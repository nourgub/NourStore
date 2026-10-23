# Renders a Tafawoq voice pack with TassiliTTS (Algerian Dardja, F5-TTS
# architecture, https://huggingface.co/samifalouti/TassiliTTS) on a free
# GPU (Kaggle T4/P100 or Google Colab T4). Same input and output as
# render_chatterbox.py, so scripts/voice-pack/import.ts imports the result.
#
# Licence: the model card says MIT, but the base model and the training data
# are not documented (services/tassili-tts/README.md) — confirm with the
# author before charging for lessons that use this voice.
#
# Kaggle: New Notebook → Accelerator = GPU T4 x1, Internet = On. Add a
# Dataset with manifest.jsonl (scripts/voice-pack/export.ts) and the
# consenting speaker's recording, then:
#
#   !pip install -q habibi-tts==0.1.1 soundfile
#   !python render_tassili.py --manifest /kaggle/input/<dataset>/manifest.jsonl \
#        --reference /kaggle/input/<dataset>/recording.mp3 \
#        --reference-text "the exact words of the first 12 seconds" --hours 8.5
#
# The reference is cut to its first --reference-seconds (default 10) at a
# pause; --reference-text must be exactly what is said in that part. Lines
# the model cannot read (Latin script: French/German/Spanish lesson words)
# are skipped: the platform says them with its other voice. Resumable with
# --previous, like the Chatterbox script.
import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
import time

import numpy as np
import soundfile as sf
import torch

RATE = 24000
LATIN = re.compile(r"[A-Za-z]")

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", required=True)
parser.add_argument("--reference", required=True, help="the consenting speaker's recording (any format ffmpeg reads)")
parser.add_argument("--reference-text", required=True, help="exactly what is said in the kept part")
parser.add_argument("--reference-seconds", type=float, default=10.0, help="keep this much of the recording (max 12)")
parser.add_argument("--reference-start", type=float, default=0.0)
parser.add_argument("--out", default="/kaggle/working/wavs")
parser.add_argument("--previous", default=None, help="a folder of WAVs rendered in an earlier session")
parser.add_argument("--hours", type=float, default=8.5, help="stop before the session ends")
parser.add_argument("--nfe-step", type=int, default=32, help="16 = faster, 32 = default quality")
parser.add_argument("--ckpt", default=None, help="ALGERIA.safetensors (downloaded from Hugging Face when omitted)")
parser.add_argument("--vocab", default=None)
args = parser.parse_args()

from f5_tts.infer.utils_infer import load_model, load_vocoder, preprocess_ref_audio_text  # noqa: E402
from f5_tts.model import DiT  # noqa: E402
from habibi_tts.infer.utils_infer import infer_process  # noqa: E402

if not args.ckpt or not args.vocab:
    from huggingface_hub import hf_hub_download

    args.ckpt = args.ckpt or hf_hub_download("samifalouti/TassiliTTS", "ALGERIA.safetensors")
    args.vocab = args.vocab or hf_hub_download("samifalouti/TassiliTTS", "vocab.txt")

device = "cuda" if torch.cuda.is_available() else "cpu"
vocoder = load_vocoder(vocoder_name="vocos", is_local=False, device=device)
model = load_model(
    DiT,
    dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
    ckpt_path=args.ckpt,
    vocab_file=args.vocab,
    device=device,
)

# The reference: mono 24 kHz, the kept part only, loudness evened out.
seconds = min(12.0, args.reference_seconds)
reference = os.path.join(tempfile.mkdtemp(), "reference.wav")
subprocess.run(
    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", args.reference, "-ss", str(args.reference_start),
     "-t", str(seconds), "-ac", "1", "-ar", str(RATE), "-af", "highpass=f=70,loudnorm=I=-20:TP=-2", reference],
    check=True,
)
ref_audio, ref_text = preprocess_ref_audio_text(reference, args.reference_text)
print(f"device={device}  reference={seconds:.1f}s  text={ref_text!r}")

entries = [json.loads(line) for line in open(args.manifest, encoding="utf-8") if line.strip()]
deadline = time.time() + args.hours * 3600
done = skipped = unreadable = failed = 0
started = time.time()
for entry in entries:
    if time.time() > deadline:
        print("Time budget reached: run again in a new session to continue (--previous).")
        break
    relative = os.path.splitext(entry["file"])[0] + ".wav"
    target = os.path.join(args.out, relative)
    if os.path.exists(target) or (args.previous and os.path.exists(os.path.join(args.previous, relative))):
        skipped += 1
        continue
    say = entry["say"].strip()
    if LATIN.search(say) or re.search(r"\d", say):
        unreadable += 1  # Latin script or digits: TassiliTTS cannot read them
        continue
    # A single word is unstable for this kind of model: end it like a sentence.
    if entry["kind"] == "piece" and not re.search(r"[.!؟?،]$", say):
        say += "."
    os.makedirs(os.path.dirname(target), exist_ok=True)
    try:
        with torch.inference_mode():
            audio, sr, _ = infer_process(ref_audio=ref_audio, ref_text=ref_text, gen_text=say, model_obj=model,
                                         vocoder=vocoder, speed=1.0, nfe_step=args.nfe_step, device=device,
                                         show_info=lambda *a, **k: None)
        audio = np.asarray(audio, dtype=np.float32)
        if sr != RATE:
            import torchaudio

            audio = torchaudio.functional.resample(torch.from_numpy(audio), sr, RATE).numpy()
        sf.write(target, audio, RATE, subtype="PCM_16")
        done += 1
    except Exception as error:  # keep going: the import lists what is missing
        failed += 1
        print("failed:", entry["text"][:60], error)
    if done and done % 100 == 0:
        rate = done / (time.time() - started)
        left = len(entries) - done - skipped - unreadable - failed
        print(f"{done} rendered, {skipped} skipped, {unreadable} unreadable, {failed} failed — {rate * 3600:.0f}/hour, ~{left / rate / 3600:.1f} h left", flush=True)

print(f"Done: {done} rendered, {skipped} already there, {unreadable} not readable by this model, {failed} failed.")
archive_dir = os.path.dirname(os.path.abspath(args.out))
shutil.make_archive(os.path.join(archive_dir, "voice-pack-wavs"), "zip", args.out)
print(f"Download {os.path.join(archive_dir, 'voice-pack-wavs.zip')}.")
