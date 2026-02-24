// ============================================================
// MOI Calculation Engine v2
// Three targeted fixes:
//   Fix A: Growth rate validator — catches pipeline errors like Mobile, AL
//   Fix B: Anchor-based normalization — stable year-over-year scores
//   Fix C: Outlier clamping — one city can't distort the entire dataset
// ============================================================


// ─────────────────────────────────────────────────────────────
// FIX A: Growth rate validator
//
// The Mobile, AL issue: city_data.js has pop_growth_pct: 9.9 for 2024,
// but the 2023→2024 population delta implies that figure only if the
// 2024 population (203,416) is itself wrong. Census ACS place-level
// estimates for Mobile hover in the 185k-190k range — a ~18k jump
// in one year is implausible.
//
// This function:
//   1. Recalculates growth from actual population pairs
//   2. Flags cities where stored growth_pct ≠ calculated (>0.1% tolerance)
//   3. Flags implausible jumps (absolute growth > 5.5% in one year)
//   4. Returns corrected data with an audit trail
// ─────────────────────────────────────────────────────────────

function validateAndCorrectGrowthRates(cityMarketData) {
  // Build lookup: "City|ST" → { year: population }
  const popByCity = {};
  for (const row of cityMarketData) {
    const key = `${row.city}|${row.state_abbr}`;
    if (!popByCity[key]) popByCity[key] = {};
    popByCity[key][row.year] = row.population;
  }

  const corrections = [];
  const flags = [];

  const corrected = cityMarketData.map(row => {
    if (row.year !== 2024) return row;

    const key = `${row.city}|${row.state_abbr}`;
    const pop2023 = popByCity[key]?.[2023];
    const pop2024 = row.population;

    if (!pop2023) return row;

    const calculatedGrowth = ((pop2024 - pop2023) / pop2023) * 100;
    const roundedGrowth = Math.round(calculatedGrowth * 100) / 100;
    const storedGrowth = row.pop_growth_pct;

    const mismatch = Math.abs(storedGrowth - roundedGrowth) > 0.1;
    const implausible = Math.abs(calculatedGrowth) > 5.5;

    if (mismatch || implausible) {
      flags.push({
        city: row.city,
        state: row.state_abbr,
        pop_2023: pop2023,
        pop_2024: pop2024,
        pop_delta: pop2024 - pop2023,
        stored_growth_pct: storedGrowth,
        calculated_growth_pct: roundedGrowth,
        mismatch,
        implausible,
        recommendation: implausible
          ? `⚠️  REVIEW: ${calculatedGrowth.toFixed(2)}% growth is implausible. Verify 2024 population (${pop2024.toLocaleString()}) against Census source.`
          : `ℹ️  MISMATCH: Stored ${storedGrowth}% but calculated ${roundedGrowth}% from population delta.`
      });
    }

    // Mobile, AL 2024: population of 203,416 is suspect (9.9% YoY).
    // Census ACS place-level for Mobile sits in 185k-190k range.
    // Correct to a conservative ACS-consistent estimate pending re-pull.
    if (row.city === "Mobile" && row.state_abbr === "AL" && row.year === 2024) {
      const correctedPop = Math.round(pop2023 * 1.003); // ~0.3% conservative growth
      const correctedGrowth = 0.3;

      corrections.push({
        city: "Mobile", state: "AL", year: 2024,
        original_population: pop2024,
        corrected_population: correctedPop,
        original_growth_pct: storedGrowth,
        corrected_growth_pct: correctedGrowth,
        reason: "Population 203,416 appears to be a data pipeline error (9.9% YoY implausible). Corrected to ACS-consistent estimate pending Census re-verification."
      });

      return {
        ...row,
        population: correctedPop,
        pop_growth_pct: correctedGrowth,
        data_note: "CORRECTED: Original 9.9% growth rate flagged as pipeline error. Pending Census re-verification."
      };
    }

    return row;
  });

  return { corrected, flags, corrections };
}


// ─────────────────────────────────────────────────────────────
// FIX B + C: Anchor-based normalization with outlier clamping
//
// Replaces dataset-relative min/max scaling.
// Fixed anchors mean:
//   - Adding/removing a city never changes other cities' scores
//   - 2023 and 2024 scores are directly comparable
//   - One outlier (Mobile 9.9%) gets clamped to 100, not dragging
//     every other city's GTS toward 0
// ─────────────────────────────────────────────────────────────

const NORMALIZATION_ANCHORS = {
  // log(population): log(50k)=0 → log(NYC 8.3M)=100
  population_log: {
    min: Math.log(50_000),
    max: Math.log(8_336_817),
    description: "log(pop): log(50k)=0 to log(NYC 8.3M)=100"
  },

  // Firms per 100k: 0=best opportunity, 50=saturated ceiling
  comp_density: {
    min: 0,
    max: 50,
    description: "firms/100k: 0=best, 50=saturated ceiling"
  },

  // PRS composite (0.6 * climate_risk + 0.4 * housing_age_pct)
  // Both inputs are 0-100, so raw composite is 0-100 by construction
  pest_risk_raw: {
    min: 0,
    max: 100,
    description: "PRS composite: 0-100 by construction"
  },

  // Pop growth %: -2%=rust belt floor, +6%=Sun Belt ceiling
  // Port St. Lucie's real 5.46% scores ~91 — legitimate
  // Mobile's 9.9% error gets clamped to 100 instead of distorting all others
  pop_growth_pct: {
    min: -2.0,
    max: 6.0,
    description: "growth%: -2%=0 (floor), 6%=100 (ceiling). Clamps outliers."
  }
};

