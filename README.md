# KMCH — Unsupervised Clustering Combination

A Python implementation inspired by **“Combinaison des classifieurs non supervisés”**, a 2019 Master’s thesis in Web and Artificial Intelligence at Mohamed Chérif Messadia University, Souk Ahras, Algeria.

> **Academic portfolio project.** This repository presents thesis-based academic work and a new reproducible experiment. It does not represent professional work experience and does not claim an exact reproduction of the thesis results.

## Project overview

K-Means and Agglomerative Hierarchical Clustering (CHA) can produce different partitions of the same unlabeled observations. Cluster IDs are arbitrary, so they must be aligned before assignments can be compared. KMCH combines the two partitions, retains agreed assignments, detects conflicts, and assigns conflicting observations using an incremental K-Means-inspired update.

## Methodology

```text
Same numeric feature matrix
        ├── K-Means ───────────┐
        └── CHA (Ward) ────────┤
                               ↓
                      Cluster alignment
                               ↓
                     Simple consensus vote
                               ↓
                    Conflict-point detection
                               ↓
               Incremental conflict resolution
```

The central research flow remains K-Means + CHA → alignment → consensus → conflicts → incremental conflict treatment. The thesis describes choosing maximum overlaps by column but does not fully specify collisions. This repository uses global one-to-one Hungarian matching as a transparent software decision; it is **not claimed to be the thesis’s exact implementation**.

## Research background and source distinctions

The thesis proposes parallel K-Means and CHA members followed by simple voting and incremental K-Means for conflicts. The thesis mentions Optdigits in its abstract and conclusion, but its experiment-results table lists Pendigits in a row where Gisette is mentioned elsewhere. It also gives headline claims of 91.01% and 97% that are not reconciled with a complete dataset-specific protocol. See [`docs/thesis_notes.md`](docs/thesis_notes.md).

This repository keeps three categories separate:

- **Thesis-reported results:** values printed in the original thesis; see the thesis notes and experiment report.
- **Earlier repository smoke test:** synthetic data used for software testing, not a thesis benchmark.
- **New UCI experiment:** the Optdigits experiment documented below; not a reproduction of the thesis experiment.

## Dataset

The experiment uses [UCI Optical Recognition of Handwritten Digits (Optdigits), dataset ID 80](https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits), under the UCI-listed CC BY 4.0 license. It has **5,620 samples**, **64 integer pixel-count features** with values 0–16, and **10 digit classes** (0–9). The official `.tra` and `.tes` files are concatenated for one transductive clustering run; no rows are dropped. Labels are excluded from all clustering and combination steps, and from all plots; they are used only for external evaluation metrics. The known class cardinality informs `k=10`; this prior knowledge is disclosed.

The loader verifies the source archive SHA-256 before parsing it and refuses to silently proceed if the downloaded archive changes. Raw data is downloaded in memory and is not committed. Reference labels are used only to calculate external metrics, not in clustering, alignment, voting, conflict resolution, or plots. Source and field handling are in [`data/README.md`](data/README.md).

## Experimental configuration

All listed settings are fixed in the experiment command. Choices absent from the thesis are marked **Repository implementation decision — not specified by the thesis.** These include: `k=10`, no feature scaling, K-Means `n_init=10` and seed 42, Ward linkage, Hungarian alignment, the precise disagreement-as-conflict rule, and the online nearest-centroid running-mean conflict update.

| Setting | Value |
|---|---|
| Preprocessing | Join official `.tra` and `.tes`; preserve source order; no rows dropped |
| Missing values | None reported by UCI; none found in archive |
| Scaling | None; raw pixel counts 0–16 |
| Number of clusters | 10 |
| K-Means | `n_clusters=10`, `n_init=10`, `random_state=42`; remaining scikit-learn defaults |
| CHA | `n_clusters=10`, `linkage="ward"`; remaining scikit-learn defaults |
| Alignment | Global one-to-one maximum-overlap Hungarian assignment |
| Vote and conflict | Agree after alignment → consensus; disagree → conflict |
| Incremental update | Process conflicts in source order; nearest current centroid and online running mean; agreed assignments remain fixed |
| Metrics | Permutation-invariant accuracy, NMI, ARI |
| PCA | Visualization only; clustering uses all 64 original features |

## New Optdigits experiment results

The following are the **actual recorded results from the saved experiment run**, rounded to four decimal places. Times are wall-clock values from a single run and depend on the machine.

