# Renders a Tafawoq voice pack with Chatterbox Multilingual (Resemble AI,
# MIT licence, commercial use allowed) on a free Kaggle GPU (T4/P100).
# See voice-dataset/pack/README.md for the whole procedure.
#
# Kaggle: New Notebook → Settings: Accelerator = GPU T4 x1, Internet = On.
# Add a Dataset holding manifest.jsonl (from scripts/voice-pack/export.ts)
# and reference.wav (10–30 s of the consenting speaker, see README), then:
#
#   !pip install -q chatterbox-tts soundfile
#   !python render_chatterbox.py --manifest /kaggle/input/<dataset>/manifest.jsonl \
#        --reference /kaggle/input/<dataset>/reference.wav --hours 8.5
#
# Resumable: what is already rendered is skipped, so run it again in the
# next session (attach the previous output as input with --previous).
# At the end, the WAVs are zipped in /kaggle/working for download.
import argparse
import inspect
import json
import os
import shutil
import time

import soundfile as sf
import torch

RATE = 24000

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", required=True)
parser.add_argument("--reference", required=True)
parser.add_argument("--out", default="/kaggle/working/wavs")
parser.add_argument("--previous", default=None, help="a folder of WAVs rendered in an earlier session")
parser.add_argument("--hours", type=float, default=8.5, help="stop before the Kaggle session ends")
parser.add_argument("--exaggeration", type=float, default=0.45, help="lower = calmer")
parser.add_argument("--cfg", type=float, default=0.4)
args = parser.parse_args()

from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402

model = ChatterboxMultilingualTTS.from_pretrained(device="cuda" if torch.cuda.is_available() else "cpu")
accepted = inspect.signature(model.generate).parameters
options = {"language_id": "ar"}
if "audio_prompt_path" in accepted:
    options["audio_prompt_path"] = args.reference
if "exaggeration" in accepted:
    options["exaggeration"] = args.exaggeration
for name in ("cfg_weight", "cfg"):
    if name in accepted:
        options[name] = args.cfg
        break

resample = None
if model.sr != RATE:
    import torchaudio

    resample = torchaudio.transforms.Resample(model.sr, RATE)

entries = [json.loads(line) for line in open(args.manifest, encoding="utf-8") if line.strip()]
deadline = time.time() + args.hours * 3600
done = skipped = failed = 0
started = time.time()
for entry in entries:
    if time.time() > deadline:
        print("Time budget reached: run again in a new session to continue.")
        break
    relative = os.path.splitext(entry["file"])[0] + ".wav"
    target = os.path.join(args.out, relative)
    if os.path.exists(target) or (args.previous and os.path.exists(os.path.join(args.previous, relative))):
        skipped += 1
        continue
    os.makedirs(os.path.dirname(target), exist_ok=True)
    # A single word is unstable for a model like this: end it like a sentence.
    say = entry["say"] if entry["kind"] == "sentence" or entry["say"].endswith(".") else entry["say"] + "."
    try:
        with torch.inference_mode():
            wav = model.generate(say, **options)
        wav = wav.detach().float().cpu()
        if resample is not None:
            wav = resample(wav)
        sf.write(target, wav.squeeze().numpy(), RATE, subtype="PCM_16")
        done += 1
    except Exception as error:  # keep going: the import lists what is missing
        failed += 1
        print("failed:", entry["text"][:60], error)
    if done and done % 200 == 0:
        rate = done / (time.time() - started)
        left = len(entries) - done - skipped - failed
        print(f"{done} rendered, {skipped} skipped, {failed} failed — {rate * 3600:.0f}/hour, ~{left / rate / 3600:.1f} h left")

print(f"Done: {done} rendered, {skipped} already there, {failed} failed.")
shutil.make_archive("/kaggle/working/voice-pack-wavs", "zip", args.out)
print("Download /kaggle/working/voice-pack-wavs.zip (Output tab).")
