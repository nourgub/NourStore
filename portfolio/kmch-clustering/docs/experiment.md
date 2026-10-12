# Optdigits experiment

## A. Thesis-reported results

| Thesis table (Optdigits) | Accuracy as printed | NMI as printed | Error as printed |
|---|---:|---:|---:|
| K-Means | 80.617 | 77.084 | 19.38 |
| CHA | 79.204 | 78.424 | 20.796 |
| Vote | not separately given as accuracy | not reported | 20.21 |

Thesis units/scale for NMI are unclear in the table. Other thesis headline statements include 91.01% in the abstract and 97% in the conclusion; these are not reconciled with dataset-specific result protocols.

The thesis lists Optdigits in its abstract/conclusion and gives 5,620 × 64 for its dataset description, but its experiment table lists Pendigits in place of Gisette. It does not document a fully reproducible Optdigits protocol.

## B. New repository experiment results

Dataset: [UCI Optical Recognition of Handwritten Digits (Optdigits)](https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits) (UCI ID 80), 5,620 samples, 64 numeric features, 10 classes. Archive SHA-256: `0d7b054fea010270e9b3f06411c654c5e59547732ad626381980baffe0a23fb0`. Reference labels are held out from all clustering/combination steps and used only for external metrics; plots use features, predicted clusters, and conflict status only.

| method                          |   accuracy |    nmi |    ari |   conflicts_before |   conflicts_after |   runtime_seconds |   evaluated_samples |
|:--------------------------------|-----------:|-------:|-------:|-------------------:|------------------:|------------------:|--------------------:|
| K-Means                         |     0.7936 | 0.7579 | 0.6718 |           nan      |          nan      |            1.1408 |                5620 |
| CHA (Ward)                      |     0.7952 | 0.8097 | 0.6972 |           nan      |          nan      |            1.9564 |                5620 |
| KMCH before conflict resolution |     0.8842 | 0.8967 | 0.8358 |          1165.0000 |         1165.0000 |            3.1029 |                4455 |
| KMCH after conflict resolution  |     0.8053 | 0.7548 | 0.6718 |          1165.0000 |            0.0000 |            3.1298 |                5620 |

KMCH before conflict resolution scores only the agreed samples (4,455/5,620; 79.3%). The post-resolution score is computed over the full dataset. Therefore, the higher pre-resolution accuracy is not a like-for-like comparison with full-coverage baselines and must not be presented as final KMCH accuracy.

“Conflicts after” is the number of rows still carrying the unassigned sentinel. It is zero because the implementation assigns every conflict to a nearest current centroid; it does not validate correctness.

## Experimental configuration

- Dataset files: official `optdigits.tra` and `optdigits.tes`, concatenated, preserving order; no rows dropped.
- Missing values: none reported by UCI; none found in source files.
- Scaling: none; original pixel-count values 0–16.
- Clusters: k=10, informed by the known digit-code cardinality.
- K-Means: `n_clusters=10`, `n_init=10`, `random_state=42`.
- CHA: `n_clusters=10`, `linkage='ward'`, Euclidean Ward criterion.
- Alignment: global Hungarian one-to-one matching on cluster overlap.
- Conflict update: original row order; nearest centroid, online running-mean update; agreed labels fixed.
- Metrics: permutation-invariant accuracy, NMI, ARI. PCA is used only for plotting.
- Environment: Python 3.12.3, NumPy 2.5.3, pandas 3.0.6, scikit-learn 1.9.1.

These are **Repository implementation decision — not specified by the thesis.** In particular, global Hungarian alignment is not claimed as the thesis method; the thesis describes per-column maximum overlap without fully specifying collisions.

## Visualizations

- `results/figures/optdigits_dataset_pca.png`
- `results/figures/optdigits_kmeans_pca.png`
- `results/figures/optdigits_cha_pca.png`
- `results/figures/optdigits_kmch_consensus_pca.png`
- `results/figures/optdigits_kmch_final_pca.png`
- `results/figures/optdigits_kmch_conflicts_pca.png`
- `results/figures/optdigits_metrics_comparison.png`

The PCA projection is for visual communication only; clustering and metric computation use all original 64-dimensional input features. Reference labels are not used to produce any plot.

## Reproduction

From the repository root after `python -m pip install -e '.[test]'`:

```bash
python -m kmch.experiment --dataset optdigits
```

The dataset is downloaded in memory from UCI, checked against the archived SHA-256 digest, and not stored in the repository. If UCI changes the archive bytes, the loader stops and asks for inspection rather than silently changing the dataset behind the saved result.

## Interpretation and comparison

The new experiment's full-coverage KMCH accuracy is 0.8053; its agreed-subset score is 0.8842. The latter covers fewer cases. The results are **not directly comparable** with the thesis because the thesis dataset list is inconsistent and exact data version, preprocessing, parameters, split, alignment, and evaluation protocol are not sufficiently specified.
