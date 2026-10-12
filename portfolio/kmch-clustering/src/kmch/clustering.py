from __future__ import annotations

from typing import Any

from numpy.typing import ArrayLike, NDArray
from sklearn.cluster import AgglomerativeClustering, KMeans

from .data import validate_features


def _validate_cluster_count(n_clusters: int, n_samples: int) -> None:
    if not isinstance(n_clusters, int) or not 1 <= n_clusters <= n_samples:
        raise ValueError("n_clusters must be an integer between 1 and sample count.")


def fit_kmeans(
    X: ArrayLike, n_clusters: int, random_state: int = 42
) -> tuple[KMeans, NDArray[Any]]:
    """Fit K-Means and return the estimator and sample cluster labels."""
    features = validate_features(X)
    _validate_cluster_count(n_clusters, len(features))
    model = KMeans(
        n_clusters=n_clusters, n_init=10, random_state=random_state
    )
    return model, model.fit_predict(features)


def fit_hierarchical(
    X: ArrayLike, n_clusters: int, linkage: str = "ward"
) -> tuple[AgglomerativeClustering, NDArray[Any]]:
    """Fit agglomerative hierarchical clustering (CHA)."""
    features = validate_features(X)
    _validate_cluster_count(n_clusters, len(features))
    model = AgglomerativeClustering(n_clusters=n_clusters, linkage=linkage)
    return model, model.fit_predict(features)
