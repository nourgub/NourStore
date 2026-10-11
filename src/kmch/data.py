from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen
import hashlib
import zipfile

import numpy as np
import pandas as pd
from numpy.typing import ArrayLike, NDArray

OPTDIGITS_URL = (
    "https://archive.ics.uci.edu/static/public/80/"
    "optical+recognition+of+handwritten+digits.zip"
)
OPTDIGITS_PAGE = (
    "https://archive.ics.uci.edu/dataset/80/"
    "optical+recognition+of+handwritten+digits"
)
# This checksum pins the precise public archive used for the documented run.
OPTDIGITS_SHA256 = "0d7b054fea010270e9b3f06411c654c5e59547732ad626381980baffe0a23fb0"


def validate_features(X: ArrayLike) -> NDArray[np.float64]:
    """Return a finite, non-empty 2D numeric feature matrix."""
    try:
        array = np.asarray(X, dtype=np.float64)
    except (TypeError, ValueError) as exc:
        raise ValueError("X must contain numeric features.") from exc
    if array.ndim != 2:
        raise ValueError("X must be 2D (samples × features).")
    if not array.shape[0] or not array.shape[1]:
        raise ValueError("X must contain at least one sample and feature.")
    if not np.isfinite(array).all():
        raise ValueError("X must not contain NaN or infinite values.")
    return array


def validate_labels(y: ArrayLike, n_samples: int) -> NDArray[Any]:
    """Validate reference labels; labels are intended only for external metrics."""
    labels = np.asarray(y)
    if labels.ndim != 1:
        raise ValueError("y must be one-dimensional.")
    if len(labels) != n_samples:
        raise ValueError(f"y has {len(labels)} values; expected {n_samples}.")
    if n_samples == 0:
        raise ValueError("y must contain at least one label.")
    return labels


def load_csv(
    path: str | Path, label_column: str | None = None
) -> tuple[NDArray[np.float64], NDArray[Any] | None]:
    """Load a numeric CSV and optionally separate one external label column."""
    frame = pd.read_csv(path)
    if frame.empty:
        raise ValueError("CSV contains no data rows.")
    if label_column is not None:
        if label_column not in frame.columns:
            raise ValueError(f"Label column {label_column!r} not found.")
        labels = validate_labels(frame.pop(label_column).to_numpy(), len(frame))
    else:
        labels = None
    try:
        features = validate_features(frame.to_numpy())
    except ValueError as exc:
        raise ValueError("CSV feature columns must be numeric and finite.") from exc
    return features, labels


def load_optdigits(
    timeout: int = 60,
) -> tuple[NDArray[np.float64], NDArray[np.int64], dict[str, Any]]:
    """Download and validate the pinned UCI Optdigits archive in memory.

    Labels are returned separately for external evaluation; callers must not
    pass them to clustering estimators. No archive or dataset is written to disk.
    """
    try:
        with urlopen(OPTDIGITS_URL, timeout=timeout) as response:
            archive_bytes = response.read()
    except (URLError, TimeoutError, OSError) as exc:
        raise RuntimeError(f"Could not download Optdigits from UCI: {exc}") from exc

    archive_hash = hashlib.sha256(archive_bytes).hexdigest()
    if archive_hash != OPTDIGITS_SHA256:
        raise ValueError(
            "The UCI Optdigits archive checksum differs from the dataset used for "
            f"the saved results. Expected {OPTDIGITS_SHA256}, received {archive_hash}; "
            "inspect the new source version before updating the experiment."
        )

    expected_shapes = {"optdigits.tra": (3823, 65), "optdigits.tes": (1797, 65)}
    try:
        with zipfile.ZipFile(BytesIO(archive_bytes)) as archive:
            frames = []
            for member, shape in expected_shapes.items():
                if member not in archive.namelist():
                    raise ValueError(f"Expected file {member!r} is missing from UCI archive.")
                frame = pd.read_csv(archive.open(member), header=None)
                if frame.shape != shape:
                    raise ValueError(
                        f"Unexpected shape for {member}: {frame.shape}; expected {shape}."
                    )
                frames.append(frame)
    except zipfile.BadZipFile as exc:
        raise ValueError("Downloaded UCI file is not a valid ZIP archive.") from exc

    raw = pd.concat(frames, ignore_index=True)
    features = validate_features(raw.iloc[:, :64].to_numpy())
    try:
        labels = raw.iloc[:, 64].to_numpy(dtype=np.int64)
    except (TypeError, ValueError) as exc:
        raise ValueError("Optdigits label column must contain integer class codes.") from exc
    if set(np.unique(labels)) != set(range(10)):
        raise ValueError("Expected Optdigits digit class codes 0 through 9.")
    if features.min() < 0 or features.max() > 16:
        raise ValueError("Expected Optdigits pixel-count features in range 0..16.")

    metadata: dict[str, Any] = {
        "dataset": "UCI Optical Recognition of Handwritten Digits (Optdigits)",
        "dataset_id": 80,
        "dataset_page": OPTDIGITS_PAGE,
        "archive_url": OPTDIGITS_URL,
        "archive_sha256": archive_hash,
        "license": "CC BY 4.0 (as listed by UCI)",
        "samples": int(features.shape[0]),
        "features": int(features.shape[1]),
        "classes": int(np.unique(labels).size),
        "feature_columns": [f"Attribute{i}" for i in range(1, 65)],
        "label_column": "Class code (0–9), last field in each record",
        "source_files": expected_shapes,
        "missing_values": "None reported by UCI; none found in downloaded source files.",
    }
    return features, labels, metadata
