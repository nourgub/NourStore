# Thesis source notes

Primary source: *Combinaison des classifieurs non supervisés*, GUEBAILI Nour ElHouda, Master Web et Intelligence Artificielle, Université Mohamed Chérif Messadia – Souk Ahras, 2018/2019. Notes below distinguish source statements from repository decisions.

## Thesis statements

- Research concerns combining unsupervised clustering outputs.
- The proposed combination uses K-Means and Classification Hiérarchique Ascendante (CHA), parallel architecture, common input, no interaction, fixed members, and simple voting.
- The thesis says an overlap matrix is computed for cluster pairs and the maximum overlap per column is used to infer equivalences.
- The vote example uses `0` for no assignment/conflict. It illustrates examples where aligned cluster assignments agree and disagreements are conflicts.
- Conflict points are collected in `Y`; existing final clustering is `X`. The high-level incremental algorithm applies incremental K-Means if `Y` is not empty, with the stated intention not to recluster already learned objects.
- An illustrated example states conflicts drop from 706 to 283 after incremental K-Means.
- Metrics in the thesis result tables include accuracy (called précision), NMI, and error rate. ARI is an additional repository external metric, not reported in the thesis result table.

## Dataset description in thesis

The table states: Letter Recognition 20,000 instances and 16 integer attributes; Gisette 13,500 instances and 5,000 integer attributes; Optdigits 5,620 instances and 64 integer attributes. The Letter Recognition prose says 17 features, inconsistent with the table.

## Reported result table

The table named as results of K-Means and CHA lists Letter Recognition, Pendigits, and Optdigits (not Gisette):

| Dataset | K-Means accuracy | CHA accuracy | K-Means NMI | CHA NMI | K-Means error | CHA error | Vote error |
|---|---:|---:|---:|---:|---:|---:|---:|
| Letter Recognition | 11.67 | 16.79 | 19.67 | 25.95 | 88.33 | 83.21 | 7.32 |
| Pendigits | 77.08 | 79.20 | 80.61 | 78.52 | 22.92 | 20.8 | 9.43 |
| Optdigits | 80.617 | 79.204 | 77.084 | 78.424 | 19.38 | 20.796 | 20.21 |

The table's units/scaling for NMI are not explicitly clear in the extracted presentation; do not silently normalize these values or assert that they are conventional 0–1 NMI scores.

## Internal inconsistencies / missing experimental details

1. Abstract and conclusion list Letter Recognition, Gisette, Optdigits, but the results table lists Letter Recognition, Pendigits, Optdigits.
2. Abstract claims 91.01% accuracy and a 30% improvement; general conclusion claims a 97% recognition rate. Neither is reconciled against dataset-specific table entries and a clear protocol.
3. Letter feature count differs (17 in prose; 16 in table).
4. The described per-column maximum overlap rule does not state how conflicting matches are resolved or how unequal cluster counts are handled.
5. Voting does not provide a fully formal rule for ties, zeros, or mapping in all cases.
6. Incremental K-Means is presented at a high level only; initialization, order, exact centroid update, and stopping criteria are not specified.
7. The results table does not fully document feature scaling, exact dataset files, splitting, random seeds, parameter settings, or how accuracy is calculated under label permutations.

## Repository implementation decisions (not claimed as thesis facts)

- **Repository implementation decision — not specified by the thesis:** global Hungarian maximum-overlap matching provides deterministic one-to-one alignment. This differs from the thesis's abbreviated per-column maximum description.
- **Repository implementation decision — not specified by the thesis:** consensus means agreement after alignment; every disagreement is marked as a conflict.
- **Repository implementation decision — not specified by the thesis:** conflicts are processed in source row order by nearest-centroid assignment and online mean update, seeded by agreed samples; agreed assignments are preserved.
- **Repository implementation decision — not specified by the thesis:** clustering accuracy uses best one-to-one label matching; NMI and ARI use scikit-learn. True labels are held out from clustering, alignment, voting, conflict resolution, and plots; they are used only for external scoring.
- **Repository implementation decision — not specified by the thesis:** the Optdigits experiment uses all 5,620 official records together, raw unscaled features, k=10, K-Means `n_init=10` and seed 42, and CHA Ward linkage. This is a new experiment, not benchmark reproduction.
- Synthetic demo results are software smoke tests, not benchmark replication. See [`experiment.md`](experiment.md) for the separate new Optdigits run and the distinction from the thesis-reported numbers.
