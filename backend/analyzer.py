"""
音声解析のメインモジュール
ピッチ検出 → 地声/裏声分類 → 音域算出
"""
import numpy as np
import librosa
from register_classifier import RegisterClassifier

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

KARAOKE_NAMES = {
    "C3": "mid1C", "C#3": "mid1C#", "D3": "mid1D", "D#3": "mid1D#",
    "E3": "mid1E", "F3": "mid1F", "F#3": "mid1F#", "G3": "mid1G",
    "G#3": "mid1G#", "A3": "mid1A", "A#3": "mid1A#", "B3": "mid1B",
    "C4": "mid2C", "C#4": "mid2C#", "D4": "mid2D", "D#4": "mid2D#",
    "E4": "mid2E", "F4": "mid2F", "F#4": "mid2F#", "G4": "mid2G",
    "G#4": "mid2G#", "A4": "hiA", "A#4": "hiA#", "B4": "hiB",
    "C5": "hiC", "C#5": "hiC#", "D5": "hiD", "D#5": "hiD#",
    "E5": "hiE", "F5": "hiF", "F#5": "hiF#", "G5": "hiG",
    "G#5": "hiG#", "A5": "hihiA", "A#5": "hihiA#", "B5": "hihiB",
    "C6": "hihiC",
}


class VoiceAnalyzer:
    def __init__(self, sr: int = 22050):
        self.sr = sr
        self.classifier = RegisterClassifier(sr=sr)

    def analyze(self, audio_path: str) -> dict:
        y, sr = librosa.load(audio_path, sr=self.sr)

        # 無音除去
        y, _ = librosa.effects.trim(y, top_db=20)

        if len(y) < sr * 0.5:
            return {"error": "録音が短すぎます（0.5秒以上必要）"}

        # ピッチ検出
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            sr=sr,
        )
        times = librosa.times_like(f0, sr=sr)

        # 地声/裏声を分類
        frame_labels = self.classifier.classify_frames(y, f0, voiced_flag, sr)

        # 有声フレームだけ抽出
        frames = []
        for i in range(len(f0)):
            if voiced_flag[i] and not np.isnan(f0[i]):
                frames.append({
                    "time": float(times[i]),
                    "f0": float(f0[i]),
                    "register": frame_labels[i],
                })

        if not frames:
            return {"error": "声が検出されませんでした"}

        # 音域を集計
        chest_pitches = [f["f0"] for f in frames if f["register"] == "chest"]
        falsetto_pitches = [f["f0"] for f in frames if f["register"] == "falsetto"]

        result = {
            "total_frames": len(frames),
            "chest_ratio": round(len(chest_pitches) / len(frames) * 100, 1),
            "falsetto_ratio": round(len(falsetto_pitches) / len(frames) * 100, 1),
            "timeline": frames,
        }

        if chest_pitches:
            lo, hi = self._stable_range(chest_pitches)
            result["chest"] = {
                "lowest": self._note_info(lo),
                "highest": self._note_info(hi),
            }

        if falsetto_pitches:
            lo, hi = self._stable_range(falsetto_pitches)
            result["falsetto"] = {
                "lowest": self._note_info(lo),
                "highest": self._note_info(hi),
            }

        return result

    def _stable_range(self, pitches: list[float]) -> tuple[float, float]:
        """外れ値を除外して安定した音域を返す"""
        arr = np.array(pitches)
        lo = float(np.percentile(arr, 3))
        hi = float(np.percentile(arr, 97))
        return lo, hi

    def _note_info(self, hz: float) -> dict:
        note = self._hz_to_note(hz)
        return {
            "hz": round(hz, 1),
            "note": note,
            "karaoke": KARAOKE_NAMES.get(note, note),
        }

    def _hz_to_note(self, freq: float) -> str:
        if freq <= 0:
            return "N/A"
        midi = int(round(12 * np.log2(freq / 440.0) + 69))
        octave = (midi // 12) - 1
        note = NOTE_NAMES[midi % 12]
        return f"{note}{octave}"