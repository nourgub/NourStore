from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import ArrayLike, NDArray
from scipy.optimize import linear_sum_assignment
from sklearn.metrics.cluster import contingency_matrix


def align_labels(
    reference: ArrayLike, candidate: ArrayLike
) -> tuple[NDArray[Any], dict[Any, Any], NDArray[np.int64]]:
    """Map candidate IDs to reference IDs by maximum global overlap.

    Hungarian one-to-one matching is a repository implementation choice. The
    thesis describes per-column maxima but leaves collision handling unclear.
    """
    reference_labels = np.asarray(reference)
    candidate_labels = np.asarray(candidate)
    if (reference_labels.ndim != 1 or candidate_labels.ndim != 1
            or len(reference_labels) != len(candidate_labels)):
        raise ValueError("Both label vectors must be 1D and have equal length.")
    if len(reference_labels) == 0:
        raise ValueError("Cannot align empty label vectors.")

    ref_ids, ref_inverse = np.unique(reference_labels, return_inverse=True)
    candidate_ids, candidate_inverse = np.unique(candidate_labels, return_inverse=True)
    overlap = contingency_matrix(ref_inverse, candidate_inverse)
    rows, columns = linear_sum_assignment(-overlap)
    mapping = {candidate_ids[column].item() if hasattr(candidate_ids[column], "item") else candidate_ids[column]:
               ref_ids[row].item() if hasattr(ref_ids[row], "item") else ref_ids[row]
               for row, column in zip(rows, columns)}
    for column, candidate_id in enumerate(candidate_ids):
        key = candidate_id.item() if hasattr(candidate_id, "item") else candidate_id
        if key not in mapping:
            best = ref_ids[int(np.argmax(overlap[:, column]))]
            mapping[key] = best.item() if hasattr(best, "item") else best
    aligned = np.asarray([mapping[value.item() if hasattr(value, "item") else value]
                          for value in candidate_labels])
    return aligned, mapping, overlap


def simple_vote(
    labels_a: ArrayLike, labels_b: ArrayLike
) -> tuple[NDArray[Any], NDArray[np.bool_]]:
    """Retain agreements and mark disagreements as conflict points."""
    first, second = np.asarray(labels_a), np.asarray(labels_b)
    if first.ndim != 1 or second.ndim != 1 or len(first) != len(second):
        raise ValueError("Label vectors must be 1D and have equal length.")
    if len(first) == 0:
        raise ValueError("Cannot vote on empty label vectors.")
    conflicts = first != second
    consensus = np.empty(len(first), dtype=object)
    consensus[:] = None
    consensus[~conflicts] = first[~conflicts]
    return consensus, conflicts