| Method | Accuracy | NMI | ARI | Conflicts before → after | Runtime (s) | Scored samples |
|---|---:|---:|---:|---:|---:|---:|
| K-Means | 0.7936 | 0.7579 | 0.6718 | N/A | 1.1408 | 5,620 |
| CHA (Ward) | 0.7952 | 0.8097 | 0.6972 | N/A | 1.9564 | 5,620 |
| KMCH before conflict resolution | 0.8842 | 0.8967 | 0.8358 | 1,165 → 1,165 | 3.1029 | 4,455 |
| KMCH after conflict resolution | 0.8053 | 0.7548 | 0.6718 | 1,165 → 0 | 3.1298 | 5,620 |

**88.42% is not the final KMCH accuracy.** It is calculated only on the 4,455 observations (79.3%) where K-Means and aligned CHA agree. The 80.53% post-resolution accuracy is measured over all 5,620 observations after the incremental step assigns the 1,165 disputed points. These scores have different coverage; do not interpret the pre-resolution figure as an apples-to-apples improvement over full-coverage baselines. “Zero conflicts after” means there are no `None`/unassigned outputs because the implementation assigns each dispute; it does not certify those assignments as correct.

The results are **not directly comparable to the thesis** because the dataset names conflict within the thesis and the exact Optdigits archive/version, preprocessing, parameters, split, alignment, and evaluation procedure are not documented well enough to confirm equivalence. See [`docs/experiment.md`](docs/experiment.md) and the saved [CSV table](results/tables/optdigits_results.csv).

## Visualizations

Figures are saved under [`results/figures/`](results/figures/):

- `optdigits_dataset_pca.png` — unlabelled dataset feature distribution.
- `optdigits_kmeans_pca.png` — K-Means clusters.
- `optdigits_cha_pca.png` — CHA clusters aligned to K-Means IDs for display.
- `optdigits_kmch_consensus_pca.png` — agreed labels, with conflicts marked `-1`.
- `optdigits_kmch_final_pca.png` — assignments after incremental conflict resolution.
- `optdigits_kmch_conflicts_pca.png` — conflicts highlighted against agreed samples.
- `optdigits_metrics_comparison.png` — accuracy, NMI, and ARI comparison.

PCA reduces the data to two dimensions **only for plotting**. Clustering and evaluation use the original 64-dimensional feature space.

## Repository structure

```text
kmch-clustering/
├── README.md
├── pyproject.toml
├── data/README.md
├── docs/
│   ├── thesis_notes.md
│   └── experiment.md
├── results/
│   ├── optdigits_config.json
│   ├── figures/
│   └── tables/optdigits_results.csv
├── scripts/run_optdigits.py       # compatibility wrapper
├── src/kmch/
│   ├── clustering.py
│   ├── data.py
│   ├── ensemble.py
│   ├── incremental.py
│   ├── metrics.py
│   ├── experiment.py              # pipeline and experiment command
│   └── cli.py                     # general demo/CSV command
└── tests/test_core.py
```

## Installation and commands

Python 3.10 or later is supported. From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install -e '.[test]'
```

Run the reproducible real-data experiment:

```bash
python -m kmch.experiment --dataset optdigits
```

It writes results to `results/` and updates `docs/experiment.md`. To change only the output directory or random seed, use `--output-dir PATH` or `--random-seed N`; the default seed is 42. The UCI archive checksum is pinned: if the source file changes, the program stops and requires inspection instead of overwriting the established run silently.

Run the synthetic smoke-test demo:

```bash
kmch
```

Run on your own numeric CSV (the reference-label column is optional and excluded from features):

```bash
kmch --csv data/my_dataset.csv --label-column class --clusters 10
```

`--clusters` is required for supplied datasets; the program never infers it from reference labels. Run tests with:

```bash
pytest -q
```

## Limitations and future work

The conflict update, tie-breaking and ordering are explicit repository choices because the thesis does not specify them fully. K-Means needs a chosen cluster count and can favor compact Euclidean groups; Ward linkage also uses Euclidean geometry. The pre-resolution score covers only agreed samples. This is one run and no confidence interval or seed-sensitivity analysis is reported. The thesis’s dataset/result inconsistencies preclude a controlled reproduction claim.

Reasonable next steps are repeated-seed evaluation, documented checks against other cluster alignment and conflict-resolution methods, runtime/memory profiling, and a benchmark protocol pinned to exact dataset versions. Such extensions should be reported separately from the core thesis-inspired workflow.

## Attribution

The research idea and terminology are attributed to the 2019 Master’s thesis. This code is an educational portfolio implementation with disclosed implementation decisions; it is not professional experience and does not claim to reproduce the thesis exactly.
