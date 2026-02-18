import axios from "axios";

// タイムアウト設定: 5分 (300秒)
// Demucsのボーカル分離は2-4分かかることがあります
const TIMEOUT_MS = 300000;

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: TIMEOUT_MS,
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

// 楽曲取得
export const getSongs = async (limit: number = 20, offset: number = 0, query: string = "") => {
  const params: any = { limit, offset };
  if (query) params.q = query;
  const res = await API.get("/songs", { params });
  return res.data;
};