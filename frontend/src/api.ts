import axios from "axios";

const TIMEOUT_MS = 300000; // 5分

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: TIMEOUT_MS,
});

/**
 * リクエストインターセプター
 * 全てのリクエストのヘッダーに Authorization: Bearer <トークン> を自動付与します
 */
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 型定義 ────────────────────────────────────────────

export interface SingingAnalysis {
  overall_score: number;
  range_score: number;
  range_semitones: number;
  stability_score: number;
  expression_score: number;
}

export interface VoiceType {
  voice_type?: string;
  range_class?: string;
  description?: string;
}

export interface RecommendedSong {
  id: number;
  title: string;
  artist: string;
  lowest_note: string | null;
  highest_note: string | null;
  match_score: number;
  recommended_key?: number;
  fit?: string;
}

export interface SimilarArtist {
  id: number;
  name: string;
  typical_lowest: string;
  typical_highest: string;
  similarity_score: number;
}

export interface Song {
  id: number;
  artist_id: number;
  title: string;
  artist: string;
  artist_reading?: string;
  lowest_note: string | null;
  highest_note: string | null;
  falsetto_note: string | null;
  note: string | null;
  source: string;
  recommended_key?: number;
  fit?: string;
}

export interface FavoriteArtist {
  id: string;
  artist_id: number;
  artist_name: string;
  created_at: string;
}

/**
 * 解析結果の全体型
 * ResultView.tsx や AnalysisResultPage.tsx で必要な全フィールドを網羅
 */
export interface AnalysisResult {
  overall_min: string;
  overall_max: string;
  overall_min_hz: number;
  overall_max_hz: number;
  
  // 地声詳細
  chest_min?: string;
  chest_max?: string;
  chest_min_hz?: number;
  chest_max_hz?: number;
  chest_count?: number; 
  chest_ratio?: number;
  
  // 裏声詳細
  falsetto_min?: string;
  falsetto_max?: string;
  falsetto_min_hz?: number;
  falsetto_max_hz?: number;
  falsetto_count?: number;
  falsetto_ratio?: number;
  
  singing_analysis?: SingingAnalysis;
  voice_type?: VoiceType;
  recommended_songs?: RecommendedSong[];
  similar_artists?: SimilarArtist[];
  error?: string;
}

/** ユーザーの音域情報（キーおすすめ用） */
export interface UserRange {
  chest_min_hz: number;
  chest_max_hz: number;
  falsetto_max_hz?: number;
}

// ── API 関数 ──────────────────────────────────────────

/** マイク録音用 */
export const analyzeVoice = async (blob: Blob): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  const res = await API.post<AnalysisResult>("/analyze", formData);
  return res.data;
};

/** カラオケ音源用 */
export const analyzeKaraoke = async (
  file: File | Blob,
  filename: string,
): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await API.post<AnalysisResult>("/analyze-karaoke", formData);
  return res.data;
};

/** 楽曲取得 */
export const getSongs = async (
  limit: number = 20,
  offset: number = 0,
  query: string = "",
  userRange?: UserRange | null,
): Promise<Song[]> => {
  const params: Record<string, any> = { limit, offset };
  if (query) params.q = query;
  if (userRange) {
    params.chest_min_hz = userRange.chest_min_hz;
    params.chest_max_hz = userRange.chest_max_hz;
    if (userRange.falsetto_max_hz) {
      params.falsetto_max_hz = userRange.falsetto_max_hz;
    }
  }
  const res = await API.get<Song[]>("/songs", { params });
  return res.data;
};

/** お気に入りアーティスト一覧取得 */
export const getFavoriteArtists = async (): Promise<FavoriteArtist[]> => {
  const res = await API.get<FavoriteArtist[]>("/favorite-artists");
  return res.data;
};

/** お気に入りアーティスト追加 */
export const addFavoriteArtist = async (artistId: number, artistName: string): Promise<FavoriteArtist> => {
  const res = await API.post<FavoriteArtist>("/favorite-artists", {
    artist_id: artistId,
    artist_name: artistName,
  });
  return res.data;
};

/** お気に入りアーティスト削除 */
export const removeFavoriteArtist = async (artistId: number): Promise<{ message: string }> => {
  const res = await API.delete<{ message: string }>(`/favorite-artists/${artistId}`);
  return res.data;
};