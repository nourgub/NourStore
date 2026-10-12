from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import platform
import time
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.datasets import make_blobs
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from .clustering import fit_hierarchical, fit_kmeans
from .data import load_optdigits, validate_features, validate_labels
from .ensemble import align_labels, simple_vote
from .incremental import resolve_conflicts_incrementally
from .metrics import evaluate_clustering

RANDOM_SEED = 42
OPTDIGITS_CLUSTERS = 10


def run_experiment(
    X: Any,
    y: Any | None = None,
    n_clusters: int | None = None,
    random_state: int = RANDOM_SEED,
) -> dict[str, Any]:
    """Run K-Means + CHA -> alignment -> consensus -> incremental conflicts.

    ``n_clusters`` must be set explicitly, even when reference labels are
    supplied. This prevents the evaluation labels from implicitly selecting
    the cluster count. ``y`` is inspected only after clustering, for metrics.
    """
    features = validate_features(X)
    if n_clusters is None:
        raise ValueError(
            "n_clusters must be provided explicitly; it is never inferred from y."
        )
    if not isinstance(n_clusters, int) or not 1 <= n_clusters <= len(features):
        raise ValueError("n_clusters must be an integer between 1 and sample count.")
    started = time.perf_counter()
    kmeans_model, kmeans_labels = fit_kmeans(
        features, n_clusters=n_clusters, random_state=random_state
    )
    kmeans_seconds = time.perf_counter() - started

    started = time.perf_counter()
    cha_model, cha_labels = fit_hierarchical(
        features, n_clusters=n_clusters, linkage="ward"
    )
    cha_seconds = time.perf_counter() - started

    started = time.perf_counter()
    aligned_cha_labels, mapping, overlap = align_labels(kmeans_labels, cha_labels)
    consensus_labels, conflict_mask = simple_vote(kmeans_labels, aligned_cha_labels)
    consensus_seconds = time.perf_counter() - started

    started = time.perf_counter()
    final_labels = resolve_conflicts_incrementally(
        features, consensus_labels, conflict_mask
    )
    incremental_seconds = time.perf_counter() - started
    conflicts_after = sum(label is None for label in final_labels)
    agreed_mask = ~conflict_mask

    result: dict[str, Any] = {
        "kmeans_labels": kmeans_labels,
        "cha_labels": cha_labels,
        "aligned_cha_labels": aligned_cha_labels,
        "consensus_labels": consensus_labels,
        "conflict_mask": conflict_mask,
        "final_labels": final_labels,
        "conflict_count_before": int(conflict_mask.sum()),
        "conflict_count_after": int(conflicts_after),
        "agreed_count": int(agreed_mask.sum()),
        "alignment_mapping": mapping,
        "overlap_matrix": overlap,
        "models": (kmeans_model, cha_model),
        "runtime_seconds": {
            "kmeans": kmeans_seconds,
            "cha": cha_seconds,
            "kmch_before_resolution": kmeans_seconds + cha_seconds + consensus_seconds,
            "incremental_resolution": incremental_seconds,
            "kmch_after_resolution": (
                kmeans_seconds + cha_seconds + consensus_seconds + incremental_seconds
            ),
        },
    }
    if y is not None:
        truth = validate_labels(y, len(features))
        result["metrics"] = {
            "kmeans": evaluate_clustering(truth, kmeans_labels),
            "cha": evaluate_clustering(truth, cha_labels),
            "kmch_before_resolution": (
                evaluate_clustering(truth[agreed_mask], consensus_labels[agreed_mask])
                if agreed_mask.any()
                else None
            ),
            "kmch_after_resolution": evaluate_clustering(truth, final_labels),
        }
    return result


def make_demo_data(random_state: int = RANDOM_SEED):
    """Return a deterministic synthetic toy set for a lightweight smoke test."""
    features, labels = make_blobs(
        n_samples=600, centers=4, n_features=5, cluster_std=2.0,
        random_state=random_state,
    )
    return StandardScaler().fit_transform(features), labels


