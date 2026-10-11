FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DB_PATH=/data/store.db HOST=0.0.0.0
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home appuser && mkdir -p /data && chown appuser /data
USER appuser
EXPOSE 5000
# One worker keeps the in-process rate limit and daily cap exact; raise threads for concurrency.
CMD ["sh", "-c", "gunicorn --workers 1 --threads 8 --bind 0.0.0.0:${PORT:-5000} app:app"]
