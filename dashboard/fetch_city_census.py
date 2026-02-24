#!/usr/bin/env python3
"""
Fetch city-level Census data for US cities
and generate city_data.js for the MOI dashboard.

Sources:
  Population:   Census PEP (preferred) or ACS 5-Year (B01003_001E) at place level
  Housing Age:  Census ACS 5-Year (B25034) at place level
  Pest Firms:   Google Places Text Search (from places_pest_counts.csv)
  Climate Risk: Inherited from state-level composite
  Pop Growth:   Derived from 2 years of ACS place-level estimates

Usage:
  python3 fetch_city_census.py                  # fetch + write city_data.js
  python3 fetch_city_census.py --key YOUR_KEY   # use Census API key
  python3 fetch_city_census.py --dry-run        # preview without writing
"""

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "city_data.js")
PEST_CSV = os.path.join(SCRIPT_DIR, "places_pest_counts.csv")
BASE_URL = "https://api.census.gov/data"

# ── Top 100 cities: (city, state_abbr, state_fips, place_fips, lat, lng) ──

CITIES = [
    ("New York", "NY", "36", "51000", 40.7128, -74.0060),
    ("Los Angeles", "CA", "06", "44000", 34.0522, -118.2437),
    ("Chicago", "IL", "17", "14000", 41.8781, -87.6298),
    ("Houston", "TX", "48", "35000", 29.7604, -95.3698),
    ("Phoenix", "AZ", "04", "55000", 33.4484, -112.0740),
    ("Philadelphia", "PA", "42", "60000", 39.9526, -75.1652),
    ("San Antonio", "TX", "48", "65000", 29.4241, -98.4936),
    ("San Diego", "CA", "06", "66000", 32.7157, -117.1611),
    ("Dallas", "TX", "48", "19000", 32.7767, -96.7970),
    ("Jacksonville", "FL", "12", "35000", 30.3322, -81.6557),
    ("Austin", "TX", "48", "05000", 30.2672, -97.7431),
    ("San Jose", "CA", "06", "68000", 37.3382, -121.8863),
    ("Fort Worth", "TX", "48", "27000", 32.7555, -97.3308),
    ("Columbus", "OH", "39", "18000", 39.9612, -82.9988),
    ("Charlotte", "NC", "37", "12000", 35.2271, -80.8431),
    ("Indianapolis", "IN", "18", "36003", 39.7684, -86.1581),
    ("San Francisco", "CA", "06", "67000", 37.7749, -122.4194),
    ("Seattle", "WA", "53", "63000", 47.6062, -122.3321),
    ("Denver", "CO", "08", "20000", 39.7392, -104.9903),
    ("Nashville", "TN", "47", "52006", 36.1627, -86.7816),
    ("Washington", "DC", "11", "50000", 38.9072, -77.0369),
    ("Oklahoma City", "OK", "40", "55000", 35.4676, -97.5164),
    ("El Paso", "TX", "48", "24000", 31.7619, -106.4850),
    ("Boston", "MA", "25", "07000", 42.3601, -71.0589),
    ("Portland", "OR", "41", "59000", 45.5152, -122.6784),
    ("Las Vegas", "NV", "32", "40000", 36.1699, -115.1398),
    ("Memphis", "TN", "47", "48000", 35.1495, -90.0490),
    ("Louisville", "KY", "21", "48006", 38.2527, -85.7585),
    ("Baltimore", "MD", "24", "04000", 39.2904, -76.6122),
    ("Milwaukee", "WI", "55", "53000", 43.0389, -87.9065),
    ("Albuquerque", "NM", "35", "02000", 35.0844, -106.6504),
    ("Tucson", "AZ", "04", "77000", 32.2226, -110.9747),
    ("Fresno", "CA", "06", "27000", 36.7378, -119.7871),
    ("Mesa", "AZ", "04", "46000", 33.4152, -111.8315),
    ("Sacramento", "CA", "06", "64000", 38.5816, -121.4944),
    ("Atlanta", "GA", "13", "04000", 33.7490, -84.3880),
    ("Kansas City", "MO", "29", "38000", 39.0997, -94.5786),
    ("Omaha", "NE", "31", "37000", 41.2565, -95.9345),
    ("Colorado Springs", "CO", "08", "16000", 38.8339, -104.8214),
    ("Raleigh", "NC", "37", "55000", 35.7796, -78.6382),
    ("Long Beach", "CA", "06", "43000", 33.7701, -118.1937),
    ("Virginia Beach", "VA", "51", "82000", 36.8529, -75.9780),
    ("Miami", "FL", "12", "45000", 25.7617, -80.1918),
    ("Oakland", "CA", "06", "53000", 37.8044, -122.2712),
    ("Minneapolis", "MN", "27", "43000", 44.9778, -93.2650),
    ("Tampa", "FL", "12", "71000", 27.9506, -82.4572),
    ("Tulsa", "OK", "40", "75000", 36.1540, -95.9928),
    ("Arlington", "TX", "48", "04000", 32.7357, -97.1081),
    ("New Orleans", "LA", "22", "55000", 29.9511, -90.0715),
    ("Wichita", "KS", "20", "79000", 37.6872, -97.3301),
    ("Cleveland", "OH", "39", "16000", 41.4993, -81.6944),
    ("Bakersfield", "CA", "06", "03526", 35.3733, -119.0187),
    ("Aurora", "CO", "08", "04000", 39.7294, -104.8319),
    ("Anaheim", "CA", "06", "02000", 33.8366, -117.9143),
    ("Honolulu", "HI", "15", "71550", 21.3069, -157.8583),
    ("Santa Ana", "CA", "06", "69000", 33.7455, -117.8677),
    ("Riverside", "CA", "06", "62000", 33.9533, -117.3962),
    ("Corpus Christi", "TX", "48", "17000", 27.8006, -97.3964),
    ("Lexington", "KY", "21", "46027", 38.0406, -84.5037),
    ("Henderson", "NV", "32", "31900", 36.0395, -114.9817),
    ("Stockton", "CA", "06", "75000", 37.9577, -121.2908),
    ("Saint Paul", "MN", "27", "58000", 44.9537, -93.0900),
    ("Cincinnati", "OH", "39", "15000", 39.1031, -84.5120),
    ("St. Louis", "MO", "29", "65000", 38.6270, -90.1994),
    ("Pittsburgh", "PA", "42", "61000", 40.4406, -79.9959),
    ("Greensboro", "NC", "37", "28000", 36.0726, -79.7920),
    ("Lincoln", "NE", "31", "28000", 40.8136, -96.7026),
    ("Orlando", "FL", "12", "53000", 28.5383, -81.3792),
    ("Irvine", "CA", "06", "36770", 33.6846, -117.8265),
    ("Newark", "NJ", "34", "51000", 40.7357, -74.1724),
    ("Durham", "NC", "37", "19000", 35.9940, -78.8986),
    ("Chula Vista", "CA", "06", "13392", 32.6401, -117.0842),
    ("Toledo", "OH", "39", "77000", 41.6528, -83.5379),
    ("Fort Wayne", "IN", "18", "25000", 41.0793, -85.1394),
    ("St. Petersburg", "FL", "12", "63000", 27.7676, -82.6403),
    ("Laredo", "TX", "48", "41464", 27.5036, -99.5076),
    ("Jersey City", "NJ", "34", "36000", 40.7178, -74.0431),
    ("Chandler", "AZ", "04", "12000", 33.3062, -111.8413),
    ("Madison", "WI", "55", "48000", 43.0731, -89.4012),
    ("Lubbock", "TX", "48", "45000", 33.5779, -101.8552),
    ("Gilbert", "AZ", "04", "27400", 33.3528, -111.7890),
    ("Reno", "NV", "32", "60600", 39.5296, -119.8138),
    ("Winston-Salem", "NC", "37", "75000", 36.0999, -80.2442),
    ("Glendale", "AZ", "04", "27820", 33.5387, -112.1860),
    ("Hialeah", "FL", "12", "30000", 25.8576, -80.2781),
    ("Garland", "TX", "48", "29000", 32.9126, -96.6389),
    ("Scottsdale", "AZ", "04", "65000", 33.4942, -111.9261),
    ("Irving", "TX", "48", "37000", 32.8140, -96.9489),
    ("Chesapeake", "VA", "51", "16000", 36.7682, -76.2875),
    ("North Las Vegas", "NV", "32", "51800", 36.1989, -115.1175),
    ("Fremont", "CA", "06", "26000", 37.5485, -121.9886),
    ("Boise", "ID", "16", "08830", 43.6150, -116.2023),
    ("Richmond", "VA", "51", "67000", 37.5407, -77.4360),
    ("San Bernardino", "CA", "06", "65000", 34.1083, -117.2898),
    ("Birmingham", "AL", "01", "07000", 33.5207, -86.8025),
    ("Spokane", "WA", "53", "67000", 47.6588, -117.4260),
    ("Rochester", "NY", "36", "63000", 43.1566, -77.6088),
    ("Des Moines", "IA", "19", "21000", 41.5868, -93.6250),
    ("Modesto", "CA", "06", "48354", 37.6391, -120.9969),
    ("Fayetteville", "NC", "37", "22920", 35.0527, -78.8784),
    # ── Expansion: Under-represented states ──
    ("Detroit", "MI", "26", "22000", 42.3314, -83.0458),
    ("Salt Lake City", "UT", "49", "67000", 40.7608, -111.8910),
    ("Little Rock", "AR", "05", "41000", 34.7465, -92.2896),
    ("Jackson", "MS", "28", "36000", 32.2988, -90.1848),
    ("Providence", "RI", "44", "59000", 41.8240, -71.4128),
    ("Anchorage", "AK", "02", "03000", 61.2181, -149.9003),
    ("Charleston", "SC", "45", "13330", 32.7765, -79.9311),
    ("Bridgeport", "CT", "09", "08000", 41.1865, -73.1952),
    ("Manchester", "NH", "33", "45140", 42.9956, -71.4548),
    ("Burlington", "VT", "50", "10675", 44.4759, -73.2121),
    ("Sioux Falls", "SD", "46", "59020", 43.5446, -96.7311),
    ("Billings", "MT", "30", "06550", 45.7833, -108.5007),
    ("Cheyenne", "WY", "56", "13900", 41.1400, -104.8202),
    ("Portland", "ME", "23", "60545", 43.6591, -70.2568),
    # ── Expansion: Growing Sun Belt / secondary markets ──
    ("Cape Coral", "FL", "12", "10275", 26.5629, -81.9495),
    ("Port St. Lucie", "FL", "12", "58715", 27.2730, -80.3582),
    ("Frisco", "TX", "48", "27684", 33.1507, -96.8236),
    ("McKinney", "TX", "48", "45744", 33.1972, -96.6397),
    ("Surprise", "AZ", "04", "71510", 33.6292, -112.3680),
    ("Murfreesboro", "TN", "47", "51560", 35.8456, -86.3903),
    ("Clarksville", "TN", "47", "15160", 36.5298, -87.3595),
    ("Savannah", "GA", "13", "69000", 32.0809, -81.0912),
    # ── Expansion: Midwest / Northeast gaps ──
    ("Grand Rapids", "MI", "26", "34000", 42.9634, -85.6681),
    ("Akron", "OH", "39", "01000", 41.0814, -81.5190),
    ("Dayton", "OH", "39", "21000", 39.7589, -84.1916),
    ("Buffalo", "NY", "36", "11000", 42.8864, -78.8784),
    ("Syracuse", "NY", "36", "73000", 43.0481, -76.1474),
    ("Worcester", "MA", "25", "82000", 42.2626, -71.8023),
    ("Knoxville", "TN", "47", "40000", 35.9606, -83.9207),
    ("Chattanooga", "TN", "47", "14000", 35.0456, -85.3097),
    ("Tallahassee", "FL", "12", "70600", 30.4383, -84.2807),
    ("Baton Rouge", "LA", "22", "05000", 30.4515, -91.1871),
    ("Shreveport", "LA", "22", "70000", 32.5252, -93.7502),
    ("Mobile", "AL", "01", "50000", 30.6954, -88.0399),
    ("Augusta", "GA", "13", "04204", 33.4735, -81.9748),
    ("Columbia", "SC", "45", "16000", 34.0007, -81.0348),
    ("Norfolk", "VA", "51", "57000", 36.8508, -76.2859),
    ("Brownsville", "TX", "48", "10768", 25.9017, -97.4975),
    ("Overland Park", "KS", "20", "53775", 38.9822, -94.6708),
    # ── Expansion: Orkin pest-pressure cities not yet in pipeline ──
    ("Greenville", "SC", "45", "30850", 34.8526, -82.3940),
    ("Hartford", "CT", "09", "37000", 41.7658, -72.6734),
    ("Flint", "MI", "26", "29000", 43.0125, -83.6875),
    ("Champaign", "IL", "17", "12385", 40.1164, -88.2434),
    ("Charleston", "WV", "54", "14600", 38.3498, -81.6326),
    ("West Palm Beach", "FL", "12", "76600", 26.7153, -80.0534),
    ("Cedar Rapids", "IA", "19", "12000", 41.9779, -91.6656),
    ("Greenville", "NC", "37", "28080", 35.6127, -77.3664),
    ("South Bend", "IN", "18", "71000", 41.6764, -86.2520),
    ("Fort Myers", "FL", "12", "24125", 26.6406, -81.8723),
    ("Davenport", "IA", "19", "19000", 41.5236, -90.5776),
    ("Youngstown", "OH", "39", "88000", 41.0998, -80.6495),
    ("Peoria", "IL", "17", "59000", 40.6936, -89.5890),
    ("Myrtle Beach", "SC", "45", "49075", 33.6891, -78.8867),
    ("Waco", "TX", "48", "76000", 31.5493, -97.1467),
    ("Kansas City", "KS", "20", "36000", 39.1155, -94.6268),
    ("Lansing", "MI", "26", "46000", 42.7325, -84.5555),
    ("Harrisburg", "PA", "42", "32800", 40.2732, -76.8867),
    ("Albany", "NY", "36", "01000", 42.6526, -73.7562),
    ("Eau Claire", "WI", "55", "22300", 44.8113, -91.4985),
]

