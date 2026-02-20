command=/opt/pitchscout/2026_team11/backend/venv/bin/python3.11 -u /opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 5# GCPでワーカー数を変更する手順

複数ユーザーの同時リクエストに対応するため、Uvicornのワーカー数を増やす手順です。

## 所要時間
約5分

## 手順

### 1. GCPインスタンスにSSH接続

```bash
# ローカルマシンから実行
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a
```

### 2. Supervisor設定を編集

```bash
# 設定ファイルを開く
sudo nano /etc/supervisor/conf.d/pitchscout-backend.conf
```

### 3. commandの行を変更

変更前：
```ini
command=/opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

変更後：
```ini
command=/opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

保存: `Ctrl + X` → `Y` → `Enter`

### 4. 設定を反映して再起動

```bash
# 設定を再読み込み
sudo supervisorctl reread
sudo supervisorctl update

# バックエンドを再起動
sudo supervisorctl restart pitchscout-backend

# 起動確認
sudo supervisorctl status
```

期待される出力：
```
pitchscout-backend               RUNNING   pid 12345, uptime 0:00:05
```

### 5. 動作確認

```bash
# ヘルスチェック
curl http://localhost:8000/health

# ワーカープロセス数を確認（4つ以上表示されればOK）
ps aux | grep "uvicorn worker"
```

## ワーカー数の推奨値

| インスタンスタイプ | CPUコア数 | 推奨ワーカー数 |
|------------------|----------|---------------|
| n1-standard-2    | 2 vCPU   | 4-5           |
| n1-standard-4    | 4 vCPU   | 8-9           |
| n1-standard-8    | 8 vCPU   | 16-17         |

**計算式**: `(CPUコア数 × 2) + 1`

## トラブルシューティング

### メモリ不足エラーが出る場合

各ワーカーが機械学習モデルをロードするため、メモリ消費が増加します。

```bash
# メモリ使用状況を確認
free -h

# メモリ不足の場合はワーカー数を減らす
# 例: --workers 3 または --workers 2
sudo nano /etc/supervisor/conf.d/pitchscout-backend.conf
sudo supervisorctl restart pitchscout-backend
```

### バックエンドが起動しない場合

```bash
# ログを確認
sudo tail -f /var/log/pitchscout-backend.log

# 手動起動テスト
cd /opt/pitchscout/2026_team11/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 効果の確認

複数のユーザーが同時にアップロードしても、各リクエストが別々のワーカープロセスで処理されるため、待ち時間が大幅に削減されます。

**変更前**:
- ユーザーA: 分析中（2分）
- ユーザーB: 待機中...
- ユーザーC: 待機中...

**変更後（4ワーカー）**:
- ユーザーA: 分析中（2分）
- ユーザーB: 分析中（2分） ← 並列処理
- ユーザーC: 分析中（2分） ← 並列処理
- ユーザーD: 分析中（2分） ← 並列処理

## 関連ドキュメント

- [GCP_DEPLOYMENT.md](../GCP_DEPLOYMENT.md#9-運用メンテナンス) - フルデプロイ手順
- [README.md](../README.md) - プロジェクト概要
