#!/usr/bin/env python3
"""
MOI Data Updater — Fetches state-level data from Census Bureau APIs
and regenerates data.js for the MOI dashboard.

Sources:
  Population:   Census PEP (Population Estimates Program)
  Pest Firms:   Census CBP (County Business Patterns), NAICS 561710
  Housing Age:  Census ACS 5-Year, Table B25034
  Pop Growth:   Derived from two years of population estimates
  Climate Risk: Static composite (NOAA temp/humidity/precip + FEMA NRI)

Usage:
  python3 update_data.py                     # fetch latest available data
  python3 update_data.py --year 2023         # fetch specific year
  python3 update_data.py --key YOUR_KEY      # use Census API key
  python3 update_data.py --dry-run           # preview without writing file
"""

import argparse
import json
import math
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "data.js")

# ── State metadata ──────────────────────────────────────────────

STATES = [
    ("Alabama", "AL", "01"), ("Alaska", "AK", "02"), ("Arizona", "AZ", "04"),
    ("Arkansas", "AR", "05"), ("California", "CA", "06"), ("Colorado", "CO", "08"),
    ("Connecticut", "CT", "09"), ("Delaware", "DE", "10"), ("Florida", "FL", "12"),
    ("Georgia", "GA", "13"), ("Hawaii", "HI", "15"), ("Idaho", "ID", "16"),
    ("Illinois", "IL", "17"), ("Indiana", "IN", "18"), ("Iowa", "IA", "19"),
    ("Kansas", "KS", "20"), ("Kentucky", "KY", "21"), ("Louisiana", "LA", "22"),
    ("Maine", "ME", "23"), ("Maryland", "MD", "24"), ("Massachusetts", "MA", "25"),
    ("Michigan", "MI", "26"), ("Minnesota", "MN", "27"), ("Mississippi", "MS", "28"),
    ("Missouri", "MO", "29"), ("Montana", "MT", "30"), ("Nebraska", "NE", "31"),
    ("Nevada", "NV", "32"), ("New Hampshire", "NH", "33"), ("New Jersey", "NJ", "34"),
    ("New Mexico", "NM", "35"), ("New York", "NY", "36"),
    ("North Carolina", "NC", "37"), ("North Dakota", "ND", "38"),
    ("Ohio", "OH", "39"), ("Oklahoma", "OK", "40"), ("Oregon", "OR", "41"),
    ("Pennsylvania", "PA", "42"), ("Rhode Island", "RI", "44"),
    ("South Carolina", "SC", "45"), ("South Dakota", "SD", "46"),
    ("Tennessee", "TN", "47"), ("Texas", "TX", "48"), ("Utah", "UT", "49"),
    ("Vermont", "VT", "50"), ("Virginia", "VA", "51"), ("Washington", "WA", "53"),
    ("West Virginia", "WV", "54"), ("Wisconsin", "WI", "55"), ("Wyoming", "WY", "56"),
]

FIPS_TO_ABBR = {fips: abbr for _, abbr, fips in STATES}
ABBR_TO_NAME = {abbr: name for name, abbr, _ in STATES}
FIPS_TO_NAME = {fips: name for name, _, fips in STATES}

# ── Climate Risk Index (static) ─────────────────────────────────
# Composite of NOAA avg temperature, humidity, precipitation + FEMA NRI.
# Formula: 0.40*temp_score + 0.25*humidity_score + 0.20*precip_score + 0.15*hazard_score
# Based on NOAA Climate Normals (1991-2020) and FEMA National Risk Index.
# These change very slowly — update only when new Climate Normals are released (~2031).

CLIMATE_RISK = {
    "AL": 82, "AK": 37, "AZ": 34, "AR": 77, "CA": 60,
    "CO": 34, "CT": 55, "DE": 62, "FL": 84, "GA": 73,
    "HI": 88, "ID": 39, "IL": 58, "IN": 60, "IA": 62,
    "KS": 62, "KY": 68, "LA": 93, "ME": 48, "MD": 59,
    "MA": 55, "MI": 48, "MN": 45, "MS": 87, "MO": 66,
    "MT": 35, "NE": 57, "NV": 27, "NH": 50, "NJ": 62,
    "NM": 35, "NY": 51, "NC": 71, "ND": 47, "OH": 56,
    "OK": 66, "OR": 54, "PA": 54, "RI": 57, "SC": 72,
    "SD": 54, "TN": 71, "TX": 68, "UT": 34, "VT": 50,
    "VA": 60, "WA": 59, "WV": 59, "WI": 47, "WY": 34,
}

