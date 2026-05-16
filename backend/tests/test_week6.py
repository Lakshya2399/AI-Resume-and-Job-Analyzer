"""
Week 6 tests — evaluation metrics.
Run with: pytest tests/test_week6.py -v
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from evaluation.metrics import (
    score_to_tier,
    mean_absolute_error,
    within_n_accuracy,
    tier_accuracy,
    tier_f1,
    pearson_correlation,
    full_report,
)


class TestScoreToTier:
    def test_strong(self):
        assert score_to_tier(85) == "strong"
        assert score_to_tier(70) == "strong"

    def test_moderate(self):
        assert score_to_tier(65) == "moderate"
        assert score_to_tier(45) == "moderate"

    def test_weak(self):
        assert score_to_tier(44) == "weak"
        assert score_to_tier(0)  == "weak"

    def test_boundary_70(self):
        assert score_to_tier(70) == "strong"
        assert score_to_tier(69) == "moderate"

    def test_boundary_45(self):
        assert score_to_tier(45) == "moderate"
        assert score_to_tier(44) == "weak"


class TestMAE:
    def test_perfect_agreement(self):
        assert mean_absolute_error([80, 60, 40], [80, 60, 40]) == 0.0

    def test_known_values(self):
        # |80-70| + |60-50| + |40-30| = 10+10+10 = 30, avg=10
        assert mean_absolute_error([80, 60, 40], [70, 50, 30]) == 10.0

    def test_mismatched_lengths_raises(self):
        with pytest.raises(ValueError):
            mean_absolute_error([80, 60], [70])

    def test_single_pair(self):
        assert mean_absolute_error([75], [80]) == 5.0


class TestWithinNAccuracy:
    def test_all_within_10(self):
        human = [80, 60, 40, 70]
        pred  = [85, 55, 45, 75]   # all within 10
        assert within_n_accuracy(human, pred, n=10) == 100.0

    def test_none_within_5(self):
        human = [80, 60]
        pred  = [70, 50]           # exactly 10 pts off — outside n=5
        assert within_n_accuracy(human, pred, n=5) == 0.0

    def test_half_within(self):
        human = [80, 80]
        pred  = [85, 65]           # first within 10, second not
        assert within_n_accuracy(human, pred, n=10) == 50.0

    def test_boundary_exactly_n(self):
        # Exactly 10 pts off — should count as within 10
        assert within_n_accuracy([80], [70], n=10) == 100.0


class TestTierAccuracy:
    def test_all_correct(self):
        # Both scores map to same tier
        assert tier_accuracy([80, 55, 30], [75, 50, 25]) == 100.0

    def test_all_wrong(self):
        # strong→weak, moderate→strong, weak→moderate
        assert tier_accuracy([80, 55, 30], [25, 80, 55]) == 0.0

    def test_mixed(self):
        assert tier_accuracy([80, 55], [75, 80]) == 50.0


class TestTierF1:
    def test_perfect_f1(self):
        human = [80, 80, 55, 55, 30, 30]
        pred  = [80, 80, 55, 55, 30, 30]
        result = tier_f1(human, pred)
        assert result["macro_f1"] == 1.0
        assert result["strong"]["f1"]   == 1.0
        assert result["moderate"]["f1"] == 1.0
        assert result["weak"]["f1"]     == 1.0

    def test_zero_f1_for_missing_tier(self):
        # Only strong predictions, human has all tiers
        human = [80, 55, 30]
        pred  = [80, 80, 80]   # LLM predicts all strong
        result = tier_f1(human, pred)
        assert result["moderate"]["f1"] == 0.0
        assert result["weak"]["f1"]     == 0.0

    def test_macro_f1_is_average(self):
        human = [80, 55, 30]
        pred  = [80, 55, 30]
        result = tier_f1(human, pred)
        f1s = [result["strong"]["f1"], result["moderate"]["f1"], result["weak"]["f1"]]
        assert result["macro_f1"] == round(sum(f1s) / 3, 3)

    def test_support_counts(self):
        human = [80, 80, 55, 30]
        pred  = [80, 75, 55, 30]
        result = tier_f1(human, pred)
        assert result["strong"]["support"]   == 2
        assert result["moderate"]["support"] == 1
        assert result["weak"]["support"]     == 1


class TestPearson:
    def test_perfect_positive_correlation(self):
        human = [20, 40, 60, 80]
        pred  = [20, 40, 60, 80]
        assert pearson_correlation(human, pred) == 1.0

    def test_perfect_negative_correlation(self):
        human = [20, 40, 60, 80]
        pred  = [80, 60, 40, 20]
        assert pearson_correlation(human, pred) == -1.0

    def test_no_variance_returns_zero(self):
        # Flat prediction — no variance in predicted, correlation undefined → 0
        assert pearson_correlation([80, 60, 40], [50, 50, 50]) == 0.0

    def test_single_pair_returns_zero(self):
        # Single pair — correlation undefined → 0 (not a raise)
        assert pearson_correlation([80], [75]) == 0.0

    def test_realistic_correlation(self):
        # Noisy but correlated predictions
        human = [85, 82, 88, 62, 58, 28, 22, 35]
        pred  = [78, 75, 82, 68, 50, 35, 30, 42]
        r = pearson_correlation(human, pred)
        assert 0.7 <= r <= 1.0  # should be strongly correlated


class TestFullReport:
    def test_returns_all_keys(self):
        human = [85, 62, 28, 80, 55]
        pred  = [80, 65, 35, 75, 60]
        report = full_report(human, pred, label="test")

        required_keys = [
            "label", "n_pairs", "mae", "within_10_pct", "within_15_pct",
            "tier_accuracy_pct", "macro_f1", "per_tier_f1", "pearson_r"
        ]
        for key in required_keys:
            assert key in report, f"Missing key: {key}"

    def test_n_pairs_correct(self):
        human = [85, 62, 28]
        pred  = [80, 65, 35]
        report = full_report(human, pred)
        assert report["n_pairs"] == 3

    def test_label_stored(self):
        report = full_report([80, 75], [75, 70], label="v3")
        assert report["label"] == "v3"

    def test_good_model_scores(self):
        # A model that agrees well with humans
        human = [85, 82, 88, 62, 58, 28, 22, 35, 65, 70]
        pred  = [80, 78, 84, 65, 55, 32, 28, 40, 70, 68]
        report = full_report(human, pred)
        assert report["mae"] < 10           # good MAE
        assert report["within_10_pct"] >= 70 # most within 10pts
        assert report["pearson_r"] >= 0.9   # strong correlation