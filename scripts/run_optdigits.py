#!/usr/bin/env python3
"""Compatibility wrapper; prefer ``python -m kmch.experiment --dataset optdigits``."""

from kmch.experiment import main


if __name__ == "__main__":
    main(["--dataset", "optdigits"])
