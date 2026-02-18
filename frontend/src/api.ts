import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 300000,  // 5分タイムアウト（Demucsは時間がかかる）
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
export const getSongs = async (limit: number = 20, offset: number = 0) => {
  const res = await API.get("/songs", { params: { limit, offset } });
  return res.data;
};