# State abbreviation to FIPS
STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
    "CO": "08", "CT": "09", "DE": "10", "FL": "12", "GA": "13",
    "HI": "15", "ID": "16", "IL": "17", "IN": "18", "IA": "19",
    "KS": "20", "KY": "21", "LA": "22", "ME": "23", "MD": "24",
    "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29",
    "MT": "30", "NE": "31", "NV": "32", "NH": "33", "NJ": "34",
    "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45",
    "SD": "46", "TN": "47", "TX": "48", "UT": "49", "VT": "50",
    "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56",
    "DC": "11",
}

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

# Climate risk (same as update_data.py - inherited from state)
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
    "DC": 59,
}


# ── API helpers ──────────────────────────────────────────────

def fetch_json(url, label="data", retries=3):
    """Fetch JSON from Census API with retries."""
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "MOI-Dashboard/1.0"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except HTTPError as e:
            if e.code == 404:
                # 404 means endpoint doesn't exist — no point retrying
                print(f"    {label}: 404 (not available)")
                return None
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"    Retry {attempt + 1}/{retries} for {label} (waiting {wait}s)...")
                time.sleep(wait)
            else:
                print(f"    ERROR fetching {label}: {e}")
                return None
        except (URLError, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"    Retry {attempt + 1}/{retries} for {label} (waiting {wait}s)...")
                time.sleep(wait)
            else:
                print(f"    ERROR fetching {label}: {e}")
                return None


