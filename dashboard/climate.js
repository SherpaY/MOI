// ============================================================
// STEP 2 — Real Climate Risk from NOAA CDO API
//
// Replaces hardcoded climate_risk values (e.g. all FL = 84)
// with city-specific scores built from two real NOAA variables:
//
//   • Cooling Degree Days (CDD) — cumulative heat above 65°F
//     High CDD = long hot summers = peak pest pressure
//     Anchors: 0 CDD (Anchorage) → score 0
//              4,500 CDD (Miami) → score 100
//
//   • Average Annual Relative Humidity (%)
//     Compounds heat-driven pest activity
//     Anchors: 20% (Phoenix/El Paso desert) → score 0
//              80% (New Orleans/Houston) → score 100
//
//   Final climate_risk = 0.65 * CDD_score + 0.35 * humidity_score
//
// FREE API: NOAA Climate Data Online (CDO)
// Token:    https://www.ncdc.noaa.gov/cdo-web/token  (1 min signup)
// ============================================================

const NOAA_TOKEN = "czBCEtsZsZEjcqyUpkBkHGRIXVTuHAht"; // ← paste token from ncdc.noaa.gov/cdo-web/token

const CITY_NOAA_STATIONS = {
  "New York|NY":           "GHCND:USW00094728",
  "Los Angeles|CA":        "GHCND:USW00023174",
  "Chicago|IL":            "GHCND:USW00094846",
  "Houston|TX":            "GHCND:USW00012960",
  "Phoenix|AZ":            "GHCND:USW00023183",
  "Philadelphia|PA":       "GHCND:USW00013739",
  "San Antonio|TX":        "GHCND:USW00012921",
  "San Diego|CA":          "GHCND:USW00023188",
  "Dallas|TX":             "GHCND:USW00003927",
  "Jacksonville|FL":       "GHCND:USW00013889",
  "Austin|TX":             "GHCND:USW00013904",
  "San Jose|CA":           "GHCND:USW00023293",
  "Fort Worth|TX":         "GHCND:USW00003927",
  "Columbus|OH":           "GHCND:USW00014821",
  "Charlotte|NC":          "GHCND:USW00013881",
  "Indianapolis|IN":       "GHCND:USW00093819",
  "San Francisco|CA":      "GHCND:USW00023272",
  "Seattle|WA":            "GHCND:USW00024233",
  "Denver|CO":             "GHCND:USW00023062",
  "Nashville|TN":          "GHCND:USW00013897",
  "Washington|DC":         "GHCND:USW00013743",
  "Oklahoma City|OK":      "GHCND:USW00013967",
  "El Paso|TX":            "GHCND:USW00023044",
  "Boston|MA":             "GHCND:USW00014739",
  "Portland|OR":           "GHCND:USW00024229",
  "Las Vegas|NV":          "GHCND:USW00023169",
  "Memphis|TN":            "GHCND:USW00013893",
  "Louisville|KY":         "GHCND:USW00093821",
  "Baltimore|MD":          "GHCND:USW00093721",
  "Milwaukee|WI":          "GHCND:USW00014839",
  "Albuquerque|NM":        "GHCND:USW00023050",
  "Tucson|AZ":             "GHCND:USW00023160",
  "Fresno|CA":             "GHCND:USW00093193",
  "Mesa|AZ":               "GHCND:USW00023183",
  "Sacramento|CA":         "GHCND:USW00023232",
  "Atlanta|GA":            "GHCND:USW00013874",
  "Kansas City|MO":        "GHCND:USW00013988",
  "Omaha|NE":              "GHCND:USW00014942",
  "Colorado Springs|CO":   "GHCND:USW00093037",
  "Raleigh|NC":            "GHCND:USW00013722",
  "Long Beach|CA":         "GHCND:USW00023174",
  "Virginia Beach|VA":     "GHCND:USW00013737",
  "Miami|FL":              "GHCND:USW00012839",
  "Oakland|CA":            "GHCND:USW00023230",
  "Minneapolis|MN":        "GHCND:USW00014922",
  "Tampa|FL":              "GHCND:USW00012842",
  "Tulsa|OK":              "GHCND:USW00013968",
  "Arlington|TX":          "GHCND:USW00003927",
  "New Orleans|LA":        "GHCND:USW00012916",
  "Wichita|KS":            "GHCND:USW00003928",
  "Cleveland|OH":          "GHCND:USW00014820",
  "Bakersfield|CA":        "GHCND:USW00023155",
  "Aurora|CO":             "GHCND:USW00023062",
  "Anaheim|CA":            "GHCND:USW00023174",
  "Honolulu|HI":           "GHCND:USW00022521",
  "Santa Ana|CA":          "GHCND:USW00023174",
  "Riverside|CA":          "GHCND:USW00093184",
  "Corpus Christi|TX":     "GHCND:USW00012924",
  "Lexington|KY":          "GHCND:USW00093820",
  "Henderson|NV":          "GHCND:USW00023169",
  "Stockton|CA":           "GHCND:USW00023237",
  "Saint Paul|MN":         "GHCND:USW00014922",
  "Cincinnati|OH":         "GHCND:USW00093814",
  "St. Louis|MO":          "GHCND:USW00013994",
  "Pittsburgh|PA":         "GHCND:USW00094823",
  "Greensboro|NC":         "GHCND:USW00013723",
  "Lincoln|NE":            "GHCND:USW00014939",
  "Orlando|FL":            "GHCND:USW00012841",
  "Irvine|CA":             "GHCND:USW00023174",
  "Newark|NJ":             "GHCND:USW00014734",
  "Durham|NC":             "GHCND:USW00013722",
  "Chula Vista|CA":        "GHCND:USW00023188",
  "Toledo|OH":             "GHCND:USW00094830",
  "Fort Wayne|IN":         "GHCND:USW00014836",
  "St. Petersburg|FL":     "GHCND:USW00012842",
  "Laredo|TX":             "GHCND:USW00022010",
  "Jersey City|NJ":        "GHCND:USW00014734",
  "Chandler|AZ":           "GHCND:USW00023183",
  "Madison|WI":            "GHCND:USW00014837",
  "Lubbock|TX":            "GHCND:USW00023042",
  "Gilbert|AZ":            "GHCND:USW00023183",
  "Reno|NV":               "GHCND:USW00023185",
  "Winston-Salem|NC":      "GHCND:USW00013723",
  "Glendale|AZ":           "GHCND:USW00023183",
  "Hialeah|FL":            "GHCND:USW00012839",
  "Garland|TX":            "GHCND:USW00003927",
  "Scottsdale|AZ":         "GHCND:USW00023183",
  "Irving|TX":             "GHCND:USW00003927",
  "Chesapeake|VA":         "GHCND:USW00013737",
  "North Las Vegas|NV":    "GHCND:USW00023169",
  "Fremont|CA":            "GHCND:USW00023230",
  "Boise|ID":              "GHCND:USW00024131",
  "Richmond|VA":           "GHCND:USW00013740",
  "San Bernardino|CA":     "GHCND:USW00003171",
  "Birmingham|AL":         "GHCND:USW00013876",
  "Spokane|WA":            "GHCND:USW00024157",
  "Rochester|NY":          "GHCND:USW00014733",
  "Des Moines|IA":         "GHCND:USW00014933",
  "Modesto|CA":            "GHCND:USW00093193",
  "Fayetteville|NC":       "GHCND:USW00013722",
  "Detroit|MI":            "GHCND:USW00094847",
  "Salt Lake City|UT":     "GHCND:USW00024127",
  "Little Rock|AR":        "GHCND:USW00013963",
  "Jackson|MS":            "GHCND:USW00013958",
  "Providence|RI":         "GHCND:USW00014765",
  "Anchorage|AK":          "GHCND:USW00026451",
  "Charleston|SC":         "GHCND:USW00013880",
  "Bridgeport|CT":         "GHCND:USW00094702",
  "Manchester|NH":         "GHCND:USW00014745",
  "Burlington|VT":         "GHCND:USW00014742",
  "Sioux Falls|SD":        "GHCND:USW00014944",
  "Billings|MT":           "GHCND:USW00024033",
  "Cheyenne|WY":           "GHCND:USW00024018",
  "Portland|ME":           "GHCND:USW00014764",
  "Cape Coral|FL":         "GHCND:USW00012894",
  "Port St. Lucie|FL":     "GHCND:USW00012844",
  "Frisco|TX":             "GHCND:USW00003927",
  "McKinney|TX":           "GHCND:USW00003927",
  "Surprise|AZ":           "GHCND:USW00023183",
  "Murfreesboro|TN":       "GHCND:USW00013897",
  "Clarksville|TN":        "GHCND:USW00013897",
  "Savannah|GA":           "GHCND:USW00013884",
  "Grand Rapids|MI":       "GHCND:USW00014833",
  "Akron|OH":              "GHCND:USW00014895",
  "Dayton|OH":             "GHCND:USW00093815",
  "Buffalo|NY":            "GHCND:USW00014733",
  "Syracuse|NY":           "GHCND:USW00014771",
  "Worcester|MA":          "GHCND:USW00094746",
  "Knoxville|TN":          "GHCND:USW00013891",
  "Chattanooga|TN":        "GHCND:USW00013882",
  "Tallahassee|FL":        "GHCND:USW00093805",
  "Baton Rouge|LA":        "GHCND:USW00013970",
  "Shreveport|LA":         "GHCND:USW00013957",
  "Mobile|AL":             "GHCND:USW00013894",
  "Augusta|GA":            "GHCND:USW00013877",
  "Columbia|SC":           "GHCND:USW00013883",
  "Norfolk|VA":            "GHCND:USW00013737",
  "Brownsville|TX":        "GHCND:USW00012919",
  "Overland Park|KS":      "GHCND:USW00013988",
  "Greenville|SC":         "GHCND:USW00013860",
  "Hartford|CT":           "GHCND:USW00014740",
  "Flint|MI":              "GHCND:USW00014826",
  "Champaign|IL":          "GHCND:USW00093822",
  "Charleston|WV":         "GHCND:USW00013866",
  "West Palm Beach|FL":    "GHCND:USW00012844",
  "Cedar Rapids|IA":       "GHCND:USW00094986",
  "Greenville|NC":         "GHCND:USW00013722",
  "South Bend|IN":         "GHCND:USW00014848",
  "Fort Myers|FL":         "GHCND:USW00012894",
  "Davenport|IA":          "GHCND:USW00014923",
  "Youngstown|OH":         "GHCND:USW00014852",
  "Peoria|IL":             "GHCND:USW00014842",
  "Myrtle Beach|SC":       "GHCND:USW00013880",
  "Waco|TX":               "GHCND:USW00013959",
  "Kansas City|KS":        "GHCND:USW00013988",
  "Lansing|MI":            "GHCND:USW00014836",
  "Harrisburg|PA":         "GHCND:USW00014751",
  "Albany|NY":             "GHCND:USW00014735",
  "Eau Claire|WI":         "GHCND:USW00014991",
};

