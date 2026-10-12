FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/store.db \
    HOST=0.0.0.0 \
    WEB_CONCURRENCY=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home --uid 10001 appuser && mkdir -p /data /app/backups && chown appuser /data /app/backups
USER appuser

# The SQLite database (and its WAL files) must live on a persistent volume.
VOLUME ["/data"]
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.getenv('PORT', '5000'), timeout=4)"

# gunicorn stops gracefully on SIGTERM: in-flight requests get up to 30 s to finish.
# Keep WEB_CONCURRENCY=1 unless REDIS_URL is set, so rate limits and the daily cap stay exact.
STOPSIGNAL SIGTERM
CMD ["sh", "-c", "exec gunicorn --workers ${WEB_CONCURRENCY} --threads 8 --timeout 60 --graceful-timeout 30 --bind 0.0.0.0:${PORT:-5000} app:app"]
