# Voice pack coverage — dz-teacher-f

Generated 2026-10-23T22:16:43.828Z from a local voice cache.

**62 of 64353 recordings present (0.1 %); 64291 missing.**

| Group | Present | Required | Coverage | Examples missing |
|---|---:|---:|---:|---|
| Maths words and symbols (pieces) | 62 | 147 | 42.2 % | «16» · «17» · «18» |
| Prose between maths words (pieces) | 0 | 6362 | 0.0 % | «شاء الله راك لاباس.» · «أخطأت» · «تمرين، راجع التصحيح خطوة بخطوة» |
| Fixed teacher sentences | 0 | 4445 | 0.0 % | «السلام عليكم!» · «معك أستاذ الرياضيات.» · «أتمنى أن تكون بخير.» |
| Teacher messages and spoken exercise variants | 0 | 53399 | 0.0 % | «نهاية كثير حدود عند زائد أو ناقص ما لا نهاية — بطريقة أبسط» · «لنأخذ فكرة واحدة فقط:» · «إف إكس يساوي ناقص 4 إكس تربيع زائد 2 إكس ناقص 3.» |

## Files in the cache

- `.pcm`: 62
- `.mp3`: 2
- `.json`: 1

Pieces are raw PCM (`.pcm`), whole sentences MP3 (`.mp3`); `voice-pack-info.json` holds the declarations.

## Declarations

- Speaker consent: Platform owner's own voice; written and spoken consent given in the Claude Code session on 2026-10-23, withdrawable at any time
- Model licence: TassiliTTS (samifalouti/TassiliTTS), MIT per model card; base model and data rights to confirm
- Accent shown to students: algerian

## Time to finish

At 120 s per recording (measured on this CPU: 70–190 s), the 64291 missing recordings take about **89 days** of one CPU; a GPU is far faster. The renderer resumes where it stopped (voice-dataset/pack/render_tassili.py).

## What this does not say

- Whether the voice sounds natural in Darja, or reads numbers, fractions, roots, derivatives and French words correctly: that needs the listening test (docs/VOICE_LISTENING_TEST.md), not done yet.
- With `TAFAWOQ_VOICE_EXCLUSIVE=female`, a missing recording is never replaced by another voice: the student sees the text and a notice that this sentence has no recording yet.
