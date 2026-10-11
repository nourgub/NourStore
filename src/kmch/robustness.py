"""Multi-seed robustness study on UCI Optdigits.

Extension beyond the thesis. The published single-run experiment
(``kmch.experiment``, seed 42) is left unchanged; this module re-runs the same
pipeline over many K-Means seeds and adds a k-NN conflict resolver, so results
are reported as mean ± standard deviation instead of one run.

Run from the repository root:

    python -m kmch.robustness --seeds 20
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Sequence

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .data import load_optdigits, validate_features, validate_labels
from .experiment import OPTDIGITS_CLUSTERS, run_experiment
from .incremental import resolve_conflicts_knn
from .metrics import evaluate_clustering

METHODS = (
    ("kmeans", "K-Means"),
    ("cha", "CHA (Ward)"),
    ("kmch_incremental", "KMCH + incremental K-Means (thesis method)"),
    ("kmch_knn", "KMCH + k-NN on agreed points (extension)"),
)


def run_seeds(
    X: Any, y: Any, seeds: Sequence[int], n_clusters: int, n_neighbors: int = 10
) -> pd.DataFrame:
    """Return one row per (seed, method) with accuracy, NMI and ARI.

    Reference labels ``y`` are used only for scoring, after clustering.
    """
    features = validate_features(X)
    truth = validate_labels(y, len(features))
    rows = []
    for seed in seeds:
        result = run_experiment(features, y=truth, n_clusters=n_clusters, random_state=int(seed))
        knn_labels = resolve_conflicts_knn(
            features, result["consensus_labels"], result["conflict_mask"], n_neighbors=n_neighbors
        )
        scores = {
            "kmeans": result["metrics"]["kmeans"],
            "cha": result["metrics"]["cha"],
            "kmch_incremental": result["metrics"]["kmch_after_resolution"],
            "kmch_knn": evaluate_clustering(truth, np.asarray(knn_labels).astype(str)),
        }
        for key, name in METHODS:
            rows.append({
                "seed": int(seed), "method_key": key, "method": name,
                "accuracy": scores[key]["accuracy"], "nmi": scores[key]["nmi"], "ari": scores[key]["ari"],
                "conflicts": result["conflict_count_before"],
            })
    return pd.DataFrame(rows)


def summarize(per_seed: pd.DataFrame) -> pd.DataFrame:
    """Mean, standard deviation, min and max per method, plus how often each beats CHA."""
    order = [name for _, name in METHODS if name in set(per_seed["method"])]
    summary = (per_seed.groupby("method")[["accuracy", "nmi", "ari"]]
               .agg(["mean", "std", "min", "max"]).reindex(order))
    summary.columns = [f"{metric}_{stat}" for metric, stat in summary.columns]
    cha = per_seed[per_seed["method_key"] == "cha"].set_index("seed")["accuracy"]
    wins = {}
    for name, group in per_seed.groupby("method"):
        accuracy = group.set_index("seed")["accuracy"]
        wins[name] = int((accuracy > cha.reindex(accuracy.index)).sum())
    summary["seeds"] = per_seed["seed"].nunique()
    summary["accuracy_above_cha_runs"] = pd.Series(wins)
    return summary.reset_index()


def _save_chart(per_seed: pd.DataFrame, output_path: Path) -> None:
    order = [name for _, name in METHODS]
    data = [per_seed.loc[per_seed["method"] == name, "accuracy"].to_numpy() for name in order]
    fig, ax = plt.subplots(figsize=(10, 5.5), constrained_layout=True)
    try:  # Matplotlib >= 3.10
        ax.boxplot(data, orientation="horizontal", widths=0.5)
    except TypeError:
        ax.boxplot(data, vert=False, widths=0.5)
    for row, values in enumerate(data, start=1):
        jitter = np.linspace(-0.12, 0.12, len(values))
        ax.scatter(values, np.full(len(values), row) + jitter, s=14, alpha=0.7)
    ax.set_yticks(range(1, len(order) + 1), order)
    ax.set_xlabel("Clustering accuracy on all 5,620 samples (best label matching)")
    ax.set_title(f"UCI Optdigits, {per_seed['seed'].nunique()} K-Means seeds")
    ax.grid(axis="x", alpha=0.25)
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Multi-seed KMCH robustness study on Optdigits.")
    parser.add_argument("--seeds", type=int, default=20, help="Number of seeds, starting at 0.")
    parser.add_argument("--neighbors", type=int, default=10)
    parser.add_argument("--output-dir", type=Path, default=Path("results"))
    args = parser.parse_args(argv)

    X, y, _ = load_optdigits()
    per_seed = run_seeds(X, y, range(args.seeds), OPTDIGITS_CLUSTERS, args.neighbors)
    summary = summarize(per_seed)
    tables, figures = args.output_dir / "tables", args.output_dir / "figures"
    tables.mkdir(parents=True, exist_ok=True)
    figures.mkdir(parents=True, exist_ok=True)
    per_seed.to_csv(tables / "optdigits_multiseed_runs.csv", index=False)
    summary.to_csv(tables / "optdigits_multiseed_summary.csv", index=False)
    _save_chart(per_seed, figures / "optdigits_multiseed_accuracy.png")
    print(summary.to_string(index=False, float_format=lambda value: f"{value:.4f}"))


if __name__ == "__main__":
    main()
