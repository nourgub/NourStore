from __future__ import annotations

import argparse
import json
from typing import Sequence

from .data import load_csv
from .experiment import make_demo_data, run_experiment


def main(argv: Sequence[str] | None = None) -> None:
    """Run the synthetic demo or a numeric CSV clustering experiment."""
    parser = argparse.ArgumentParser(description="Run the KMCH clustering pipeline.")
    parser.add_argument("--csv", help="Optional local numeric CSV file.")
    parser.add_argument("--label-column", help="Reference label column for external evaluation only.")
    parser.add_argument("--clusters", type=int, help="Cluster count; required for CSV data.")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args(argv)

    if args.csv:
        features, labels = load_csv(args.csv, args.label_column)
        if args.clusters is None:
            parser.error("--clusters is required for CSV data; it is never inferred from labels.")
        cluster_count = args.clusters
    else:
        if args.label_column:
            parser.error("--label-column is only valid with --csv.")
        features, labels = make_demo_data(args.seed)
        cluster_count = args.clusters if args.clusters is not None else 4

    result = run_experiment(
        features, y=labels, n_clusters=cluster_count, random_state=args.seed
    )
    summary = {
        "samples": len(features),
        "features": features.shape[1],
        "n_clusters": cluster_count,
        "conflicts_before_incremental": result["conflict_count_before"],
        "unassigned_after_incremental": result["conflict_count_after"],
        "metrics": result.get("metrics"),
    }
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
