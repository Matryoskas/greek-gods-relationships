#!/usr/bin/env python3
"""
Drop columns that are completely empty from one or more CSV files using pandas only.

A column is considered "completely empty" if all of its values are NA or
empty/whitespace-only strings.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import sys
import pandas as pd

DEFAULT_FILES = [
    Path('section1_places.csv'),
    Path('section2_persons.csv'),
    Path('section3_marriages.csv'),
    Path('section4_family.csv'),
]


def drop_completely_empty_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Return a copy with columns removed where all values are empty.

    We treat empty strings and whitespace-only strings as NA before checking.
    Returns the cleaned DataFrame and the list of dropped column names.
    """
    # Work on a copy to avoid mutating caller's frame
    out = df.copy()
    # Convert empty/whitespace-only strings to NA so dropna can detect fully-empty cols
    out = out.replace(r"^\s*$", pd.NA, regex=True)
    # Identify columns that are entirely NA
    mask_all_na = out.isna().all(axis=0)
    dropped_cols = [c for c, m in mask_all_na.items() if bool(m)]
    if dropped_cols:
        out = out.loc[:, ~mask_all_na]
    return out, dropped_cols


def process_file(path: Path, suffix: str | None = None) -> int:
    if not path.exists():
        print(f"[skip] File not found: {path}")
        return 0
    try:
        df = pd.read_csv(path, engine='python')
    except Exception as e:
        print(f"[error] Failed to read {path}: {e}")
        return 1
    cleaned, dropped = drop_completely_empty_columns(df)
    if suffix:
        out_path = path.with_name(path.stem + suffix + path.suffix)
    else:
        out_path = path
    try:
        cleaned.to_csv(out_path, index=False)
    except Exception as e:
        print(f"[error] Failed to write {out_path}: {e}")
        return 1
    if dropped:
        print(f"[ok] {path.name} -> {out_path.name}: dropped {len(dropped)} columns: {dropped}")
    else:
        print(f"[ok] {path.name} -> {out_path.name}: no empty columns to drop")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument('files', nargs='*', type=Path, help='CSV files to clean. Defaults to the four split files if none provided.')
    p.add_argument('--suffix', default=None, help='Optional suffix for output filenames (e.g., "_clean"). If omitted, files are overwritten in-place.')
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv[1:])
    files: list[Path]
    if args.files:
        files = args.files
    else:
        files = DEFAULT_FILES
    rc = 0
    for f in files:
        rc |= process_file(f, suffix=args.suffix)
    return rc


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
