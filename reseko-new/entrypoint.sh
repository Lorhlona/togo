#!/bin/bash

# PostgreSQLの起動
service postgresql start

# ORCAサービスの起動
service jma-receipt-weborca restart

# コンテナが終了しないように待機
tail -f /dev/null
