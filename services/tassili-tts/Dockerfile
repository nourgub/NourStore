# TassiliTTS service. CPU image by default; for a GPU host build FROM a
# CUDA PyTorch image and drop the --index-url line.
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
COPY app.py .
# The model (1.35 GB) and the reference voices are mounted, never baked in:
#   /models/ALGERIA.safetensors, /models/vocab.txt, /data/voices.json (+ recordings)
ENV TASSILI_CKPT=/models/ALGERIA.safetensors \
    TASSILI_VOCAB=/models/vocab.txt \
    TASSILI_VOICES=/data/voices.json \
    HF_HOME=/models/hf-cache
EXPOSE 8008
# TASSILI_TOKEN must be set at run time (the service refuses to serve without it).
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8008", "--workers", "1"]
