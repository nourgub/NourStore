"""TassiliTTS speech service for Tafawoq (FastAPI).

Wraps the TassiliTTS / KasbahTTS V0 model (F5-TTS architecture, fine-tuned
from Habibi-TTS for Algerian Dardja: https://huggingface.co/samifalouti/TassiliTTS).
The model clones the voice of a short *reference recording*: a teacher voice
exists only when its reference recording, its transcript and a reference to
the speaker's written consent are configured (voices.json). Without them the
voice is reported "not configured" and nothing is synthesised.

Endpoints
  GET  /health      model, device, voices and queue state (no auth)
  POST /synthesize  {text, voice, speed?} -> audio/wav (16-bit mono), Bearer auth

Honest limits
  - The whole sentence is generated before anything is sent: no streaming.
  - A synthesis already running cannot be interrupted (the model has no hook
    for it); a request still waiting in the queue is dropped if its client
    has gone away.
  - The model reads Arabic script only: no digits, no Latin letters, no
    diacritics. The Node.js side spells numbers and maths out before calling.
"""
from __future__ import annotations

import asyncio
import hmac
import io
import json
import logging
import os
import re
import time
import wave
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

log = logging.getLogger("tassili")
logging.basicConfig(level=os.environ.get("TASSILI_LOG_LEVEL", "INFO"))

MAX_CHARS = int(os.environ.get("TASSILI_MAX_CHARS", "300"))
MAX_WAITING = int(os.environ.get("TASSILI_MAX_WAITING", "8"))
TIMEOUT_S = float(os.environ.get("TASSILI_TIMEOUT_S", "120"))
NFE_STEP = int(os.environ.get("TASSILI_NFE_STEP", "32"))
SAMPLE_RATE_FALLBACK = 24_000

# Arabic letters, Arabic punctuation and spaces only (no digits, no Latin, no diacritics).
_ALLOWED = re.compile(r"^[ء-غف-يٱ-ۓ\s،؛؟!.,:\-ـ]+$")
_DIACRITICS = re.compile(r"[ً-ْٰ]")


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_CHARS)
    voice: Literal["male", "female"] = "male"
    speed: float = Field(default=1.0, ge=0.7, le=1.3)

    @field_validator("text")
    @classmethod
    def arabic_only(cls, value: str) -> str:
        value = _DIACRITICS.sub("", value).strip()
        if not value:
            raise ValueError("empty text")
        if not _ALLOWED.match(value):
            raise ValueError("Arabic script only: spell out digits and symbols, no Latin letters")
        return value


@dataclass
class Voice:
    name: str
    ref_audio: str
    ref_text: str
    consent_ref: str
    ready: bool
    reason: str
    prepared: object = None  # (audio, text) after the model's preprocessing


def load_voices(path: str | None) -> dict[str, Voice]:
    """voices.json: {"male": {"ref_audio", "ref_text", "consent_ref"}, "female": {...}}."""
    config: dict = {}
    if path and Path(path).is_file():
        config = json.loads(Path(path).read_text(encoding="utf-8"))
    voices: dict[str, Voice] = {}
    for name in ("male", "female"):
        entry = config.get(name) or {}
        ref_audio = str(entry.get("ref_audio", ""))
        ref_text = str(entry.get("ref_text", "")).strip()
        consent = str(entry.get("consent_ref", "")).strip()
        if not entry:
            reason = "reference voice not configured"
        elif not consent:
            reason = "no consent reference for this voice: refused"
        elif not ref_audio or not Path(ref_audio).is_file():
            reason = "reference recording not found"
        elif not ref_text:
            reason = "reference transcript missing"
        else:
            reason = ""
        voices[name] = Voice(name, ref_audio, ref_text, consent, ready=not reason, reason=reason or "ready")
    return voices


class Backend:
    """The real model. Loaded once at start-up."""

    def __init__(self) -> None:
        import torch
        from f5_tts.infer.utils_infer import load_model, load_vocoder
        from f5_tts.model import DiT

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        ckpt = os.environ.get("TASSILI_CKPT", "models/ALGERIA.safetensors")
        vocab = os.environ.get("TASSILI_VOCAB", "models/vocab.txt")
        for file in (ckpt, vocab):
            if not Path(file).is_file():
                raise RuntimeError(f"model file missing: {file} (see README: download from Hugging Face)")
        self.vocoder = load_vocoder(vocoder_name="vocos", is_local=False, device=self.device)
        # Architecture as published in the model card.
        self.model = load_model(
            DiT,
            dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
            ckpt_path=ckpt,
            vocab_file=vocab,
            device=self.device,
        )

    def prepare(self, voice: Voice) -> None:
        from f5_tts.infer.utils_infer import preprocess_ref_audio_text

        voice.prepared = preprocess_ref_audio_text(voice.ref_audio, voice.ref_text)

    def synthesize(self, voice: Voice, text: str, speed: float) -> tuple[np.ndarray, int]:
        from habibi_tts.infer.utils_infer import infer_process

        ref_audio, ref_text = voice.prepared  # type: ignore[misc]
        audio, sample_rate, _ = infer_process(
            ref_audio=ref_audio,
            ref_text=ref_text,
            gen_text=text,
            model_obj=self.model,
            vocoder=self.vocoder,
            speed=speed,
            nfe_step=NFE_STEP,
            device=self.device,
        )
        return np.asarray(audio, dtype=np.float32), int(sample_rate)


