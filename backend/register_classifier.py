"""
地声/裏声の分類
HNR + スペクトル平坦度 + 倍音比で判定
"""
import numpy as np
import librosa


class RegisterClassifier:
    def __init__(self, sr: int = 22050, frame_length: int = 2048, hop_length: int = 512):
        self.sr = sr
        self.frame_length = frame_length
        self.hop_length = hop_length

    def classify_frames(
        self,
        y: np.ndarray,
        f0: np.ndarray,
        voiced_flag: np.ndarray,
        sr: int,
    ) -> list[str]:
        """全フレームを地声/裏声に分類して返す"""

        # --- 特徴量を一括計算 ---
        y_harmonic = librosa.effects.harmonic(y)
        y_residual = y - y_harmonic

        rms_h = librosa.feature.rms(
            y=y_harmonic, frame_length=self.frame_length,
            hop_length=self.hop_length
        )[0]
        rms_n = librosa.feature.rms(
            y=y_residual, frame_length=self.frame_length,
            hop_length=self.hop_length
        )[0]
        hnr = 10 * np.log10(rms_h / (rms_n + 1e-10))

        flatness = librosa.feature.spectral_flatness(
            y=y, hop_length=self.hop_length
        )[0]

        S = np.abs(librosa.stft(y, n_fft=self.frame_length, hop_length=self.hop_length))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=self.frame_length)
        low_e = np.sum(S[freqs < 2000, :] ** 2, axis=0)
        high_e = np.sum(S[freqs >= 2000, :] ** 2, axis=0)
        h_ratio = low_e / (high_e + 1e-10)

        # --- フレームごとに分類 ---
        n = min(len(f0), len(hnr), len(flatness), len(h_ratio))
        labels = []
        for i in range(n):
            if not voiced_flag[i] or np.isnan(f0[i]):
                labels.append("unvoiced")
                continue
            labels.append(self._classify_one(
                hnr=float(hnr[i]),
                flatness=float(flatness[i]),
                h_ratio=float(h_ratio[i]),
                f0=float(f0[i]),
            ))

        # スムージング（5フレーム多数決）
        labels = self._smooth(labels, window=5)

        # f0 の長さに合わせる
        while len(labels) < len(f0):
            labels.append("unvoiced")

        return labels

    def _classify_one(self, hnr: float, flatness: float,
                      h_ratio: float, f0: float) -> str:
        chest = 0.0
        falsetto = 0.0

        # HNR
        if hnr > 15:
            chest += 3.0
        elif hnr > 10:
            chest += 1.5
            falsetto += 0.5
        elif hnr > 5:
            falsetto += 1.5
            chest += 0.5
        else:
            falsetto += 3.0

        # スペクトル平坦度
        if flatness < 0.01:
            chest += 2.0
        elif flatness < 0.03:
            chest += 1.0
        elif flatness < 0.06:
            falsetto += 1.0
        else:
            falsetto += 2.0

        # 倍音比
        if h_ratio > 8:
            chest += 2.0
        elif h_ratio > 4:
            chest += 1.0
        elif h_ratio > 2:
            falsetto += 1.0
        else:
            falsetto += 2.0

        # 高音域補正
        if f0 > 400 and hnr > 10:
            chest += 0.5
        if f0 > 500 and hnr <= 8:
            falsetto += 1.5

        return "chest" if chest >= falsetto else "falsetto"

    def _smooth(self, labels: list[str], window: int = 5) -> list[str]:
        """多数決フィルタ"""
        result = labels.copy()
        half = window // 2
        for i in range(half, len(labels) - half):
            local = labels[i - half: i + half + 1]
            voiced = [l for l in local if l != "unvoiced"]
            if not voiced:
                continue
            chest_count = sum(1 for l in voiced if l == "chest")
            result[i] = "chest" if chest_count > len(voiced) // 2 else "falsetto"
        return result