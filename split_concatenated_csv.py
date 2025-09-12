#!/usr/bin/env python3
"""
Split one big CSV (with 4 concatenated tables) into 4 separate CSV files using only pandas
"""
from __future__ import annotations
import sys
from pathlib import Path
import pandas as pd

# Known distinct header lines for the 4 sections
HDR1 = "Place,Title,Name,Type,Latitude,Longitude,Code,Enclosed_by,Date"
HDR2 = (
    "Person,Surname,Given,Call,Suffix,Prefix,Title,Gender,Birth date,Birth place,"
    "Birth source,Baptism date,Baptism place,Baptism source,Death date,Death place,"
    "Death source,Burial date,Burial place,Burial source,Note"
)
HDR3 = "Marriage,Husband,Wife,Date,Place,Source,Note"
HDR4 = "Family,Child"

DEFAULT_SRC = Path("datasets/greek-god-geneology.csv")


def find_header_indices(lines: list[str]) -> list[int]:
    # Remove BOM if present on first line
    if lines and lines[0].startswith("\ufeff"):
        lines[0] = lines[0].replace("\ufeff", "", 1)
    map_idx: dict[str, int] = {}
    for i, line in enumerate(lines, start=1):  # 1-indexed
        if line == HDR1:
            map_idx['h1'] = i
        elif line == HDR2:
            map_idx['h2'] = i
        elif line == HDR3:
            map_idx['h3'] = i
        elif line == HDR4:
            map_idx['h4'] = i
    missing = [k for k in ('h1','h2','h3','h4') if k not in map_idx]
    if missing:
        raise RuntimeError(f"Could not detect headers for: {missing}. Please verify the source file.")
    return [map_idx['h1'], map_idx['h2'], map_idx['h3'], map_idx['h4']]


def clean_header(header_line: str) -> list[str]:
    # split and remove trailing empties from extra commas
    cols = [c.strip() for c in header_line.split(',')]
    while cols and cols[-1] == "":
        cols.pop()
    # ensure no empty names remain
    return [c if c else f"col_{i}" for i, c in enumerate(cols)]


def read_section(src: Path, start_line: int, next_start_line: int | None, header_names: list[str]) -> pd.DataFrame:
    # Skip everything through the header line itself (start_line), then read only data rows.
    skip = range(0, start_line)  # 0..start_line-1 inclusive -> skips header row too
    kwargs = dict(
        header=None,
        names=header_names,
        engine='python',
        usecols=list(range(len(header_names))),
        skip_blank_lines=False,  # be explicit, we already control header
    )
    if next_start_line is None:
        df = pd.read_csv(src, skiprows=skip, **kwargs)
    else:
        nrows = next_start_line - start_line - 1  # data row count (exclude next header)
        df = pd.read_csv(src, skiprows=skip, nrows=nrows, **kwargs)
    return df


def main(argv: list[str]) -> int:
    src = Path(argv[1]) if len(argv) > 1 else DEFAULT_SRC
    if not src.exists():
        print(f"Source file not found: {src}", file=sys.stderr)
        return 2

    text = src.read_text(encoding='utf-8', errors='replace')
    lines = text.splitlines()

    h1, h2, h3, h4 = find_header_indices(lines)

    # Extract raw header strings and clean them into column names
    hdr1 = clean_header(lines[h1 - 1])
    hdr2 = clean_header(lines[h2 - 1])
    hdr3 = clean_header(lines[h3 - 1])
    hdr4 = clean_header(lines[h4 - 1])

    sec1 = read_section(src, h1, h2, hdr1)
    sec2 = read_section(src, h2, h3, hdr2)
    sec3 = read_section(src, h3, h4, hdr3)
    sec4 = read_section(src, h4, None, hdr4)

    out_files = [
        Path('section1_places.csv'),
        Path('section2_persons.csv'),
        Path('section3_marriages.csv'),
        Path('section4_family.csv'),
    ]

    for df, out in zip([sec1, sec2, sec3, sec4], out_files):
        df.to_csv(out, index=False)

    # Print basic info
    for name, df in zip([
        'section1_places.csv',
        'section2_persons.csv',
        'section3_marriages.csv',
        'section4_family.csv',
    ], [sec1, sec2, sec3, sec4]):
        print(f"{name}:", df.shape)
        with pd.option_context('display.max_columns', None, 'display.width', 200):
            print(df.head(3))
            print()

    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
