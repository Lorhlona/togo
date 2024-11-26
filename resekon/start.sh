#!/bin/bash

# エラーハンドリングの設定
set -e
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# 環境変数の設定
export LANG=ja_JP.UTF-8
export TZ=Asia/Tokyo

# ログファイルの設定
LOGDIR="/var/log/jma-receipt"
LOGFILE="$LOGDIR/weborca.log"
ERROR_LOGFILE="$LOGDIR/service_errors.log"

# エラーハンドリング関数
error_handler() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local func_trace=$5
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] エラー発生: コマンド '${last_command}' が終了コード ${exit_code} で失敗" >> "$ERROR_LOGFILE"
    echo "  発生場所: ${line_no}行目" >> "$ERROR_LOGFILE"
    echo "  関数トレース: ${func_trace}" >> "$ERROR_LOGFILE"
}

# ログ出力関数
log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "$LOGFILE"
}

# ディレクトリ作成関数
create_directory() {
    local dir=$1
    local owner=$2
    local mode=$3
    if [ ! -d "$dir" ]; then
        log "INFO" "${dir}を作成します"
        mkdir -p "$dir"
        chown "$owner" "$dir"
        chmod "$mode" "$dir"
    fi
}

# PostgreSQL起動確認関数
wait_for_postgresql() {
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h localhost -U postgres; then
            log "INFO" "PostgreSQL起動完了"
            return 0
        fi
        log "INFO" "PostgreSQL起動待機中... (${attempt}/${max_attempts})"
        sleep 2
        attempt=$((attempt + 1))
    done
    log "ERROR" "PostgreSQLの起動に失敗しました"
    return 1
}

# メイン処理開始
log "INFO" "サービス起動スクリプトを開始します"

# 必要なディレクトリの作成
create_directory "/tmp/weborca" "orca:orca" "755"
create_directory "/home/orca" "orca:orca" "755"
create_directory "$LOGDIR" "orca:orca" "755"
create_directory "/opt/jma/weborca/conf" "orca:orca" "755"

# ログファイルの初期化
touch "$LOGFILE" "$ERROR_LOGFILE"
chown orca:orca "$LOGFILE" "$ERROR_LOGFILE"
chmod 644 "$LOGFILE" "$ERROR_LOGFILE"

# サービスの有効化
log "INFO" "サービスを有効化します"
systemctl enable postgresql
systemctl enable jma-receipt-weborca

# PostgreSQLの起動
log "INFO" "PostgreSQLを起動します"
systemctl start postgresql
wait_for_postgresql

# データベースとユーザーの設定
if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='orca'\"" | grep -q 1; then
    log "INFO" "ORCAデータベースを作成します"
    su - postgres -c "createuser -S -D -R orca"
    su - postgres -c "createdb -O orca orca -E UTF8 -T template0"
    su - postgres -c "psql -c \"ALTER USER orca WITH PASSWORD 'Syunikiss501';\""
    log "INFO" "データベース作成完了"
fi

# WebORCA設定ファイルの確認
if [ ! -f /opt/jma/weborca/conf/jma-receipt.conf ]; then
    log "INFO" "WebORCA設定ファイルを作成します"
    cat > /opt/jma/weborca/conf/jma-receipt.conf << EOF
DBNAME=orca
DBUSER=orca
DBHOST=localhost
DBPASS=Syunikiss501
PORT=8000
LOGDIR=/var/log/jma-receipt
USERDIR=/home/orca
ORCAUSER=orca
ORCAGROUP=orca
EOF
    chown orca:orca /opt/jma/weborca/conf/jma-receipt.conf
    chmod 644 /opt/jma/weborca/conf/jma-receipt.conf
fi

# WebORCAの初期設定
if [ ! -f /var/lib/jma-receipt/.initialized ]; then
    log "INFO" "WebORCAの初期設定を実行します"
    sudo -u orca /usr/lib/jma-receipt/bin/jma-receipt-db-setup.sh || true
    sudo -u orca /usr/lib/jma-receipt/bin/jma-receipt-program-upgrade.sh || true
    touch /var/lib/jma-receipt/.initialized
    chown orca:orca /var/lib/jma-receipt/.initialized
    log "INFO" "初期設定完了"
fi

# WebORCAサービスの起動
log "INFO" "WebORCAサービスを起動します"
systemctl start jma-receipt-weborca

log "INFO" "全てのサービスが起動しました"

# サービスの状態を監視
while true; do
    if ! systemctl is-active --quiet postgresql; then
        log "WARNING" "PostgreSQLが停止しています。再起動を試みます"
        systemctl restart postgresql
        sleep 5
    fi
    
    if ! systemctl is-active --quiet jma-receipt-weborca; then
        log "WARNING" "WebORCAが停止しています。再起動を試みます"
        systemctl restart jma-receipt-weborca
        sleep 5
    fi
    
    # ログファイルの権限を確認
    if [ ! -O "$LOGFILE" ]; then
        chown orca:orca "$LOGFILE"
        chmod 644 "$LOGFILE"
    fi
    
    sleep 30
done
