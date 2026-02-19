import axios from "axios";
import { supabase } from "./supabaseClient";

// タイムアウト設定: 5分 (300秒)
// Demucsのボーカル分離は2-4分かかることがあります
const TIMEOUT_MS = 300000;

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: TIMEOUT_MS,
});

// Supabaseのセッショントークンを自動でAuthorizationヘッダーに付与
API.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// マイク録音用
export const analyzeVoice = async (blob: Blob) => {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  const res = await API.post("/analyze", formData);
  return res.data;
};

// カラオケ音源用
export const analyzeKaraoke = async (file: File | Blob, filename: string) => {
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await API.post("/analyze-karaoke", formData);
  return res.data;
};

// ユーザーの音域情報（キーおすすめ用）
export interface UserRange {
  chest_min_hz: number;
  chest_max_hz: number;
  falsetto_max_hz?: number;
}

// 楽曲取得（音域指定でキーおすすめ付き）
export const getSongs = async (
  limit: number = 20,
  offset: number = 0,
  query: string = "",
  userRange?: UserRange | null,
) => {
  const params: any = { limit, offset };
  if (query) params.q = query;
  if (userRange) {
    params.chest_min_hz = userRange.chest_min_hz;
    params.chest_max_hz = userRange.chest_max_hz;
    if (userRange.falsetto_max_hz) {
      params.falsetto_max_hz = userRange.falsetto_max_hz;
    }
  }
  const res = await API.get("/songs", { params });
  return res.data;
};
