"""
evaluation/evaluate.py

Week 6 evaluation framework.

Runs all 3 prompt versions against the 20-pair ground truth dataset,
computes agreement metrics, and logs everything to MLflow.

Usage (from backend/ folder):
    python -m evaluation.evaluate                    # all 3 prompts
    python -m evaluation.evaluate --prompt v3        # single prompt
    python -m evaluation.evaluate --dry-run          # skip LLM, use dummy scores
    python -m evaluation.evaluate --output results/  # save JSON reports

What it produces:
    - Console table comparing all 3 prompts
    - MLflow runs under experiment 'resume-analyzer-eval'
    - JSON report saved to evaluation/results/
    - The numbers that go on your resume
"""

import argparse
import json
import os
import sys
import time
import logging
from datetime import datetime
from pathlib import Path

# Add backend/ to path so imports work when run as a module
sys.path.insert(0, str(Path(__file__).parent.parent))

import mlflow
from app.core.config import get_settings
from app.services.scorer import score_match
from app.services.preprocessor import preprocess_resume_text, preprocess_jd_text
from evaluation.metrics import full_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

GROUND_TRUTH_PATH = Path(__file__).parent / "ground_truth.json"
RESULTS_DIR       = Path(__file__).parent / "results"
EVAL_EXPERIMENT   = "resume-analyzer-eval"
PROMPT_VERSIONS   = ["v1", "v2", "v3"]


def load_ground_truth() -> list:
    with open(GROUND_TRUTH_PATH) as f:
        return json.load(f)


def score_one(pair: dict, prompt_version: str, dry_run: bool = False) -> dict:
    """
    Score a single ground truth pair. Returns a result dict with
    the LLM score, timing, and whether repair was needed.
    """
    if dry_run:
        import random
        human = pair["human_score"]
        # Simulate realistic LLM noise: ±8-15pts from human score
        noise = random.randint(-15, 15)
        fake_score = max(0, min(100, human + noise))
        return {
            "id":             pair["id"],
            "human_score":    human,
            "llm_score":      fake_score,
            "prompt_version": prompt_version,
            "elapsed_s":      round(random.uniform(1.5, 4.0), 2),
            "attempts":       1,
            "was_repaired":   False,
            "error":          None,
        }

    resume_text = preprocess_resume_text(pair["resume_text"])
    jd_text     = preprocess_jd_text(pair["job_description"])

    try:
        report, elapsed, meta = score_match(
            resume_text=resume_text,
            job_description=jd_text,
            prompt_version=prompt_version,
        )
        return {
            "id":             pair["id"],
            "human_score":    pair["human_score"],
            "llm_score":      report.overall_score,
            "prompt_version": prompt_version,
            "elapsed_s":      round(elapsed, 2),
            "attempts":       meta["attempts"],
            "was_repaired":   meta["was_repaired"],
            "error":          None,
        }
    except Exception as e:
        logger.error(f"Failed on {pair['id']} with {prompt_version}: {e}")
        return {
            "id":             pair["id"],
            "human_score":    pair["human_score"],
            "llm_score":      None,
            "prompt_version": prompt_version,
            "elapsed_s":      0,
            "attempts":       3,
            "was_repaired":   False,
            "error":          str(e),
        }


def run_prompt_eval(
    pairs: list,
    prompt_version: str,
    dry_run: bool = False,
) -> dict:
    """
    Run all 20 pairs through one prompt version.
    Returns a results dict with per-pair scores and aggregate metrics.
    """
    logger.info(f"Evaluating prompt={prompt_version} on {len(pairs)} pairs...")
    results = []

    for i, pair in enumerate(pairs, 1):
        logger.info(f"  [{i}/{len(pairs)}] {pair['id']} (human={pair['human_score']})")
        result = score_one(pair, prompt_version, dry_run=dry_run)
        results.append(result)

        if not dry_run and i < len(pairs):
            time.sleep(0.5)  # avoid hammering Ollama

    # Filter out failed pairs for metrics
    valid = [r for r in results if r["llm_score"] is not None]
    failed = [r for r in results if r["llm_score"] is None]

    if not valid:
        logger.error(f"All pairs failed for prompt={prompt_version}.")
        return {"prompt_version": prompt_version, "results": results, "metrics": None}

    human_scores = [r["human_score"] for r in valid]
    llm_scores   = [r["llm_score"]   for r in valid]

    metrics = full_report(human_scores, llm_scores, label=prompt_version)
    metrics["n_failed"]       = len(failed)
    metrics["avg_elapsed_s"]  = round(sum(r["elapsed_s"] for r in valid) / len(valid), 2)
    metrics["repair_rate_pct"] = round(sum(r["was_repaired"] for r in valid) / len(valid) * 100, 1)
    metrics["avg_attempts"]   = round(sum(r["attempts"] for r in valid) / len(valid), 2)

    logger.info(f"  → MAE={metrics['mae']} | within-10={metrics['within_10_pct']}% | macro-F1={metrics['macro_f1']}")
    return {
        "prompt_version": prompt_version,
        "results":        results,
        "metrics":        metrics,
    }


