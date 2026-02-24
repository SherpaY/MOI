// ============================================================
// Market Opportunity Index (MOI) - State Market Data
// VERIFIED DATA from authoritative sources (Updated Feb 2026)
// Population: Census Bureau Vintage 2025 (NST-EST2025-POP, released Jan 2026)
// Pop Growth: Derived from Vintage 2025 year-over-year % change
// Pest Firms (CBP): Census CBP 2023, NAICS 561710 (employer establishments)
// Pest Firms (Google): Places Text Search API, top 100 US cities
// Housing Age: ACS 2024 5-Year, Table B25034 (% units built before 1994)
// Climate Risk: Composite index from NOAA temp/humidity/precip + FEMA NRI
// ============================================================

const STATE_MARKET_DATA = [
  { year: 2025, state: "Alabama", abbr: "AL", population: 5193088, pest_firm_count: 338, google_places_count: 60, google_places_cities: 1, housing_age_pct: 61.9, climate_risk: 82, pop_growth_pct: 0.58 },
  { year: 2025, state: "Alaska", abbr: "AK", population: 737270, pest_firm_count: 16, google_places_count: 0, google_places_cities: 0, housing_age_pct: 66.1, climate_risk: 37, pop_growth_pct: 0.1 },
  { year: 2025, state: "Arizona", abbr: "AZ", population: 7623818, pest_firm_count: 565, google_places_count: 382, google_places_cities: 7, housing_age_pct: 52.8, climate_risk: 34, pop_growth_pct: 0.89 },
  { year: 2025, state: "Arkansas", abbr: "AR", population: 3114791, pest_firm_count: 170, google_places_count: 0, google_places_cities: 0, housing_age_pct: 60.2, climate_risk: 77, pop_growth_pct: 0.6 },
  { year: 2025, state: "California", abbr: "CA", population: 39355309, pest_firm_count: 1984, google_places_count: 910, google_places_cities: 18, housing_age_pct: 74.9, climate_risk: 60, pop_growth_pct: -0.02 },
  { year: 2025, state: "Colorado", abbr: "CO", population: 6012561, pest_firm_count: 183, google_places_count: 127, google_places_cities: 3, housing_age_pct: 58.9, climate_risk: 34, pop_growth_pct: 0.4 },
  { year: 2025, state: "Connecticut", abbr: "CT", population: 3688496, pest_firm_count: 104, google_places_count: 0, google_places_cities: 0, housing_age_pct: 83.2, climate_risk: 55, pop_growth_pct: 0.38 },
  { year: 2025, state: "Delaware", abbr: "DE", population: 1059952, pest_firm_count: 49, google_places_count: 0, google_places_cities: 0, housing_age_pct: 59.2, climate_risk: 62, pop_growth_pct: 0.94 },
  { year: 2025, state: "Florida", abbr: "FL", population: 23462518, pest_firm_count: 2301, google_places_count: 348, google_places_cities: 6, housing_age_pct: 58.9, climate_risk: 84, pop_growth_pct: 0.85 },
  { year: 2025, state: "Georgia", abbr: "GA", population: 11302748, pest_firm_count: 723, google_places_count: 43, google_places_cities: 1, housing_age_pct: 54.1, climate_risk: 73, pop_growth_pct: 0.88 },
  { year: 2025, state: "Hawaii", abbr: "HI", population: 1432820, pest_firm_count: 59, google_places_count: 30, google_places_cities: 1, housing_age_pct: 70.6, climate_risk: 88, pop_growth_pct: -0.15 },
  { year: 2025, state: "Idaho", abbr: "ID", population: 2029733, pest_firm_count: 110, google_places_count: 60, google_places_cities: 1, housing_age_pct: 54.4, climate_risk: 39, pop_growth_pct: 1.44 },
  { year: 2025, state: "Illinois", abbr: "IL", population: 12719141, pest_firm_count: 395, google_places_count: 42, google_places_cities: 1, housing_age_pct: 76.8, climate_risk: 58, pop_growth_pct: 0.13 },
  { year: 2025, state: "Indiana", abbr: "IN", population: 6973333, pest_firm_count: 261, google_places_count: 91, google_places_cities: 2, housing_age_pct: 69.9, climate_risk: 60, pop_growth_pct: 0.56 },
  { year: 2025, state: "Iowa", abbr: "IA", population: 3238387, pest_firm_count: 146, google_places_count: 36, google_places_cities: 1, housing_age_pct: 72.5, climate_risk: 62, pop_growth_pct: 0.25 },
  { year: 2025, state: "Kansas", abbr: "KS", population: 2977220, pest_firm_count: 190, google_places_count: 47, google_places_cities: 1, housing_age_pct: 72.3, climate_risk: 62, pop_growth_pct: 0.4 },
  { year: 2025, state: "Kentucky", abbr: "KY", population: 4606864, pest_firm_count: 173, google_places_count: 70, google_places_cities: 2, housing_age_pct: 65.4, climate_risk: 68, pop_growth_pct: 0.5 },
  { year: 2025, state: "Louisiana", abbr: "LA", population: 4618189, pest_firm_count: 304, google_places_count: 58, google_places_cities: 1, housing_age_pct: 65.3, climate_risk: 93, pop_growth_pct: 0.07 },
  { year: 2025, state: "Maine", abbr: "ME", population: 1414874, pest_firm_count: 50, google_places_count: 0, google_places_cities: 0, housing_age_pct: 72.7, climate_risk: 48, pop_growth_pct: 0.46 },
  { year: 2025, state: "Maryland", abbr: "MD", population: 6265347, pest_firm_count: 223, google_places_count: 47, google_places_cities: 1, housing_age_pct: 71.2, climate_risk: 59, pop_growth_pct: 0.32 },
  { year: 2025, state: "Massachusetts", abbr: "MA", population: 7154084, pest_firm_count: 252, google_places_count: 36, google_places_cities: 1, housing_age_pct: 81.2, climate_risk: 55, pop_growth_pct: 0.22 },
  { year: 2025, state: "Michigan", abbr: "MI", population: 10127884, pest_firm_count: 259, google_places_count: 0, google_places_cities: 0, housing_age_pct: 76.6, climate_risk: 48, pop_growth_pct: 0.28 },
  { year: 2025, state: "Minnesota", abbr: "MN", population: 5830405, pest_firm_count: 104, google_places_count: 81, google_places_cities: 2, housing_age_pct: 68.9, climate_risk: 45, pop_growth_pct: 0.57 },
  { year: 2025, state: "Mississippi", abbr: "MS", population: 2954160, pest_firm_count: 191, google_places_count: 0, google_places_cities: 0, housing_age_pct: 61.4, climate_risk: 87, pop_growth_pct: 0.14 },
  { year: 2025, state: "Missouri", abbr: "MO", population: 6270541, pest_firm_count: 290, google_places_count: 96, google_places_cities: 2, housing_age_pct: 69.7, climate_risk: 66, pop_growth_pct: 0.43 },
  { year: 2025, state: "Montana", abbr: "MT", population: 1144694, pest_firm_count: 45, google_places_count: 0, google_places_cities: 0, housing_age_pct: 64.5, climate_risk: 35, pop_growth_pct: 0.63 },
  { year: 2025, state: "Nebraska", abbr: "NE", population: 2018006, pest_firm_count: 93, google_places_count: 77, google_places_cities: 2, housing_age_pct: 70.8, climate_risk: 57, pop_growth_pct: 0.62 },
  { year: 2025, state: "Nevada", abbr: "NV", population: 3282188, pest_firm_count: 204, google_places_count: 170, google_places_cities: 4, housing_age_pct: 45.0, climate_risk: 27, pop_growth_pct: 0.88 },
  { year: 2025, state: "New Hampshire", abbr: "NH", population: 1415342, pest_firm_count: 56, google_places_count: 0, google_places_cities: 0, housing_age_pct: 74.3, climate_risk: 50, pop_growth_pct: 0.48 },
  { year: 2025, state: "New Jersey", abbr: "NJ", population: 9548215, pest_firm_count: 429, google_places_count: 60, google_places_cities: 2, housing_age_pct: 78.2, climate_risk: 62, pop_growth_pct: 0.44 },
  { year: 2025, state: "New Mexico", abbr: "NM", population: 2125498, pest_firm_count: 109, google_places_count: 47, google_places_cities: 1, housing_age_pct: 65.2, climate_risk: 35, pop_growth_pct: -0.06 },
  { year: 2025, state: "New York", abbr: "NY", population: 20002427, pest_firm_count: 788, google_places_count: 88, google_places_cities: 2, housing_age_pct: 84.0, climate_risk: 51, pop_growth_pct: 0.01 },
  { year: 2025, state: "North Carolina", abbr: "NC", population: 11197968, pest_firm_count: 573, google_places_count: 277, google_places_cities: 6, housing_age_pct: 54.8, climate_risk: 71, pop_growth_pct: 1.32 },
  { year: 2025, state: "North Dakota", abbr: "ND", population: 799358, pest_firm_count: 15, google_places_count: 0, google_places_cities: 0, housing_age_pct: 62.2, climate_risk: 47, pop_growth_pct: 0.75 },
  { year: 2025, state: "Ohio", abbr: "OH", population: 11900510, pest_firm_count: 378, google_places_count: 184, google_places_cities: 4, housing_age_pct: 76.9, climate_risk: 56, pop_growth_pct: 0.34 },
  { year: 2025, state: "Oklahoma", abbr: "OK", population: 4123288, pest_firm_count: 268, google_places_count: 112, google_places_cities: 2, housing_age_pct: 67.4, climate_risk: 66, pop_growth_pct: 0.62 },
  { year: 2025, state: "Oregon", abbr: "OR", population: 4273586, pest_firm_count: 158, google_places_count: 41, google_places_cities: 1, housing_age_pct: 65.3, climate_risk: 54, pop_growth_pct: 0.19 },
  { year: 2025, state: "Pennsylvania", abbr: "PA", population: 13059432, pest_firm_count: 423, google_places_count: 91, google_places_cities: 2, housing_age_pct: 80.4, climate_risk: 54, pop_growth_pct: 0.1 },
  { year: 2025, state: "Rhode Island", abbr: "RI", population: 1114521, pest_firm_count: 50, google_places_count: 0, google_places_cities: 0, housing_age_pct: 85.3, climate_risk: 57, pop_growth_pct: 0.37 },
  { year: 2025, state: "South Carolina", abbr: "SC", population: 5570274, pest_firm_count: 407, google_places_count: 0, google_places_cities: 0, housing_age_pct: 53.6, climate_risk: 72, pop_growth_pct: 1.46 },
  { year: 2025, state: "South Dakota", abbr: "SD", population: 935094, pest_firm_count: 32, google_places_count: 0, google_places_cities: 0, housing_age_pct: 63.4, climate_risk: 54, pop_growth_pct: 0.86 },
  { year: 2025, state: "Tennessee", abbr: "TN", population: 7315076, pest_firm_count: 424, google_places_count: 119, google_places_cities: 2, housing_age_pct: 60.0, climate_risk: 71, pop_growth_pct: 0.88 },
  { year: 2025, state: "Texas", abbr: "TX", population: 31709821, pest_firm_count: 1498, google_places_count: 549, google_places_cities: 12, housing_age_pct: 53.1, climate_risk: 68, pop_growth_pct: 1.25 },
  { year: 2025, state: "Utah", abbr: "UT", population: 3538904, pest_firm_count: 212, google_places_count: 0, google_places_cities: 0, housing_age_pct: 52.4, climate_risk: 34, pop_growth_pct: 1.03 },
  { year: 2025, state: "Vermont", abbr: "VT", population: 644663, pest_firm_count: 19, google_places_count: 0, google_places_cities: 0, housing_age_pct: 76.1, climate_risk: 50, pop_growth_pct: -0.29 },
  { year: 2025, state: "Virginia", abbr: "VA", population: 8880107, pest_firm_count: 426, google_places_count: 167, google_places_cities: 3, housing_age_pct: 65.0, climate_risk: 60, pop_growth_pct: 0.69 },
  { year: 2025, state: "Washington", abbr: "WA", population: 8001020, pest_firm_count: 220, google_places_count: 96, google_places_cities: 2, housing_age_pct: 61.7, climate_risk: 59, pop_growth_pct: 0.92 },
  { year: 2025, state: "West Virginia", abbr: "WV", population: 1766147, pest_firm_count: 58, google_places_count: 0, google_places_cities: 0, housing_age_pct: 72.8, climate_risk: 59, pop_growth_pct: -0.07 },
  { year: 2025, state: "Wisconsin", abbr: "WI", population: 5972787, pest_firm_count: 184, google_places_count: 78, google_places_cities: 2, housing_age_pct: 71.4, climate_risk: 47, pop_growth_pct: 0.26 },
  { year: 2025, state: "Wyoming", abbr: "WY", population: 588753, pest_firm_count: 22, google_places_count: 0, google_places_cities: 0, housing_age_pct: 67.6, climate_risk: 34, pop_growth_pct: 0.35 },

  // 2024 data for year-over-year comparison
  // Population: Census Bureau Vintage 2025 (July 1, 2024 estimates)
  // Pest firms: CBP 2023 baseline (latest available)
  // Housing age: ACS 2024 5-Year (same reference period)
  // Climate risk: Stable year-to-year
  // Pop growth: 2023-2024 rates from Vintage 2025
  { year: 2024, state: "Alabama", abbr: "AL", population: 5163055, pest_firm_count: 338, google_places_count: 60, google_places_cities: 1, housing_age_pct: 61.9, climate_risk: 82, pop_growth_pct: 0.88 },
  { year: 2024, state: "Alaska", abbr: "AK", population: 736537, pest_firm_count: 16, google_places_count: 0, google_places_cities: 0, housing_age_pct: 66.1, climate_risk: 37, pop_growth_pct: 0.26 },
  { year: 2024, state: "Arizona", abbr: "AZ", population: 7556424, pest_firm_count: 565, google_places_count: 382, google_places_cities: 7, housing_age_pct: 52.8, climate_risk: 34, pop_growth_pct: 1.4 },
  { year: 2024, state: "Arkansas", abbr: "AR", population: 3096080, pest_firm_count: 170, google_places_count: 0, google_places_cities: 0, housing_age_pct: 60.2, climate_risk: 77, pop_growth_pct: 0.85 },
  { year: 2024, state: "California", abbr: "CA", population: 39364774, pest_firm_count: 1984, google_places_count: 910, google_places_cities: 18, housing_age_pct: 74.9, climate_risk: 60, pop_growth_pct: 0.47 },
  { year: 2024, state: "Colorado", abbr: "CO", population: 5988502, pest_firm_count: 183, google_places_count: 127, google_places_cities: 3, housing_age_pct: 58.9, climate_risk: 34, pop_growth_pct: 1.29 },
  { year: 2024, state: "Connecticut", abbr: "CT", population: 3674449, pest_firm_count: 104, google_places_count: 0, google_places_cities: 0, housing_age_pct: 83.2, climate_risk: 55, pop_growth_pct: 0.91 },
  { year: 2024, state: "Delaware", abbr: "DE", population: 1050123, pest_firm_count: 49, google_places_count: 0, google_places_cities: 0, housing_age_pct: 59.2, climate_risk: 62, pop_growth_pct: 1.43 },
  { year: 2024, state: "Florida", abbr: "FL", population: 23265838, pest_firm_count: 2301, google_places_count: 348, google_places_cities: 6, housing_age_pct: 58.9, climate_risk: 84, pop_growth_pct: 1.47 },
  { year: 2024, state: "Georgia", abbr: "GA", population: 11204208, pest_firm_count: 723, google_places_count: 43, google_places_cities: 1, housing_age_pct: 54.1, climate_risk: 73, pop_growth_pct: 1.27 },
  { year: 2024, state: "Hawaii", abbr: "HI", population: 1434952, pest_firm_count: 59, google_places_count: 30, google_places_cities: 1, housing_age_pct: 70.6, climate_risk: 88, pop_growth_pct: 0.0 },
  { year: 2024, state: "Idaho", abbr: "ID", population: 2000872, pest_firm_count: 110, google_places_count: 60, google_places_cities: 1, housing_age_pct: 54.4, climate_risk: 39, pop_growth_pct: 1.54 },
  { year: 2024, state: "Illinois", abbr: "IL", population: 12703033, pest_firm_count: 395, google_places_count: 42, google_places_cities: 1, housing_age_pct: 76.8, climate_risk: 58, pop_growth_pct: 0.55 },
  { year: 2024, state: "Indiana", abbr: "IN", population: 6934754, pest_firm_count: 261, google_places_count: 91, google_places_cities: 2, housing_age_pct: 69.9, climate_risk: 60, pop_growth_pct: 0.78 },
  { year: 2024, state: "Iowa", abbr: "IA", population: 3230454, pest_firm_count: 146, google_places_count: 36, google_places_cities: 1, housing_age_pct: 72.5, climate_risk: 62, pop_growth_pct: 0.49 },
  { year: 2024, state: "Kansas", abbr: "KS", population: 2965252, pest_firm_count: 190, google_places_count: 47, google_places_cities: 1, housing_age_pct: 72.3, climate_risk: 62, pop_growth_pct: 0.53 },
  { year: 2024, state: "Kentucky", abbr: "KY", population: 4584046, pest_firm_count: 173, google_places_count: 70, google_places_cities: 2, housing_age_pct: 65.4, climate_risk: 68, pop_growth_pct: 0.75 },
  { year: 2024, state: "Louisiana", abbr: "LA", population: 4614878, pest_firm_count: 304, google_places_count: 58, google_places_cities: 1, housing_age_pct: 65.3, climate_risk: 93, pop_growth_pct: 0.35 },
  { year: 2024, state: "Maine", abbr: "ME", population: 1408438, pest_firm_count: 50, google_places_count: 0, google_places_cities: 0, housing_age_pct: 72.7, climate_risk: 48, pop_growth_pct: 0.46 },
  { year: 2024, state: "Maryland", abbr: "MD", population: 6245314, pest_firm_count: 223, google_places_count: 47, google_places_cities: 1, housing_age_pct: 71.2, climate_risk: 59, pop_growth_pct: 0.65 },
  { year: 2024, state: "Massachusetts", abbr: "MA", population: 7138560, pest_firm_count: 252, google_places_count: 36, google_places_cities: 1, housing_age_pct: 81.2, climate_risk: 55, pop_growth_pct: 0.92 },
  { year: 2024, state: "Michigan", abbr: "MI", population: 10099962, pest_firm_count: 259, google_places_count: 0, google_places_cities: 0, housing_age_pct: 76.6, climate_risk: 48, pop_growth_pct: 0.38 },
  { year: 2024, state: "Minnesota", abbr: "MN", population: 5797405, pest_firm_count: 104, google_places_count: 81, google_places_cities: 2, housing_age_pct: 68.9, climate_risk: 45, pop_growth_pct: 0.77 },
  { year: 2024, state: "Mississippi", abbr: "MS", population: 2950172, pest_firm_count: 191, google_places_count: 0, google_places_cities: 0, housing_age_pct: 61.4, climate_risk: 87, pop_growth_pct: 0.26 },
  { year: 2024, state: "Missouri", abbr: "MO", population: 6243544, pest_firm_count: 290, google_places_count: 96, google_places_cities: 2, housing_age_pct: 69.7, climate_risk: 66, pop_growth_pct: 0.61 },
  { year: 2024, state: "Montana", abbr: "MT", population: 1137557, pest_firm_count: 45, google_places_count: 0, google_places_cities: 0, housing_age_pct: 64.5, climate_risk: 35, pop_growth_pct: 0.61 },
  { year: 2024, state: "Nebraska", abbr: "NE", population: 2005591, pest_firm_count: 93, google_places_count: 77, google_places_cities: 2, housing_age_pct: 70.8, climate_risk: 57, pop_growth_pct: 0.88 },
  { year: 2024, state: "Nevada", abbr: "NV", population: 3253543, pest_firm_count: 204, google_places_count: 170, google_places_cities: 4, housing_age_pct: 45.0, climate_risk: 27, pop_growth_pct: 1.32 },
  { year: 2024, state: "New Hampshire", abbr: "NH", population: 1408518, pest_firm_count: 56, google_places_count: 0, google_places_cities: 0, housing_age_pct: 74.3, climate_risk: 50, pop_growth_pct: 0.5 },
  { year: 2024, state: "New Jersey", abbr: "NJ", population: 9506354, pest_firm_count: 429, google_places_count: 60, google_places_cities: 2, housing_age_pct: 78.2, climate_risk: 62, pop_growth_pct: 1.18 },
  { year: 2024, state: "New Mexico", abbr: "NM", population: 2126774, pest_firm_count: 109, google_places_count: 47, google_places_cities: 1, housing_age_pct: 65.2, climate_risk: 35, pop_growth_pct: 0.35 },
  { year: 2024, state: "New York", abbr: "NY", population: 20001419, pest_firm_count: 788, google_places_count: 88, google_places_cities: 2, housing_age_pct: 84.0, climate_risk: 51, pop_growth_pct: 1.09 },
  { year: 2024, state: "North Carolina", abbr: "NC", population: 11052061, pest_firm_count: 573, google_places_count: 277, google_places_cities: 6, housing_age_pct: 54.8, climate_risk: 71, pop_growth_pct: 1.66 },
  { year: 2024, state: "North Dakota", abbr: "ND", population: 793387, pest_firm_count: 15, google_places_count: 0, google_places_cities: 0, housing_age_pct: 62.2, climate_risk: 47, pop_growth_pct: 0.8 },
  { year: 2024, state: "Ohio", abbr: "OH", population: 11860621, pest_firm_count: 378, google_places_count: 184, google_places_cities: 4, housing_age_pct: 76.9, climate_risk: 56, pop_growth_pct: 0.44 },
  { year: 2024, state: "Oklahoma", abbr: "OK", population: 4097758, pest_firm_count: 268, google_places_count: 112, google_places_cities: 2, housing_age_pct: 67.4, climate_risk: 66, pop_growth_pct: 0.86 },
  { year: 2024, state: "Oregon", abbr: "OR", population: 4265324, pest_firm_count: 158, google_places_count: 41, google_places_cities: 1, housing_age_pct: 65.3, climate_risk: 54, pop_growth_pct: 0.35 },
  { year: 2024, state: "Pennsylvania", abbr: "PA", population: 13045848, pest_firm_count: 423, google_places_count: 91, google_places_cities: 2, housing_age_pct: 80.4, climate_risk: 54, pop_growth_pct: 0.28 },
  { year: 2024, state: "Rhode Island", abbr: "RI", population: 1110415, pest_firm_count: 50, google_places_count: 0, google_places_cities: 0, housing_age_pct: 85.3, climate_risk: 57, pop_growth_pct: 0.84 },
  { year: 2024, state: "South Carolina", abbr: "SC", population: 5490316, pest_firm_count: 407, google_places_count: 0, google_places_cities: 0, housing_age_pct: 53.6, climate_risk: 72, pop_growth_pct: 1.85 },
  { year: 2024, state: "South Dakota", abbr: "SD", population: 927110, pest_firm_count: 32, google_places_count: 0, google_places_cities: 0, housing_age_pct: 63.4, climate_risk: 54, pop_growth_pct: 1.02 },
  { year: 2024, state: "Tennessee", abbr: "TN", population: 7251291, pest_firm_count: 424, google_places_count: 119, google_places_cities: 2, housing_age_pct: 60.0, climate_risk: 71, pop_growth_pct: 1.37 },
  { year: 2024, state: "Texas", abbr: "TX", population: 31318578, pest_firm_count: 1498, google_places_count: 549, google_places_cities: 12, housing_age_pct: 53.1, climate_risk: 68, pop_growth_pct: 1.95 },
  { year: 2024, state: "Utah", abbr: "UT", population: 3502983, pest_firm_count: 212, google_places_count: 0, google_places_cities: 0, housing_age_pct: 52.4, climate_risk: 34, pop_growth_pct: 1.56 },
  { year: 2024, state: "Vermont", abbr: "VT", population: 646521, pest_firm_count: 19, google_places_count: 0, google_places_cities: 0, housing_age_pct: 76.1, climate_risk: 50, pop_growth_pct: -0.19 },
  { year: 2024, state: "Virginia", abbr: "VA", population: 8819642, pest_firm_count: 426, google_places_count: 167, google_places_cities: 3, housing_age_pct: 65.0, climate_risk: 60, pop_growth_pct: 1.0 },
  { year: 2024, state: "Washington", abbr: "WA", population: 7927958, pest_firm_count: 220, google_places_count: 96, google_places_cities: 2, housing_age_pct: 61.7, climate_risk: 59, pop_growth_pct: 1.14 },
  { year: 2024, state: "West Virginia", abbr: "WV", population: 1767402, pest_firm_count: 58, google_places_count: 0, google_places_cities: 0, housing_age_pct: 72.8, climate_risk: 59, pop_growth_pct: -0.15 },
  { year: 2024, state: "Wisconsin", abbr: "WI", population: 5957168, pest_firm_count: 184, google_places_count: 78, google_places_cities: 2, housing_age_pct: 71.4, climate_risk: 47, pop_growth_pct: 0.45 },
  { year: 2024, state: "Wyoming", abbr: "WY", population: 586722, pest_firm_count: 22, google_places_count: 0, google_places_cities: 0, housing_age_pct: 67.6, climate_risk: 34, pop_growth_pct: 0.35 },
];

// FIPS codes for mapping states to GeoJSON
const STATE_FIPS = {
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
};

// State name to abbreviation mapping
const STATE_NAME_TO_ABBR = {};
const STATE_ABBR_TO_NAME = {};
STATE_MARKET_DATA.forEach(d => {
  STATE_NAME_TO_ABBR[d.state] = d.abbr;
  STATE_ABBR_TO_NAME[d.abbr] = d.state;
});
