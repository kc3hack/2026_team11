import os
import subprocess
from pathlib import Path

def separate_vocals(input_wav_path: str, output_dir: str = "separated") -> str:
    """
    Demucsを使ってボーカル分離を行う
    戻り値: 分離されたボーカル(wav)のパス
    """
    input_file = Path(input_wav_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_wav_path}")

    cmd = [
        "demucs",
        "-n", "htdemucs_ft", 
        "--two-stems=vocals",
        "-o", output_dir,
        str(input_wav_path)
    ]
    
    print(f"[INFO] Starting Demucs separation for: {input_wav_path}")
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ボーカル分離に失敗しました (Demucs error): {e.stderr.decode()}")
    except FileNotFoundError:
        raise RuntimeError("demucsコマンドが見つかりません。'pip install demucs' を実行してください。")

    # 出力パスの特定 (htdemucs/input_filename/vocals.wav)
    stem_name = input_file.stem
    expected_path = Path(output_dir) / "htdemucs_ft" / stem_name / "vocals.wav"
    
    if not expected_path.exists():
        # ファイル名によってはフォルダ名が変わる可能性があるため、フォルダ内を検索
        search_dir = Path(output_dir) / "htdemucs_ft"
        found = list(search_dir.glob(f"**/{stem_name}/vocals.wav"))
        if not found:
            # さらに緩く検索
            found = list(search_dir.glob("**/vocals.wav"))
            if not found:
                 raise RuntimeError(f"分離後のファイルが見つかりません: {expected_path}")
            # 最新のものを採用
            expected_path = max(found, key=os.path.getctime)
        else:
             expected_path = found[0]
        
    print(f"[INFO] Separation complete: {expected_path}")
    return str(expected_path)