def log_to_mlflow(eval_result: dict, run_timestamp: str):
    """Log one prompt's eval results as an MLflow run."""
    settings = get_settings()
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(EVAL_EXPERIMENT)

    prompt_version = eval_result["prompt_version"]
    metrics        = eval_result["metrics"]
    if not metrics:
        return

    with mlflow.start_run(run_name=f"eval-{prompt_version}-{run_timestamp}"):
        mlflow.log_params({
            "prompt_version": prompt_version,
            "n_pairs":        metrics["n_pairs"],
            "eval_timestamp": run_timestamp,
        })
        mlflow.log_metrics({
            "mae":               metrics["mae"],
            "within_10_pct":     metrics["within_10_pct"],
            "within_15_pct":     metrics["within_15_pct"],
            "tier_accuracy_pct": metrics["tier_accuracy_pct"],
            "macro_f1":          metrics["macro_f1"],
            "pearson_r":         metrics["pearson_r"],
            "repair_rate_pct":   metrics["repair_rate_pct"],
            "avg_elapsed_s":     metrics["avg_elapsed_s"],
            "avg_attempts":      metrics["avg_attempts"],
            "n_failed":          metrics["n_failed"],
            "f1_strong":         metrics["per_tier_f1"]["strong"]["f1"],
            "f1_moderate":       metrics["per_tier_f1"]["moderate"]["f1"],
            "f1_weak":           metrics["per_tier_f1"]["weak"]["f1"],
        })
        mlflow.set_tags({
            "eval_type":      "ground_truth",
            "prompt_version": prompt_version,
        })

    logger.info(f"MLflow run logged for eval prompt={prompt_version}")


def save_results(eval_results: list, output_dir: Path):
    """Save full results JSON + a summary CSV."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Full JSON
    json_path = output_dir / f"eval_{timestamp}.json"
    with open(json_path, "w") as f:
        json.dump(eval_results, f, indent=2)
    logger.info(f"Results saved to {json_path}")

    # Summary CSV
    csv_path = output_dir / f"eval_summary_{timestamp}.csv"
    with open(csv_path, "w") as f:
        f.write("prompt_version,mae,within_10_pct,tier_accuracy_pct,macro_f1,pearson_r,repair_rate_pct,avg_elapsed_s\n")
        for er in eval_results:
            m = er.get("metrics")
            if m:
                f.write(f"{er['prompt_version']},{m['mae']},{m['within_10_pct']},{m['tier_accuracy_pct']},{m['macro_f1']},{m['pearson_r']},{m['repair_rate_pct']},{m['avg_elapsed_s']}\n")
    logger.info(f"Summary CSV saved to {csv_path}")

    return json_path, csv_path


def print_comparison_table(eval_results: list):
    """Print a formatted comparison table to the console."""
    print("\n" + "=" * 72)
    print("  EVALUATION RESULTS — Prompt Version Comparison")
    print("=" * 72)
    print(f"  {'Metric':<28} {'v1':>10} {'v2':>10} {'v3':>10}")
    print("-" * 72)

    metric_labels = [
        ("mae",               "MAE (lower=better)"),
        ("within_10_pct",     "Within-10 accuracy %"),
        ("within_15_pct",     "Within-15 accuracy %"),
        ("tier_accuracy_pct", "Tier accuracy %"),
        ("macro_f1",          "Macro F1"),
        ("pearson_r",         "Pearson r"),
        ("repair_rate_pct",   "Repair rate %"),
        ("avg_elapsed_s",     "Avg latency (s)"),
        ("avg_attempts",      "Avg attempts"),
    ]

    metrics_by_version = {er["prompt_version"]: er.get("metrics", {}) for er in eval_results}

    for key, label in metric_labels:
        row = f"  {label:<28}"
        for v in ["v1", "v2", "v3"]:
            m = metrics_by_version.get(v, {})
            val = m.get(key, "N/A")
            row += f" {str(val):>10}"
        print(row)

    print("=" * 72)

    # Highlight best prompt
    valid = [(er["prompt_version"], er["metrics"]["macro_f1"])
             for er in eval_results if er.get("metrics")]
    if valid:
        best = max(valid, key=lambda x: x[1])
        print(f"\n  Best prompt by macro F1: {best[0]} ({best[1]})")

    print()


def main():
    parser = argparse.ArgumentParser(description="Week 6 evaluation framework")
    parser.add_argument("--prompt", choices=["v1", "v2", "v3"], default=None,
                        help="Run a single prompt version (default: all 3)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip real LLM calls — use simulated scores for testing")
    parser.add_argument("--no-mlflow", action="store_true",
                        help="Skip MLflow logging")
    parser.add_argument("--output", type=str, default=str(RESULTS_DIR),
                        help="Directory to save result JSON and CSV")
    args = parser.parse_args()

    pairs   = load_ground_truth()
    prompts = [args.prompt] if args.prompt else PROMPT_VERSIONS
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if args.dry_run:
        logger.info("DRY RUN — using simulated LLM scores (no real API calls)")

    eval_results = []
    for prompt_version in prompts:
        result = run_prompt_eval(pairs, prompt_version, dry_run=args.dry_run)
        eval_results.append(result)

        if not args.no_mlflow and result.get("metrics"):
            try:
                log_to_mlflow(result, timestamp)
            except Exception as e:
                logger.warning(f"MLflow logging failed (non-fatal): {e}")

    print_comparison_table(eval_results)
    save_results(eval_results, Path(args.output))

    # Exit with non-zero if any prompt had zero valid results
    if any(er.get("metrics") is None for er in eval_results):
        sys.exit(1)


if __name__ == "__main__":
    main()