def _save_scatter(
    coordinates: np.ndarray,
    color_values: np.ndarray,
    title: str,
    output_path: Path,
    colorbar_label: str,
) -> None:
    fig, ax = plt.subplots(figsize=(8, 6), constrained_layout=True)
    points = ax.scatter(
        coordinates[:, 0], coordinates[:, 1], c=color_values, s=8,
        cmap="tab10", alpha=0.78, rasterized=True,
    )
    fig.colorbar(points, ax=ax, label=colorbar_label, ticks=np.unique(color_values))
    ax.set(title=title, xlabel="PCA component 1", ylabel="PCA component 2")
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def _save_conflict_plot(
    coordinates: np.ndarray, conflict_mask: np.ndarray, output_path: Path
) -> None:
    fig, ax = plt.subplots(figsize=(8, 6), constrained_layout=True)
    ax.scatter(coordinates[~conflict_mask, 0], coordinates[~conflict_mask, 1],
               c="#b8c2cc", s=8, alpha=0.55, label="Agreed")
    ax.scatter(coordinates[conflict_mask, 0], coordinates[conflict_mask, 1],
               c="#d62728", s=11, alpha=0.85, label="Conflict")
    ax.set(title="KMCH conflict points (PCA visualization only)",
           xlabel="PCA component 1", ylabel="PCA component 2")
    ax.legend(frameon=False)
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def _save_dataset_projection(coordinates: np.ndarray, output_path: Path) -> None:
    """Plot feature-space geometry without consulting reference labels."""
    fig, ax = plt.subplots(figsize=(8, 6), constrained_layout=True)
    ax.scatter(coordinates[:, 0], coordinates[:, 1], c="#3973ac", s=8,
               alpha=0.7, rasterized=True)
    ax.set(title="Optdigits feature distribution (PCA; labels not shown)",
           xlabel="PCA component 1", ylabel="PCA component 2")
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def _save_metric_chart(table: pd.DataFrame, output_path: Path) -> None:
    methods = table["method"].tolist()
    metrics = ["accuracy", "nmi", "ari"]
    values = table[metrics].to_numpy(dtype=float)
    positions = np.arange(len(methods))
    width = 0.24
    fig, ax = plt.subplots(figsize=(11, 6), constrained_layout=True)
    for index, metric in enumerate(metrics):
        ax.bar(positions + (index - 1) * width, values[:, index], width, label=metric.upper())
    ax.set_xticks(positions, methods, rotation=15, ha="right")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Score (0–1)")
    ax.set_title("External clustering metrics on UCI Optdigits")
    ax.legend(frameon=False)
    ax.grid(axis="y", alpha=0.2)
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def _write_figures(
    X: np.ndarray, result: dict[str, Any], table: pd.DataFrame, figures_dir: Path
) -> list[str]:
    figures_dir.mkdir(parents=True, exist_ok=True)
    # PCA is deliberately isolated to visualization; clustering uses all raw features.
    coordinates = PCA(n_components=2, svd_solver="full").fit_transform(X)
    outputs = {
        "dataset_pca": "optdigits_dataset_pca.png",
        "kmeans": "optdigits_kmeans_pca.png",
        "cha": "optdigits_cha_pca.png",
        "consensus": "optdigits_kmch_consensus_pca.png",
        "final": "optdigits_kmch_final_pca.png",
        "conflicts": "optdigits_kmch_conflicts_pca.png",
        "comparison": "optdigits_metrics_comparison.png",
    }
    _save_dataset_projection(coordinates, figures_dir / outputs["dataset_pca"])
    _save_scatter(coordinates, result["kmeans_labels"], "K-Means clusters",
                  figures_dir / outputs["kmeans"], "Cluster ID")
    _save_scatter(coordinates, result["aligned_cha_labels"], "CHA clusters (aligned to K-Means)",
                  figures_dir / outputs["cha"], "Aligned cluster ID")
    consensus_plot = np.asarray([
        -1 if label is None else int(label)
        for label in result["consensus_labels"]
    ], dtype=int)
    _save_scatter(coordinates, consensus_plot, "KMCH consensus (-1 marks conflicts)",
                  figures_dir / outputs["consensus"], "Cluster ID / conflict")
    _save_scatter(coordinates, np.asarray(result["final_labels"], dtype=int),
                  "KMCH after incremental conflict resolution",
                  figures_dir / outputs["final"], "Cluster ID")
    _save_conflict_plot(coordinates, result["conflict_mask"], figures_dir / outputs["conflicts"])
    _save_metric_chart(table, figures_dir / outputs["comparison"])
    return list(outputs.values())


def _build_result_table(result: dict[str, Any]) -> pd.DataFrame:
    metrics = result["metrics"]
    times = result["runtime_seconds"]
    specifications = [
        ("K-Means", "kmeans", None, None, len(result["kmeans_labels"]), times["kmeans"]),
        ("CHA (Ward)", "cha", None, None, len(result["cha_labels"]), times["cha"]),
        ("KMCH before conflict resolution", "kmch_before_resolution",
         result["conflict_count_before"], result["conflict_count_before"],
         result["agreed_count"], times["kmch_before_resolution"]),
        ("KMCH after conflict resolution", "kmch_after_resolution",
         result["conflict_count_before"], result["conflict_count_after"],
         len(result["final_labels"]), times["kmch_after_resolution"]),
    ]
    rows = []
    for name, key, before, after, count, runtime in specifications:
        scores = metrics[key]
        rows.append({
            "method": name,
            "accuracy": scores["accuracy"],
            "nmi": scores["nmi"],
            "ari": scores["ari"],
            "conflicts_before": before,
            "conflicts_after": after,
            "runtime_seconds": runtime,
            "evaluated_samples": count,
        })
    return pd.DataFrame(rows)


