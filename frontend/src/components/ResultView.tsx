import React from "react";

interface Props {
  result: any;
}

const ResultView: React.FC<Props> = ({ result }) => {
  if (result.error) {
    return <p style={{ color: "red" }}>⚠️ {result.error}</p>;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2>🎵 測定結果</h2>

      <h3>📊 全体</h3>
      <p>最低音: {result.overall_min} ({result.overall_min_hz} Hz)</p>
      <p>最高音: {result.overall_max} ({result.overall_max_hz} Hz)</p>

      {result.chest_ratio !== undefined && (
        <div style={{ margin: "15px 0", padding: 10, background: "#f5f5f5", borderRadius: 8 }}>
          <p>🗣️ 地声: {result.chest_ratio}% ／ 🎙️ ミックス: {result.mix_ratio}% ／ 🎤 裏声: {result.falsetto_ratio}%</p>
        </div>
      )}

      {result.chest_min && (
        <>
          <h3>🗣️ 地声</h3>
          <p>最低音: {result.chest_min} ({result.chest_min_hz} Hz)</p>
          <p>最高音: {result.chest_max} ({result.chest_max_hz} Hz)</p>
        </>
      )}

      {result.mix_min && (
        <>
          <h3>🎙️ ミックスボイス</h3>
          <p>最低音: {result.mix_min} ({result.mix_min_hz} Hz)</p>
          <p>最高音: {result.mix_max} ({result.mix_max_hz} Hz)</p>
        </>
      )}

      {result.falsetto_min && (
        <>
          <h3>🎤 裏声</h3>
          <p>最低音: {result.falsetto_min} ({result.falsetto_min_hz} Hz)</p>
          <p>最高音: {result.falsetto_max} ({result.falsetto_max_hz} Hz)</p>
        </>
      )}

      {!result.chest_min && !result.mix_min && !result.falsetto_min && (
        <p>⚠️ 声の種類を判定できませんでした。もう少し長く録音してください。</p>
      )}
    </div>
  );
};

export default ResultView;