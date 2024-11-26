# ベースイメージ
FROM ubuntu:22.04

# 環境変数の設定
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Tokyo \
    LANG=ja_JP.UTF-8 \
    LANGUAGE=ja_JP:ja \
    LC_ALL=ja_JP.UTF-8

# システムのアップデートと基本パッケージのインストール
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    apt-transport-https \
    curl \
    sudo \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    language-pack-ja \
    fonts-ipafont \
    fcitx-mozc \
    systemd \
    systemd-sysv \
    ca-certificates \
    tzdata \
    locales \
    && rm -rf /var/lib/apt/lists/* \
    && locale-gen ja_JP.UTF-8

# systemdの設定
RUN cd /lib/systemd/system/sysinit.target.wants/ && \
    ls | grep -v systemd-tmpfiles-setup | xargs rm -f && \
    rm -f /lib/systemd/system/multi-user.target.wants/* && \
    rm -f /etc/systemd/system/*.wants/* && \
    rm -f /lib/systemd/system/local-fs.target.wants/* && \
    rm -f /lib/systemd/system/sockets.target.wants/*udev* && \
    rm -f /lib/systemd/system/sockets.target.wants/*initctl* && \
    rm -f /lib/systemd/system/basic.target.wants/* && \
    rm -f /lib/systemd/system/anaconda.target.wants/* && \
    systemctl mask dev-hugepages.mount sys-fs-fuse-connections.mount

# PostgreSQLの設定
RUN mkdir -p /var/lib/postgresql/14/main && \
    chown -R postgres:postgres /var/lib/postgresql/14/main && \
    chmod 700 /var/lib/postgresql/14/main

# システムディレクトリの作成と権限設定
RUN mkdir -p /run/systemd/system && \
    mkdir -p /run/systemd/journal && \
    mkdir -p /var/log/journal && \
    chmod 755 /run/systemd/system && \
    chmod 755 /run/systemd/journal && \
    chmod 755 /var/log/journal

# ORCAのキーリングとapt-lineの設定
RUN mkdir -p /etc/apt/keyrings
COPY archive.key /etc/apt/keyrings/jma.asc
COPY jma-receipt-weborca-jammy10.list /etc/apt/sources.list.d/

# WebORCAオンプレ版のインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends jma-receipt-weborca && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ORCAユーザーの設定
RUN echo "orca ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    chmod 440 /etc/sudoers

# 必要なディレクトリの作成と権限設定
RUN mkdir -p /tmp/weborca \
    /home/orca \
    /var/log/jma-receipt \
    /opt/jma/weborca/conf \
    /var/lib/jma-receipt/backup && \
    chown -R orca:orca \
    /tmp/weborca \
    /home/orca \
    /var/log/jma-receipt \
    /opt/jma/weborca \
    /var/lib/jma-receipt/backup && \
    chmod 755 \
    /tmp/weborca \
    /home/orca \
    /var/log/jma-receipt \
    /var/lib/jma-receipt/backup

# ログファイルの設定
RUN touch /var/log/jma-receipt/weborca.log \
    /var/log/jma-receipt/service_errors.log && \
    chown orca:orca \
    /var/log/jma-receipt/weborca.log \
    /var/log/jma-receipt/service_errors.log && \
    chmod 644 \
    /var/log/jma-receipt/weborca.log \
    /var/log/jma-receipt/service_errors.log

# 設定ファイルのコピーと権限設定
COPY jma-receipt.conf /opt/jma/weborca/conf/
COPY jma-receipt-weborca.service /lib/systemd/system/
RUN chown orca:orca /opt/jma/weborca/conf/jma-receipt.conf && \
    chmod 644 /opt/jma/weborca/conf/jma-receipt.conf && \
    chmod 644 /lib/systemd/system/jma-receipt-weborca.service && \
    mkdir -p /etc/systemd/system/multi-user.target.wants && \
    ln -sf /lib/systemd/system/jma-receipt-weborca.service \
    /etc/systemd/system/multi-user.target.wants/jma-receipt-weborca.service

# 起動スクリプトの設定
COPY start.sh /start.sh
RUN chmod +x /start.sh && \
    chown root:root /start.sh

# ヘルスチェック
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=3 \
    CMD systemctl is-system-running --wait || exit 1

# ポート設定
EXPOSE 8000

# システム制限の設定
RUN ulimit -n 65536

# 起動設定
STOPSIGNAL SIGRTMIN+3
ENTRYPOINT ["/lib/systemd/systemd"]
CMD ["--system"]
