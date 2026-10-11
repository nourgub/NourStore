import numpy as np
import pytest
from sklearn.datasets import make_blobs

from kmch.data import validate_features, validate_labels
from kmch.ensemble import align_labels, simple_vote
from kmch.experiment import make_demo_data, run_experiment
from kmch.incremental import resolve_conflicts_incrementally
from kmch.metrics import clustering_accuracy, evaluate_clustering


def test_input_validation_rejects_bad_features_and_labels():
    assert validate_features([[1, 2], [3, 4]]).dtype == np.float64
    for invalid in ([], [[1, np.nan]], [[1, np.inf]], [["x"]]):
        with pytest.raises(ValueError):
            validate_features(invalid)
    with pytest.raises(ValueError):
        validate_labels([1], 2)
    with pytest.raises(ValueError):
        validate_labels([[1, 2]], 1)


def test_label_alignment_ignores_arbitrary_cluster_ids():
    reference = np.array([0, 0, 1, 1, 2, 2])
    candidate = np.array([8, 8, 4, 4, 9, 9])
    aligned, mapping, overlap = align_labels(reference, candidate)
    np.testing.assert_array_equal(aligned, reference)
    assert len(mapping) == 3
    assert overlap.shape == (3, 3)


def test_hungarian_matching_is_one_to_one_and_globally_optimal():
    reference = np.array([0, 0, 1, 1, 2, 2])
    candidate = np.array([5, 5, 5, 4, 4, 4])
    aligned, mapping, overlap = align_labels(reference, candidate)
    # Both candidate IDs are mapped to distinct reference IDs when cardinalities match.
    assert len(set(mapping.values())) == 2
    # Candidate IDs are sorted as [4, 5], hence the reversed outer columns.
    assert overlap.tolist() == [[0, 2], [1, 1], [2, 0]]
    assert aligned.tolist() == [0, 0, 0, 2, 2, 2]


def test_alignment_rejects_shape_mismatch_and_empty_inputs():
    with pytest.raises(ValueError):
        align_labels([0, 1], [0])
    with pytest.raises(ValueError):
        align_labels([], [])


def test_consensus_vote_retains_agreement_and_marks_disagreement():
    consensus, conflict_mask = simple_vote([0, 1, 2], [0, 2, 2])
    assert consensus.tolist() == [0, None, 2]
    assert conflict_mask.tolist() == [False, True, False]
    with pytest.raises(ValueError):
        simple_vote([0], [0, 1])


def test_incremental_update_preserves_agreed_rows_and_assigns_conflicts():
    features = np.array([[0.0], [0.2], [9.8], [10.0], [5.0]])
    consensus = np.array(["left", "left", "right", "right", None], dtype=object)
    conflicts = np.array([False, False, False, False, True])
    output = resolve_conflicts_incrementally(features, consensus, conflicts)
    assert output[:4].tolist() == consensus[:4].tolist()
    assert output[4] in {"left", "right"}
    assert sum(value is None for value in output) == 0


def test_incremental_handles_no_conflicts_and_rejects_no_anchor_case():
    features = np.array([[0.0], [1.0]])
    consensus = np.array([0, 1], dtype=object)
    unchanged = resolve_conflicts_incrementally(
        features, consensus, np.array([False, False])
    )
    assert unchanged.tolist() == consensus.tolist()
    with pytest.raises(ValueError, match="no agreed samples"):
        resolve_conflicts_incrementally(
            features, np.array([None, None], dtype=object), np.array([True, True])
        )


def test_metrics_are_label_permutation_invariant_and_include_ari():
    truth = np.array([0, 0, 1, 1])
    predicted = np.array([9, 9, 3, 3])
    assert clustering_accuracy(truth, predicted) == 1.0
    scores = evaluate_clustering(truth, predicted)
    assert scores["nmi"] == pytest.approx(1.0)
    assert scores["ari"] == pytest.approx(1.0)
    assert scores["error_rate"] == 0.0
    with pytest.raises(ValueError, match="must not be empty"):
        evaluate_clustering([], [])


def test_labels_do_not_implicitly_select_cluster_count():
    features, labels = make_blobs(n_samples=40, centers=2, random_state=3)
    with pytest.raises(ValueError, match="provided explicitly"):
        run_experiment(features, y=labels)


def test_deterministic_execution_with_fixed_seed():
    features, labels = make_demo_data(random_state=7)
    first = run_experiment(features, y=labels, n_clusters=4, random_state=19)
    second = run_experiment(features, y=labels, n_clusters=4, random_state=19)
    np.testing.assert_array_equal(first["kmeans_labels"], second["kmeans_labels"])
    np.testing.assert_array_equal(first["cha_labels"], second["cha_labels"])
    np.testing.assert_array_equal(first["final_labels"], second["final_labels"])
    assert first["metrics"] == second["metrics"]


def test_end_to_end_kmch_pipeline():
    features, labels = make_demo_data()
    result = run_experiment(features, y=labels, n_clusters=4)
    assert len(result["final_labels"]) == len(features)
    assert result["conflict_count_after"] == 0
    assert result["conflict_count_before"] == int(result["conflict_mask"].sum())
    assert result["agreed_count"] + result["conflict_count_before"] == len(features)
    assert set(result["metrics"]) == {
        "kmeans", "cha", "kmch_before_resolution", "kmch_after_resolution"
    }
