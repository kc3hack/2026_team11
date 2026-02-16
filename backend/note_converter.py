import re


def to_japanese_notation(note: str) -> str:
    """
    librosaの音名（例: C4, F#5）を日本式（例: mid2C, hiF#）に変換

    オクターブ対応表:
      C2〜B2 → lowC〜lowB
      C3〜B3 → mid1C〜mid1B
      C4〜B4 → mid2C〜mid2B
      C5〜B5 → hiC〜hiB
      C6〜B6 → hihiC〜hihiB
      C7      → hihihiC
    """
    match = re.match(r"([A-G][#♯b♭]?)(\d+)", note)
    if not match:
        return note

    pitch = match.group(1)
    octave = int(match.group(2))

    prefix_map = {
        1: "lowlow",
        2: "low",
        3: "mid1",
        4: "mid2",
        5: "hi",
        6: "hihi",
        7: "hihihi",
    }

    prefix = prefix_map.get(octave, f"oct{octave}_")

    return f"{prefix}{pitch}"