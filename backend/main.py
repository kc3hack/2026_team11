import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid

from audio_converter import convert_to_wav, convert_to_wav_hq
from analyzer import analyze
from vocal_separator import separate_vocals

# Supabase対応のデータベース関数をインポート
from database_supabase import (
    get_all_songs, search_songs, get_song,
    get_user_profile, update_user_profile, update_vocal_range,
    create_analysis_record, get_analysis_history,
    add_favorite_song, remove_favorite_song, get_favorite_songs, is_favorite
)

# 認証関連
from auth import (
    get_current_user, get_optional_user,
    sign_up_with_email, sign_in_with_email, sign_out,
    refresh_session, request_password_reset, update_password
)

# Pydanticモデル
from models import (
    SignUpRequest, SignInRequest, RefreshTokenRequest,
    PasswordResetRequest, PasswordUpdateRequest,
    UserProfileUpdate, VocalRangeUpdate,
    AnalysisCreate, FavoriteSongAdd
)

app = FastAPI(title="Voice Range Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 認証エンドポイント
# ============================================================

@app.post("/auth/signup")
def signup(data: SignUpRequest):
    """メールアドレスでユーザー登録"""
    return sign_up_with_email(data.email, data.password, data.display_name)


@app.post("/auth/signin")
def signin(data: SignInRequest):
    """メールアドレスでログイン"""
    return sign_in_with_email(data.email, data.password)


@app.post("/auth/signout")
def signout_endpoint(user: dict = Depends(get_current_user)):
    """ログアウト"""
    sign_out(user.get("id"))
    return {"message": "ログアウトしました"}


@app.post("/auth/refresh")
def refresh(data: RefreshTokenRequest):
    """セッションをリフレッシュ"""
    return refresh_session(data.refresh_token)


@app.post("/auth/reset-password")
def reset_password(data: PasswordResetRequest):
    """パスワードリセットメールを送信"""
    success = request_password_reset(data.email)
    if success:
        return {"message": "パスワードリセットメールを送信しました"}
    raise HTTPException(status_code=400, detail="メール送信に失敗しました")


@app.post("/auth/update-password")
def update_password_endpoint(data: PasswordUpdateRequest, user: dict = Depends(get_current_user)):
    """パスワードを更新（要ログイン）"""
    success = update_password(user.get("id"), data.new_password)
    if success:
        return {"message": "パスワードを更新しました"}
    raise HTTPException(status_code=400, detail="パスワード更新に失敗しました")


# ============================================================
# ユーザープロファイル
# ============================================================

@app.get("/profile/me")
def get_my_profile(user: dict = Depends(get_current_user)):
    """自分のプロファイルを取得"""
    profile = get_user_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="プロファイルが見つかりません")
    return profile


@app.put("/profile/me")
def update_my_profile(data: UserProfileUpdate, user: dict = Depends(get_current_user)):
    """自分のプロファイルを更新"""
    profile = update_user_profile(user["id"], data.model_dump(exclude_none=True))
    return profile


@app.put("/profile/vocal-range")
def update_my_vocal_range(data: VocalRangeUpdate, user: dict = Depends(get_current_user)):
    """自分の声域情報を更新"""
    result = update_vocal_range(
        user["id"],
        data.vocal_range_min,
        data.vocal_range_max,
        data.falsetto_max
    )
    return result


# ============================================================
# 分析履歴
# ============================================================

@app.post("/analysis")
def create_analysis(data: AnalysisCreate, user: dict = Depends(get_current_user)):
    """分析履歴を保存"""
    record = create_analysis_record(
        user["id"],
        data.vocal_range_min,
        data.vocal_range_max,
        data.falsetto_max,
        data.source_type,
        data.file_name
    )
    
    # プロファイルの声域も更新
    update_vocal_range(
        user["id"],
        data.vocal_range_min,
        data.vocal_range_max,
        data.falsetto_max
    )
    
    return record


@app.get("/analysis/history")
def get_my_analysis_history(user: dict = Depends(get_current_user), limit: int = 50):
    """自分の分析履歴を取得"""
    return get_analysis_history(user["id"], limit)


# ============================================================
# お気に入り楽曲
# ============================================================

@app.post("/favorites")
def add_favorite(data: FavoriteSongAdd, user: dict = Depends(get_current_user)):
    """お気に入りに楽曲を追加"""
    result = add_favorite_song(user["id"], data.song_id)
    if not result:
        raise HTTPException(status_code=400, detail="既にお気に入りに登録されています")
    return result


@app.delete("/favorites/{song_id}")
def remove_favorite(song_id: int, user: dict = Depends(get_current_user)):
    """お気に入りから楽曲を削除"""
    success = remove_favorite_song(user["id"], song_id)
    if success:
        return {"message": "お気に入りから削除しました"}
    raise HTTPException(status_code=404, detail="お気に入りに登録されていません")


