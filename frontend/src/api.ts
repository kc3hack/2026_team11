import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
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