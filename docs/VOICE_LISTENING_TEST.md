# Listening test — the teacher's voice

**Status: not done yet.** Until people have run this test and the results
below are filled in, the platform does not claim the voice is natural in
Darja, complete, or correct on maths. Automated tests check that the server
plays the recordings, never how they sound.

## Who

At least 5 listeners who speak Algerian Darja, including 2 BAC students and
1 maths teacher. Nobody who made the recordings.

## How

1. Install the pack (docs/VOICE_PACK_INSTALL.md) and set
   `TAFAWOQ_VOICE_EXCLUSIVE=female`.
2. In a lesson, open «الأستاذ» and press «استمع» on each sentence below
   (or play the files from `uploads/tts-cache`). Use a phone speaker, then
   earphones.
3. Each listener rates each sentence alone, without seeing the others' ratings.

| Score | Meaning |
|---|---|
| 1 | Wrong or not understandable (wrong number, wrong symbol, cut off) |
| 2 | Understandable but clearly robotic or wrong accent |
| 3 | Fine, a few odd sounds |
| 4 | Natural |

Mark also: wrong word read, missing word, wrong number, cut at the end.

## Sentences

| # | Covers | Text shown |
|---|---|---|
| 1 | Greeting, Darja | السلام عليكم! معك أستاذة الرياضيات. |
| 2 | Integers | 2026، 15، 304 |
| 3 | Decimals and negatives | −3,5 و 0,25 |
| 4 | Fractions | 3/4 و (x+1)/(x−1) |
| 5 | Powers | x² و x³ و 2ⁿ |
| 6 | Roots | √x و √(x+1) |
| 7 | Derivatives | f'(x) = 3x² − 2x |
| 8 | Limits | lim (x → +∞) f(x) = −∞ |
| 9 | Logarithm, exponential | ln(x) و e^x |
| 10 | French words inside Darja | الـ dérivée تاع f، والـ tableau de variation |
| 11 | A full worked step | نهاية كثير الحدود عند −∞ هي نهاية حده الأعلى درجة 2x³ |
| 12 | A correction | ليس تماماً. الجواب الصحيح: −∞. |

A sentence that has no recording yet must show its text and the notice
«بعض هذه الجمل لم تُسجَّل بعد بصوت الأستاذة»; no other voice may read it.

## Results

| Date | Listeners | Average score | Sentences scored 1 | Decision |
|---|---|---|---|---|
| — | — | — | — | not done |

Decision rule: the voice is described as "natural" only if every sentence
averages ≥ 3.5 and no sentence has a 1 from two listeners; otherwise list the
problems and render those recordings again.
