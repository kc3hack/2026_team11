# GCPメモリ不足の緊急対処法

## 症状
- 処理が異常に遅い
- メモリが解放されない
- リクエストがタイムアウトする

## 原因
5ワーカー設定でメモリ不足。各ワーカーがCREPE（500MB）+ Demucs（2GB）をロードするため、合計12.5GB以上必要。n1-standard-2 (7.5GB RAM)では不足。

---

## 🚨 即座に実行する対処法

### ステップ1: SSH接続
```bash
# ローカルマシンから
gcloud compute ssh pitchscout-gpu --zone=asia-northeast1-a
```

### ステップ2: 現状確認
```bash
# メモリ使用状況
free -h

# プロセス確認（メモリ順）
ps aux --sort=-%mem | head -20

# ワーカープロセス数
ps aux | grep uvicorn
```

### ステップ3: ワーカー数を2に減らす（緊急）
```bash
# 設定ファイルを編集
sudo nano /etc/supervisor/conf.d/pitchscout-backend.conf
```

**この行を変更**:
```ini
# 変更前
command=/opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 5

# 変更後
command=/opt/pitchscout/2026_team11/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

保存: `Ctrl+X` → `Y` → `Enter`

### ステップ4: 再起動
```bash
# 設定を再読み込み
sudo supervisorctl reread
sudo supervisorctl update

# 強制停止して再起動
sudo supervisorctl stop pitchscout-backend
sleep 3
sudo supervisorctl start pitchscout-backend

# 状態確認
sudo supervisorctl status
```

### ステップ5: メモリ解放確認
```bash
# メモリが解放されたか確認
free -h

# ワーカー数が2になっているか確認
ps aux | grep "uvicorn worker"
```

---

## 追加対処法

### A. 一時ファイルを削除（容量・メモリ解放）
```bash
# 古い音声ファイルを削除
find /opt/pitchscout/2026_team11/backend/uploads -type f -mtime +0 -delete
find /opt/pitchscout/2026_team11/backend/separated -type d -mindepth 1 -mtime +0 -exec rm -rf {} +

# 容量確認
df -h
```

### B. 不要なプロセスを停止
```bash
# 動いているサービスを確認
sudo supervisorctl status

# 不要なものがあれば停止（例）
# sudo supervisorctl stop other-service
```

### C. システムキャッシュをクリア（慎重に）
```bash
# ページキャッシュのみクリア（安全）
sudo sync; echo 1 | sudo tee /proc/sys/vm/drop_caches

# メモリ状況を再確認
free -h
```

---

## インスタンスを再起動する（最終手段）

すべて試してもダメな場合：

```bash
# ローカルマシンから
gcloud compute instances stop pitchscout-gpu --zone=asia-northeast1-a
sleep 10
gcloud compute instances start pitchscout-gpu --zone=asia-northeast1-a
```

起動後、再度SSH接続してワーカー数が2になっているか確認。

---

## 根本的な解決策（後で実施）

### 選択肢1: メモリ増強（推奨）
インスタンスタイプを変更：

```bash
# インスタンスを停止
gcloud compute instances stop pitchscout-gpu --zone=asia-northeast1-a

# マシンタイプを変更（7.5GB → 15GB RAM）
gcloud compute instances set-machine-type pitchscout-gpu \
    --machine-type n1-standard-4 \
    --zone=asia-northeast1-a

# 再起動
gcloud compute instances start pitchscout-gpu --zone=asia-northeast1-a
```

**費用**: 約2倍（月額$100 → $200程度）  
**効果**: 4-5ワーカーで安定動作

### 選択肢2: スワップ領域を追加（一時的）
```bash
# 4GBのスワップファイルを作成
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永続化
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 確認
free -h
```

**注意**: スワップは遅いため、処理速度が大幅に低下します。一時的な回避策としてのみ使用。

### 選択肢3: 非同期タスクキュー導入（本格的）
Celery + Redisでジョブキューを構築し、別のワーカーインスタンスで処理。

---

## 理想的な構成

### 小規模（10人/日以下）
- **インスタンス**: n1-standard-2 (2 vCPU, 7.5GB RAM)
- **ワーカー数**: 2
- **同時処理**: 2人まで

### 中規模（50人/日程度）
- **インスタンス**: n1-standard-4 (4 vCPU, 15GB RAM)
- **ワーカー数**: 4
- **同時処理**: 4人まで

### 大規模（100人/日以上）
- **インスタンス**: n1-standard-8 (8 vCPU, 30GB RAM)
- **ワーカー数**: 8
- **同時処理**: 8人まで

---

## 確認項目

- [ ] ワーカー数を2に変更した
- [ ] メモリ使用状況を確認した（`free -h`）
- [ ] プロセス数を確認した（`ps aux | grep uvicorn`）
- [ ] 一時ファイルを削除した
- [ ] バックエンドが正常起動している（`curl http://localhost:8000/health`）
- [ ] 外部からアクセスできる

## 問い合わせ
問題が解決しない場合は、以下の情報を共有してください：
- `free -h` の出力
- `ps aux --sort=-%mem | head -20` の出力
- `/var/log/pitchscout-backend.log` の最新エラー
