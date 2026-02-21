import axios from "axios";
import { supabase } from "./supabaseClient";

const TIMEOUT_MS = 600000; // 10分

// 本番環境では /api を使用、開発環境では localhost:8000 を使用
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === "production" ? "/api" : "http://127.0.0.1:8000"),
  timeout: TIMEOUT_MS,
});

// 認証が必要なパス（トークン未取得時に短い待機して再取得する対象）
const AUTH_PATHS = ["/favorites", "/favorite-artists", "/analysis", "/recommend"];

// Supabaseのセッショントークンを自動でAuthorizationヘッダーに付与
API.interceptors.request.use(async (config) => {
  if (!supabase) return config;
  const client = supabase;

  const tryAttachToken = async (): Promise<string | null> => {
    try {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Refresh Token") || msg.includes("refresh_token")) {
        await client.auth.signOut();
      }
      return null;
    }
  };

  try {
    let token = await tryAttachToken();
    const url = config.url ?? "";
    const needsAuth = AUTH_PATHS.some((p) => url.includes(p));
    // 認証系パスでトークンが無い場合のみ、短く待って1回だけ再取得（認証復元のタイミングずれ対策）
    if (!token && needsAuth) {
      await new Promise((r) => setTimeout(r, 80));
      token = await tryAttachToken();
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {
    // 付与失敗時はそのまま送信（バックエンドで 401）
  }
  return config;
});

// 401 のときはリフレッシュを1回試してリトライ。リトライ後も 401 またはリフレッシュ失敗時はログアウトする
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err?.config;
    if (err?.response?.status === 401 && supabase && config && !(config as { _retried?: boolean })._retried) {
      (config as { _retried?: boolean })._retried = true;
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data.session?.access_token) {
          config.headers.Authorization = `Bearer ${data.session.access_token}`;
          return API.request(config);
        }
      } catch (_) {
        // リフレッシュ失敗時はログアウト
      }
    }
    if (err?.response?.status === 401 && supabase) {
      await supabase.auth.signOut();
    }
    return Promise.reject(err);
  }
);

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
  artist_slug?: string;
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

// お気に入り楽曲
export interface FavoriteSong {
  favorite_id: string;
  song_id: number;
  title: string;
  artist: string | null;
  lowest_note: string | null;
  highest_note: string | null;
  falsetto_note: string | null;
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

/** 統合音域情報（直近N件の分析から算出） */
export interface IntegratedVocalRange {
  overall_min?: string;
  overall_max?: string;
  overall_min_hz?: number;
  overall_max_hz?: number;
  chest_min?: string;
  chest_max?: string;
  chest_min_hz?: number;
  chest_max_hz?: number;
  falsetto_max?: string;
  falsetto_max_hz?: number;
  chest_ratio?: number;
  falsetto_ratio?: number;
  data_count: number;  // 統合に使用したデータ件数
  limit: number;       // 取得を試みた件数
  singing_analysis?: SingingAnalysis;
  voice_type?: VoiceType;
  recommended_songs?: RecommendedSong[];
  similar_artists?: SimilarArtist[];
}

// ── API 関数 ──────────────────────────────────────────

/** マイク録音用 */
export const analyzeVoice = async (blob: Blob, noFalsetto: boolean = false): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  if (noFalsetto) formData.append("no_falsetto", "true");
  const res = await API.post<AnalysisResult>("/analyze", formData);
  return res.data;
};

/** カラオケ音源用 */
export const analyzeKaraoke = async (
  file: File | Blob,
  filename: string,
  noFalsetto: boolean = false,
): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("file", file, filename);
  if (noFalsetto) formData.append("no_falsetto", "true");
  const res = await API.post<AnalysisResult>("/analyze-karaoke", formData);
  return res.data;
};

/** 楽曲検索レスポンス */
export interface SongsResponse {
  songs: Song[];
  total: number;
}

/** 楽曲取得 */
export const getSongs = async (
  limit: number = 20,
  offset: number = 0,
  query: string = "",
  userRange?: UserRange | null,
): Promise<SongsResponse> => {
  const params: Record<string, any> = { limit, offset };
  if (query) params.q = query;
  if (userRange) {
    params.chest_min_hz = userRange.chest_min_hz;
    params.chest_max_hz = userRange.chest_max_hz;
    if (userRange.falsetto_max_hz) {
      params.falsetto_max_hz = userRange.falsetto_max_hz;
    }
  }
  const res = await API.get<SongsResponse>("/songs", { params });
  return res.data;
};

/** アーティスト型 */
export interface Artist {
  id: number;
  name: string;
  slug: string;
  song_count: number;
  reading: string;
}

/** アーティスト一覧レスポンス */
export interface ArtistsResponse {
  artists: Artist[];
  total: number;
}

/** アーティスト一覧取得（ページネーション対応） */
export const getArtists = async (
  limit: number = 10,
  offset: number = 0,
  query: string = "",
): Promise<ArtistsResponse> => {
  const params: Record<string, any> = { limit, offset };
  if (query) params.q = query;
  const res = await API.get<ArtistsResponse>("/artists", { params });
  return res.data;
};

/** 特定アーティストの楽曲一覧取得 */
export const getArtistSongs = async (
  artistId: number,
  userRange?: UserRange | null,
): Promise<Song[]> => {
  const params: Record<string, any> = {};
  if (userRange) {
    params.chest_min_hz = userRange.chest_min_hz;
    params.chest_max_hz = userRange.chest_max_hz;
    if (userRange.falsetto_max_hz) {
      params.falsetto_max_hz = userRange.falsetto_max_hz;
    }
  }
  const res = await API.get<Song[]>(`/artists/${artistId}/songs`, { params });
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

// ── お気に入り楽曲 API ─────────────────────────────────

/** お気に入り楽曲一覧取得 */
export const getFavorites = async (limit = 100): Promise<FavoriteSong[]> => {
  const res = await API.get("/favorites", { params: { limit } });
  return res.data;
};

/** お気に入り楽曲追加 */
export const addFavorite = async (songId: number) => {
  const res = await API.post("/favorites", { song_id: songId });
  return res.data;
};

/** お気に入り楽曲削除 */
export const removeFavorite = async (songId: number) => {
  await API.delete(`/favorites/${songId}`);
};

/** お気に入り楽曲チェック */
export const checkFavorite = async (songId: number): Promise<boolean> => {
  const res = await API.get(`/favorites/check/${songId}`);
  return res.data.is_favorite;
};

export interface AnalysisHistoryRecord {
  id: string;
  user_id: string;
  vocal_range_min: string | null;
  vocal_range_max: string | null;
  falsetto_max: string | null;
  source_type: string;
  file_name: string | null;
  created_at: string;
  result_json?: AnalysisResult | null;
}

// 履歴取得API
export const getAnalysisHistory = async (limit = 50): Promise<AnalysisHistoryRecord[]> => {
  const res = await API.get<AnalysisHistoryRecord[]>("/analysis/history", { params: { limit } });
  return res.data;
};

/** 履歴削除API */
export const deleteAnalysisHistory = async (recordId: string): Promise<{ message: string }> => {
  const res = await API.delete(`/analysis/history/${recordId}`);
  return res.data;
};
/** 統合音域取得API（直近N件から計算） */
export const getIntegratedVocalRange = async (limit = 20): Promise<IntegratedVocalRange> => {
  const res = await API.get<IntegratedVocalRange>("/analysis/integrated-range", { params: { limit } });
  return res.data;
};
