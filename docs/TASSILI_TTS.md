# The Algerian Dardja voice (TassiliTTS) — status, measurements, costs

Status on 2026-10-23: **integrated and working end to end, but not ready for
live lessons** (too slow without a GPU, no consented reference voice yet,
licence to confirm). The platform keeps working without it.

## What was done and checked

| | Result |
|---|---|
| Model files downloaded | `ALGERIA.safetensors` 1 348 751 153 bytes + `vocab.txt` (Hugging Face, `samifalouti/TassiliTTS`) |
| Library | `habibi-tts==0.1.1` (pulls `f5-tts` 1.1.x), CPU PyTorch 2.8.0 |
| API checked in the installed code | `load_model(DiT, cfg, ckpt_path, vocab_file, device)`, `load_vocoder("vocos")`, `preprocess_ref_audio_text`, `habibi_tts…infer_process(…, nfe_step, speed, device)` |
| Real synthesis | yes, on CPU — 4 cores, 15 GB RAM, **no GPU** in this environment |
| Output | 24 kHz mono, whole sentence at once (no streaming) |
| Node.js → service → model → MP3 → cache | passed (`server/tafawoq/tassili.service.e2e.test.ts`) |

### Measured on CPU (4 cores)

| Sentence | Quality steps (`nfe_step`) | Time | Audio | Real-time factor |
|---|---:|---:|---:|---:|
| «صحيت، هاديك هي الإجابة الصحيحة» | 16 | 48.1 s | 3.48 s | 13.8× slower |
| same | 32 | 90.6 s | 3.48 s | 26.1× slower |
| «إف مشتقة إكس يساوي اثنان إكس زائد ثلاثة» | 32 | 104.5 s | 4.42 s | 23.7× slower |
| a lesson sentence through Node.js + the service | 16 | 70.9 s | 5.42 s | 13.1× slower |

Model load: 7.5 s (24 s for the service start, vocoder download included).
Memory: fits in 15 GB RAM. **A GPU was not available: GPU speed was not measured.**

The test reference voice is a **synthetic espeak-ng voice** (no real person), so the
samples sound robotic — they prove the pipeline, not the quality a real teacher's
recording would give. Nobody has listened to judge the pronunciation: that
evaluation is still to be done by Algerian listeners.

## How it fits in the platform

- `services/tassili-tts/` — FastAPI service (`/health`, `/synthesize`), token required,
  one synthesis at a time, bounded queue, timeout (a timed-out synthesis keeps the
  model busy until it really ends), Arabic-script validation, WAV output.
- `server/tafawoq/tts.ts` — optional engine `tassili`, tried first for Arabic when
  `TAFAWOQ_TASSILI_URL` / `TAFAWOQ_TASSILI_TOKEN` are set and the service reports the
  voice ready. Any failure or timeout → the next voice (Azure ar-DZ, Piper, the
  device's own) → and the text is always on screen.
- Before sending: maths read aloud (`shared/spokenArabic.ts`), then numbers in words
  (`shared/arabicNumbers.ts`) because the model cannot read digits; the student's
  name is removed. The displayed formulas are never changed.
- Every sentence is synthesised once and cached (disk, and S3 when configured);
  the same sentence asked twice at the same moment is synthesised once.
- The student's male/female choice is saved with the account; the switch shows
  "صوت جزائري", "صوت عربي غير جزائري" or "الصوت المرجعي غير مهيأ" from what the server
  really has.

## What is needed before students hear it

1. **Licence** — the card says MIT, but the LICENSE file is missing, the base model
   (Habibi-TTS) is Apache-2.0 for its ALG model and CC-BY-NC-SA for its unified one, and
   the training data is not described. Get written confirmation from the author, or a
   lawyer's review, before any paid use.
2. **Reference voices** — one man and one woman, Algerian, who sign a consent to the
   commercial use of a cloned voice; 5–15 s each, clean, with the exact transcript.
   Configure them in `voices.json` (see `voices.example.json`). Until then the switch
   says the reference voice is not configured.
3. **A GPU host** for live use, or **pre-generation**: the teacher's fixed sentences
   (greetings, praise, hints, dialogues — see `server/tafawoq/ttsWarmup.ts`) can be
   generated once on a GPU (e.g. the Colab notebook) and served from the cache; only
   sentences with new numbers would then need live synthesis.
4. **A listening test** with Algerian students or teachers on representative lesson
   sentences (repetitions, words skipped, maths terms).

## Running it without your own machine

- **Try and listen:** open `services/tassili-tts/colab_tassili_tts.ipynb` in Google
  Colab, choose a T4 GPU, run the cells. Not a host: sessions stop after a few hours.
- **Serve students:** run `services/tassili-tts/Dockerfile` on a GPU host that runs
  containers, set `TASSILI_TOKEN`, mount the model and `voices.json`, and give
  `TAFAWOQ_TASSILI_URL` + `TAFAWOQ_TASSILI_TOKEN` to the Node server as secrets.

## Cost estimate (to confirm with the provider before any purchase — nothing was bought)

| Option | What it gives | Order of magnitude |
|---|---|---|
| CPU next to the app (what was measured) | 14–26× slower than real time: unusable live; usable only to pre-generate slowly | no extra cost |
| Free Colab T4 | listening tests, pre-generating a batch of fixed sentences | free, not a host |
| Cloud GPU (T4 / L4 class) on demand | live synthesis | roughly USD 0.4–1 per hour while running; ≈ USD 300–700 a month if always on |
| Pre-generate fixed sentences on a GPU, then CPU/cache | most of a lesson in the Algerian voice, little GPU time | a few GPU hours per content update |

GPU speed was not measured here, so the number of students one GPU can serve is unknown;
measure it with the Colab notebook (it prints the real-time factor) before choosing.

## Privacy

- The service receives only the sentence to say (no name, no account, no student id).
- If it runs on a third-party host, that host is a processor of these sentences; add it to
  the privacy policy's list of providers before enabling it.
- Reference recordings are personal data of the speakers: keep them and their consent
  forms outside the repository (`voices.json` and recordings are git-ignored).
