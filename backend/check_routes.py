#!/usr/bin/env python3
"""
8000番で動いているのがこのプロジェクトのAPIかどうか確認するスクリプト。
使い方: python3 check_routes.py
"""
import urllib.request
import sys

BASE = "http://127.0.0.1:8000"

def get(path):
    try:
        req = urllib.request.Request(BASE + path)
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.getcode(), r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return None, str(e)

def main():
    print("=== 8000番のサーバー診断 ===\n")

    code, body = get("/health")
    if code == 200 and body and "ok" in body:
        print("✅ /health → 200 OK（このプロジェクトのAPIの可能性が高い）")
    elif code == 404:
        print("❌ /health → 404")
        print("   → 8000番で動いているのはこのプロジェクトの backend ではありません。")
        print("   対処: 8000番のプロセスを止めて、cd backend から uvicorn main:app --reload --port 8000 で起動し直してください。")
        sys.exit(1)
    else:
        print(f"⚠️ /health → {code} {body or ''}")
        print("   → サーバーが止まっているか、別のアプリが動いています。")
        sys.exit(1)

    for path in ["/artists", "/favorite-artists", "/favorites"]:
        code, _ = get(path)
        if code == 404:
            print(f"❌ {path} → 404（ルートがありません）")
        elif code in (200, 401):
            print(f"✅ {path} → {code}")
        else:
            print(f"⚠️ {path} → {code}")

    if code != 200 or any(get(p)[0] == 404 for p in ["/artists", "/favorite-artists", "/favorites"]):
        print("\n⚠️ 結論: 8000番で動いているのはこのプロジェクトの backend ではありません。")
        print("   別のプロセス（別プロジェクトのサーバーや古いプロセス）が 8000 を使っています。")
        print("\n対処:")
        print("  1. 8000番のプロセスを止める:  lsof -i :8000  で確認 → kill <PID>")
        print("  2. このプロジェクトのバックエンドを起動:")
        print("     cd backend")
        print("     uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        print("  3. 再度このスクリプトを実行して全て ✅ になることを確認")
        sys.exit(1)
    print("\n以上で問題なければ、フロントから再度アクセスしてみてください。")

if __name__ == "__main__":
    main()
