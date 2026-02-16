import numpy as np
import librosa
import noisereduce as nr
import soundfile as sf


def reduce_noise(file_path: str, output_path: str = "cleaned.wav") -> str:
    # 元のサンプリングレートで読む
    y, sr = librosa.load(file_path, sr=None, mono=True)

    y_denoised = nr.reduce_noise(
        y=y,
        sr=sr,
        prop_decrease=0.8,
        n_fft=2048,
        hop_length=512,
    )

    intervals = librosa.effects.split(y_denoised, top_db=30)
    if len(intervals) == 0:
        sf.write(output_path, y_denoised, sr)
        return output_path

    y_trimmed = np.concatenate([y_denoised[start:end] for start, end in intervals])
    sf.write(output_path, y_trimmed, sr)
    return output_path