const CLIMATE_ANCHORS = {
  cdd:      { min: 0,    max: 4500 },
  humidity: { min: 20,   max: 80   },
};

function normalizeCDDScore(cdd) {
  const { min, max } = CLIMATE_ANCHORS.cdd;
  return Math.min(100, Math.max(0, ((cdd - min) / (max - min)) * 100));
}

function normalizeHumidityScore(humidity) {
  const { min, max } = CLIMATE_ANCHORS.humidity;
  return Math.min(100, Math.max(0, ((humidity - min) / (max - min)) * 100));
}

function computeClimateRisk(cdd, humidity) {
  return Math.round((0.65 * normalizeCDDScore(cdd) + 0.35 * normalizeHumidityScore(humidity)) * 10) / 10;
}

async function fetchCDD(stationId) {
  const url = new URL("https://www.ncdc.noaa.gov/cdo-web/api/v2/data");
  url.searchParams.set("datasetid",  "NORMAL_ANN");
  url.searchParams.set("datatypeid", "ANN-CLDD-NORMAL");
  url.searchParams.set("stationid",  stationId);
  url.searchParams.set("startdate",  "2010-01-01");
  url.searchParams.set("enddate",    "2010-12-31");
  url.searchParams.set("limit",      "1");
  url.searchParams.set("units",      "standard");
  const res = await fetch(url.toString(), { headers: { token: NOAA_TOKEN } });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.results || !json.results.length) return null;
  return json.results[0].value / 10; // NOAA stores as 10x actual
}

