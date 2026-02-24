#!/usr/bin/env python3
"""
Fetch pest control firm counts from Google Places Text Search API
for top 100 US cities, aggregate to state level, and integrate
with the MOI dashboard data.js.

Uses the Places Text Search (New) API to search for "pest control"
businesses in each city, paginating through all results (max ~60 per city).

Usage:
  python3 fetch_places_counts.py test               # Test API key with one city
  python3 fetch_places_counts.py fetch               # Query API, output CSV
  python3 fetch_places_counts.py fetch --fresh        # Ignore checkpoint, re-fetch all
  python3 fetch_places_counts.py merge               # Merge results into data.js
  python3 fetch_places_counts.py merge --dry-run      # Preview without writing
  python3 fetch_places_counts.py run                 # fetch + merge in one step

Requires:
  pip install requests
  GOOGLE_MAPS_API_KEY environment variable set

Cost estimate (~$200/mo free credit covers this):
  ~100 cities x ~4 pages each = ~400 Text Search calls
  Text Search Basic SKU = $0.032/call → ~$13
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_FILE = os.path.join(SCRIPT_DIR, "places_checkpoint.json")
CSV_OUTPUT = os.path.join(SCRIPT_DIR, "places_pest_counts.csv")
STATE_CSV_OUTPUT = os.path.join(SCRIPT_DIR, "places_state_summary.csv")
DATA_JS_FILE = os.path.join(SCRIPT_DIR, "data.js")

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# Max results the Text Search API returns across all pages
TEXT_SEARCH_MAX_RESULTS = 60

# ── Top 100 US cities by population (2024 Census estimates) ───

TOP_100_CITIES = [
    ("New York", "NY"),
    ("Los Angeles", "CA"),
    ("Chicago", "IL"),
    ("Houston", "TX"),
    ("Phoenix", "AZ"),
    ("Philadelphia", "PA"),
    ("San Antonio", "TX"),
    ("San Diego", "CA"),
    ("Dallas", "TX"),
    ("Jacksonville", "FL"),
    ("Austin", "TX"),
    ("San Jose", "CA"),
    ("Fort Worth", "TX"),
    ("Columbus", "OH"),
    ("Charlotte", "NC"),
    ("Indianapolis", "IN"),
    ("San Francisco", "CA"),
    ("Seattle", "WA"),
    ("Denver", "CO"),
    ("Nashville", "TN"),
    ("Washington", "DC"),
    ("Oklahoma City", "OK"),
    ("El Paso", "TX"),
    ("Boston", "MA"),
    ("Portland", "OR"),
    ("Las Vegas", "NV"),
    ("Memphis", "TN"),
    ("Louisville", "KY"),
    ("Baltimore", "MD"),
    ("Milwaukee", "WI"),
    ("Albuquerque", "NM"),
    ("Tucson", "AZ"),
    ("Fresno", "CA"),
    ("Mesa", "AZ"),
    ("Sacramento", "CA"),
    ("Atlanta", "GA"),
    ("Kansas City", "MO"),
    ("Omaha", "NE"),
    ("Colorado Springs", "CO"),
    ("Raleigh", "NC"),
    ("Long Beach", "CA"),
    ("Virginia Beach", "VA"),
    ("Miami", "FL"),
    ("Oakland", "CA"),
    ("Minneapolis", "MN"),
    ("Tampa", "FL"),
    ("Tulsa", "OK"),
    ("Arlington", "TX"),
    ("New Orleans", "LA"),
    ("Wichita", "KS"),
    ("Cleveland", "OH"),
    ("Bakersfield", "CA"),
    ("Aurora", "CO"),
    ("Anaheim", "CA"),
    ("Honolulu", "HI"),
    ("Santa Ana", "CA"),
    ("Riverside", "CA"),
    ("Corpus Christi", "TX"),
    ("Lexington", "KY"),
    ("Henderson", "NV"),
    ("Stockton", "CA"),
    ("Saint Paul", "MN"),
    ("Cincinnati", "OH"),
    ("St. Louis", "MO"),
    ("Pittsburgh", "PA"),
    ("Greensboro", "NC"),
    ("Lincoln", "NE"),
    ("Orlando", "FL"),
    ("Irvine", "CA"),
    ("Newark", "NJ"),
    ("Durham", "NC"),
    ("Chula Vista", "CA"),
    ("Toledo", "OH"),
    ("Fort Wayne", "IN"),
    ("St. Petersburg", "FL"),
    ("Laredo", "TX"),
    ("Jersey City", "NJ"),
    ("Chandler", "AZ"),
    ("Madison", "WI"),
    ("Lubbock", "TX"),
    ("Gilbert", "AZ"),
    ("Reno", "NV"),
    ("Winston-Salem", "NC"),
    ("Glendale", "AZ"),
    ("Hialeah", "FL"),
    ("Garland", "TX"),
    ("Scottsdale", "AZ"),
    ("Irving", "TX"),
    ("Chesapeake", "VA"),
    ("North Las Vegas", "NV"),
    ("Fremont", "CA"),
    ("Boise", "ID"),
    ("Richmond", "VA"),
    ("San Bernardino", "CA"),
    ("Birmingham", "AL"),
    ("Spokane", "WA"),
    ("Rochester", "NY"),
    ("Des Moines", "IA"),
    ("Modesto", "CA"),
    ("Fayetteville", "NC"),
    # ── Expansion cities ──
    ("Detroit", "MI"),
    ("Salt Lake City", "UT"),
    ("Little Rock", "AR"),
    ("Jackson", "MS"),
    ("Providence", "RI"),
    ("Anchorage", "AK"),
    ("Charleston", "SC"),
    ("Bridgeport", "CT"),
    ("Manchester", "NH"),
    ("Burlington", "VT"),
    ("Sioux Falls", "SD"),
    ("Billings", "MT"),
    ("Cheyenne", "WY"),
    ("Portland", "ME"),
    ("Cape Coral", "FL"),
    ("Port St. Lucie", "FL"),
    ("Frisco", "TX"),
    ("McKinney", "TX"),
    ("Surprise", "AZ"),
    ("Murfreesboro", "TN"),
    ("Clarksville", "TN"),
    ("Savannah", "GA"),
    ("Grand Rapids", "MI"),
    ("Akron", "OH"),
    ("Dayton", "OH"),
    ("Buffalo", "NY"),
    ("Syracuse", "NY"),
    ("Worcester", "MA"),
    ("Knoxville", "TN"),
    ("Chattanooga", "TN"),
    ("Tallahassee", "FL"),
    ("Baton Rouge", "LA"),
    ("Shreveport", "LA"),
    ("Mobile", "AL"),
    ("Augusta", "GA"),
    ("Columbia", "SC"),
    ("Norfolk", "VA"),
    ("Brownsville", "TX"),
    ("Overland Park", "KS"),
    # ── Expansion: Orkin pest-pressure cities not yet in pipeline ──
    ("Greenville", "SC"),
    ("Hartford", "CT"),
    ("Flint", "MI"),
    ("Champaign", "IL"),
    ("Charleston", "WV"),
    ("West Palm Beach", "FL"),
    ("Cedar Rapids", "IA"),
    ("Greenville", "NC"),
    ("South Bend", "IN"),
    ("Fort Myers", "FL"),
    ("Davenport", "IA"),
    ("Youngstown", "OH"),
    ("Peoria", "IL"),
    ("Myrtle Beach", "SC"),
    ("Waco", "TX"),
    ("Kansas City", "KS"),
    ("Lansing", "MI"),
    ("Harrisburg", "PA"),
    ("Albany", "NY"),
    ("Eau Claire", "WI"),
]

# State abbreviation to full name mapping
STATE_ABBR_TO_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


# ── Google Places Client ──────────────────────────────────────

class GooglePlacesClient:
    """Client for Google Places Text Search (New) API."""

    def __init__(self, api_key):
        self.api_key = api_key
        self.session = requests.Session()

    def search_pest_control(self, city, state_abbr):
        """
        Search for pest control businesses in a city using Text Search.
        Paginates through all results (API caps at ~60).

        Returns:
            dict with 'count' (int), 'truncated' (bool), 'businesses' (list), 'error' (str|None)
        """
        query = f"pest control in {city}, {state_abbr}"
        all_businesses = []
        page_token = None
        page = 0
        max_pages = 10  # Safety limit

        while page < max_pages:
            payload = {
                "textQuery": query,
                "maxResultCount": 20,
                "languageCode": "en",
            }
            if page_token:
                payload["pageToken"] = page_token

            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.primaryType,nextPageToken",
            }

            result = self._post_with_retry(TEXT_SEARCH_URL, payload, headers)

            if result.get("error"):
                if page == 0:
                    return {"count": None, "truncated": False, "businesses": [], "error": result["error"]}
                else:
                    # Got some results before error, return what we have
                    break

            data = result["data"]
            places = data.get("places", [])

            for p in places:
                all_businesses.append({
                    "name": p.get("displayName", {}).get("text", "Unknown"),
                    "address": p.get("formattedAddress", ""),
                    "type": p.get("primaryType", ""),
                })

            page += 1

            # Check for next page
            page_token = data.get("nextPageToken")
            if not page_token or len(places) == 0:
                break

            # Small delay between pages
            time.sleep(0.1)

        count = len(all_businesses)
        truncated = count >= TEXT_SEARCH_MAX_RESULTS

        return {
            "count": count,
            "truncated": truncated,
            "businesses": all_businesses,
            "error": None,
        }

    def _post_with_retry(self, url, payload, headers, max_retries=5):
        """POST request with exponential backoff on rate limits."""
        for attempt in range(max_retries):
            try:
                resp = self.session.post(url, json=payload, headers=headers, timeout=30)

                if resp.status_code == 200:
                    return {"data": resp.json(), "error": None}

                if resp.status_code == 429:
                    wait = min(2 ** attempt * 2, 32)
                    print(f"\n    Rate limited. Waiting {wait}s...", end="", flush=True)
                    time.sleep(wait)
                    continue

                if resp.status_code == 400:
                    error_body = resp.json() if resp.text else {}
                    error_msg = error_body.get("error", {}).get("message", resp.text[:200])
                    return {"data": None, "error": f"bad_request: {error_msg}"}

                if resp.status_code == 403:
                    error_body = resp.json() if resp.text else {}
                    error_msg = error_body.get("error", {}).get("message", resp.text[:200])
                    return {"data": None, "error": f"forbidden: {error_msg}"}

                resp.raise_for_status()

            except requests.exceptions.ConnectionError as e:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    print(f"\n    Connection error, retrying in {wait}s...", end="", flush=True)
                    time.sleep(wait)
                else:
                    return {"data": None, "error": f"connection_error: {e}"}

            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    print(f"\n    Timeout, retrying in {wait}s...", end="", flush=True)
                    time.sleep(wait)
                else:
                    return {"data": None, "error": "timeout"}

        return {"data": None, "error": "max_retries_exceeded"}


# ── Checkpoint Manager ────────────────────────────────────────

class CheckpointManager:
    """Saves and loads progress to allow resuming interrupted fetches."""

    def __init__(self, filepath):
        self.filepath = filepath
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                print("  WARNING: Checkpoint file corrupt, starting fresh.")
                return self._empty()
        return self._empty()

    def _empty(self):
        return {
            "timestamp": None,
            "counts": {},
            "truncated": {},
            "errors": {},
            "businesses": {},
        }

    def save(self):
        self.data["timestamp"] = datetime.now().isoformat()
        with open(self.filepath, "w") as f:
            json.dump(self.data, f, indent=2)

    def has_count(self, city_key):
        return city_key in self.data["counts"]

    def get_count(self, city_key):
        return self.data["counts"].get(city_key)

    def is_truncated(self, city_key):
        return self.data.get("truncated", {}).get(city_key, False)

    def set_result(self, city_key, count, truncated=False, error=None, businesses=None):
        self.data["counts"][city_key] = count
        self.data.setdefault("truncated", {})[city_key] = truncated
        if error:
            self.data["errors"][city_key] = error
        if businesses:
            # Store just names to keep checkpoint small
            self.data.setdefault("businesses", {})[city_key] = [
                b["name"] for b in businesses[:100]
            ]

    def get_error(self, city_key):
        return self.data.get("errors", {}).get(city_key)

    def get_businesses(self, city_key):
        return self.data.get("businesses", {}).get(city_key, [])

    def clear(self):
        self.data = self._empty()
        self.save()


# ── Fetch Command ─────────────────────────────────────────────

def cmd_fetch(api_key, fresh=False):
    """Fetch pest control counts for all top 100 cities."""
    client = GooglePlacesClient(api_key)
    checkpoint = CheckpointManager(CHECKPOINT_FILE)

    if fresh:
        print("  Starting fresh (ignoring checkpoint)...")
        checkpoint.clear()

    total = len(TOP_100_CITIES)
    successful = 0
    cached = 0
    errors = 0

    print(f"\n  Processing {total} cities via Text Search API...\n")

    for i, (city, state) in enumerate(TOP_100_CITIES):
        city_key = f"{city}, {state}"
        progress = f"[{i + 1:3d}/{total}]"

        # Check checkpoint
        if checkpoint.has_count(city_key):
            count = checkpoint.get_count(city_key)
            error = checkpoint.get_error(city_key)
            trunc = checkpoint.is_truncated(city_key)
            if error:
                print(f"  {progress} {city_key:<30} cached (error: {error})")
                errors += 1
            else:
                suffix = "+" if trunc else ""
                print(f"  {progress} {city_key:<30} cached ({count}{suffix} firms)")
                cached += 1
            continue

        # Query Text Search API
        print(f"  {progress} {city_key:<30} ", end="", flush=True)
        result = client.search_pest_control(city, state)

        checkpoint.set_result(
            city_key,
            result["count"],
            truncated=result.get("truncated", False),
            error=result.get("error"),
            businesses=result.get("businesses", []),
        )

        if result["error"]:
            print(f"ERROR ({result['error'][:50]})")
            errors += 1
        else:
            suffix = "+" if result.get("truncated") else ""
            print(f"{result['count']}{suffix} firms")
            successful += 1

        # Throttle between cities
        time.sleep(0.2)

        # Save checkpoint every 10 cities
        if (i + 1) % 10 == 0:
            checkpoint.save()

    # Final save
    checkpoint.save()

    # Write CSVs
    write_city_csv(checkpoint)
    state_summary = aggregate_to_state(checkpoint)
    write_state_csv(state_summary)

    # Print summary
    total_with_data = successful + cached
    print(f"\n{'=' * 60}")
    print(f"  Google Places Pest Control Counts — Summary")
    print(f"{'=' * 60}")
    print(f"  Cities processed:  {total}")
    print(f"  Successful:        {total_with_data}")
    print(f"    New queries:     {successful}")
    print(f"    From cache:      {cached}")
    print(f"  Errors:            {errors}")

    # Count truncated
    truncated_cities = [
        k for k in checkpoint.data.get("truncated", {})
        if checkpoint.data["truncated"][k]
    ]
    if truncated_cities:
        print(f"  Truncated (60+):   {len(truncated_cities)} cities")

    states_with_data = [s for s in state_summary if state_summary[s]["count"] > 0]
    print(f"\n  State coverage:    {len(states_with_data)} of 50 states")

    uncovered = sorted([
        s for s in STATE_ABBR_TO_NAME
        if s != "DC" and (s not in state_summary or state_summary[s]["count"] == 0)
    ])
    if uncovered:
        print(f"  States w/o data:   {', '.join(uncovered)}")

    top_states = sorted(
        [(s, d) for s, d in state_summary.items() if d["count"] > 0],
        key=lambda x: x[1]["count"],
        reverse=True,
    )[:10]
    print(f"\n  Top 10 States by Google Places Count:")
    for abbr, data in top_states:
        trunc = "*" if data.get("has_truncated") else ""
        print(f"    {abbr}: {data['count']:>5,}{trunc}  ({data['cities']} cities)")

    if any(d.get("has_truncated") for _, d in top_states):
        print(f"    * = includes cities capped at 60 results")

    print(f"\n  Files written:")
    print(f"    {CSV_OUTPUT}")
    print(f"    {STATE_CSV_OUTPUT}")
    print(f"{'=' * 60}")

    return state_summary


def write_city_csv(checkpoint):
    """Write city-level results to CSV."""
    rows = []
    for city, state in TOP_100_CITIES:
        city_key = f"{city}, {state}"
        count = checkpoint.get_count(city_key)
        error = checkpoint.get_error(city_key) or ""
        truncated = checkpoint.is_truncated(city_key)
        businesses = checkpoint.get_businesses(city_key)

        rows.append({
            "city": city,
            "state_abbr": state,
            "state_name": STATE_ABBR_TO_NAME.get(state, state),
            "pest_control_count": count if count is not None else "",
            "truncated": "yes" if truncated else "no",
            "sample_businesses": " | ".join(businesses[:10]),
            "error": error,
            "query_date": datetime.now().strftime("%Y-%m-%d"),
        })

    with open(CSV_OUTPUT, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "city", "state_abbr", "state_name",
            "pest_control_count", "truncated", "sample_businesses",
            "error", "query_date",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n  City CSV written: {CSV_OUTPUT} ({len(rows)} rows)")


def aggregate_to_state(checkpoint):
    """Aggregate city-level counts to state level."""
    state_data = {}

    for city, state in TOP_100_CITIES:
        if state == "DC":
            continue

        if state not in state_data:
            state_data[state] = {
                "count": 0,
                "cities": 0,
                "has_truncated": False,
                "city_details": [],
            }

        city_key = f"{city}, {state}"
        count = checkpoint.get_count(city_key)
        error = checkpoint.get_error(city_key)
        truncated = checkpoint.is_truncated(city_key)

        if count is not None and not error:
            state_data[state]["count"] += count
            state_data[state]["cities"] += 1
            if truncated:
                state_data[state]["has_truncated"] = True
            state_data[state]["city_details"].append({
                "city": city,
                "count": count,
                "truncated": truncated,
            })

    return state_data


def write_state_csv(state_summary):
    """Write state-level summary to CSV."""
    rows = []
    for abbr in sorted(STATE_ABBR_TO_NAME.keys()):
        if abbr == "DC":
            continue
        data = state_summary.get(abbr, {"count": 0, "cities": 0, "has_truncated": False})
        rows.append({
            "state_abbr": abbr,
            "state_name": STATE_ABBR_TO_NAME[abbr],
            "google_places_count": data["count"],
            "cities_queried": data["cities"],
            "has_truncated_cities": "yes" if data.get("has_truncated") else "no",
        })

    with open(STATE_CSV_OUTPUT, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "state_abbr", "state_name", "google_places_count",
            "cities_queried", "has_truncated_cities",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"  State CSV written: {STATE_CSV_OUTPUT} ({len(rows)} rows)")


# ── Merge Command ─────────────────────────────────────────────

def cmd_merge(dry_run=False):
    """Merge Google Places counts into data.js."""
    if not os.path.exists(STATE_CSV_OUTPUT):
        print(f"  ERROR: {STATE_CSV_OUTPUT} not found. Run 'fetch' first.")
        sys.exit(1)

    state_counts = {}
    with open(STATE_CSV_OUTPUT, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            state_counts[row["state_abbr"]] = {
                "count": int(row["google_places_count"]),
                "cities": int(row["cities_queried"]),
            }

    if not os.path.exists(DATA_JS_FILE):
        print(f"  ERROR: {DATA_JS_FILE} not found.")
        sys.exit(1)

    with open(DATA_JS_FILE, "r") as f:
        content = f.read()

    # Parse state records using regex
    record_pattern = re.compile(
        r'\{\s*year:\s*(\d+),\s*state:\s*"([^"]+)",\s*abbr:\s*"([^"]+)",\s*'
        r'population:\s*(\d+),\s*pest_firm_count:\s*(\d+),\s*'
        r'housing_age_pct:\s*([\d.]+),\s*climate_risk:\s*(\d+),\s*'
        r'pop_growth_pct:\s*(-?[\d.]+)\s*\}'
    )

    records = []
    for match in record_pattern.finditer(content):
        records.append({
            "year": int(match.group(1)),
            "state": match.group(2),
            "abbr": match.group(3),
            "population": int(match.group(4)),
            "pest_firm_count": int(match.group(5)),
            "housing_age_pct": float(match.group(6)),
            "climate_risk": int(match.group(7)),
            "pop_growth_pct": float(match.group(8)),
        })

    if not records:
        print("  ERROR: Could not parse any records from data.js")
        sys.exit(1)

    print(f"  Parsed {len(records)} records from data.js")

    # Add Google Places fields
    for r in records:
        sc = state_counts.get(r["abbr"], {"count": 0, "cities": 0})
        r["google_places_count"] = sc["count"]
        r["google_places_cities"] = sc["cities"]

    # Split into current and previous year
    years = sorted(set(r["year"] for r in records), reverse=True)
    current_year = years[0]
    current_records = [r for r in records if r["year"] == current_year]
    prev_records = [r for r in records if r["year"] != current_year]

    if dry_run:
        print(f"\n  Dry run — preview of changes:\n")
        print(f"  {'State':<20} {'CBP Firms':>10} {'Google Places':>14} {'Cities':>7}")
        print(f"  {'-'*20} {'-'*10} {'-'*14} {'-'*7}")
        for r in sorted(current_records, key=lambda x: x["state"]):
            gp = r["google_places_count"]
            gc = r["google_places_cities"]
            print(f"  {r['state']:<20} {r['pest_firm_count']:>10,} {gp:>14,} {gc:>7}")
        print(f"\n  File not written (dry run).")
        return

    write_updated_data_js(current_records, prev_records)
    print(f"\n  Updated: {DATA_JS_FILE}")
    print(f"  File size: {os.path.getsize(DATA_JS_FILE):,} bytes")


def write_updated_data_js(current_records, prev_records):
    """Write data.js with google_places_count fields added."""
    lines = []
    lines.append("// ============================================================")
    lines.append("// Market Opportunity Index (MOI) - State Market Data")
    lines.append(f"// VERIFIED DATA from authoritative sources (Updated {datetime.now().strftime('%b %Y')})")
    lines.append("// Population: Census Bureau Vintage 2025 (NST-EST2025-POP, released Jan 2026)")
    lines.append("// Pop Growth: Derived from Vintage 2025 year-over-year % change")
    lines.append("// Pest Firms (CBP): Census CBP 2023, NAICS 561710 (employer establishments)")
    lines.append("// Pest Firms (Google): Places Text Search API, top 100 US cities")
    lines.append("// Housing Age: ACS 2024 5-Year, Table B25034 (% units built before 1994)")
    lines.append("// Climate Risk: Composite index from NOAA temp/humidity/precip + FEMA NRI")
    lines.append("// ============================================================")
    lines.append("")
    lines.append("const STATE_MARKET_DATA = [")

    def format_record(r):
        return (
            f'  {{ year: {r["year"]}, state: "{r["state"]}", abbr: "{r["abbr"]}", '
            f'population: {r["population"]}, pest_firm_count: {r["pest_firm_count"]}, '
            f'google_places_count: {r["google_places_count"]}, '
            f'google_places_cities: {r["google_places_cities"]}, '
            f'housing_age_pct: {r["housing_age_pct"]}, climate_risk: {r["climate_risk"]}, '
            f'pop_growth_pct: {r["pop_growth_pct"]} }},'
        )

    for r in sorted(current_records, key=lambda x: x["state"]):
        lines.append(format_record(r))

    if prev_records:
        lines.append("")
        prev_year = prev_records[0]["year"]
        lines.append(f"  // {prev_year} data for year-over-year comparison")
        lines.append(f"  // Population: Census Bureau Vintage 2025 (July 1, {prev_year} estimates)")
        lines.append(f"  // Pest firms: CBP 2023 baseline (latest available)")
        lines.append(f"  // Housing age: ACS 2024 5-Year (same reference period)")
        lines.append(f"  // Climate risk: Stable year-to-year")
        lines.append(f"  // Pop growth: {prev_year - 1}-{prev_year} rates from Vintage 2025")
        for r in sorted(prev_records, key=lambda x: x["state"]):
            lines.append(format_record(r))

    lines.append("];")
    lines.append("")

    # FIPS codes
    STATES_FIPS = [
        ("AL", "01"), ("AK", "02"), ("AZ", "04"), ("AR", "05"), ("CA", "06"),
        ("CO", "08"), ("CT", "09"), ("DE", "10"), ("FL", "12"), ("GA", "13"),
        ("HI", "15"), ("ID", "16"), ("IL", "17"), ("IN", "18"), ("IA", "19"),
        ("KS", "20"), ("KY", "21"), ("LA", "22"), ("ME", "23"), ("MD", "24"),
        ("MA", "25"), ("MI", "26"), ("MN", "27"), ("MS", "28"), ("MO", "29"),
        ("MT", "30"), ("NE", "31"), ("NV", "32"), ("NH", "33"), ("NJ", "34"),
        ("NM", "35"), ("NY", "36"), ("NC", "37"), ("ND", "38"), ("OH", "39"),
        ("OK", "40"), ("OR", "41"), ("PA", "42"), ("RI", "44"), ("SC", "45"),
        ("SD", "46"), ("TN", "47"), ("TX", "48"), ("UT", "49"), ("VT", "50"),
        ("VA", "51"), ("WA", "53"), ("WV", "54"), ("WI", "55"), ("WY", "56"),
    ]

    lines.append("// FIPS codes for mapping states to GeoJSON")
    lines.append("const STATE_FIPS = {")
    for i in range(0, len(STATES_FIPS), 5):
        chunk = STATES_FIPS[i:i + 5]
        pairs = [f'"{abbr}": "{fips}"' for abbr, fips in chunk]
        lines.append("  " + ", ".join(pairs) + ",")
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

    with open(DATA_JS_FILE, "w") as f:
        f.write("\n".join(lines))


# ── Test Command ──────────────────────────────────────────────

def cmd_test(api_key):
    """Test API key with a single city search."""
    client = GooglePlacesClient(api_key)

    print(f"\n{'=' * 60}")
    print(f"  API Test — Google Places Text Search")
    print(f"{'=' * 60}")

    test_city, test_state = "Houston", "TX"
    print(f"\n  Searching for pest control in {test_city}, {test_state}...")

    result = client.search_pest_control(test_city, test_state)

    if result["error"]:
        print(f"\n  ERROR: {result['error']}")
        print(f"\n  Troubleshooting:")
        print(f"    1. Ensure 'Places API (New)' is enabled in Google Cloud Console")
        print(f"    2. Check API key restrictions allow Places API")
        print(f"    3. Verify billing is enabled on the project")
        sys.exit(1)

    count = result["count"]
    truncated = result.get("truncated", False)
    businesses = result.get("businesses", [])

    print(f"\n  Results:")
    print(f"    Count: {count}{'+ (truncated at 60)' if truncated else ''}")
    print(f"    Businesses found:")
    for b in businesses[:10]:
        print(f"      - {b['name']}")
        print(f"        {b['address']}")
    if len(businesses) > 10:
        print(f"      ... and {len(businesses) - 10} more")

    print(f"\n{'=' * 60}")
    print(f"  API test PASSED")
    print(f"  Found {count} pest control businesses in {test_city}, {test_state}")
    print(f"  You can now run: python3 fetch_places_counts.py fetch")
    print(f"{'=' * 60}")


# ── Main ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch pest control firm counts from Google Places Text Search API"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    subparsers.add_parser("test", help="Test API key with one city")

    fetch_parser = subparsers.add_parser("fetch", help="Fetch counts for all 100 cities")
    fetch_parser.add_argument("--fresh", action="store_true", help="Ignore checkpoint, re-fetch all")

    merge_parser = subparsers.add_parser("merge", help="Merge results into data.js")
    merge_parser.add_argument("--dry-run", action="store_true", help="Preview without writing")

    run_parser = subparsers.add_parser("run", help="Fetch + merge in one step")
    run_parser.add_argument("--fresh", action="store_true", help="Ignore checkpoint, re-fetch all")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")

    if args.command in ("test", "fetch", "run") and not api_key:
        print("ERROR: GOOGLE_MAPS_API_KEY environment variable not set.")
        print("")
        print("Set it with:")
        print("  export GOOGLE_MAPS_API_KEY='your-api-key-here'")
        print("")
        print("Get an API key at: https://console.cloud.google.com/apis/credentials")
        print("Required API: Places API (New)")
        sys.exit(1)

    if args.command == "test":
        cmd_test(api_key)
    elif args.command == "fetch":
        cmd_fetch(api_key, fresh=args.fresh)
    elif args.command == "merge":
        cmd_merge(dry_run=getattr(args, "dry_run", False))
    elif args.command == "run":
        cmd_fetch(api_key, fresh=getattr(args, "fresh", False))
        print("\n  Now merging into data.js...\n")
        cmd_merge()


if __name__ == "__main__":
    main()
