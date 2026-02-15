type NoteInfo = {
  hz: number;
  note: string;
  karaoke: string;
};

type Range = {
  lowest: NoteInfo;
  highest: NoteInfo;
};

type Result = {
  error?: string;
  chest?: Range;
  falsetto?: Range;
  chest_ratio?: number;
  falsetto_ratio?: number;
};

type Props = {
  result: Result;
};

// 音名を 0〜60 の位置に変換（C3=0, C6=36 を 0〜60 にマッピング）
function noteToPos(note: string): number {
  const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const name = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  const semitone = notes.indexOf(name) + (octave - 3) * 12;
  return Math.max(0, Math.min(100, (semitone / 36) * 100));
}

function RangeBar({ chest, falsetto }: { chest?: Range; falsetto?: Range }) {
  return (
    <div style={{ margin: "2rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888" }}>
        <span>mid1C</span><span>mid2C</span><span>hiA</span><span>hiC</span><span>hihiA</span><span>hihiC</span>
      </div>
      <div style={{
        position: "relative",
        height: "32px",
        background: "#1a1a2e",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        {chest && (
          <div style={{
            position: "absolute",
            left: `${noteToPos(chest.lowest.note)}%`,
            width: `${noteToPos(chest.highest.note) - noteToPos(chest.lowest.note)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
            borderRadius: "4px",
          }} />
        )}
        {falsetto && (
          <div style={{
            position: "absolute",
            left: `${noteToPos(falsetto.lowest.note)}%`,
            width: `${noteToPos(falsetto.highest.note) - noteToPos(falsetto.lowest.note)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
            borderRadius: "4px",
            opacity: 0.8,
          }} />
        )}
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem", fontSize: "0.85rem" }}>
        <span><span style={{ color: "#60a5fa" }}>■</span> 地声</span>
        <span><span style={{ color: "#fbbf24" }}>■</span> 裏声</span>
      </div>
    </div>
  );
}

function NoteCard({ label, range, color }: { label: string; range: Range; color: string }) {
  return (
    <div style={{
      background: "#16213e",
      borderRadius: "12px",
      padding: "1.5rem",
      borderLeft: `4px solid ${color}`,
    }}>
      <h3 style={{ margin: "0 0 1rem 0", color }}>{label}</h3>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#888", fontSize: "0.85rem" }}>最低音</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{range.lowest.karaoke}</div>
          <div style={{ color: "#888", fontSize: "0.8rem" }}>{range.lowest.note} / {range.lowest.hz}Hz</div>
        </div>
        <div style={{ fontSize: "2rem", color: "#444", alignSelf: "center" }}>→</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#888", fontSize: "0.85rem" }}>最高音</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{range.highest.karaoke}</div>
          <div style={{ color: "#888", fontSize: "0.8rem" }}>{range.highest.note} / {range.highest.hz}Hz</div>
        </div>
      </div>
    </div>
  );
}

export default function ResultView({ result }: Props) {
  if (result.error) {
    return <p style={{ color: "#e74c3c", textAlign: "center" }}>❌ {result.error}</p>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* 地声最高音（一番見せたい数字） */}
      {result.chest && (
        <div style={{ textAlign: "center", margin: "2rem 0" }}>
          <div style={{ color: "#888" }}>あなたの地声最高音</div>
          <div style={{ fontSize: "3rem", fontWeight: "bold", color: "#60a5fa" }}>
            {result.chest.highest.karaoke}
          </div>
          <div style={{ color: "#888" }}>
            {result.chest.highest.note} / {result.chest.highest.hz}Hz
          </div>
        </div>
      )}

      {/* 音域バー */}
      <RangeBar chest={result.chest} falsetto={result.falsetto} />

      {/* 詳細カード */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {result.chest && <NoteCard label="🟦 地声" range={result.chest} color="#3b82f6" />}
        {result.falsetto && <NoteCard label="🟨 裏声" range={result.falsetto} color="#f59e0b" />}
      </div>

      {/* 地声/裏声の割合 */}
      {result.chest_ratio !== undefined && (
        <div style={{ marginTop: "1.5rem", textAlign: "center", color: "#888" }}>
          地声 {result.chest_ratio}% / 裏声 {result.falsetto_ratio}%
        </div>
      )}
    </div>
  );
}