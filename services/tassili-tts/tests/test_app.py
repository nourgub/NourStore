"""Service tests with the fake backend (no model download). Run:
    TASSILI_FAKE=1 python -m pytest -q services/tassili-tts/tests
"""
import importlib
import io
import json
import sys
import wave
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

HERE = Path(__file__).resolve().parent.parent


def make_client(tmp_path, monkeypatch, voices: dict | None, token: str | None = "secret-token"):
    ref = tmp_path / "ref.wav"
    with wave.open(str(ref), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(24000)
        out.writeframes(b"\x00\x00" * 24000)
    config = tmp_path / "voices.json"
    if voices is not None:
        for entry in voices.values():
            if entry.get("ref_audio") == "REF":
                entry["ref_audio"] = str(ref)
        config.write_text(json.dumps(voices), encoding="utf-8")
    monkeypatch.setenv("TASSILI_FAKE", "1")
    monkeypatch.setenv("TASSILI_VOICES", str(config))
    if token:
        monkeypatch.setenv("TASSILI_TOKEN", token)
    else:
        monkeypatch.delenv("TASSILI_TOKEN", raising=False)
    monkeypatch.syspath_prepend(str(HERE))
    sys.modules.pop("app", None)
    module = importlib.import_module("app")
    return TestClient(module.app)


CONSENTED = {"ref_audio": "REF", "ref_text": "السلام عليكم", "consent_ref": "contract 2026-10 signed"}
AUTH = {"Authorization": "Bearer secret-token"}


def test_health_reports_voices_without_auth(tmp_path, monkeypatch):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        body = client.get("/health").json()
        assert body["model_loaded"] is True
        assert body["streaming"] is False
        assert body["voices"]["male"]["ready"] is True
        assert body["voices"]["female"] == {"ready": False, "reason": "reference voice not configured"}


def test_synthesize_returns_wav(tmp_path, monkeypatch):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        response = client.post("/synthesize", json={"text": "واش راك خويا", "voice": "male"}, headers=AUTH)
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        with wave.open(io.BytesIO(response.content)) as wav:
            assert wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == 24000
            assert wav.getnframes() > 0


def test_auth_is_required(tmp_path, monkeypatch):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        assert client.post("/synthesize", json={"text": "واش راك", "voice": "male"}).status_code == 401
        bad = {"Authorization": "Bearer wrong"}
        assert client.post("/synthesize", json={"text": "واش راك", "voice": "male"}, headers=bad).status_code == 401


def test_refuses_to_serve_without_a_token(tmp_path, monkeypatch):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}, token=None) as client:
        assert client.post("/synthesize", json={"text": "واش راك", "voice": "male"}).status_code == 503


def test_voice_without_consent_is_refused(tmp_path, monkeypatch):
    no_consent = {**CONSENTED, "consent_ref": ""}
    with make_client(tmp_path, monkeypatch, {"female": no_consent}) as client:
        assert "consent" in client.get("/health").json()["voices"]["female"]["reason"]
        response = client.post("/synthesize", json={"text": "واش راك", "voice": "female"}, headers=AUTH)
        assert response.status_code == 409


@pytest.mark.parametrize("text", ["عندي 3 خاوتي", "ça va", "", "ب" * 400, "مَرْحَبًا 2"])
def test_rejects_text_the_model_cannot_read(tmp_path, monkeypatch, text):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        response = client.post("/synthesize", json={"text": text, "voice": "male"}, headers=AUTH)
        assert response.status_code == 422


def test_diacritics_are_removed_not_refused(tmp_path, monkeypatch):
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        response = client.post("/synthesize", json={"text": "مَرْحَبًا", "voice": "male"}, headers=AUTH)
        assert response.status_code == 200


def test_a_timed_out_synthesis_keeps_the_model_busy_until_it_ends(tmp_path, monkeypatch):
    import time as _time

    monkeypatch.setenv("TASSILI_TIMEOUT_S", "0.2")
    with make_client(tmp_path, monkeypatch, {"male": CONSENTED}) as client:
        module = sys.modules["app"]
        calls = []

        def slow(voice, text, speed):
            calls.append(_time.perf_counter())
            _time.sleep(0.6)
            return module.FakeBackend().synthesize(voice, text, speed)

        monkeypatch.setattr(module.state.backend, "synthesize", slow)
        first = client.post("/synthesize", json={"text": "واش راك", "voice": "male"}, headers=AUTH)
        assert first.status_code == 504
        # The next request starts only after the first computation has ended.
        client.post("/synthesize", json={"text": "واش راك", "voice": "male"}, headers=AUTH)
        assert len(calls) == 2 and calls[1] - calls[0] >= 0.55