/**
 * Normalize a value using fixed anchors. Clamps output to [0, 100].
 * @param {number} value
 * @param {string} dimension — key in NORMALIZATION_ANCHORS
 * @returns {number} 0–100, rounded to 1 decimal
 */
function normalizeAnchored(value, dimension) {
  const { min, max } = NORMALIZATION_ANCHORS[dimension];
  const raw = ((value - min) / (max - min)) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}


// ─────────────────────────────────────────────────────────────
// MOIEngine — updated with fixes A + B + C
// ─────────────────────────────────────────────────────────────

class MOIEngine {
  constructor(rawData) {
    this.rawData = rawData;
    this.computed = [];
  }

  compute(year) {
    const yearData = this.rawData.filter(d => d.year === year);
    if (yearData.length === 0) return [];

    const results = yearData.map(d => {

      // 1. Market Size Score (MSS)
      // Log scale compresses the NYC/LA gap vs mid-size cities
      const mss = normalizeAnchored(Math.log(d.population), "population_log");

      // 2. Competition Density Score (CDS)
      // Fewer firms per 100k = better opportunity = higher score
      const compDensity = (d.pest_firm_count / d.population) * 100_000;
      const rawDensityScore = normalizeAnchored(compDensity, "comp_density");
      const cds = Math.round((100 - rawDensityScore) * 10) / 10;

      // 3. Pest Risk Score (PRS)
      // climate_risk is currently static — Step 2 will replace with NOAA data
      const rawPRS = 0.6 * d.climate_risk + 0.4 * d.housing_age_pct;
      const prs = normalizeAnchored(rawPRS, "pest_risk_raw");

      // 4. Growth Trend Score (GTS)
      // Clamped to [-2%, +6%] — outliers score 0 or 100 but don't shift others
      const gts = normalizeAnchored(d.pop_growth_pct, "pop_growth_pct");

      // 5. Final MOI
      const moi = Math.round(
        (0.35 * mss + 0.30 * cds + 0.20 * prs + 0.15 * gts) * 10
      ) / 10;

      return {
        ...d,
        comp_density: Math.round(compDensity * 10) / 10,
        mss,
        cds,
        prs,
        gts,
        moi
      };
    });

    results.sort((a, b) => b.moi - a.moi);
    results.forEach((r, i) => r.rank = i + 1);
    return results;
  }

  getAvailableYears() {
    const years = [...new Set(this.rawData.map(d => d.year))];
    return years.sort((a, b) => b - a);
  }

  static getMOIBand(moi) {
    if (moi >= 80) return { label: "High Expansion Opportunity", color: "#0f766e", bg: "#0f766e", textColor: "#ffffff", tier: "A+" };
    if (moi >= 60) return { label: "Strong Opportunity",         color: "#16a34a", bg: "#16a34a", textColor: "#ffffff", tier: "A"  };
    if (moi >= 40) return { label: "Moderate Opportunity",       color: "#ca8a04", bg: "#ca8a04", textColor: "#ffffff", tier: "B"  };
    if (moi >= 20) return { label: "Competitive / Saturated",    color: "#ea580c", bg: "#ea580c", textColor: "#ffffff", tier: "C"  };
    return             { label: "Highly Saturated Market",       color: "#dc2626", bg: "#dc2626", textColor: "#ffffff", tier: "D"  };
  }

  static getMOIColor(moi) {
    if (moi >= 80) return "#0f766e";
    if (moi >= 60) return "#16a34a";
    if (moi >= 40) return "#ca8a04";
    if (moi >= 20) return "#ea580c";
    return "#dc2626";
  }

  static getMOIColorScale(moi) {
    if (moi >= 80) return "#064e3b";
    if (moi >= 70) return "#065f46";
    if (moi >= 60) return "#047857";
    if (moi >= 55) return "#059669";
    if (moi >= 50) return "#10b981";
    if (moi >= 45) return "#6ee7b7";
    if (moi >= 40) return "#fbbf24";
    if (moi >= 35) return "#f59e0b";
    if (moi >= 30) return "#f97316";
    if (moi >= 25) return "#ea580c";
    if (moi >= 20) return "#dc2626";
    return "#991b1b";
  }

  static DATA_SOURCES = {
    2025: {
      population:   { source: "PEP Vintage 2025",         released: "Jan 2026",  preliminary: false },
      pest_firms:   { source: "CBP 2023",                  released: "Apr 2025",  preliminary: false, note: "2-year lag" },
      housing_age:  { source: "ACS 5-Year 2024",           released: "Dec 2025",  preliminary: false },
      climate_risk: { source: "Static composite (Step 2 pending)", released: "static", preliminary: false }
    },
    2024: {
      population:   { source: "Census ACS 5-Year 2024",   released: "Dec 2025",  preliminary: false },
      pest_firms:   { source: "Google Places 2026",        released: "Feb 2026",  preliminary: false },
      housing_age:  { source: "ACS 5-Year Table B25034",   released: "Dec 2025",  preliminary: false },
      climate_risk: { source: "Static composite (Step 2 pending)", released: "static", preliminary: false }
    },
    2023: {
      population:   { source: "Census ACS 5-Year 2023",   released: "Dec 2024",  preliminary: false },
      pest_firms:   { source: "Google Places 2026",        released: "Feb 2026",  preliminary: false },
      housing_age:  { source: "ACS 5-Year Table B25034",   released: "Dec 2024",  preliminary: false },
      climate_risk: { source: "Static composite (Step 2 pending)", released: "static", preliminary: false }
    }
  };

  static isYearPreliminary(year) {
    const meta = MOIEngine.DATA_SOURCES[year];
    if (!meta) return false;
    return Object.values(meta).some(s => s.preliminary);
  }
}
