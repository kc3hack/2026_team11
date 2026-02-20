import React, { useState, useEffect } from "react";
import {
  AnalysisResult,
  getFavoriteArtists,
  addFavoriteArtist,
  removeFavoriteArtist,
} from "./api";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

interface AnalysisResultPageProps {
  result: AnalysisResult | null;
}

/* ───── ヘルパーコンポーネント: キーバッジ ───── */
const keyBadge = (key: number, fit?: string, octaveShift?: string) => {
  // オクターブ表記
  let octaveLabel = "";
  if (octaveShift === "down") octaveLabel = "🔽";
  else if (octaveShift === "up") octaveLabel = "🔼";

  // キー表記
  const keyLabel = key === 0 ? "±0" : key > 0 ? `+${key}` : `${key}`;
  const label = octaveLabel ? `${octaveLabel}${keyLabel}` : keyLabel;

  let color: string;
  if (fit === "perfect") color = "bg-emerald-900/30 text-emerald-400 border border-emerald-500/30";
  else if (fit === "good") color = "bg-sky-900/30 text-sky-400 border border-sky-500/30";
  else if (fit === "ok") color = "bg-amber-900/30 text-amber-400 border border-amber-500/30";
  else if (fit === "hard") color = "bg-rose-900/30 text-rose-400 border border-rose-500/30";
  else color = "bg-slate-800 text-slate-500 border border-slate-700";
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-full text-xs font-bold ${color}`}>
      {label}
    </span>
  );
};

/* ───── ヘルパーコンポーネント: 難易度バッジ ───── */
const difficultyBadge = (score: number) => {
  if (score >= 80) return <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">Easy</span>;
  if (score >= 60) return <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-900/30 text-amber-400 border border-amber-500/30">Medium</span>;
  return <span className="text-xs font-bold px-2 py-1 rounded-md bg-rose-900/30 text-rose-400 border border-rose-500/30">Hard</span>;
};

/* ───── 歌唱力レーダーチャート (SVG) ───── */
const RadarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const cx = 120, cy = 120, r = 90;
  const n = data.length;
  if (n === 0) return null;

  const angles = data.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const points = data.map((d, i) => {
    const ratio = d.value / 100;
    const x = cx + r * ratio * Math.cos(angles[i]);
    const y = cy + r * ratio * Math.sin(angles[i]);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full max-w-[220px]">
      {[0.33, 0.66, 1.0].map((level, li) => (
        <polygon key={li} points={angles.map(a => `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`).join(" ")} fill="none" stroke="#334155" strokeWidth="1" />
      ))}
      {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#334155" strokeWidth="1" />)}
      <polygon points={points} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
      {data.map((d, i) => (
        <text key={i} x={cx + (r + 20) * Math.cos(angles[i])} y={cy + (r + 20) * Math.sin(angles[i])} textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-[10px] font-bold">
          {d.label}
        </text>
      ))}
    </svg>
  );
};

/* ════════════════════════════════════════════════
   メインコンポーネント
   ════════════════════════════════════════════════ */
const AnalysisResultPage: React.FC<AnalysisResultPageProps> = ({ result }) => {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  // お気に入り情報の初期取得
  useEffect(() => {
    const fetchFavs = async () => {
      try {
        const favs = await getFavoriteArtists();
        setFavoriteIds(favs.map(f => f.artist_id));
      } catch (e) {
        console.error("Failed to sync favorites", e);
      }
    };
    fetchFavs();
  }, []);

  // お気に入り切り替え
  const toggleFavorite = async (artistId: number, artistName: string) => {
    try {
      if (favoriteIds.includes(artistId)) {
        await removeFavoriteArtist(artistId);
        setFavoriteIds(prev => prev.filter(id => id !== artistId));
      } else {
        await addFavoriteArtist(artistId, artistName);
        setFavoriteIds(prev => [...prev, artistId]);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "お気に入り操作に失敗しました。");
    }
  };

  if (!result || result.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 p-8">
        <div className="text-6xl mb-4">🎤</div>
        <p className="text-lg font-bold mb-2">分析データがありません</p>
        <p className="text-sm">録音して解析を完了させると、ここに結果が表示されます。</p>
      </div>
    );
  }

  const singing = result.singing_analysis;
  const radarData = singing ? [
    { label: "音域", value: singing.range_score },
    { label: "安定性", value: singing.stability_score },
    { label: "表現力", value: singing.expression_score },
    { label: "総合", value: singing.overall_score },
  ] : [];

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-transparent p-4 sm:p-8 font-sans text-slate-200">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 左カラム: メイン解析 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 p-6 sm:p-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Vocal Range Analysis</h2>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-4xl sm:text-6xl font-black text-white tracking-tighter">
                {result.overall_min} <span className="text-slate-600 mx-1">~</span> {result.overall_max}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-900/30 p-4 rounded-2xl border border-indigo-500/30">
                <p className="text-xs font-bold text-indigo-400 mb-1">地声範囲 (Chest)</p>
                <p className="text-xl font-bold text-slate-100">{result.chest_min ?? result.overall_min} ~ {result.chest_max ?? result.overall_max}</p>
              </div>
              {result.falsetto_max && (
                <div className="bg-emerald-900/30 p-4 rounded-2xl border border-emerald-500/30">
                  <p className="text-xs font-bold text-emerald-400 mb-1">裏声最高音 (Falsetto)</p>
                  <p className="text-xl font-bold text-slate-100">{result.falsetto_max}</p>
                </div>
              )}
            </div>

            {result.voice_type && (
              <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                <p className="text-sm font-bold text-slate-200 mb-1">
                  タイプ: <span className="text-cyan-400">{result.voice_type.voice_type}</span>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{result.voice_type.description}</p>
              </div>
            )}
          </div>

          {/* 似ているアーティストセクション */}
          {result.similar_artists && result.similar_artists.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4">声質が似ているアーティスト</h3>
              <div className="flex flex-wrap gap-3">
                {result.similar_artists.map((artist) => (
                  <div key={artist.id} className="flex items-center gap-3 bg-slate-800/50 pl-4 pr-2 py-2 rounded-full border border-slate-700/50 group transition-all hover:bg-slate-700/50 hover:border-slate-600/50">
                    <span className="text-sm font-bold text-slate-200">{artist.name}</span>
                    <span className="text-[10px] font-bold text-indigo-400">{Math.round(artist.similarity_score)}%</span>
                    <button
                      onClick={() => toggleFavorite(artist.id, artist.name)}
                      className="p-1.5 transition-transform hover:scale-125"
                      aria-label="お気に入り登録"
                    >
                      {favoriteIds.includes(artist.id) ? (
                        <StarSolid className="w-5 h-5 text-amber-400" />
                      ) : (
                        <StarOutline className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右カラム: スコア・おすすめ */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 p-6 flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-200 self-start mb-4">歌唱力指標</h3>
            {radarData.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                <RadarChart data={radarData} />
                <div className="mt-4 text-center">
                  <div className="text-3xl font-black text-indigo-400">{Math.round(singing?.overall_score ?? 0)}点</div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Singing Score</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-10">スコアデータがありません</p>
            )}
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4">あなたへのおすすめ曲</h3>
            <div className="space-y-3">
              {result.recommended_songs?.slice(0, 5).map((song, i) => (
                <div key={song.id} className="flex items-center justify-between group">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{song.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{song.artist}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    {song.recommended_key !== undefined && keyBadge(song.recommended_key, song.fit, (song as any).octave_shift)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisResultPage;