async function fetchHumidity(stationId) {
  const url = new URL("https://www.ncdc.noaa.gov/cdo-web/api/v2/data");
  url.searchParams.set("datasetid",  "NORMAL_ANN");
  url.searchParams.set("datatypeid", "ANN-RHAV-NORMAL");
  url.searchParams.set("stationid",  stationId);
  url.searchParams.set("startdate",  "2010-01-01");
  url.searchParams.set("enddate",    "2010-12-31");
  url.searchParams.set("limit",      "1");
  url.searchParams.set("units",      "standard");
  const res = await fetch(url.toString(), { headers: { token: NOAA_TOKEN } });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.results || !json.results.length) return null;
  return json.results[0].value / 10;
}

function applyStateFallbacks(results, failed) {
  const byState = {};
  for (const [key, val] of results) {
    const state = key.split("|")[1];
    if (!byState[state]) byState[state] = [];
    byState[state].push(val.climate_risk);
  }
  const stateMedians = {};
  for (const [state, scores] of Object.entries(byState)) {
    scores.sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    stateMedians[state] = scores.length % 2 === 0
      ? (scores[mid - 1] + scores[mid]) / 2
      : scores[mid];
  }
  for (const { cityKey } of failed) {
    const state = cityKey.split("|")[1];
    const fallback = stateMedians[state];
    if (fallback !== undefined) {
      results.set(cityKey, {
        climate_risk: Math.round(fallback * 10) / 10,
        cdd: null, humidity: null,
        source: "State median fallback (NOAA fetch failed)",
        station: null,
      });
    }
  }
}