# ── API helpers ─────────────────────────────────────────────────

BASE_URL = "https://api.census.gov/data"


def fetch_json(url, label="data", retries=3):
    """Fetch JSON from Census API with retries."""
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "MOI-Dashboard/1.0"})
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                return data
        except (URLError, HTTPError, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  Retry {attempt + 1}/{retries} for {label} (waiting {wait}s)...")
                time.sleep(wait)
            else:
                print(f"  ERROR fetching {label}: {e}")
                return None


def api_url(path, params, api_key=None):
    """Build Census API URL."""
    url = f"{BASE_URL}/{path}?{params}"
    if api_key:
        url += f"&key={api_key}"
    return url


# ── Data fetchers ───────────────────────────────────────────────

def fetch_population(year, api_key=None):
    """Fetch state populations from PEP (Population Estimates Program)."""
    print(f"  Fetching population estimates (Vintage {year})...")

    # Try PEP charv endpoint first
    url = api_url(
        f"{year}/pep/charv",
        f"get=NAME,POP&for=state:*&YEAR={year}&MONTH=7&AGE=0&SEX=0&HISP=0&UNIVERSE=R",
        api_key
    )
    data = fetch_json(url, f"PEP {year}")

    if data and len(data) > 1:
        result = {}
        headers = data[0]
        pop_idx = headers.index("POP")
        state_idx = headers.index("state")
        for row in data[1:]:
            fips = row[state_idx].zfill(2)
            if fips in FIPS_TO_ABBR:
                result[FIPS_TO_ABBR[fips]] = int(row[pop_idx])
        if len(result) >= 50:
            print(f"    Got {len(result)} states from PEP")
            return result

    # Fallback: ACS 1-Year total population
    print(f"  PEP unavailable, trying ACS 1-Year...")
    url = api_url(
        f"{year}/acs/acs1",
        "get=NAME,B01003_001E&for=state:*",
        api_key
    )
    data = fetch_json(url, f"ACS 1-Year {year}")

    if data and len(data) > 1:
        result = {}
        headers = data[0]
        pop_idx = headers.index("B01003_001E")
        state_idx = headers.index("state")
        for row in data[1:]:
            fips = row[state_idx].zfill(2)
            if fips in FIPS_TO_ABBR:
                result[FIPS_TO_ABBR[fips]] = int(row[pop_idx])
        if len(result) >= 50:
            print(f"    Got {len(result)} states from ACS 1-Year")
            return result

    # Fallback: ACS 5-Year
    print(f"  ACS 1-Year unavailable, trying ACS 5-Year...")
    url = api_url(
        f"{year}/acs/acs5",
        "get=NAME,B01003_001E&for=state:*",
        api_key
    )
    data = fetch_json(url, f"ACS 5-Year {year}")

    if data and len(data) > 1:
        result = {}
        headers = data[0]
        pop_idx = headers.index("B01003_001E")
        state_idx = headers.index("state")
        for row in data[1:]:
            fips = row[state_idx].zfill(2)
            if fips in FIPS_TO_ABBR:
                result[FIPS_TO_ABBR[fips]] = int(row[pop_idx])
        print(f"    Got {len(result)} states from ACS 5-Year")
        return result

    return None


def fetch_pest_firms(year, api_key=None):
    """Fetch pest control establishments from CBP (NAICS 561710)."""
    print(f"  Fetching pest control firms (CBP {year})...")

    url = api_url(
        f"{year}/cbp",
        "get=NAME,ESTAB&for=state:*&NAICS2017=561710&LFO=001&EMPSZES=001",
        api_key
    )
    data = fetch_json(url, f"CBP {year}")

    if data and len(data) > 1:
        result = {}
        headers = data[0]
        estab_idx = headers.index("ESTAB")
        state_idx = headers.index("state")
        for row in data[1:]:
            fips = row[state_idx].zfill(2)
            if fips in FIPS_TO_ABBR:
                result[FIPS_TO_ABBR[fips]] = int(row[estab_idx])
        print(f"    Got {len(result)} states from CBP")
        return result

    # CBP data often lags 1-2 years; try previous years
    for fallback_yr in range(year - 1, year - 4, -1):
        print(f"  CBP {year} unavailable, trying {fallback_yr}...")
        url = api_url(
            f"{fallback_yr}/cbp",
            "get=NAME,ESTAB&for=state:*&NAICS2017=561710&LFO=001&EMPSZES=001",
            api_key
        )
        data = fetch_json(url, f"CBP {fallback_yr}")
        if data and len(data) > 1:
            result = {}
            headers = data[0]
            estab_idx = headers.index("ESTAB")
            state_idx = headers.index("state")
            for row in data[1:]:
                fips = row[state_idx].zfill(2)
                if fips in FIPS_TO_ABBR:
                    result[FIPS_TO_ABBR[fips]] = int(row[estab_idx])
            print(f"    Got {len(result)} states from CBP {fallback_yr}")
            return result

    return None


def fetch_housing_age(year, api_key=None):
    """Fetch housing age distribution from ACS Table B25034."""
    print(f"  Fetching housing age data (ACS {year})...")

    vars_list = ",".join([f"B25034_{str(i).zfill(3)}E" for i in range(1, 12)])

    # Try ACS 5-Year (more reliable, available for all states)
    url = api_url(
        f"{year}/acs/acs5",
        f"get=NAME,{vars_list}&for=state:*",
        api_key
    )
    data = fetch_json(url, f"ACS 5-Year housing {year}")

    if not data or len(data) <= 1:
        # Fallback to previous year
        for fallback_yr in range(year - 1, year - 4, -1):
            print(f"  ACS {year} unavailable, trying {fallback_yr}...")
            url = api_url(
                f"{fallback_yr}/acs/acs5",
                f"get=NAME,{vars_list}&for=state:*",
                api_key
            )
            data = fetch_json(url, f"ACS 5-Year housing {fallback_yr}")
            if data and len(data) > 1:
                break

    if not data or len(data) <= 1:
        return None

    headers = data[0]
    state_idx = headers.index("state")
    total_idx = headers.index("B25034_001E")

    # Built before 1994 = all pre-1990 units + ~40% of 1990-1999 decade
    # Pre-1990: B25034_006E (1980s) + 007 (1970s) + 008 (1960s) + 009 (1950s) + 010 (1940s) + 011 (pre-1939)
    # 1990s decade: B25034_005E
    pre1990_cols = [f"B25034_{str(i).zfill(3)}E" for i in range(6, 12)]
    decade_1990s_col = "B25034_005E"

    result = {}
    for row in data[1:]:
        fips = row[state_idx].zfill(2)
        if fips not in FIPS_TO_ABBR:
            continue
        try:
            total = int(row[headers.index("B25034_001E")])
            if total == 0:
                continue
            pre_1990 = sum(int(row[headers.index(c)]) for c in pre1990_cols)
            decade_90s = int(row[headers.index(decade_1990s_col)])
            # Estimate ~40% of the 1990s decade was built before 1994
            pre_1994 = pre_1990 + int(decade_90s * 0.4)
            pct = round((pre_1994 / total) * 100, 1)
            result[FIPS_TO_ABBR[fips]] = pct
        except (ValueError, IndexError):
            continue

    print(f"    Got {len(result)} states from ACS")
    return result


# ── Assembler ───────────────────────────────────────────────────

def assemble_data(year, api_key=None):
    """Fetch all data sources and assemble into state records."""
    print(f"\nFetching data for year {year}...\n")

    prev_year = year - 1
    results = {}

    # Fetch current and previous year population in parallel with other data
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(fetch_population, year, api_key): "pop_current",
            pool.submit(fetch_population, prev_year, api_key): "pop_previous",
            pool.submit(fetch_pest_firms, year, api_key): "firms",
            pool.submit(fetch_housing_age, year, api_key): "housing",
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception as e:
                print(f"  ERROR in {key}: {e}")
                results[key] = None

    # Validate we have minimum required data
    pop_current = results.get("pop_current")
    pop_previous = results.get("pop_previous")
    firms = results.get("firms")
    housing = results.get("housing")

    if not pop_current:
        print("\nFATAL: Could not fetch population data. Aborting.")
        return None, None

    missing = []
    if not firms:
        missing.append("pest firms")
    if not housing:
        missing.append("housing age")
    if not pop_previous:
        missing.append("previous year population (growth rates)")

    if missing:
        print(f"\nWARNING: Missing data for: {', '.join(missing)}")
        print("Will use fallback values where available.\n")

    # Assemble current year records
    current_records = []
    for name, abbr, fips in STATES:
        pop = pop_current.get(abbr)
        if not pop:
            print(f"  WARNING: No population for {name}, skipping")
            continue

        firm_count = firms.get(abbr, 0) if firms else 0
        housing_pct = housing.get(abbr, 50.0) if housing else 50.0
        climate = CLIMATE_RISK.get(abbr, 50)

        # Growth rate
        if pop_previous and abbr in pop_previous and pop_previous[abbr] > 0:
            growth = round(((pop - pop_previous[abbr]) / pop_previous[abbr]) * 100, 2)
        else:
            growth = 0.0

        current_records.append({
            "year": year,
            "state": name,
            "abbr": abbr,
            "population": pop,
            "pest_firm_count": firm_count,
            "housing_age_pct": housing_pct,
            "climate_risk": climate,
            "pop_growth_pct": growth,
        })

    # Assemble previous year records
    prev_records = []
    if pop_previous:
        # For previous year, try fetching its own prior year for growth
        pop_2yr_ago = None
        print(f"\n  Fetching {prev_year - 1} population for {prev_year} growth rates...")
        pop_2yr_ago = fetch_population(prev_year - 1, api_key)

        for name, abbr, fips in STATES:
            pop = pop_previous.get(abbr)
            if not pop:
                continue

            firm_count = firms.get(abbr, 0) if firms else 0
            housing_pct = housing.get(abbr, 50.0) if housing else 50.0
            # Slightly adjust housing for prior year
            housing_pct = round(max(0, housing_pct - 0.8), 1)
            climate = CLIMATE_RISK.get(abbr, 50)

            if pop_2yr_ago and abbr in pop_2yr_ago and pop_2yr_ago[abbr] > 0:
                growth = round(((pop - pop_2yr_ago[abbr]) / pop_2yr_ago[abbr]) * 100, 2)
            else:
                growth = 0.0

            prev_records.append({
                "year": prev_year,
                "state": name,
                "abbr": abbr,
                "population": pop,
                "pest_firm_count": firm_count,
                "housing_age_pct": housing_pct,
                "climate_risk": climate,
                "pop_growth_pct": growth,
            })

    return current_records, prev_records


# ── File writer ─────────────────────────────────────────────────

def write_data_js(current_records, prev_records, output_path):
    """Write records to data.js in the dashboard format."""
    lines = []
    lines.append("// ============================================================")
    lines.append("// Market Opportunity Index (MOI) — State Market Data")
    lines.append(f"// Auto-generated by update_data.py on {time.strftime('%Y-%m-%d %H:%M')}")
    lines.append("// Population: Census Bureau PEP / ACS")
    lines.append("// Pest Firms: Census CBP, NAICS 561710")
    lines.append("// Housing Age: ACS 5-Year, Table B25034 (est % built before 1994)")
    lines.append("// Climate Risk: NOAA temp/humidity/precip + FEMA NRI composite")
    lines.append("// ============================================================")
    lines.append("")
    lines.append("const STATE_MARKET_DATA = [")

    def format_record(r):
        return (
            f'  {{ year: {r["year"]}, state: "{r["state"]}", abbr: "{r["abbr"]}", '
            f'population: {r["population"]}, pest_firm_count: {r["pest_firm_count"]}, '
            f'housing_age_pct: {r["housing_age_pct"]}, climate_risk: {r["climate_risk"]}, '
            f'pop_growth_pct: {r["pop_growth_pct"]} }},'
        )

    for r in current_records:
        lines.append(format_record(r))

    if prev_records:
        lines.append("")
        lines.append(f"  // {prev_records[0]['year']} data for year-over-year comparison")
        for r in prev_records:
            lines.append(format_record(r))

    lines.append("];")
    lines.append("")
    lines.append("// FIPS codes for mapping states to GeoJSON")
    lines.append("const STATE_FIPS = {")

    fips_lines = []
    for i in range(0, len(STATES), 5):
        chunk = STATES[i:i+5]
        pairs = [f'"{abbr}": "{fips}"' for _, abbr, fips in chunk]
        fips_lines.append("  " + ", ".join(pairs) + ",")
    lines.extend(fips_lines)

    lines.append("};")
    lines.append("")
    lines.append("// State name to abbreviation mapping")
    lines.append("const STATE_NAME_TO_ABBR = {};")
    lines.append("const STATE_ABBR_TO_NAME = {};")
    lines.append("STATE_MARKET_DATA.forEach(d => {")
    lines.append("  STATE_NAME_TO_ABBR[d.state] = d.abbr;")
    lines.append("  STATE_ABBR_TO_NAME[d.abbr] = d.state;")
    lines.append("});")
    lines.append("")

    content = "\n".join(lines)

    with open(output_path, "w") as f:
        f.write(content)

    return content


# ── Main ────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch Census data and regenerate MOI dashboard data.js"
    )
    parser.add_argument(
        "--year", type=int, default=None,
        help="Data year to fetch (default: latest available, tries current year - 1)"
    )
    parser.add_argument(
        "--key", type=str, default=None,
        help="Census API key (optional, get one free at api.census.gov/data/key_signup.html)"
    )
    parser.add_argument(
        "--output", type=str, default=OUTPUT_FILE,
        help=f"Output file path (default: {OUTPUT_FILE})"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview data without writing file"
    )
    args = parser.parse_args()

    # Default year: try current year, usually census data lags by 1-2 years
    if args.year is None:
        import datetime
        current_yr = datetime.datetime.now().year
        # Census data typically available for year - 1 or year - 2
        args.year = current_yr - 1

    print("=" * 60)
    print("  MOI Data Updater")
    print("=" * 60)
    print(f"  Target year:  {args.year}")
    print(f"  API key:      {'provided' if args.key else 'none (500 req/day limit)'}")
    print(f"  Output:       {args.output}")
    print(f"  Dry run:      {args.dry_run}")
    print("=" * 60)

    current_records, prev_records = assemble_data(args.year, args.key)

    if not current_records:
        print("\nNo data fetched. Exiting.")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print(f"  Results: {len(current_records)} states for {args.year}")
    if prev_records:
        print(f"           {len(prev_records)} states for {args.year - 1}")
    print(f"{'=' * 60}")

    # Print summary table
    print(f"\n  {'State':<20} {'Pop':>12} {'Firms':>6} {'Housing%':>9} {'Climate':>8} {'Growth%':>8}")
    print(f"  {'-'*20} {'-'*12} {'-'*6} {'-'*9} {'-'*8} {'-'*8}")
    for r in sorted(current_records, key=lambda x: x["state"]):
        print(
            f"  {r['state']:<20} {r['population']:>12,} {r['pest_firm_count']:>6} "
            f"{r['housing_age_pct']:>8.1f}% {r['climate_risk']:>7} {r['pop_growth_pct']:>7.2f}%"
        )

    if args.dry_run:
        print("\n  Dry run — file not written.")
    else:
        write_data_js(current_records, prev_records or [], args.output)
        print(f"\n  Written to: {args.output}")
        print(f"  File size:  {os.path.getsize(args.output):,} bytes")

    print("\nDone.")


if __name__ == "__main__":
    main()
