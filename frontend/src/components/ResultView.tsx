import React from "react";

interface Props {
  result: any;
}

/* ───── helpers ───── */
const fmtHz = (hz: number) => `${Math.round(hz)} Hz`;
const fmtNote = (label: string) => label || "—";

/* ───── score → color ───── */
const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-sky-500";
  if (score >= 40) return "text-amber-500";
  return "text-rose-400";
};
const scoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-sky-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-400";
};
const scoreRank = (score: number) => {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
};

/* ════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════ */
const ResultView: React.FC<Props> = ({ result }) => {
  if (result.error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-slate-600 text-center max-w-md">{result.error}</p>
      </div>
    );
  }

  const hasChest = result.chest_min != null;
  const hasFalsetto = result.falsetto_min != null;
  const analysis = result.singing_analysis;
  const songs: any[] = result.recommended_songs || [];
  const artists: any[] = result.similar_artists || [];
  const voiceType = result.voice_type || {};

  return (
    <div className="space-y-6">

      {/* ──── 1. Voice Type Badge + Overall Range ──── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 p-6 text-white">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* voice type */}
          {voiceType.voice_type && (
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold tracking-wide mb-3">
              {voiceType.range_class} ・ {voiceType.voice_type}
            </div>
          )}

          <h2 className="text-sm font-medium text-white/70 mb-1">あなたの音域</h2>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {fmtNote(result.overall_min)}
            </span>
            <span className="text-xl text-white/50">〜</span>
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {fmtNote(result.overall_max)}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">
            {fmtHz(result.overall_min_hz)} 〜 {fmtHz(result.overall_max_hz)}
          </p>

          {voiceType.description && (
            <p className="text-sm text-white/80 mt-4 leading-relaxed max-w-lg">
              {voiceType.description}
            </p>
          )}
        </div>
      </div>

      {/* ──── 2. Chest / Falsetto Ratio Bar ──── */}
      {result.chest_ratio !== undefined && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">声区バランス</h3>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${result.chest_ratio}%` }}
            />
            <div
              className="h-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${result.falsetto_ratio}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full inline-block" />
              地声 {result.chest_ratio}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
              裏声 {result.falsetto_ratio}%
            </span>
          </div>
        </div>
      )}

      {/* ──── 3. Range Detail Cards ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasChest && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-700">地声</h3>
              <span className="text-xs text-slate-400 ml-auto">{result.chest_count}フレーム</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">最低音</span>
                <span className="font-bold text-slate-800">{fmtNote(result.chest_min)} <span className="text-xs text-slate-400 font-normal">{fmtHz(result.chest_min_hz)}</span></span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">最高音</span>
                <span className="font-bold text-slate-800">{fmtNote(result.chest_max)} <span className="text-xs text-slate-400 font-normal">{fmtHz(result.chest_max_hz)}</span></span>
              </div>
            </div>
          </div>
        )}
        {hasFalsetto && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
              <h3 className="text-sm font-bold text-slate-700">裏声</h3>
              <span className="text-xs text-slate-400 ml-auto">{result.falsetto_count}フレーム</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">最低音</span>
                <span className="font-bold text-slate-800">{fmtNote(result.falsetto_min)} <span className="text-xs text-slate-400 font-normal">{fmtHz(result.falsetto_min_hz)}</span></span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">最高音</span>
                <span className="font-bold text-slate-800">{fmtNote(result.falsetto_max)} <span className="text-xs text-slate-400 font-normal">{fmtHz(result.falsetto_max_hz)}</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──── 4. Singing Analysis Scores ──── */}
      {analysis && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">歌唱力スコア</h3>
            <div className="flex items-center gap-1.5">
              <span className={`text-2xl font-black ${scoreColor(analysis.overall_score)}`}>
                {scoreRank(analysis.overall_score)}
              </span>
              <span className="text-xs text-slate-400">ランク</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Overall */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">総合</span>
                <span className={`font-bold ${scoreColor(analysis.overall_score)}`}>{Math.round(analysis.overall_score)}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${scoreBg(analysis.overall_score)}`} style={{ width: `${analysis.overall_score}%` }} />
              </div>
            </div>
            {/* Range */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">音域の広さ <span className="text-slate-400">({analysis.range_semitones}半音)</span></span>
                <span className={`font-bold ${scoreColor(analysis.range_score)}`}>{Math.round(analysis.range_score)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${scoreBg(analysis.range_score)}`} style={{ width: `${analysis.range_score}%` }} />
              </div>
            </div>
            {/* Stability */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">ピッチ安定性</span>
                <span className={`font-bold ${scoreColor(analysis.stability_score)}`}>{Math.round(analysis.stability_score)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${scoreBg(analysis.stability_score)}`} style={{ width: `${analysis.stability_score}%` }} />
              </div>
            </div>
            {/* Expression */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">表現力</span>
                <span className={`font-bold ${scoreColor(analysis.expression_score)}`}>{Math.round(analysis.expression_score)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${scoreBg(analysis.expression_score)}`} style={{ width: `${analysis.expression_score}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── 5. Similar Artists ──── */}
      {artists.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-3">声が似ているアーティスト</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {artists.map((a: any, i: number) => (
              <div
                key={a.id}
                className="flex-shrink-0 w-28 flex flex-col items-center text-center"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${
                  i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                  i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                  'bg-gradient-to-br from-blue-400 to-indigo-500'
                }`}>
                  {a.name.charAt(0)}
                </div>
                <span className="text-xs font-bold text-slate-700 mt-2 leading-tight line-clamp-2">
                  {a.name}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {a.typical_lowest}〜{a.typical_highest}
                </span>
                <span className="text-[10px] text-indigo-500 font-semibold">
                  {a.similarity_score}%一致
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── 6. Recommended Songs ──── */}
      {songs.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-1">おすすめの曲</h3>
          <p className="text-xs text-slate-400 mb-4">あなたの音域に合った楽曲</p>

          <div className="space-y-1">
            {songs.map((song: any, i: number) => {
              const matchColor =
                song.match_score >= 95 ? "bg-emerald-100 text-emerald-700" :
                song.match_score >= 80 ? "bg-sky-100 text-sky-700" :
                song.match_score >= 60 ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600";

              return (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  {/* rank number */}
                  <span className="w-6 text-center text-sm font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">
                    {i + 1}
                  </span>

                  {/* song info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{song.title}</div>
                    <div className="text-xs text-slate-400 truncate">{song.artist}</div>
                  </div>

                  {/* range */}
                  <div className="hidden sm:block text-xs text-slate-400 whitespace-nowrap">
                    {song.lowest_note}〜{song.highest_note}
                  </div>

                  {/* key badge */}
                  {song.recommended_key !== undefined && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      song.fit === 'perfect' ? 'bg-emerald-100 text-emerald-700' :
                      song.fit === 'good' ? 'bg-sky-100 text-sky-700' :
                      song.fit === 'ok' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {song.recommended_key === 0 ? '±0' : song.recommended_key > 0 ? `+${song.recommended_key}` : `${song.recommended_key}`}
                    </span>
                  )}

                  {/* match score */}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${matchColor}`}>
                    {Math.round(song.match_score)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasChest && !hasFalsetto && (
        <div className="text-center py-8 text-slate-400">
          <p>声の種類を判定できませんでした。</p>
          <p className="text-sm">もう少し長く録音してみてください。</p>
        </div>
      )}
    </div>
  );
};

export default ResultView;