def api_url(path, params, api_key=None):
    """Build Census API URL."""
    url = f"{BASE_URL}/{path}?{params}"
    if api_key:
        url += f"&key={api_key}"
    return url


# ── Data fetchers ────────────────────────────────────────────

def get_states_with_cities():
    """Get unique state FIPS codes from our city list."""
    states = {}
    for city, st_abbr, st_fips, pl_fips, lat, lng in CITIES:
        if st_fips not in states:
            states[st_fips] = {"abbr": st_abbr, "cities": []}
        states[st_fips]["cities"].append((city, pl_fips))
    return states


def fetch_place_population(year, api_key=None):
    """Fetch population for all our cities. Tries PEP first, falls back to ACS 5-Year."""
    # Try PEP sub-county estimates first (most current)
    result = _fetch_pep_place_population(year, api_key)
    if result and len(result) >= len(CITIES) * 0.5:
        return result

    # Fallback: ACS 5-Year (reliable but lags ~1 year)
    return _fetch_acs_place_population(year, api_key)


def _fetch_pep_place_population(year, api_key=None):
    """Try PEP place-level population estimates."""
    print(f"  Trying PEP place-level population (Vintage {year})...")

    states = get_states_with_cities()
    result = {}
    fetched = 0
    consecutive_failures = 0

    for st_fips, info in sorted(states.items()):
        # PEP population endpoint for places
        url = api_url(
            f"{year}/pep/population",
            f"get=NAME,POP_{year}&for=place:*&in=state:{st_fips}",
            api_key
        )
        data = fetch_json(url, f"PEP pop {info['abbr']}")

        if not data or len(data) <= 1:
            consecutive_failures += 1
            # If first 3 states all fail, this vintage isn't available
            if consecutive_failures >= 3 and fetched == 0:
                break
            continue
        consecutive_failures = 0

        headers = data[0]
        # Find population column (varies: POP_2025, POP, POPULATION, etc.)
        pop_field = None
        for h in headers:
            if h.startswith("POP") or h == "POPULATION":
                pop_field = h
                break
        if not pop_field:
            continue

        pop_idx = headers.index(pop_field)
        place_idx = headers.index("place")

        place_lookup = {}
        for row in data[1:]:
            try:
                place_lookup[row[place_idx]] = int(row[pop_idx]) if row[pop_idx] else 0
            except (ValueError, IndexError):
                continue

        for city, pl_fips in info["cities"]:
            key = f"{city}, {info['abbr']}"
            if pl_fips in place_lookup and place_lookup[pl_fips] > 0:
                result[key] = place_lookup[pl_fips]
                fetched += 1

        time.sleep(0.2)

    if fetched > 0:
        print(f"    Got PEP population for {fetched} of {len(CITIES)} cities")
    else:
        print(f"    PEP Vintage {year} not available at place level")
    return result if result else None


def _fetch_acs_place_population(year, api_key=None):
    """Fetch population using ACS 5-Year at place level (fallback)."""
    print(f"  Fetching city populations (ACS 5-Year {year})...")

    states = get_states_with_cities()
    result = {}
    fetched = 0

    for st_fips, info in sorted(states.items()):
        url = api_url(
            f"{year}/acs/acs5",
            f"get=NAME,B01003_001E&for=place:*&in=state:{st_fips}",
            api_key
        )
        data = fetch_json(url, f"ACS pop {info['abbr']}")

        if not data or len(data) <= 1:
            print(f"    WARNING: No ACS data for {info['abbr']}")
            continue

        headers = data[0]
        name_idx = headers.index("NAME")
        pop_idx = headers.index("B01003_001E")
        place_idx = headers.index("place")

        place_lookup = {}
        for row in data[1:]:
            place_lookup[row[place_idx]] = {
                "name": row[name_idx],
                "pop": int(row[pop_idx]) if row[pop_idx] else 0,
            }

        for city, pl_fips in info["cities"]:
            key = f"{city}, {info['abbr']}"
            if pl_fips in place_lookup:
                result[key] = place_lookup[pl_fips]["pop"]
                fetched += 1
            else:
                print(f"    WARNING: {key} (place {pl_fips}) not found in Census")

        time.sleep(0.2)

    print(f"    Got ACS population for {fetched} of {len(CITIES)} cities")
    return result


def fetch_place_housing_age(year, api_key=None):
    """Fetch housing age data for all our cities using ACS 5-Year B25034."""
    print(f"  Fetching city housing age (ACS 5-Year {year} B25034)...")

    vars_list = ",".join([f"B25034_{str(i).zfill(3)}E" for i in range(1, 12)])
    states = get_states_with_cities()
    result = {}
    fetched = 0

    for st_fips, info in sorted(states.items()):
        url = api_url(
            f"{year}/acs/acs5",
            f"get=NAME,{vars_list}&for=place:*&in=state:{st_fips}",
            api_key
        )
        data = fetch_json(url, f"ACS housing {info['abbr']}")

        if not data or len(data) <= 1:
            print(f"    WARNING: No housing data for {info['abbr']}")
            continue

        headers = data[0]
        place_idx = headers.index("place")

        # Pre-1990 columns: B25034_006E through _011E
        pre1990_cols = [f"B25034_{str(i).zfill(3)}E" for i in range(6, 12)]
        decade_1990s_col = "B25034_005E"

        place_lookup = {}
        for row in data[1:]:
            try:
                total = int(row[headers.index("B25034_001E")])
                if total == 0:
                    continue
                pre_1990 = sum(int(row[headers.index(c)]) for c in pre1990_cols)
                decade_90s = int(row[headers.index(decade_1990s_col)])
                pre_1994 = pre_1990 + int(decade_90s * 0.4)
                pct = round((pre_1994 / total) * 100, 1)
                place_lookup[row[place_idx]] = pct
            except (ValueError, IndexError):
                continue

        for city, pl_fips in info["cities"]:
            key = f"{city}, {info['abbr']}"
            if pl_fips in place_lookup:
                result[key] = place_lookup[pl_fips]
                fetched += 1

        time.sleep(0.2)

    print(f"    Got housing age for {fetched} of {len(CITIES)} cities")
    return result


def read_pest_counts():
    """Read pest control firm counts from places_pest_counts.csv."""
    print(f"  Reading pest firm counts from CSV...")

    if not os.path.exists(PEST_CSV):
        print(f"    WARNING: {PEST_CSV} not found")
        return {}, {}

    counts = {}
    truncated = {}
    with open(PEST_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = f"{row['city']}, {row['state_abbr']}"
            try:
                counts[key] = int(row["pest_control_count"])
            except (ValueError, KeyError):
                counts[key] = 0
            truncated[key] = row.get("truncated", "no") == "yes"

    print(f"    Got pest counts for {len(counts)} cities")
    return counts, truncated


# ── Assembler ────────────────────────────────────────────────

def assemble_city_data(year, api_key=None):
    """Fetch all data and assemble city records."""
    print(f"\nFetching city-level data for {year}...\n")

    prev_year = year - 1

    # Fetch current and previous year population + housing
    pop_current = fetch_place_population(year, api_key)
    pop_previous = fetch_place_population(prev_year, api_key)
    # Housing: try target year, fall back to year-1 (ACS 5-Year lags)
    housing = fetch_place_housing_age(year, api_key)
    if not housing or len(housing) < len(CITIES) * 0.5:
        print(f"  Housing age for {year} insufficient, trying {prev_year}...")
        housing = fetch_place_housing_age(prev_year, api_key)
    pest_counts, pest_truncated = read_pest_counts()

    # Assemble current year
    current_records = []
    for city, st_abbr, st_fips, pl_fips, lat, lng in CITIES:
        key = f"{city}, {st_abbr}"

        pop = pop_current.get(key, 0)
        if pop == 0:
            print(f"  WARNING: No population for {key}, skipping")
            continue

        pop_prev = pop_previous.get(key, 0)
        if pop_prev > 0:
            growth = round(((pop - pop_prev) / pop_prev) * 100, 2)
        else:
            growth = 0.0

        current_records.append({
            "year": year,
            "city": city,
            "state_abbr": st_abbr,
            "state_name": STATE_ABBR_TO_NAME.get(st_abbr, st_abbr),
            "lat": lat,
            "lng": lng,
            "population": pop,
            "pest_firm_count": pest_counts.get(key, 0),
            "pest_firm_truncated": pest_truncated.get(key, False),
            "housing_age_pct": housing.get(key, 50.0),
            "climate_risk": CLIMATE_RISK.get(st_abbr, 50),
            "pop_growth_pct": growth,
        })

    # Assemble previous year
    prev_records = []
    housing_prev = fetch_place_housing_age(prev_year, api_key)
    pop_2yr_ago = fetch_place_population(prev_year - 1, api_key)

    for city, st_abbr, st_fips, pl_fips, lat, lng in CITIES:
        key = f"{city}, {st_abbr}"

        pop = pop_previous.get(key, 0)
        if pop == 0:
            continue

        pop_2yr = pop_2yr_ago.get(key, 0)
        if pop_2yr > 0:
            growth = round(((pop - pop_2yr) / pop_2yr) * 100, 2)
        else:
            growth = 0.0

        h_pct = housing_prev.get(key, housing.get(key, 50.0))
        # Slightly adjust for prior year
        h_pct = round(max(0, h_pct - 0.8), 1)

        prev_records.append({
            "year": prev_year,
            "city": city,
            "state_abbr": st_abbr,
            "state_name": STATE_ABBR_TO_NAME.get(st_abbr, st_abbr),
            "lat": lat,
            "lng": lng,
            "population": pop,
            "pest_firm_count": pest_counts.get(key, 0),
            "pest_firm_truncated": pest_truncated.get(key, False),
            "housing_age_pct": h_pct,
            "climate_risk": CLIMATE_RISK.get(st_abbr, 50),
            "pop_growth_pct": growth,
        })

    return current_records, prev_records


# ── Writer ───────────────────────────────────────────────────

def write_city_data_js(current_records, prev_records):
    """Write city_data.js with CITY_MARKET_DATA array."""
    lines = []
    lines.append("// ============================================================")
    lines.append("// Market Opportunity Index (MOI) - City Market Data")
    lines.append(f"// Top {len(current_records)} US cities")
    lines.append(f"// Generated by fetch_city_census.py on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("// Population: Census ACS 5-Year estimates at place level")
    lines.append("// Housing Age: ACS 5-Year Table B25034 at place level")
    lines.append("// Pest Firms: Google Places Text Search API")
    lines.append("// Climate Risk: Inherited from state-level composite")
    lines.append("// Pop Growth: Derived from ACS year-over-year estimates")
    lines.append("// ============================================================")
    lines.append("")
    lines.append("const CITY_MARKET_DATA = [")

    def fmt(r):
        trunc = "true" if r["pest_firm_truncated"] else "false"
        return (
            f'  {{ year: {r["year"]}, city: "{r["city"]}", state_abbr: "{r["state_abbr"]}", '
            f'state_name: "{r["state_name"]}", lat: {r["lat"]}, lng: {r["lng"]}, '
            f'population: {r["population"]}, pest_firm_count: {r["pest_firm_count"]}, '
            f'pest_firm_truncated: {trunc}, '
            f'housing_age_pct: {r["housing_age_pct"]}, climate_risk: {r["climate_risk"]}, '
            f'pop_growth_pct: {r["pop_growth_pct"]} }},'
        )

    for r in current_records:
        lines.append(fmt(r))

    if prev_records:
        lines.append("")
        lines.append(f"  // {prev_records[0]['year']} data for year-over-year comparison")
        for r in prev_records:
            lines.append(fmt(r))

    lines.append("];")
    lines.append("")

    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(lines))

    return len(current_records), len(prev_records)


# ── Main ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch city-level Census data and generate city_data.js"
    )
    parser.add_argument("--year", type=int, default=2025,
                        help="ACS data year (default: 2024)")
    parser.add_argument("--key", type=str, default=None,
                        help="Census API key")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing")
    args = parser.parse_args()

    print("=" * 60)
    print("  MOI City Data Fetcher")
    print("=" * 60)
    print(f"  Target year:  {args.year}")
    print(f"  API key:      {'provided' if args.key else 'none (500 req/day limit)'}")
    print(f"  Output:       {OUTPUT_FILE}")
    print(f"  Cities:       {len(CITIES)}")
    print("=" * 60)

    current_records, prev_records = assemble_city_data(args.year, args.key)

    if not current_records:
        print("\nNo data fetched. Exiting.")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print(f"  Results: {len(current_records)} cities for {args.year}")
    if prev_records:
        print(f"           {len(prev_records)} cities for {args.year - 1}")
    print(f"{'=' * 60}")

    # Summary table
    print(f"\n  {'City':<25} {'Pop':>12} {'Firms':>6} {'Housing%':>9} {'Climate':>8} {'Growth%':>8}")
    print(f"  {'-'*25} {'-'*12} {'-'*6} {'-'*9} {'-'*8} {'-'*8}")
    for r in current_records[:20]:
        print(
            f"  {r['city'] + ', ' + r['state_abbr']:<25} {r['population']:>12,} {r['pest_firm_count']:>6} "
            f"{r['housing_age_pct']:>8.1f}% {r['climate_risk']:>7} {r['pop_growth_pct']:>7.2f}%"
        )
    if len(current_records) > 20:
        print(f"  ... and {len(current_records) - 20} more cities")

    if args.dry_run:
        print("\n  Dry run - file not written.")
    else:
        n_curr, n_prev = write_city_data_js(current_records, prev_records)
        print(f"\n  Written to: {OUTPUT_FILE}")
        print(f"  File size:  {os.path.getsize(OUTPUT_FILE):,} bytes")
        print(f"  Records:    {n_curr} current + {n_prev} previous = {n_curr + n_prev}")

    print("\nDone.")


if __name__ == "__main__":
    main()
