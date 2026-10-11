from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike
from scipy.optimize import linear_sum_assignment
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score


def _validate_metric_labels(y_true: ArrayLike, y_pred: ArrayLike):
    truth, predicted = np.asarray(y_true), np.asarray(y_pred)
    if truth.ndim != 1 or predicted.ndim != 1:
        raise ValueError("Metric label arrays must be one-dimensional.")
    if len(truth) != len(predicted):
        raise ValueError("Metric label arrays must have equal lengths.")
    if len(truth) == 0:
        raise ValueError("Metric label arrays must not be empty.")
    return truth, predicted


def clustering_accuracy(y_true: ArrayLike, y_pred: ArrayLike) -> float:
    """Best one-to-one label-matched accuracy (external evaluation only)."""
    truth, predicted = _validate_metric_labels(y_true, y_pred)
    true_ids, true_inverse = np.unique(truth, return_inverse=True)
    predicted_ids, predicted_inverse = np.unique(predicted, return_inverse=True)
    contingency = np.zeros((len(true_ids), len(predicted_ids)), dtype=np.int64)
    np.add.at(contingency, (true_inverse, predicted_inverse), 1)
    rows, columns = linear_sum_assignment(-contingency)
    return float(contingency[rows, columns].sum() / len(truth))


def evaluate_clustering(y_true: ArrayLike, y_pred: ArrayLike) -> dict[str, float]:
    """Compute external clustering metrics without using labels for model fitting."""
    truth, predicted = _validate_metric_labels(y_true, y_pred)
    accuracy = clustering_accuracy(truth, predicted)
    return {
        "accuracy": accuracy,
        "nmi": float(normalized_mutual_info_score(truth, predicted)),
        "ari": float(adjusted_rand_score(truth, predicted)),
        "error_rate": 1.0 - accuracy,
    }
