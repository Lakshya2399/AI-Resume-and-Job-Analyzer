"""
evaluation/metrics.py

Agreement metrics for comparing LLM scores against human labels.
These functions produce the concrete numbers that go on your resume:
  - MAE (mean absolute error)
  - Within-N accuracy (% of predictions within N points of human score)
  - Tier F1 (strong/moderate/weak classification agreement)
  - Pearson correlation
"""

from typing import List, Tuple
import math


def score_to_tier(score: int) -> str:
    """Convert a 0-100 score to a 3-class tier label."""
    if score >= 70:
        return "strong"
    if score >= 45:
        return "moderate"
    return "weak"


def mean_absolute_error(human: List[int], predicted: List[int]) -> float:
    """
    Average absolute difference between human and LLM scores.
    Lower is better. A MAE of <=10 means the LLM is within one
    'letter grade' of the human on average.
    """
    if len(human) != len(predicted):
        raise ValueError("Lists must be the same length.")
    return round(sum(abs(h - p) for h, p in zip(human, predicted)) / len(human), 2)


def within_n_accuracy(human: List[int], predicted: List[int], n: int = 10) -> float:
    """
    % of predictions within N points of the human score.
    This is the key resume metric: 'X% agreement within 10 points'.
    """
    if len(human) != len(predicted):
        raise ValueError("Lists must be the same length.")
    hits = sum(1 for h, p in zip(human, predicted) if abs(h - p) <= n)
    return round(hits / len(human) * 100, 1)


def tier_accuracy(human: List[int], predicted: List[int]) -> float:
    """
    % of pairs where LLM and human agree on the tier (strong/moderate/weak).
    Coarser but more forgiving metric.
    """
    if len(human) != len(predicted):
        raise ValueError("Lists must be the same length.")
    hits = sum(
        1 for h, p in zip(human, predicted)
        if score_to_tier(h) == score_to_tier(p)
    )
    return round(hits / len(human) * 100, 1)


def tier_f1(human: List[int], predicted: List[int]) -> dict:
    """
    Per-tier precision, recall, and F1.
    Returns a dict with keys 'strong', 'moderate', 'weak', and 'macro_f1'.

    This is what 'F1 agreement score' means on the resume bullet.
    """
    tiers = ["strong", "moderate", "weak"]
    human_tiers = [score_to_tier(h) for h in human]
    pred_tiers  = [score_to_tier(p) for p in predicted]

    results = {}
    f1_scores = []

    for tier in tiers:
        tp = sum(1 for h, p in zip(human_tiers, pred_tiers) if h == tier and p == tier)
        fp = sum(1 for h, p in zip(human_tiers, pred_tiers) if h != tier and p == tier)
        fn = sum(1 for h, p in zip(human_tiers, pred_tiers) if h == tier and p != tier)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        results[tier] = {
            "precision": round(precision, 3),
            "recall":    round(recall, 3),
            "f1":        round(f1, 3),
            "support":   sum(1 for h in human_tiers if h == tier),
        }
        f1_scores.append(f1)

    results["macro_f1"] = round(sum(f1_scores) / len(f1_scores), 3)
    return results


def pearson_correlation(human: List[int], predicted: List[int]) -> float:
    """
    Pearson r — measures linear correlation between human and LLM scores.
    Range: -1 to 1. Above 0.7 is strong positive correlation.
    """
    n = len(human)
    if n != len(predicted):
        raise ValueError("Lists must be the same length.")
    if n < 2:
        return 0.0  # correlation undefined for a single pair

    mean_h = sum(human) / n
    mean_p = sum(predicted) / n

    num   = sum((h - mean_h) * (p - mean_p) for h, p in zip(human, predicted))
    den_h = math.sqrt(sum((h - mean_h) ** 2 for h in human))
    den_p = math.sqrt(sum((p - mean_p) ** 2 for p in predicted))

    if den_h == 0 or den_p == 0:
        return 0.0
    return round(num / (den_h * den_p), 3)


def full_report(human: List[int], predicted: List[int], label: str = "") -> dict:
    """
    Compute all metrics at once. Returns a dict suitable for
    printing, logging to MLflow, or saving to JSON.
    """
    f1_result = tier_f1(human, predicted)
    return {
        "label":             label,
        "n_pairs":           len(human),
        "mae":               mean_absolute_error(human, predicted),
        "within_10_pct":     within_n_accuracy(human, predicted, n=10),
        "within_15_pct":     within_n_accuracy(human, predicted, n=15),
        "tier_accuracy_pct": tier_accuracy(human, predicted),
        "macro_f1":          f1_result["macro_f1"],
        "per_tier_f1":       {k: v for k, v in f1_result.items() if k != "macro_f1"},
        "pearson_r":         pearson_correlation(human, predicted),
    }