async function fetchAllClimateRisks() {
  const CACHE_KEY = "moi_climate_risk_v1";
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Return from cache if fresh
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        console.log("✅ Climate risk loaded from cache");
        return new Map(Object.entries(data));
      }
    }
  } catch (e) { /* cache miss */ }

  // Guard: don't hit API if token not set
  if (NOAA_TOKEN === "YOUR_NOAA_TOKEN_HERE") {
    console.warn("⚠️  NOAA token not set — skipping climate enrichment. Get a free token at ncdc.noaa.gov/cdo-web/token");
    return new Map();
  }

  console.log(`🌡️  Fetching NOAA climate data for ${Object.keys(CITY_NOAA_STATIONS).length} cities...`);

  const results = new Map();
  const failed = [];
  const entries = Object.entries(CITY_NOAA_STATIONS);
  const BATCH_SIZE = 4;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async ([cityKey, stationId]) => {
      try {
        const [cdd, humidity] = await Promise.all([fetchCDD(stationId), fetchHumidity(stationId)]);
        if (cdd !== null && humidity !== null) {
          results.set(cityKey, {
            climate_risk: computeClimateRisk(cdd, humidity),
            cdd: Math.round(cdd),
            humidity: Math.round(humidity * 10) / 10,
            source: "NOAA Normals 1991-2020",
            station: stationId,
          });
        } else {
          failed.push({ cityKey, stationId, reason: "null CDD or humidity" });
        }
      } catch (err) {
        failed.push({ cityKey, stationId, reason: err.message });
      }
    }));

    if (i + BATCH_SIZE < entries.length) await new Promise(r => setTimeout(r, 300));
    console.log(`NOAA progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`);
  }

  if (failed.length > 0) {
    console.warn(`⚠️  ${failed.length} cities failed NOAA fetch — applying state fallbacks`);
    applyStateFallbacks(results, failed);
  }

  // Cache results
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: Object.fromEntries(results),
      timestamp: Date.now(),
    }));
  } catch (e) { /* non-fatal */ }

  console.log(`✅ Climate enrichment complete: ${results.size} cities scored`);
  return results;
}

async function enrichWithNOAAClimate(cityMarketData) {
  const climateMap = await fetchAllClimateRisks();
  if (climateMap.size === 0) return cityMarketData; // No token — return unchanged

  let enriched = 0, fallback = 0, unchanged = 0;

  const result = cityMarketData.map(row => {
    const key = `${row.city}|${row.state_abbr}`;
    const climateData = climateMap.get(key);
    if (climateData) {
      if (climateData.source.includes("fallback")) fallback++;
      else enriched++;
      return {
        ...row,
        climate_risk: climateData.climate_risk,
        _noaa_cdd: climateData.cdd,
        _noaa_humidity: climateData.humidity,
        _climate_source: climateData.source,
      };
    }
    unchanged++;
    return { ...row, _climate_source: "Original static value (no NOAA match)" };
  });

  console.log(`Climate enrichment: ${enriched} NOAA-live, ${fallback} state-fallback, ${unchanged} unchanged`);
  return result;
}
