#!/usr/bin/env python3
import os
import sys

# バックエンドディレクトリに移動
os.chdir('/Users/miii/Project/2026_team11/backend')
sys.path.insert(0, '/Users/miii/Project/2026_team11/backend')

# uvicorn を実行
import uvicorn
uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
