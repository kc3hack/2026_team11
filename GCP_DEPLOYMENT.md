# GCPデプロイ手順 - ピッチスカウト

> Google Cloud Platform への本番環境デプロイガイド

**所要時間**: 60-90分  
**前提**: GCPアカウント・クレジット利用可能

---

## 📋 目次

1. [事前準備](#1-事前準備)
2. [GCPプロジェクトのセットアップ](#2-gcpプロジェクトのセットアップ)
3. [Compute Engine（GPU）のセットアップ](#3-compute-enginegpuのセットアップ)
4. [バックエンドのデプロイ](#4-バックエンドのデプロイ)
5. [フロントエンドのデプロイ](#5-フロントエンドのデプロイ)
6. [ドメイン・SSL設定](#6-ドメインssl設定)
7. [コスト管理](#7-コスト管理)

---

## 1. 事前準備

### 1.1 必要なもの

- [x] GCPアカウント（クレジット4万円利用可能）
- [x] Supabaseプロジェクト（[QUICKSTART.md](QUICKSTART.md#2-supabaseプロジェクトの準備) 参照）
- [x] ドメイン（オプション。なくてもIPアドレスで動作確認可能）
- [x] ローカルに gcloud CLI インストール

### 1.2 gcloud CLI のインストール

```bash
# macOS
brew install --cask google-cloud-sdk

# 初期化
gcloud init
gcloud auth login
```

---

## 2. GCPプロジェクトのセットアップ

### 2.1 プロジェクト作成

```bash
# プロジェクトIDを決める（ユニークである必要がある）
export PROJECT_ID="pitchscout-prod"
export REGION="asia-northeast1"  # 東京リージョン

# プロジェクト作成
gcloud projects create $PROJECT_ID --name="PitchScout Production"

# プロジェクトを選択
gcloud config set project $PROJECT_ID

# 課金アカウントの確認（クレジットがあるアカウントを使用）
gcloud billing accounts list

# 課金を有効化（BILLING_ACCOUNT_IDは上記コマンドで確認したID）
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2.2 必要なAPIの有効化

```bash
# Compute Engine API
gcloud services enable compute.googleapis.com

# その他必要なAPI
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    servicenetworking.googleapis.com \
    dns.googleapis.com
```

---

## 3. Compute Engine（GPU）のセットアップ

### 3.1 GPUクォータの確認・増加申請

GPUインスタンスはデフォルトでクォータ0の場合があります。

```bash
# 現在のクォータ確認
gcloud compute project-info describe --project=$PROJECT_ID

# GCPコンソールで確認・申請
# https://console.cloud.google.com/iam-admin/quotas
# 「GPUs (all regions)」を検索して、1以上に増加申請
```

**注意**: クォータ増加には数時間〜1日かかる場合があります。

### 3.2 ファイアウォールルールの作成

```bash
# HTTP/HTTPS/SSH を許可
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server

gcloud compute firewall-rules create allow-backend \
    --allow tcp:8000 \
    --source-ranges 0.0.0.0/0 \
    --target-tags backend-server
```

### 3.3 Compute Engine インスタンスの作成

#### パターンA: GPU付きインスタンス（推奨）

```bash
# インスタンス作成（n2-standard-2 + NVIDIA T4）
gcloud compute instances create pitchscout-gpu \
    --zone=asia-northeast1-a \
    --machine-type=n2-standard-2 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --maintenance-policy=TERMINATE \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-balanced \
    --tags=http-server,https-server,backend-server \
    --metadata=startup-script='#!/bin/bash
# GPU ドライバーのインストール
curl -O https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
dpkg -i cuda-keyring_1.1-1_all.deb
apt-get update
apt-get install -y cuda-drivers
'
```

#### パターンB: CPUのみインスタンス（コスト削減）

```bash
# GPU不要の場合（処理は遅くなる）
gcloud compute instances create pitchscout-cpu \
    --zone=asia-northeast1-a \
    --machine-type=n2-standard-2 \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-balanced \
    --tags=http-server,https-server,backend-server
```

### 3.4 静的IPアドレスの予約（オプション）

```bash
# 外部IPを予約
gcloud compute addresses create pitchscout-ip --region=$REGION

# 予約したIPを確認
gcloud compute addresses describe pitchscout-ip --region=$REGION
```

---

## 4. バックエンドのデプロイ

### 4.1 インスタンスにSSH接続

```bash
# SSH接続
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a
```

以降はインスタンス内での作業です。

### 4.2 システムパッケージのインストール

```bash
# システム更新
sudo apt-get update
sudo apt-get upgrade -y

# 必要なパッケージ
sudo apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    build-essential \
    nginx \
    supervisor \
    git
```

### 4.3 リポジトリのクローン

```bash
# 作業ディレクトリ作成
sudo mkdir -p /opt/pitchscout
sudo chown $USER:$USER /opt/pitchscout
cd /opt/pitchscout

# リポジトリクローン
git clone https://github.com/your-org/2026_team11.git
cd 2026_team11
```

### 4.4 Python環境のセットアップ

```bash
cd /opt/pitchscout/2026_team11/backend

# 仮想環境作成
python3.11 -m venv venv
source venv/bin/activate

# 依存関係インストール
pip install --upgrade pip
pip install -r requirements.txt

# GPU版PyTorch（GPUインスタンスの場合）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### 4.5 環境変数の設定

```bash
cd /opt/pitchscout/2026_team11/backend
cp .env.example .env
nano .env
```

`.env` を編集:

```env
# Supabase設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret（強力なランダム文字列を生成）
JWT_SECRET=your-super-secure-random-jwt-secret-change-this

# 環境
ENVIRONMENT=production
```

JWT_SECRETの生成:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 4.6 動作テスト

```bash
cd /opt/pitchscout/2026_team11/backend
source venv/bin/activate

# テスト起動
uvicorn main:app --host 0.0.0.0 --port 8000

# 別ターミナルでテスト
curl http://localhost:8000/health
# 期待: {"status":"ok"}
```

Ctrl+C で停止

### 4.7 Supervisorによる自動起動設定

```bash
sudo nano /etc/supervisor/conf.d/pitchscout-backend.conf
```

設定内容:

```ini
[program:pitchscout-backend]
git command=/opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
directory=/opt/pitchscout/2026_team11/backend
user=YOUR_USERNAME
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/pitchscout-backend.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
environment=PATH="/opt/pitchscout/2026_team11/backend/venv/bin"
```

**注意**: `YOUR_USERNAME` を実際のユーザー名に置き換えてください（`whoami` で確認）

起動:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start pitchscout-backend
sudo supervisorctl status
```

---

## 5. フロントエンドのデプロイ

### 5.1 Node.jsのインストール（インスタンス内）

```bash
# Node.jsのインストール（nvm使用）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 5.2 環境変数の設定

```bash
cd /opt/pitchscout/2026_team11/frontend
cp .env.example .env.production
nano .env.production
```

`.env.production` を編集:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_API_URL=http://YOUR_EXTERNAL_IP:8000
```

**重要**: `YOUR_EXTERNAL_IP` をインスタンスの外部IPアドレスに置き換えてください。

外部IPの確認:

```bash
curl ifconfig.me
```

### 5.3 api.ts の本番環境設定

```bash
nano /opt/pitchscout/2026_team11/frontend/src/api.ts
```

以下のように編集（baseURLを本番環境に変更）:

```typescript
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://YOUR_EXTERNAL_IP:8000",
  timeout: TIMEOUT_MS,
});
```

### 5.4 ビルド

```bash
cd /opt/pitchscout/2026_team11/frontend

# 依存関係インストール
npm install

# プロダクションビルド
npm run build

# ビルド確認
ls -la build/
```

### 5.5 Nginxの設定

```bash
sudo nano /etc/nginx/sites-available/pitchscout
```

設定内容:

```nginx
# フロントエンド
server {
    listen 80 default_server;
    server_name _;

    root /opt/pitchscout/2026_team11/frontend/build;
    index index.html;

    # React Router対応
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静的ファイルのキャッシュ
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # gzip圧縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# バックエンドAPI（ポート8000をプロキシ）
server {
    listen 8000;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # タイムアウト設定（音声処理用）
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

有効化:

```bash
# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 新設定を有効化
sudo ln -s /etc/nginx/sites-available/pitchscout /etc/nginx/sites-enabled/

# 設定チェック
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 6. ドメイン・SSL設定

### 6.1 ドメインのDNS設定（ドメイン保有時）

お名前.com / Cloudflare / Route 53 などで、Aレコードを設定:

```
タイプ: A
名前: @ または pitchscout
値: YOUR_EXTERNAL_IP（インスタンスの外部IP）
TTL: 3600
```

APIサブドメインも設定（オプション）:

```
タイプ: A
名前: api
値: YOUR_EXTERNAL_IP
TTL: 3600
```

### 6.2 SSL証明書の取得（Let's Encrypt）

**ドメインがある場合**:

```bash
# Certbotインストール
sudo apt-get install -y certbot python3-certbot-nginx

# SSL証明書取得（your-domain.com を実際のドメインに置き換え）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新のテスト
sudo certbot renew --dry-run
```

**ドメインがない場合**:

- HTTPのみで運用（開発・検証用）
- IPアドレスでアクセス: `http://YOUR_EXTERNAL_IP`

---

## 7. コスト管理

### 7.1 予算アラートの設定

```bash
# GCPコンソールで設定
# https://console.cloud.google.com/billing/budgets
```

推奨設定:

- **月次予算**: 30,000円
- **アラート**: 50%, 80%, 100%で通知

### 7.2 コスト最適化のTips

#### 夜間停止スケジュール（コスト50%削減）

```bash
# 停止スクリプト（午前2時）
gcloud compute instances stop pitchscout-gpu \
    --zone=asia-northeast1-a

# 起動スクリプト（午前10時）
gcloud compute instances start pitchscout-gpu \
    --zone=asia-northeast1-a
```

Cloud Schedulerで自動化:

```bash
# 停止（午前2時・JST）
gcloud scheduler jobs create compute stop-pitchscout \
    --schedule="0 2 * * *" \
    --time-zone="Asia/Tokyo" \
    --location=$REGION \
    --action=stop \
    --target-instance=pitchscout-gpu \
    --target-instance-zone=asia-northeast1-a

# 起動（午前10時・JST）
gcloud scheduler jobs create compute start-pitchscout \
    --schedule="0 10 * * *" \
    --time-zone="Asia/Tokyo" \
    --location=$REGION \
    --action=start \
    --target-instance=pitchscout-gpu \
    --target-instance-zone=asia-northeast1-a
```

#### プリエンプティブルVM（最大70%削減）

```bash
# プリエンプティブル版のインスタンス作成
gcloud compute instances create pitchscout-preemptible \
    --zone=asia-northeast1-a \
    --machine-type=n2-standard-2 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --maintenance-policy=TERMINATE \
    --preemptible \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --tags=http-server,https-server,backend-server
```

**注意**: 24時間以内に停止される可能性があります。

### 7.3 月額コスト見積もり（クレジット消費）

| 構成 | 月額（目安） | 4万円で何ヶ月 |
|------|-------------|--------------|
| GPU常時稼働 | ¥39,000 | 約1ヶ月 |
| GPU夜間停止（12h/日） | ¥24,000 | 約1.7ヶ月 |
| GPUプリエンプティブル | ¥12,000 | 約3.3ヶ月 |
| CPUのみ | ¥8,000 | 約5ヶ月 |

**推奨**: 夜間停止で運用して、クレジット残高を見ながら調整

---

## 8. デプロイ後の確認

### 8.1 動作確認

```bash
# バックエンドヘルスチェック
curl http://YOUR_EXTERNAL_IP:8000/health
# 期待: {"status":"ok"}

# フロントエンドアクセス
curl -I http://YOUR_EXTERNAL_IP
# 期待: HTTP/1.1 200 OK
```

ブラウザで `http://YOUR_EXTERNAL_IP` にアクセスして動作確認。

### 8.2 GPU動作確認（GPUインスタンスの場合）

```bash
# SSH接続
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a

# GPU確認
nvidia-smi

# PyTorchからGPU確認
python3 -c "import torch; print(torch.cuda.is_available())"
# 期待: True
```

### 8.3 ログ確認

```bash
# バックエンドログ
sudo tail -f /var/log/pitchscout-backend.log

# Nginxログ
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 9. 運用メンテナンス

### 9.1 アップデート手順

```bash
# SSH接続
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a

# 最新コード取得
cd /opt/pitchscout/2026_team11
git pull origin main

# バックエンド更新
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart pitchscout-backend

# フロントエンド更新
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

### 9.2 一時ファイルのクリーンアップ

```bash
# cronで毎日実行
crontab -e
```

追加:

```cron
# 毎日午前3時に24時間以上前のファイルを削除
0 3 * * * find /opt/pitchscout/2026_team11/backend/uploads -type f -mtime +1 -delete
0 3 * * * find /opt/pitchscout/2026_team11/backend/separated -type f -mtime +1 -delete
```

### 9.3 バックアップ

```bash
# データベース（SQLite）のバックアップ
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a

# バックアップディレクトリ作成
mkdir -p ~/backups

# 手動バックアップ
cp /opt/pitchscout/2026_team11/backend/songs.db ~/backups/songs_$(date +%Y%m%d).db
```

---

## 10. トラブルシューティング

### 問題: GPUが認識されない

```bash
# ドライバーインストール確認
nvidia-smi

# エラーが出る場合、ドライバー再インストール
sudo apt-get install -y cuda-drivers
sudo reboot
```

### 問題: Supervisorが起動しない

```bash
# ログ確認
sudo tail -f /var/log/pitchscout-backend.log

# 手動起動テスト
cd /opt/pitchscout/2026_team11/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 問題: 502 Bad Gateway

```bash
# バックエンドが起動しているか確認
sudo supervisorctl status pitchscout-backend

# 起動していない場合
sudo supervisorctl start pitchscout-backend
```

### 問題: クォータ不足

```bash
# クォータ確認
gcloud compute project-info describe --project=$PROJECT_ID

# GCPコンソールで増加申請
# https://console.cloud.google.com/iam-admin/quotas
```

---

## 11. チェックリスト

### デプロイ前

- [ ] GCPプロジェクト作成完了
- [ ] 課金・クレジット有効化完了
- [ ] GPUクォータ確認・申請（必要に応じて）
- [ ] Supabaseプロジェクト作成完了
- [ ] `.env` ファイル準備完了

### デプロイ後

- [ ] Compute Engineインスタンス起動確認
- [ ] バックエンドヘルスチェックOK
- [ ] フロントエンドアクセスOK
- [ ] GPU認識確認（GPUインスタンスの場合）
- [ ] ユーザー登録・ログイン動作確認
- [ ] 音声分析動作確認
- [ ] 楽曲検索動作確認
- [ ] Supervisor自動起動確認
- [ ] 予算アラート設定完了

---

## 12. サポート・参考資料

- **GCP公式ドキュメント**: <https://cloud.google.com/docs>
- **Compute Engine GPU**: <https://cloud.google.com/compute/docs/gpus>
- **詳細デプロイガイド**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **クイックスタート**: [QUICKSTART.md](QUICKSTART.md)
- **GitHub Issues**: <https://github.com/your-org/2026_team11/issues>

---

**最終更新**: 2026年2月20日
