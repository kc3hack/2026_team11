import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000" });

export async function analyzeVoice(audioBlob: Blob) {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  const res = await API.post("/analyze", form);
  return res.data;
}