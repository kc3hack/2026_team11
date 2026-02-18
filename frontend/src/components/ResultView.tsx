import React from "react";

interface Props {
  result: any;
}

// Hz を整数で表示（例: 371.676 → 372）
const fmtHz = (hz: number) => `${Math.round(hz)} Hz`;

// ラベルが空文字（C4オクターブ）の場合の保護
const fmtNote = (label: string) => label || "（不明）";

const NoteRow: React.FC<{ label: string; note: string; hz: number }> = ({ label, note, hz }) => (
  <p style={{ margin: "4px 0" }}>
    {label}：<strong>{fmtNote(note)}</strong>
    <span style={{ color: "#888", marginLeft: 8, fontSize: 13 }}>({fmtHz(hz)})</span>
  </p>
);

const ResultView: React.FC<Props> = ({ result }) => {
  if (result.error) {
    return <p style={{ color: "red" }}>⚠️ {result.error}</p>;
  }

  const hasChest    = result.chest_min != null;
  const hasFalsetto = result.falsetto_min != null;

  return (
    <div style={{ marginTop: 20 }}>
      <h2>🎵 測定結果</h2>

      {/* 全体音域 */}
      <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>📊 全体音域</h3>
        <NoteRow label="最低音" note={result.overall_min} hz={result.overall_min_hz} />
        <NoteRow label="最高音" note={result.overall_max} hz={result.overall_max_hz} />
      </div>

      {/* 声種比率 */}
      {result.chest_ratio !== undefined && (
        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            🗣️ 地声 <strong>{result.chest_ratio}%</strong>
            　／　
            🎤 裏声 <strong>{result.falsetto_ratio}%</strong>
          </p>
        </div>
      )}

      {/* 地声 */}
      {hasChest && (
        <div style={{ background: "#f9fff5", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 8px" }}>🗣️ 地声</h3>
          <NoteRow label="最低音" note={result.chest_min} hz={result.chest_min_hz} />
          <NoteRow label="最高音" note={result.chest_max} hz={result.chest_max_hz} />
        </div>
      )}

      {/* 裏声 */}
      {hasFalsetto && (
        <div style={{ background: "#fff5fb", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 8px" }}>🎤 裏声</h3>
          <NoteRow label="最低音" note={result.falsetto_min} hz={result.falsetto_min_hz} />
          <NoteRow label="最高音" note={result.falsetto_max} hz={result.falsetto_max_hz} />
        </div>
      )}

      {!hasChest && !hasFalsetto && (
        <p>⚠️ 声の種類を判定できませんでした。もう少し長く録音してください。</p>
      )}
    </div>
  );
};

export default ResultView;
