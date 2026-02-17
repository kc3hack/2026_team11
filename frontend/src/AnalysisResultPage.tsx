import React from 'react';
// import {
//   Radar,
//   RadarChart,
//   PolarGrid,
//   PolarAngleAxis,
//   PolarRadiusAxis,
//   ResponsiveContainer,
// } from 'recharts';

// Dummy Data for Radar Chart
// const radarData = [
//     { subject: '音程', A: 120, fullMark: 150 },
//     { subject: '安定感', A: 98, fullMark: 150 },
//     { subject: '抑揚', A: 86, fullMark: 150 },
//     { subject: 'ロングトーン', A: 99, fullMark: 150 },
//     { subject: 'テクニック', A: 85, fullMark: 150 },
// ];

// Dummy Data for Recommended Songs
const recommendedSongs = [
    { title: 'マリーゴールド', artist: 'あいみょん', difficulty: 'Easy' },
    { title: '猫', artist: 'DISH//', difficulty: 'Medium' },
    { title: 'ドライフラワー', artist: '優里', difficulty: 'Hard' },
];

const AnalysisResultPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
            {/* Page Title */}
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 mb-8 self-start">
                分析結果
            </h1>

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN (2/3) - Vocal Range & Main Stats */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Main Card */}
                    <div className="bg-white rounded-2xl shadow-md p-8 h-full flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-slate-700">音域チェック結果</h2>
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="px-4 py-2 bg-blue-100 text-blue-600 rounded-full font-bold">
                                    あなたの音域
                                </div>
                                <div className="text-4xl font-extrabold text-slate-800">
                                    lowG <span className="text-slate-400 mx-2">~</span> hiA
                                </div>
                            </div>

                            <p className="text-slate-500 leading-relaxed mb-6">
                                これはサンプルです
                            </p>

                            {/* Dummy "Voice Type" visualization */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">Voice Type Ratio</h3>
                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-indigo-500 w-[60%]"></div>
                                    <div className="h-full bg-emerald-400 w-[40%]"></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-2">
                                    <span className="flex items-center"><div className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></div> 地声 (60%)</span>
                                    <span className="flex items-center"><div className="w-2 h-2 bg-emerald-400 rounded-full mr-1"></div> 裏声 (40%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Piano Roll Placeholder (Could be an image or CSS grid later)
                        <div className="w-full h-32 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                            [ ピアノロール風の音域グラフを表示予定 ]
                        </div> */}
                    </div>
                </div>

                {/* RIGHT COLUMN (1/3) - Chart & Recommendations */}
                <div className="space-y-8">
                    {/* Radar Chart Card */}
                    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 self-start">歌唱力分析</h2>
                        <div className="w-full h-[250px] relative flex items-center justify-center bg-slate-50 rounded-lg">
                            {/* <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar
                    name="My Stats"
                    dataKey="A"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="#a78bfa"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer> */}
                            <div className="text-slate-400 text-sm text-center">
                                チャート表示エラー<br />(ライブラリ未インストール)
                            </div>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-3xl font-extrabold text-violet-500">A</span>
                            <span className="text-slate-400 text-sm ml-1">Rank</span>
                        </div>
                    </div>

                    {/* Recommended Songs Card */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h2 className="text-lg font-bold text-slate-700 mb-4">おすすめの曲</h2>
                        <div className="space-y-4">
                            {recommendedSongs.map((song, index) => (
                                <div key={index} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{song.title}</div>
                                            <div className="text-xs text-slate-500">{song.artist}</div>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md 
                    ${song.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-600' :
                                            song.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-rose-100 text-rose-600'}`}>
                                        {song.difficulty}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {/* <button className="w-full mt-6 py-2 text-sm text-blue-500 font-bold hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            もっと見る →
                        </button> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultPage;
