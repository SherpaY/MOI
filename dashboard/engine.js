// ============================================================
// MOI Calculation Engine
// Normalizes and computes all component scores per year
// ============================================================

class MOIEngine {
  constructor(rawData) {
    this.rawData = rawData;
    this.computed = [];
  }

  normalize(values) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 50);
    return values.map(v => ((v - min) / (max - min)) * 100);
  }

  compute(year) {
    const yearData = this.rawData.filter(d => d.year === year);
    if (yearData.length === 0) return [];

    // 1. Market Size Score (MSS) = normalized(log(Population))
    const logPops = yearData.map(d => Math.log(d.population));
    const mssScores = this.normalize(logPops);

    // 2. Competition Density Score (CDS)
    const compDensities = yearData.map(d =>
      (d.pest_firm_count / d.population) * 100000
    );
    const normCompDensities = this.normalize(compDensities);
    const cdsScores = normCompDensities.map(v => 100 - v);

    // 3. Structural Pest Risk Score (PRS)
    const rawPRS = yearData.map(d =>
      0.6 * d.climate_risk + 0.4 * d.housing_age_pct
    );
    const prsScores = this.normalize(rawPRS);

    // 4. Growth Trend Score (GTS)
    const growths = yearData.map(d => d.pop_growth_pct);
    const gtsScores = this.normalize(growths);

    // 5. Final MOI
    const results = yearData.map((d, i) => {
      const mss = Math.round(mssScores[i] * 10) / 10;
      const cds = Math.round(cdsScores[i] * 10) / 10;
      const prs = Math.round(prsScores[i] * 10) / 10;
      const gts = Math.round(gtsScores[i] * 10) / 10;

      const moi = Math.round(
        (0.35 * mss + 0.30 * cds + 0.20 * prs + 0.15 * gts) * 10
      ) / 10;

      const compDensity = Math.round(compDensities[i] * 10) / 10;

      return {
        year: d.year,
        state: d.state,
        abbr: d.abbr,
        population: d.population,
        pest_firm_count: d.pest_firm_count,
        housing_age_pct: d.housing_age_pct,
        climate_risk: d.climate_risk,
        pop_growth_pct: d.pop_growth_pct,
        comp_density: compDensity,
        mss,
        cds,
        prs,
        gts,
        moi
      };
    });

    // Sort by MOI descending and add rank
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
    if (moi >= 60) return { label: "Strong Opportunity", color: "#16a34a", bg: "#16a34a", textColor: "#ffffff", tier: "A" };
    if (moi >= 40) return { label: "Moderate Opportunity", color: "#ca8a04", bg: "#ca8a04", textColor: "#ffffff", tier: "B" };
    if (moi >= 20) return { label: "Competitive / Saturated", color: "#ea580c", bg: "#ea580c", textColor: "#ffffff", tier: "C" };
    return { label: "Highly Saturated Market", color: "#dc2626", bg: "#dc2626", textColor: "#ffffff", tier: "D" };
  }

  static getMOIColor(moi) {
    if (moi >= 80) return "#0f766e";
    if (moi >= 60) return "#16a34a";
    if (moi >= 40) return "#ca8a04";
    if (moi >= 20) return "#ea580c";
    return "#dc2626";
  }

  static getMOIColorScale(moi) {
    // Continuous color scale for choropleth
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
}
