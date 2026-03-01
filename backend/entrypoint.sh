#!/bin/bash
set -e

echo "Waiting for MySQL..."
python << EOF
import sys
import pymysql
import os
import time

db_host = "db"
db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASSWORD")
db_name = os.getenv("DB_NAME")

max_retries = 30
while max_retries > 0:
    try:
        conn = pymysql.connect(
            host=db_host,
            user=db_user,
            password=db_pass,
            database=db_name,
            connect_timeout=3
        )
        conn.close()
        print("✓ MySQL is ready!")
        sys.exit(0)
    except Exception as e:
        print(f"Database not ready... ({max_retries} retries left)")
        time.sleep(2)
        max_retries -= 1

print("✗ Failed to connect to MySQL after 30 retries")
sys.exit(1)
EOF

echo "Running database migrations..."
alembic upgrade head

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload