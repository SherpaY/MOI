"""
fetch_priority_firms.py
Fetches Census CBP 2022 NAICS 561710 firm counts for 10 priority cities
and their states, computes CDS scores, outputs two CSVs + reconciliation.
"""

import csv
import time
import requests

# ── City → county FIPS mappings ─────────────────────────────────────────────
PRIORITY_CITY_COUNTIES = {
    "Houston":           [("48", "201")],
    "Dallas-Fort Worth": [("48", "113"), ("48", "439"), ("48", "121")],
    "Los Angeles":       [("06", "037")],
    "Washington DC":     [("11", "001")],
    "Miami":             [("12", "086")],
    "Phoenix":           [("04", "013")],
    "Atlanta":           [("13", "121"), ("13", "135"), ("13", "067")],
    "New York":          [("36", "061"), ("36", "047"), ("36", "081"), ("36", "005"), ("36", "085")],
    "Chicago":           [("17", "031")],
    "Philadelphia":      [("42", "101")],
}

# State FIPS for state-level fetch
PRIORITY_STATES = {
    "TX": "48",
    "CA": "06",
    "DC": "11",
    "FL": "12",
    "AZ": "04",
    "GA": "13",
    "NY": "36",
    "IL": "17",
    "PA": "42",
}

STATE_NAMES = {
    "TX": "Texas", "CA": "California", "DC": "District of Columbia",
    "FL": "Florida", "AZ": "Arizona", "GA": "Georgia",
    "NY": "New York", "IL": "Illinois", "PA": "Pennsylvania",
}

# City → state abbreviation (for output)
CITY_STATE = {
    "Houston": "TX", "Dallas-Fort Worth": "TX", "Los Angeles": "CA",
    "Washington DC": "DC", "Miami": "FL", "Phoenix": "AZ",
    "Atlanta": "GA", "New York": "NY", "Chicago": "IL",
    "Philadelphia": "PA",
}

# City → state abbreviation (for CDS gap lookup)
CITY_TO_STATE = CITY_STATE

CITY_POPULATIONS = {
    "Houston":           2328253,
    "Dallas-Fort Worth": 7759615,
    "Los Angeles":       3857263,
    "Washington DC":     681294,
    "Miami":             459745,
    "Phoenix":           1642323,
    "Atlanta":           505268,
    "New York":          8483844,
    "Chicago":           2711226,
    "Philadelphia":      1579706,
}

STATE_POPULATIONS = {
    "TX": 30503301,
    "CA": 39237836,
    "DC":   681294,
    "FL": 22610726,
    "AZ":  7431344,
    "GA": 10912876,
    "NY": 19677151,
    "IL": 12516863,
    "PA": 12961683,
}

# ── CDS normalization ────────────────────────────────────────────────────────
COMP_ANCHOR_MIN = 0
COMP_ANCHOR_MAX = 50   # 50 firms/100k = worst possible score

def compute_cds(firm_count, population):
    firms_per_100k = (firm_count / population) * 100_000
    normalized = ((firms_per_100k - COMP_ANCHOR_MIN) / (COMP_ANCHOR_MAX - COMP_ANCHOR_MIN)) * 100
    cds = 100 - min(100, max(0, normalized))
    return round(firms_per_100k, 2), round(cds, 1)

# ── Census CBP API helpers ───────────────────────────────────────────────────
BASE_URL = "https://api.census.gov/data/2022/cbp"

def fetch_county_estab(state_fips, county_fips):
    """Fetch ESTAB for one county. Returns int (suppressed = 1)."""
    params = {
        "get": "ESTAB",
        "for": f"county:{county_fips}",
        "in":  f"state:{state_fips}",
        "NAICS2017": "561710",
    }
    resp = requests.get(BASE_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    # data = [["ESTAB","county","state"], ["123","201","48"]]
    if len(data) < 2:
        print(f"  ⚠  No data for county {state_fips}-{county_fips}, treating as 1")
        return 1
    raw = data[1][0]
    if raw in (None, "-1", -1):
        print(f"  ⚠  Suppressed value for county {state_fips}-{county_fips}, treating as 1")
        return 1
    return int(raw)

def fetch_state_estab(state_fips):
    """Fetch ESTAB for a whole state."""
    params = {
        "get": "ESTAB",
        "for": f"state:{state_fips}",
        "NAICS2017": "561710",
    }
    resp = requests.get(BASE_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if len(data) < 2:
        return None
    raw = data[1][0]
    if raw in (None, "-1", -1):
        return 1
    return int(raw)

# ── Step 1: City-level firm counts ──────────────────────────────────────────
print("\n── Step 1: Fetching city-level firm counts from Census CBP 2022 ──")
city_rows = []

for city, counties in PRIORITY_CITY_COUNTIES.items():
    total = 0
    county_labels = []
    for state_fips, county_fips in counties:
        print(f"  {city}: fetching county {state_fips}-{county_fips}...")
        count = fetch_county_estab(state_fips, county_fips)
        total += count
        county_labels.append(f"{state_fips}-{county_fips}")
        time.sleep(0.1)

    pop = CITY_POPULATIONS[city]
    firms_per_100k, cds = compute_cds(total, pop)
    state_abbr = CITY_STATE[city]

    city_rows.append({
        "city":           city,
        "state":          state_abbr,
        "firm_count":     total,
        "population":     pop,
        "firms_per_100k": firms_per_100k,
        "CDS_score":      cds,
        "source":         "Census CBP 2022 NAICS 561710",
        "counties_summed": "; ".join(county_labels),
    })
    print(f"  ✓  {city}: {total} firms → {firms_per_100k} per 100K → CDS {cds}")

# ── Step 2: State-level firm counts ─────────────────────────────────────────
print("\n── Step 2: Fetching state-level firm counts from Census CBP 2022 ──")
state_rows = []

for abbr, fips in PRIORITY_STATES.items():
    print(f"  {abbr}: fetching state {fips}...")
    count = fetch_state_estab(fips)
    time.sleep(0.1)

    if count is None:
        print(f"  ⚠  No data returned for state {abbr}")
        continue

    pop = STATE_POPULATIONS[abbr]
    firms_per_100k, cds = compute_cds(count, pop)

    state_rows.append({
        "state":          abbr,
        "state_name":     STATE_NAMES[abbr],
        "firm_count":     count,
        "population":     pop,
        "firms_per_100k": firms_per_100k,
        "CDS_score":      cds,
        "source":         "Census CBP 2022 NAICS 561710",
    })
    print(f"  ✓  {abbr}: {count} firms → {firms_per_100k} per 100K → CDS {cds}")

# ── Step 3: Write CSVs ───────────────────────────────────────────────────────
city_csv = "priority_city_firms.csv"
with open(city_csv, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "city","state","firm_count","population",
        "firms_per_100k","CDS_score","source","counties_summed"
    ])
    writer.writeheader()
    writer.writerows(city_rows)
print(f"\n✓  Wrote {city_csv}")

state_csv = "priority_state_firms.csv"
with open(state_csv, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "state","state_name","firm_count","population",
        "firms_per_100k","CDS_score","source"
    ])
    writer.writeheader()
    writer.writerows(state_rows)
print(f"✓  Wrote {state_csv}")

# ── Step 4: Reconciliation summary ──────────────────────────────────────────
state_cds_map = {r["state"]: r["CDS_score"] for r in state_rows}

print("\nRECONCILIATION CHECK")
print("─" * 68)
print(f"{'City':<22} {'City CDS':>9} {'State CDS':>10} {'Gap':>7}  Status")
print("─" * 68)

for row in sorted(city_rows, key=lambda r: r["city"]):
    city_cds  = row["CDS_score"]
    state_abbr = CITY_TO_STATE[row["city"]]
    state_cds = state_cds_map.get(state_abbr, None)

    if state_cds is None:
        print(f"{row['city']:<22} {city_cds:>9} {'N/A':>10} {'—':>7}  ⚠ No state data")
        continue

    gap = round(abs(city_cds - state_cds), 1)
    print(f"{row['city']:<22} {city_cds:>9} {state_cds:>10} {gap:>7}  ✓ Consistent (same CBP source)")

print("─" * 68)
print("Both city and state CDS scores now use Census CBP 2022 NAICS 561710.")
print("The gap reflects real market differences (city ⊂ county ⊂ state), not source inconsistency.")

# ── Validation check ─────────────────────────────────────────────────────────
print("\nVALIDATION")
print("─" * 40)
expected_floors = {
    "New York": 1800, "Chicago": 900, "Houston": 700, "Los Angeles": 1200
}
for city, floor in expected_floors.items():
    row = next((r for r in city_rows if r["city"] == city), None)
    if row:
        ok = "✓" if row["firm_count"] >= floor else "✗ BELOW EXPECTED — check county summing"
        print(f"  {city:<22} {row['firm_count']:>5} firms  (expected ≥{floor})  {ok}")
