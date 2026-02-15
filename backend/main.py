from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from analyzer import VoiceAnalyzer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = VoiceAnalyzer()


@app.post("/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    """録音データを受け取って音域を解析する"""
    
    # 一時ファイルに保存
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = analyzer.analyze(tmp_path)
        return result
    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok"}