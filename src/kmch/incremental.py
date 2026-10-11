from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import ArrayLike, NDArray

from .data import validate_features


def resolve_conflicts_incrementally(
    X: ArrayLike,
    consensus: ArrayLike,
    conflict_mask: ArrayLike,
) -> NDArray[Any]:
    """Assign conflicts to nearest agreed-cluster centroids and update online.

    Agreed rows are never reassigned. The thesis proposes incremental K-Means
    but does not give the initialization, update equation, or processing order;
    this online running-mean version is therefore an explicit repository choice.
    """
    features = validate_features(X)
    assignments = np.asarray(consensus, dtype=object)
    conflicts = np.asarray(conflict_mask, dtype=bool)
    expected_shape = (len(features),)
    if assignments.shape != expected_shape or conflicts.shape != expected_shape:
        raise ValueError("consensus and conflict_mask must match the sample count.")
    if np.any(assignments[~conflicts] == None):
        raise ValueError("Non-conflict samples must have consensus cluster labels.")
    if not conflicts.any():
        return assignments.copy()

    fixed = ~conflicts
    if not fixed.any():
        raise ValueError("Cannot initialize incremental centroids: no agreed samples.")
    labels = np.unique(assignments[fixed])
    centers = np.vstack([
        features[fixed & (assignments == label)].mean(axis=0) for label in labels
    ])
    counts = np.asarray([
        np.sum(fixed & (assignments == label)) for label in labels
    ], dtype=np.int64)
    output = assignments.copy()
    for index in np.flatnonzero(conflicts):
        squared_distances = np.sum((centers - features[index]) ** 2, axis=1)
        winner = int(np.argmin(squared_distances))
        output[index] = labels[winner]
        counts[winner] += 1
        centers[winner] += (features[index] - centers[winner]) / counts[winner]
    return output


def resolve_conflicts_knn(
    X: ArrayLike,
    consensus: ArrayLike,
    conflict_mask: ArrayLike,
    n_neighbors: int = 10,
) -> NDArray[Any]:
    """Assign conflicts with a k-NN classifier trained on agreed samples.

    Extension beyond the thesis. The agreed samples act as pseudo-labelled
    training data: their labels come from the K-Means/CHA consensus, never
    from reference labels. Conflicts are classified in one batch, so the
    result does not depend on row order. Agreed rows are never reassigned.
    """
    from sklearn.neighbors import KNeighborsClassifier

    features = validate_features(X)
    assignments = np.asarray(consensus, dtype=object)
    conflicts = np.asarray(conflict_mask, dtype=bool)
    expected_shape = (len(features),)
    if assignments.shape != expected_shape or conflicts.shape != expected_shape:
        raise ValueError("consensus and conflict_mask must match the sample count.")
    if np.any(assignments[~conflicts] == None):
        raise ValueError("Non-conflict samples must have consensus cluster labels.")
    if not conflicts.any():
        return assignments.copy()
    fixed = ~conflicts
    if not fixed.any():
        raise ValueError("Cannot train the k-NN resolver: no agreed samples.")
    if not isinstance(n_neighbors, int) or n_neighbors < 1:
        raise ValueError("n_neighbors must be a positive integer.")

    train_labels = assignments[fixed]
    label_ids, encoded = np.unique(train_labels.astype(str), return_inverse=True)
    originals = {code: train_labels[np.flatnonzero(encoded == code)[0]] for code in range(len(label_ids))}
    model = KNeighborsClassifier(n_neighbors=min(n_neighbors, int(fixed.sum())))
    model.fit(features[fixed], encoded)
    output = assignments.copy()
    predicted = model.predict(features[conflicts])
    output[np.flatnonzero(conflicts)] = [originals[int(code)] for code in predicted]
    return output