def run_optdigits_experiment(
    output_dir: str | Path = "results",
    random_seed: int = RANDOM_SEED,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Run the UCI Optdigits experiment and persist reports/figures."""
    X, y, metadata = load_optdigits()
    result = run_experiment(
        X, y=y, n_clusters=OPTDIGITS_CLUSTERS, random_state=random_seed
    )
    table = _build_result_table(result)
    output_path = Path(output_dir)
    tables_dir = output_path / "tables"
    figures_dir = output_path / "figures"
    tables_dir.mkdir(parents=True, exist_ok=True)
    table.to_csv(tables_dir / "optdigits_results.csv", index=False)
    figure_names = _write_figures(X, result, table, figures_dir)

    config = {
        **metadata,
        "experiment_category": "New UCI experiment; not a thesis reproduction",
        "run_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "python": platform.python_version(), "numpy": np.__version__,
            "pandas": pd.__version__, "scikit_learn": sklearn.__version__,
        },
        "feature_preprocessing": "Concatenate official optdigits.tra and optdigits.tes; no rows dropped; original feature order.",
        "scaling": "None; use pixel count values 0–16 as supplied.",
        "n_clusters": OPTDIGITS_CLUSTERS,
        "kmeans": {"n_clusters": OPTDIGITS_CLUSTERS, "n_init": 10,
                   "random_state": random_seed, "other_parameters": "scikit-learn defaults"},
        "agglomerative": {"n_clusters": OPTDIGITS_CLUSTERS, "linkage": "ward",
                          "metric": "euclidean (Ward requirement)",
                          "other_parameters": "scikit-learn defaults"},
        "random_seed": random_seed,
        "alignment": "Global one-to-one maximum-overlap matching using Hungarian assignment.",
        "vote_conflict_rule": "After alignment, agreement is consensus; disagreement is a conflict.",
        "conflict_resolution": "Process conflicts in original row order; assign to the nearest centroid initialized from agreed samples and update its running mean online. Agreed labels remain fixed.",
        "metrics": "Permutation-invariant accuracy, NMI, ARI. Pre-resolution KMCH scores cover only the agreed subset.",
        "timing_definition": "Single wall-clock perf_counter run; model fit/predict for base rows; KMCH totals include both base runs plus alignment/vote, and final total additionally includes incremental processing.",
        "conflict_counts": {"before": result["conflict_count_before"],
                            "after": result["conflict_count_after"],
                            "after_definition": "Number of final rows still carrying the None/unassigned sentinel; zero means all conflicts were assigned, not that assignments were verified."},
        "figure_files": figure_names,
        "repository_implementation_decisions": [
            "Repository implementation decision — not specified by the thesis: k=10, based on the known digit class cardinality.",
            "Repository implementation decision — not specified by the thesis: no feature scaling.",
            "Repository implementation decision — not specified by the thesis: K-Means n_init=10 and random seed 42 by default.",
            "Repository implementation decision — not specified by the thesis: Hungarian global one-to-one cluster-label alignment.",
            "Repository implementation decision — not specified by the thesis: online nearest-centroid mean update and original data-row processing order for conflicts.",
        ],
        "labels_policy": "Reference labels are not passed to K-Means, CHA, alignment, voting, conflict resolution, or plots; used only to calculate external metrics.",
        "thesis_comparison": "Not directly comparable: the thesis has dataset-list inconsistencies and lacks a fully specified matching preprocessing, parameter, split, alignment, and evaluation protocol.",
    }
    config_path = output_path / "optdigits_config.json"
    config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return table, {"metadata": metadata, "config": config, "result": result,
                   "output_dir": output_path, "figure_files": figure_names}


def _write_experiment_doc(table: pd.DataFrame, details: dict[str, Any]) -> Path:
    result = details["result"]
    metadata = details["metadata"]
    output_dir: Path = details["output_dir"]
    repository_root = Path.cwd()
    doc_path = repository_root / "docs" / "experiment.md"
    doc_path.parent.mkdir(parents=True, exist_ok=True)
    figure_rows = "\n".join(
        f"- `{output_dir / 'figures' / filename}`" for filename in details["figure_files"]
    )
    thesis = (
        "| Thesis table (Optdigits) | Accuracy as printed | NMI as printed | Error as printed |\n"
        "|---|---:|---:|---:|\n"
        "| K-Means | 80.617 | 77.084 | 19.38 |\n"
        "| CHA | 79.204 | 78.424 | 20.796 |\n"
        "| Vote | not separately given as accuracy | not reported | 20.21 |\n\n"
        "Thesis units/scale for NMI are unclear in the table. Other thesis headline statements include 91.01% in the abstract and 97% in the conclusion; these are not reconciled with dataset-specific result protocols."
    )
    text = f"""# Optdigits experiment

## A. Thesis-reported results

{thesis}

The thesis lists Optdigits in its abstract/conclusion and gives 5,620 × 64 for its dataset description, but its experiment table lists Pendigits in place of Gisette. It does not document a fully reproducible Optdigits protocol.

## B. New repository experiment results

Dataset: [{metadata['dataset']}]({metadata['dataset_page']}) (UCI ID {metadata['dataset_id']}), {metadata['samples']:,} samples, {metadata['features']} numeric features, {metadata['classes']} classes. Archive SHA-256: `{metadata['archive_sha256']}`. Reference labels are held out from all clustering/combination steps and used only for external metrics; plots use features, predicted clusters, and conflict status only.

{table.to_markdown(index=False, floatfmt='.4f')}

KMCH before conflict resolution scores only the agreed samples ({result['agreed_count']:,}/{metadata['samples']:,}; {result['agreed_count'] / metadata['samples']:.1%}). The post-resolution score is computed over the full dataset. Therefore, the higher pre-resolution accuracy is not a like-for-like comparison with full-coverage baselines and must not be presented as final KMCH accuracy.

“Conflicts after” is the number of rows still carrying the unassigned sentinel. It is zero because the implementation assigns every conflict to a nearest current centroid; it does not validate correctness.

## Experimental configuration

- Dataset files: official `optdigits.tra` and `optdigits.tes`, concatenated, preserving order; no rows dropped.
- Missing values: none reported by UCI; none found in source files.
- Scaling: none; original pixel-count values 0–16.
- Clusters: k=10, informed by the known digit-code cardinality.
- K-Means: `n_clusters=10`, `n_init=10`, `random_state={details['config']['random_seed']}`.
- CHA: `n_clusters=10`, `linkage='ward'`, Euclidean Ward criterion.
- Alignment: global Hungarian one-to-one matching on cluster overlap.
- Conflict update: original row order; nearest centroid, online running-mean update; agreed labels fixed.
- Metrics: permutation-invariant accuracy, NMI, ARI. PCA is used only for plotting.
- Environment: Python {details['config']['environment']['python']}, NumPy {details['config']['environment']['numpy']}, pandas {details['config']['environment']['pandas']}, scikit-learn {details['config']['environment']['scikit_learn']}.

These are **Repository implementation decision — not specified by the thesis.** In particular, global Hungarian alignment is not claimed as the thesis method; the thesis describes per-column maximum overlap without fully specifying collisions.

## Visualizations

{figure_rows}

The PCA projection is for visual communication only; clustering and metric computation use all original 64-dimensional input features. Reference labels are not used to produce any plot.

## Reproduction

From the repository root after `python -m pip install -e '.[test]'`:

```bash
python -m kmch.experiment --dataset optdigits
```

The dataset is downloaded in memory from UCI, checked against the archived SHA-256 digest, and not stored in the repository. If UCI changes the archive bytes, the loader stops and asks for inspection rather than silently changing the dataset behind the saved result.

## Interpretation and comparison

The new experiment's full-coverage KMCH accuracy is {table.loc[table['method'] == 'KMCH after conflict resolution', 'accuracy'].iloc[0]:.4f}; its agreed-subset score is {table.loc[table['method'] == 'KMCH before conflict resolution', 'accuracy'].iloc[0]:.4f}. The latter covers fewer cases. The results are **not directly comparable** with the thesis because the thesis dataset list is inconsistent and exact data version, preprocessing, parameters, split, alignment, and evaluation protocol are not sufficiently specified.
"""
    doc_path.write_text(text, encoding="utf-8")
    return doc_path


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run a reproducible KMCH dataset experiment.")
    parser.add_argument("--dataset", choices=["optdigits"], required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("results"))
    parser.add_argument("--random-seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args(argv)

    table, details = run_optdigits_experiment(args.output_dir, args.random_seed)
    doc_path = _write_experiment_doc(table, details)
    print(table.to_string(index=False, float_format=lambda value: f"{value:.6f}"))
    print(f"\nConflicts: {details['result']['conflict_count_before']} before; "
          f"{details['result']['conflict_count_after']} unassigned after.")
    print(f"Archive SHA-256: {details['metadata']['archive_sha256']}")
    print(f"Experiment documentation: {doc_path}")
    print(f"Tables/config/figures saved under: {args.output_dir}")


if __name__ == "__main__":
    main()