@app.get("/favorites")
def get_my_favorites(user: dict = Depends(get_current_user), limit: int = 100):
    """自分のお気に入り楽曲一覧を取得"""
    return get_favorite_songs(user["id"], limit)


@app.get("/favorites/check/{song_id}")
def check_favorite(song_id: int, user: dict = Depends(get_current_user)):
    """楽曲がお気に入りに登録されているか確認"""
    return {"is_favorite": is_favorite(user["id"], song_id)}


# ============================================================
# 楽曲検索（認証不要）
# ============================================================

@app.get("/songs")
def read_songs(limit: int = 20, offset: int = 0, q: str | None = None):
    if q:
        return search_songs(q, limit, offset)
    return get_all_songs(limit, offset)

# ============================================================
# 音声分析エンドポイント（認証オプショナル）
# ============================================================

UPLOAD_DIR = "uploads"
SEPARATED_DIR = "separated"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SEPARATED_DIR, exist_ok=True)

def cleanup_files(*paths):
    """一時ファイルを削除するタスク"""
    for path in paths:
        if not path: continue
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
        except Exception as e:
            print(f"[WARN] Cleanup failed for {path}: {e}")

@app.post("/analyze")
async def analyze_voice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_optional_user)
):
    """
    アカペラ/マイク録音用 (Demucsなし)
    ログイン済みの場合は自動的に履歴に保存
    """
    temp_input_path = None
    converted_wav_path = None
    
    try:
        ext = os.path.splitext(file.filename)[1] or ".tmp"
        temp_input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # マイク録音は16kHz/モノラルで十分
        converted_wav_path = convert_to_wav(temp_input_path, output_dir=UPLOAD_DIR)

        result = analyze(converted_wav_path)
        
        # ログイン済みの場合は履歴に自動保存
        if user and result.get("vocal_range"):
            vocal_range = result["vocal_range"]
            create_analysis_record(
                user["id"],
                vocal_range.get("lowest_note"),
                vocal_range.get("highest_note"),
                vocal_range.get("falsetto_max"),
                "microphone",
                file.filename
            )
            # プロファイルも更新
            update_vocal_range(
                user["id"],
                vocal_range.get("lowest_note"),
                vocal_range.get("highest_note"),
                vocal_range.get("falsetto_max")
            )

        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path)
        return result

    except Exception as e:
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path)
        return {"error": f"エラーが発生しました: {str(e)}"}

@app.post("/analyze-karaoke")
async def analyze_karaoke(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_optional_user)
):
    """
    カラオケ音源用 (Demucsあり)
    ログイン済みの場合は自動的に履歴に保存
    """
    temp_input_path = None
    converted_wav_path = None
    vocal_path = None
    demucs_folder = None
    
    try:
        ext = os.path.splitext(file.filename)[1] or ".tmp"
        temp_input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # ★修正: Demucs前は高品質変換(44100Hz/ステレオ)が必須
        # 16kHz/モノラルだとDemucsのボーカル分離精度が大幅に落ちる
        converted_wav_path = convert_to_wav_hq(temp_input_path, output_dir=UPLOAD_DIR)

        # Demucsでボーカル分離
        vocal_path = separate_vocals(converted_wav_path, output_dir=SEPARATED_DIR)
        
        # 解析 (Demucs出力のvocals.wavはそのまま渡す)
        result = analyze(vocal_path, already_separated=True)
        
        # ログイン済みの場合は履歴に自動保存
        if user and result.get("vocal_range"):
            vocal_range = result["vocal_range"]
            create_analysis_record(
                user["id"],
                vocal_range.get("lowest_note"),
                vocal_range.get("highest_note"),
                vocal_range.get("falsetto_max"),
                "karaoke",
                file.filename
            )
            # プロファイルも更新
            update_vocal_range(
                user["id"],
                vocal_range.get("lowest_note"),
                vocal_range.get("highest_note"),
                vocal_range.get("falsetto_max")
            )

        # Demucs出力フォルダ全体を削除対象にする
        # vocal_path例: separated/htdemucs/{uuid}/vocals.wav
        # → 削除対象: separated/htdemucs/{uuid} フォルダ全体
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)  # {uuid}フォルダ

        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path, demucs_folder)
        
        return result

    except Exception as e:
        print(f"[ERROR] Process failed: {e}")
        # エラー時もDemucs出力フォルダを削除
        if vocal_path:
            demucs_folder = os.path.dirname(vocal_path)
        background_tasks.add_task(cleanup_files, temp_input_path, converted_wav_path, demucs_folder)
        return {"error": f"処理中にエラーが発生しました: {str(e)}"}
