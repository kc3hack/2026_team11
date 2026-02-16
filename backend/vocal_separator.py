import os
import numpy as np
import torch
import torchaudio
import soundfile as sf


def separate_vocals(input_path: str, output_dir: str = "separated", max_duration: int = 30, progress_callback=None) -> str:
    """
    Demucs でボーカルのみ抽出する（Python API版 - CLIバグ回避）
    """
    from demucs.pretrained import get_model
    from demucs.apply import apply_model

    # === モデル読み込み ===
    device = "cpu"
    model = get_model("htdemucs")
    model.to(device)
    model.eval()

    # === 音声読み込み ===
    wav, sr = torchaudio.load(input_path)
    print(f"[DEBUG] Input: SR={sr}, shape={wav.shape}")

    # 最大30秒にカット
    max_samples = max_duration * sr
    if wav.shape[1] > max_samples:
        wav = wav[:, :max_samples]

    # モノラル→ステレオに変換（Demucsはステレオ入力が必要）
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)

    # 44100Hz にリサンプル（Demucsの要求）
    if sr != 44100:
        wav = torchaudio.transforms.Resample(sr, 44100)(wav)
        sr = 44100

    # === clone() してバグ回避 ===
    wav = wav.clone()

    # バッチ次元を追加 [channels, samples] → [1, channels, samples]
    wav = wav.unsqueeze(0).to(device)

    # === 分離実行 ===
    with torch.no_grad():
        sources = apply_model(model, wav, device=device, segment=7, overlap=0.1)

    # sources: [1, num_sources, channels, samples]
    # htdemucs のソース順: drums, bass, other, vocals
    source_names = model.sources
    print(f"[DEBUG] Source names: {source_names}")

    vocals_idx = source_names.index("vocals")
    vocals = sources[0, vocals_idx]  # [channels, samples]

    # ステレオ→モノラル
    vocals_mono = vocals.mean(dim=0).cpu().numpy()

    # === 保存 ===
    os.makedirs(output_dir, exist_ok=True)
    vocal_path = os.path.join(output_dir, "vocals_extracted.wav")
    sf.write(vocal_path, vocals_mono, sr)

    print(f"[DEBUG] Vocals saved: {vocal_path}, duration={len(vocals_mono)/sr:.2f}s")

    return vocal_path