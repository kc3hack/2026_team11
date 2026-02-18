import os
import subprocess
from pathlib import Path

def separate_vocals(input_wav_path: str, output_dir: str = "separated", 
                    fast_mode: bool = False, ultra_fast_mode: bool = False) -> str:
    """
    Demucsを使ってボーカル分離を行う
    
    Args:
        input_wav_path: 入力WAVファイルのパス
        output_dir: 出力ディレクトリ
        fast_mode: True時は軽量モデル(htdemucs)を使用 (約2-3倍高速)
        ultra_fast_mode: True時は超軽量モデル(htdemucs_6s)を使用 (約3-5倍高速)
    
    戻り値: 分離されたボーカル(wav)のパス
    """
    input_file = Path(input_wav_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_wav_path}")

    # モデル選択: ultra_fast > fast > default
    if ultra_fast_mode:
        model_name = "htdemucs_6s"
        mode_label = "⚡ ULTRA FAST MODE (3-5x faster)"
    elif fast_mode:
        model_name = "htdemucs"
        mode_label = "🚀 FAST MODE (2-3x faster)"
    else:
        model_name = "htdemucs_ft"
        mode_label = "💎 HIGH QUALITY"
    
    cmd = [
        "demucs",
        "-n", model_name,
        "--two-stems=vocals",
        "-o", output_dir,
    ]
    
    # GPUが使える場合は自動的に使用される（PyTorchのデフォルト動作）
    # CPUを強制したい場合は --device cpu を追加
    
    cmd.append(str(input_wav_path))
    
    print(f"[INFO] Starting Demucs separation for: {input_wav_path}")
    print(f"[INFO] Model: {model_name} {mode_label}")
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ボーカル分離に失敗しました (Demucs error): {e.stderr.decode()}")
    except FileNotFoundError:
        raise RuntimeError("demucsコマンドが見つかりません。'pip install demucs' を実行してください。")

    # 出力パスの特定 (htdemucs/input_filename/vocals.wav)
    stem_name = input_file.stem
    expected_path = Path(output_dir) / model_name / stem_name / "vocals.wav"
    
    if not expected_path.exists():
        # ファイル名によってはフォルダ名が変わる可能性があるため、フォルダ内を検索
        search_dir = Path(output_dir) / model_name
        found = list(search_dir.glob(f"**/{stem_name}/vocals.wav"))
        if not found:
            # 旧モデル名でも検索（互換性のため）
            search_dir_ft = Path(output_dir) / "htdemucs_ft"
            if search_dir_ft.exists():
                found = list(search_dir_ft.glob(f"**/{stem_name}/vocals.wav"))
            if not found:
                # さらに緩く検索
                found = list(search_dir.glob("**/vocals.wav"))
                if not found and search_dir_ft.exists():
                    found = list(search_dir_ft.glob("**/vocals.wav"))
            if not found:
                 raise RuntimeError(f"分離後のファイルが見つかりません: {expected_path}")
            # 最新のものを採用
            expected_path = max(found, key=os.path.getctime)
        else:
             expected_path = found[0]
        
    print(f"[INFO] Separation complete: {expected_path}")
    return str(expected_path)