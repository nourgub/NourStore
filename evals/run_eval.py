"""Behaviour evaluation for the sales assistant, run against the real Claude API.

Each case starts from a fresh demo database and checks what the assistant *did*
(which tools it called, whether it prepared an order) plus a few text checks.
Requires ANTHROPIC_API_KEY. Usage, from the project root:

    python -m evals.run_eval            # all cases
    python -m evals.run_eval --repeat 3 # each case 3 times, to see variance

Cost: about 24 cases × 2–3 model calls with claude-haiku-5-5, a few US cents per run.
"""
import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")


def check(case, called, proposals, reply):
    failures = []
    for name in case.get("expect_tools", []):
        if name not in called:
            failures.append(f"did not call {name}")
    for name in case.get("forbid_tools", []):
        if name in called:
            failures.append(f"called {name}")
    if "expect_proposal" in case and bool(proposals) != case["expect_proposal"]:
        failures.append("prepared an order" if proposals else "did not prepare an order")
    if case.get("reply_contains_any") and not any(token.lower() in reply.lower() for token in case["reply_contains_any"]):
        failures.append("reply missing expected content")
    for token in case.get("reply_not_contains", []):
        if token.lower() in reply.lower():
            failures.append(f"reply contains '{token}'")
    return failures


def run_case(case):
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["DB_PATH"] = str(Path(tmp) / "eval.db")
        os.environ["SEED_DEMO_DATA"] = "true"
        import db
        import agent
        db.init_db()
        history, called, proposals, reply = [], [], [], ""
        for turn in case["turns"]:
            history.append({"role": "user", "content": turn})
            result = agent.run_agent(history)
            reply = result["reply"]
            called += [call["name"] for call in result["tool_calls"]]
            if result["proposal"]:
                proposals.append(result["proposal"])
            history.append({"role": "assistant", "content": reply})
        orders_created = len(db.list_orders())
    failures = check(case, called, proposals, reply)
    if orders_created:
        failures.append("an order was created without the customer's confirmation click")
    return {"id": case["id"], "lang": case["lang"], "passed": not failures, "failures": failures,
            "tools": called, "reply": reply}


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--only", help="Run a single case id")
    args = parser.parse_args(argv)
    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY (in .env or the environment) to run the evaluation.")
    cases = json.loads((ROOT / "evals" / "cases.json").read_text(encoding="utf-8"))
    if args.only:
        cases = [c for c in cases if c["id"] == args.only]
    results = []
    for _ in range(args.repeat):
        for case in cases:
            outcome = run_case(case)
            results.append(outcome)
            mark = "PASS" if outcome["passed"] else "FAIL"
            print(f"{mark}  {case['id']:<26} {', '.join(outcome['failures'])}")
    passed = sum(r["passed"] for r in results)
    print(f"\n{passed}/{len(results)} passed ({passed / len(results):.0%}), model {os.getenv('ANTHROPIC_MODEL', 'claude-haiku-5-5')}")
    by_lang = {}
    for r in results:
        by_lang.setdefault(r["lang"], []).append(r["passed"])
    print("  by language: " + ", ".join(f"{lang} {sum(v)}/{len(v)}" for lang, v in sorted(by_lang.items())))
    out = ROOT / "evals" / "results"
    out.mkdir(exist_ok=True)
    path = out / f"run-{time.strftime('%Y%m%d-%H%M%S')}.json"
    path.write_text(json.dumps({"model": os.getenv("ANTHROPIC_MODEL", "claude-haiku-5-5"), "results": results},
                               ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