class FakeBackend:
    """For tests and CI without the 1.3 GB model: a short tone, clearly not speech."""

    device = "fake"

    def prepare(self, voice: Voice) -> None:
        voice.prepared = ("fake", voice.ref_text)

    def synthesize(self, voice: Voice, text: str, speed: float) -> tuple[np.ndarray, int]:
        seconds = min(4.0, 0.06 * len(text) / speed)
        t = np.linspace(0, seconds, int(SAMPLE_RATE_FALLBACK * seconds), endpoint=False)
        return (0.2 * np.sin(2 * np.pi * 220 * t)).astype(np.float32), SAMPLE_RATE_FALLBACK


def to_wav(audio: np.ndarray, sample_rate: int) -> bytes:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(pcm.tobytes())
    return buffer.getvalue()


class State:
    backend: object | None = None
    error: str | None = None
    voices: dict[str, Voice] = {}
    lock = asyncio.Lock()
    waiting = 0


state = State()


@asynccontextmanager
async def lifespan(_: FastAPI):
    state.voices = load_voices(os.environ.get("TASSILI_VOICES", "voices.json"))
    try:
        state.backend = FakeBackend() if os.environ.get("TASSILI_FAKE") == "1" else Backend()
        for voice in state.voices.values():
            if voice.ready:
                state.backend.prepare(voice)  # type: ignore[union-attr]
    except Exception as error:  # the service still answers /health with the reason
        state.error = str(error)
        log.error("model not loaded: %s", error)
    yield


app = FastAPI(title="Tafawoq TassiliTTS", lifespan=lifespan)


def require_token(request: Request) -> None:
    expected = os.environ.get("TASSILI_TOKEN", "")
    if not expected:
        if os.environ.get("TASSILI_ALLOW_NO_AUTH") == "1":
            return
        raise HTTPException(503, "TASSILI_TOKEN is not set: refusing to serve without authentication")
    given = request.headers.get("authorization", "")
    if not hmac.compare_digest(given.encode(), f"Bearer {expected}".encode()):
        raise HTTPException(401, "unauthorized")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok" if state.backend and not state.error else "error",
        "model_loaded": bool(state.backend) and not state.error,
        "error": state.error,
        "device": getattr(state.backend, "device", None),
        "streaming": False,
        "voices": {name: {"ready": voice.ready, "reason": voice.reason} for name, voice in state.voices.items()},
        "queue": {"waiting": state.waiting, "max": MAX_WAITING},
        "max_chars": MAX_CHARS,
    }


@app.post("/synthesize", dependencies=[Depends(require_token)])
async def synthesize(body: SynthesisRequest, request: Request) -> Response:
    if not state.backend or state.error:
        raise HTTPException(503, f"model not loaded: {state.error}")
    voice = state.voices.get(body.voice)
    if not voice or not voice.ready:
        raise HTTPException(409, f"voice '{body.voice}' unavailable: {voice.reason if voice else 'unknown'}")
    if state.waiting >= MAX_WAITING:
        raise HTTPException(503, "busy: too many requests waiting")
    state.waiting += 1
    try:
        async with state.lock:  # one synthesis at a time: the model is not re-entrant on one device
            if await request.is_disconnected():
                raise HTTPException(499, "client went away before its turn")
            started = time.perf_counter()
            loop = asyncio.get_running_loop()
            try:
                audio, rate = await asyncio.wait_for(
                    loop.run_in_executor(None, state.backend.synthesize, voice, body.text, body.speed),  # type: ignore[union-attr]
                    timeout=TIMEOUT_S,
                )
            except asyncio.TimeoutError:
                raise HTTPException(504, "synthesis took too long")
            elapsed = time.perf_counter() - started
    finally:
        state.waiting -= 1
    if not len(audio):
        raise HTTPException(500, "the model returned no audio")
    log.info("synthesised %d chars in %.2fs (%.2fs of audio)", len(body.text), elapsed, len(audio) / rate)
    return Response(
        content=to_wav(audio, rate),
        media_type="audio/wav",
        headers={"X-Synthesis-Seconds": f"{elapsed:.3f}", "X-Audio-Seconds": f"{len(audio) / rate:.3f}"},
    )
