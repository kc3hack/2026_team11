/**
 * 音名表示用: "C♯3" / "C#3" / "G♯4" などを
 * low / mid1 / mid2 / hi 等の日本式表記に変換する
 */

const OCTAVE_PREFIX: Record<number, string> = {
  1: "lowlow",
  2: "low",
  3: "mid1",
  4: "mid2",
  5: "hi",
  6: "hihi",
  7: "hihihi",
};

/**
 * "C♯3", "C#3", "G♯4", "Bb2" などを日本式（mid1C#, mid2G#, lowBb 等）に変換する。
 * 既に日本式の場合はそのまま返す。
 */
export function parseNoteToJapanese(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "—";
  const s = value.trim();
  if (!s) return "—";
  const normalized = s.replace(/♯/g, "#").replace(/♭/g, "b");
  if (/^(lowlow|low|mid1|mid2|hi|hihi|hihihi)[A-G][#b]?$/i.test(normalized)) {
    return normalized;
  }
  const m = normalized.match(/^([A-Ga-g])([#b])?(\d+)$/);
  if (!m) return s;
  const pitch = m[1].toUpperCase();
  const acc = m[2] ?? "";
  const octave = parseInt(m[3], 10);
  const prefix = OCTAVE_PREFIX[octave];
  if (!prefix) return s;
  return `${prefix}${pitch}${acc}`;
}
