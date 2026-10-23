# TassiliTTS service — the Algerian Dardja voice (optional)

A small FastAPI service that serves the **TassiliTTS / KasbahTTS V0** model
(<https://huggingface.co/samifalouti/TassiliTTS>) to the Tafawoq Node.js server.
It is **optional**: without it, the platform uses its other voices
(Azure ar-DZ, Piper, the device's own voice) and the lesson always goes on in text.

## What the model is — checked, not assumed

| | |
|---|---|
| Architecture | F5-TTS (DiT, flow matching), fine-tuned from Habibi-TTS |
| Weights | `ALGERIA.safetensors` (1.35 GB) + `vocab.txt`; Vocos vocoder (~40 MB) fetched on first start |
| Inference | `habibi_tts.infer.utils_infer.infer_process` (as in the model card), CPU or CUDA |
| Output | the whole sentence at once, 24 kHz mono → returned as 16-bit WAV. **No streaming.** |
| Needs | a **reference recording** of the voice to clone (5–15 s) and its exact transcript |
| Reads | Arabic script only. **No digits**, no Latin/French, no diacritics (model card) |
| Known issues | may repeat words; shorter segments help (model card) |

## Licence and consent — read before any commercial use

- The model card says **MIT**, but its LICENSE link points to a file that is not in the repository.
- It is fine-tuned from **Habibi-TTS**, whose models are under two licences: the Algerian (ALG),
  EGY, IRQ, MAR and MSA models under **Apache 2.0**, the *unified* model under
  **CC-BY-NC-SA-4.0 (non-commercial)**. The card does not say which one TassiliTTS starts from.
- The training data of TassiliTTS is not described ("real Algerian conversational speech").
- **So commercial use is not established.** Before charging students for a lesson that uses this
  voice, get written confirmation from the author (MenaVoice / samifalouti) of the base model
  and the data rights, or have a lawyer review it.
- **Reference voices:** the service refuses a voice without a `consent_ref` (a reference to the
  speaker's signed consent to the commercial use of a cloned voice). Never use a recording found
  online, a teacher's voice without a contract, or the samples in the model repository.

## Run it

```bash
cd services/tassili-tts
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
mkdir -p models && huggingface-cli download samifalouti/TassiliTTS ALGERIA.safetensors vocab.txt --local-dir models
cp voices.example.json voices.json   # fill in consented reference voices only
TASSILI_TOKEN="$(openssl rand -hex 32)" uvicorn app:app --host 127.0.0.1 --port 8008 --workers 1
```

Then, on the Node.js server (secrets, never in files):

```
TAFAWOQ_TASSILI_URL=http://127.0.0.1:8008
TAFAWOQ_TASSILI_TOKEN=<the same token>
```

| Variable (service) | Default | |
|---|---|---|
| `TASSILI_TOKEN` | — | **required**; the service refuses to synthesise without it |
| `TASSILI_CKPT`, `TASSILI_VOCAB` | `models/…` | the weights |
| `TASSILI_VOICES` | `voices.json` | reference voices (see `voices.example.json`) |
| `TASSILI_MAX_CHARS` | 300 | longest text per request |
| `TASSILI_MAX_WAITING` | 8 | requests allowed to wait; beyond → 503 busy |
| `TASSILI_TIMEOUT_S` | 120 | per synthesis |
| `TASSILI_NFE_STEP` | 32 | quality/speed trade-off (16 faster, 64 better) |

One synthesis runs at a time (the model is not re-entrant on one device). A request
still waiting when its client disconnects is dropped; one already running cannot be
interrupted — the Node server caches every sentence, so the work is not lost.

## Tests

```bash
pip install -r requirements-test.txt
python -m pytest -q tests                       # fake backend, no model download
TASSILI_FAKE=1 TASSILI_TOKEN=t uvicorn app:app --port 8009 &
TASSILI_TEST_URL=http://127.0.0.1:8009 TASSILI_TEST_TOKEN=t npx vitest run server/tafawoq/tassili.service.e2e.test.ts
```

## Hosting (no machine of your own)

- **To try and listen:** `colab_tassili_tts.ipynb` in Google Colab (free T4 GPU).
  Colab is not a host: sessions stop after a few hours and the address changes.
- **To serve students:** a GPU host that runs a container (e.g. a small cloud GPU,
  a Hugging Face Space with GPU hardware). CPU works but is slow — see the measured
  figures in `docs/TASSILI_TTS.md`. Every hosted option costs money: none was bought.
