# ベースイメージとしてUbuntu 22.04 LTS (Jammy Jellyfish) を使用
FROM ubuntu:22.04

# 環境設定
ENV DEBIAN_FRONTEND=noninteractive

# 必要なパッケージのインストール
RUN apt-get update && \
    apt-get install -y wget gnupg software-properties-common locales sudo && \
    locale-gen ja_JP.UTF-8

# ロケールの設定
ENV LANG=ja_JP.UTF-8
ENV LANGUAGE=ja_JP:ja
ENV LC_ALL=ja_JP.UTF-8

# ORCAの公開鍵を追加
RUN mkdir -p /etc/apt/keyrings
COPY archive.key /etc/apt/keyrings/jma.asc

# apt-lineの追加
COPY jma-receipt-weborca-jammy10.list /etc/apt/sources.list.d/

# パッケージデータベースの更新とアップグレード
RUN apt-get update && \
    apt-get dist-upgrade -y

# ORCAのインストール
RUN apt-get install -y jma-receipt-weborca

# データベース設定ファイルのコピー
COPY jma-receipt.conf /opt/jma/weborca/conf/jma-receipt.conf

# サービスの起動スクリプトをコピー
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ポートの公開
EXPOSE 8000

# コンテナ起動時に実行するコマンド
CMD ["/entrypoint.sh"]
