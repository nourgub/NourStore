# Data sources and handling

## UCI Optical Recognition of Handwritten Digits (Optdigits)

Official dataset: [UCI Optical Recognition of Handwritten Digits](https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits), dataset ID 80. UCI lists the license as CC BY 4.0; attribute the dataset and contributors. The experiment downloads `optdigits.tra` (3,823 rows) and `optdigits.tes` (1,797 rows) from the official UCI archive and concatenates them for the transductive clustering run. Each row contains 64 pixel-count features (values 0–16) and a final digit class code (0–9). The class labels are excluded from K-Means, CHA, alignment, voting, conflict resolution and plots; they are used only for external evaluation metrics.

Run the experiment from the repository root with `python -m kmch.experiment --dataset optdigits`. The archive is downloaded in memory, checked against the SHA-256 digest of the documented source version, and validated for dimensions and value ranges. If the source archive changes, execution stops with an error for investigation instead of silently replacing results. The raw data is neither saved nor committed.

For any other dataset, document its stable source URL, version, license, checksum, feature and label fields, missing-value policy, preprocessing and split. The thesis itself is inconsistent about Gisette versus Pendigits in its results table; do not silently substitute one for the other.
