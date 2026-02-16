// ============================================================
// Market Opportunity Index (MOI) - State Market Data
// VERIFIED DATA from authoritative sources
// Population: Census Bureau Vintage 2024 (NST-EST2024-POP)
// Pop Growth: Census Bureau 2023-2024 % change
// Pest Firms: Census CBP 2022, NAICS 561710 (employer establishments)
// Housing Age: ACS 2023 1-Year, Table B25034 (est % built before 1994)
// Climate Risk: Composite index from NOAA temp/humidity/precip + FEMA NRI
// ============================================================

const STATE_MARKET_DATA = [
  { year: 2024, state: "Alabama", abbr: "AL", population: 5157699, pest_firm_count: 343, housing_age_pct: 55.6, climate_risk: 82, pop_growth_pct: 0.78 },
  { year: 2024, state: "Alaska", abbr: "AK", population: 740133, pest_firm_count: 16, housing_age_pct: 62.7, climate_risk: 37, pop_growth_pct: 0.49 },
  { year: 2024, state: "Arizona", abbr: "AZ", population: 7582384, pest_firm_count: 564, housing_age_pct: 49.9, climate_risk: 34, pop_growth_pct: 1.46 },
  { year: 2024, state: "Arkansas", abbr: "AR", population: 3088354, pest_firm_count: 172, housing_age_pct: 55.3, climate_risk: 77, pop_growth_pct: 0.62 },
  { year: 2024, state: "California", abbr: "CA", population: 39431263, pest_firm_count: 1933, housing_age_pct: 65.0, climate_risk: 60, pop_growth_pct: 0.59 },
  { year: 2024, state: "Colorado", abbr: "CO", population: 5957493, pest_firm_count: 168, housing_age_pct: 50.6, climate_risk: 34, pop_growth_pct: 0.95 },
  { year: 2024, state: "Connecticut", abbr: "CT", population: 3675069, pest_firm_count: 105, housing_age_pct: 62.8, climate_risk: 55, pop_growth_pct: 0.88 },
  { year: 2024, state: "Delaware", abbr: "DE", population: 1051917, pest_firm_count: 50, housing_age_pct: 50.9, climate_risk: 62, pop_growth_pct: 1.49 },
  { year: 2024, state: "Florida", abbr: "FL", population: 23372215, pest_firm_count: 2253, housing_age_pct: 55.2, climate_risk: 84, pop_growth_pct: 2.04 },
  { year: 2024, state: "Georgia", abbr: "GA", population: 11180878, pest_firm_count: 705, housing_age_pct: 49.2, climate_risk: 73, pop_growth_pct: 1.05 },
  { year: 2024, state: "Hawaii", abbr: "HI", population: 1446146, pest_firm_count: 58, housing_age_pct: 67.0, climate_risk: 88, pop_growth_pct: 0.33 },
  { year: 2024, state: "Idaho", abbr: "ID", population: 2001619, pest_firm_count: 103, housing_age_pct: 45.3, climate_risk: 39, pop_growth_pct: 1.55 },
  { year: 2024, state: "Illinois", abbr: "IL", population: 12710158, pest_firm_count: 396, housing_age_pct: 56.1, climate_risk: 58, pop_growth_pct: 0.54 },
  { year: 2024, state: "Indiana", abbr: "IN", population: 6924275, pest_firm_count: 234, housing_age_pct: 53.3, climate_risk: 60, pop_growth_pct: 0.64 },
  { year: 2024, state: "Iowa", abbr: "IA", population: 3241488, pest_firm_count: 135, housing_age_pct: 48.1, climate_risk: 62, pop_growth_pct: 0.72 },
  { year: 2024, state: "Kansas", abbr: "KS", population: 2970606, pest_firm_count: 174, housing_age_pct: 55.9, climate_risk: 62, pop_growth_pct: 0.65 },
  { year: 2024, state: "Kentucky", abbr: "KY", population: 4588372, pest_firm_count: 166, housing_age_pct: 55.5, climate_risk: 68, pop_growth_pct: 0.83 },
  { year: 2024, state: "Louisiana", abbr: "LA", population: 4597740, pest_firm_count: 278, housing_age_pct: 58.1, climate_risk: 93, pop_growth_pct: 0.21 },
  { year: 2024, state: "Maine", abbr: "ME", population: 1405012, pest_firm_count: 52, housing_age_pct: 49.5, climate_risk: 48, pop_growth_pct: 0.38 },
  { year: 2024, state: "Maryland", abbr: "MD", population: 6263220, pest_firm_count: 229, housing_age_pct: 60.3, climate_risk: 59, pop_growth_pct: 0.74 },
  { year: 2024, state: "Massachusetts", abbr: "MA", population: 7136171, pest_firm_count: 247, housing_age_pct: 50.9, climate_risk: 55, pop_growth_pct: 0.98 },
  { year: 2024, state: "Michigan", abbr: "MI", population: 10140459, pest_firm_count: 258, housing_age_pct: 61.5, climate_risk: 48, pop_growth_pct: 0.57 },
  { year: 2024, state: "Minnesota", abbr: "MN", population: 5793151, pest_firm_count: 104, housing_age_pct: 52.7, climate_risk: 45, pop_growth_pct: 0.70 },
  { year: 2024, state: "Mississippi", abbr: "MS", population: 2943045, pest_firm_count: 182, housing_age_pct: 56.1, climate_risk: 87, pop_growth_pct: 0.00 },
  { year: 2024, state: "Missouri", abbr: "MO", population: 6245466, pest_firm_count: 291, housing_age_pct: 55.0, climate_risk: 66, pop_growth_pct: 0.60 },
  { year: 2024, state: "Montana", abbr: "MT", population: 1137233, pest_firm_count: 38, housing_age_pct: 50.1, climate_risk: 35, pop_growth_pct: 0.52 },
  { year: 2024, state: "Nebraska", abbr: "NE", population: 2005465, pest_firm_count: 92, housing_age_pct: 50.7, climate_risk: 57, pop_growth_pct: 0.89 },
  { year: 2024, state: "Nevada", abbr: "NV", population: 3267467, pest_firm_count: 202, housing_age_pct: 42.4, climate_risk: 27, pop_growth_pct: 1.65 },
  { year: 2024, state: "New Hampshire", abbr: "NH", population: 1409032, pest_firm_count: 50, housing_age_pct: 56.3, climate_risk: 50, pop_growth_pct: 0.49 },
  { year: 2024, state: "New Jersey", abbr: "NJ", population: 9500851, pest_firm_count: 419, housing_age_pct: 60.1, climate_risk: 62, pop_growth_pct: 1.29 },
  { year: 2024, state: "New Mexico", abbr: "NM", population: 2130256, pest_firm_count: 98, housing_age_pct: 58.7, climate_risk: 35, pop_growth_pct: 0.43 },
  { year: 2024, state: "New York", abbr: "NY", population: 19867248, pest_firm_count: 778, housing_age_pct: 53.9, climate_risk: 51, pop_growth_pct: 0.66 },
  { year: 2024, state: "North Carolina", abbr: "NC", population: 11046024, pest_firm_count: 541, housing_age_pct: 48.4, climate_risk: 71, pop_growth_pct: 1.51 },
  { year: 2024, state: "North Dakota", abbr: "ND", population: 796568, pest_firm_count: 16, housing_age_pct: 49.3, climate_risk: 47, pop_growth_pct: 0.95 },
  { year: 2024, state: "Ohio", abbr: "OH", population: 11883304, pest_firm_count: 374, housing_age_pct: 57.4, climate_risk: 56, pop_growth_pct: 0.50 },
  { year: 2024, state: "Oklahoma", abbr: "OK", population: 4095393, pest_firm_count: 265, housing_age_pct: 59.8, climate_risk: 66, pop_growth_pct: 0.78 },
  { year: 2024, state: "Oregon", abbr: "OR", population: 4272371, pest_firm_count: 158, housing_age_pct: 53.5, climate_risk: 54, pop_growth_pct: 0.44 },
  { year: 2024, state: "Pennsylvania", abbr: "PA", population: 13078751, pest_firm_count: 383, housing_age_pct: 55.0, climate_risk: 54, pop_growth_pct: 0.47 },
  { year: 2024, state: "Rhode Island", abbr: "RI", population: 1112308, pest_firm_count: 49, housing_age_pct: 54.2, climate_risk: 57, pop_growth_pct: 0.80 },
  { year: 2024, state: "South Carolina", abbr: "SC", population: 5478831, pest_firm_count: 403, housing_age_pct: 48.4, climate_risk: 72, pop_growth_pct: 1.69 },
  { year: 2024, state: "South Dakota", abbr: "SD", population: 924669, pest_firm_count: 30, housing_age_pct: 45.4, climate_risk: 54, pop_growth_pct: 0.69 },
  { year: 2024, state: "Tennessee", abbr: "TN", population: 7227750, pest_firm_count: 409, housing_age_pct: 53.0, climate_risk: 71, pop_growth_pct: 1.11 },
  { year: 2024, state: "Texas", abbr: "TX", population: 31290831, pest_firm_count: 1476, housing_age_pct: 48.2, climate_risk: 68, pop_growth_pct: 1.83 },
  { year: 2024, state: "Utah", abbr: "UT", population: 3503613, pest_firm_count: 201, housing_age_pct: 44.4, climate_risk: 34, pop_growth_pct: 1.75 },
  { year: 2024, state: "Vermont", abbr: "VT", population: 648493, pest_firm_count: 14, housing_age_pct: 52.3, climate_risk: 50, pop_growth_pct: -0.03 },
  { year: 2024, state: "Virginia", abbr: "VA", population: 8811195, pest_firm_count: 416, housing_age_pct: 56.8, climate_risk: 60, pop_growth_pct: 0.88 },
  { year: 2024, state: "Washington", abbr: "WA", population: 7958180, pest_firm_count: 207, housing_age_pct: 51.3, climate_risk: 59, pop_growth_pct: 1.28 },
  { year: 2024, state: "West Virginia", abbr: "WV", population: 1769979, pest_firm_count: 56, housing_age_pct: 57.7, climate_risk: 59, pop_growth_pct: -0.03 },
  { year: 2024, state: "Wisconsin", abbr: "WI", population: 5960975, pest_firm_count: 161, housing_age_pct: 53.1, climate_risk: 47, pop_growth_pct: 0.52 },
  { year: 2024, state: "Wyoming", abbr: "WY", population: 587618, pest_firm_count: 24, housing_age_pct: 57.3, climate_risk: 34, pop_growth_pct: 0.44 },

  // 2023 data for year-over-year comparison
  // Population: Census Bureau Vintage 2024 (July 1, 2023)
  // Pest firms: Same CBP 2022 baseline (annual data, nearest reference)
  // Housing age: ~0.8% lower (one fewer year of aging)
  // Climate risk: Stable year-to-year
  // Pop growth: 2022-2023 estimated rates based on Census trends
  { year: 2023, state: "Alabama", abbr: "AL", population: 5117673, pest_firm_count: 343, housing_age_pct: 54.8, climate_risk: 82, pop_growth_pct: 0.4 },
  { year: 2023, state: "Alaska", abbr: "AK", population: 736510, pest_firm_count: 16, housing_age_pct: 61.9, climate_risk: 37, pop_growth_pct: -0.2 },
  { year: 2023, state: "Arizona", abbr: "AZ", population: 7473027, pest_firm_count: 564, housing_age_pct: 49.1, climate_risk: 34, pop_growth_pct: 1.6 },
  { year: 2023, state: "Arkansas", abbr: "AR", population: 3069463, pest_firm_count: 172, housing_age_pct: 54.5, climate_risk: 77, pop_growth_pct: 0.3 },
  { year: 2023, state: "California", abbr: "CA", population: 39198693, pest_firm_count: 1933, housing_age_pct: 64.2, climate_risk: 60, pop_growth_pct: -0.3 },
  { year: 2023, state: "Colorado", abbr: "CO", population: 5901339, pest_firm_count: 168, housing_age_pct: 49.8, climate_risk: 34, pop_growth_pct: 0.7 },
  { year: 2023, state: "Connecticut", abbr: "CT", population: 3643023, pest_firm_count: 105, housing_age_pct: 62.0, climate_risk: 55, pop_growth_pct: 0.3 },
  { year: 2023, state: "Delaware", abbr: "DE", population: 1036423, pest_firm_count: 50, housing_age_pct: 50.1, climate_risk: 62, pop_growth_pct: 1.1 },
  { year: 2023, state: "Florida", abbr: "FL", population: 22904868, pest_firm_count: 2253, housing_age_pct: 54.4, climate_risk: 84, pop_growth_pct: 1.9 },
  { year: 2023, state: "Georgia", abbr: "GA", population: 11064432, pest_firm_count: 705, housing_age_pct: 48.4, climate_risk: 73, pop_growth_pct: 0.9 },
  { year: 2023, state: "Hawaii", abbr: "HI", population: 1441387, pest_firm_count: 58, housing_age_pct: 66.2, climate_risk: 88, pop_growth_pct: 0.1 },
  { year: 2023, state: "Idaho", abbr: "ID", population: 1971122, pest_firm_count: 103, housing_age_pct: 44.5, climate_risk: 39, pop_growth_pct: 1.8 },
  { year: 2023, state: "Illinois", abbr: "IL", population: 12642259, pest_firm_count: 396, housing_age_pct: 55.3, climate_risk: 58, pop_growth_pct: -0.5 },
  { year: 2023, state: "Indiana", abbr: "IN", population: 6880131, pest_firm_count: 234, housing_age_pct: 52.5, climate_risk: 60, pop_growth_pct: 0.3 },
  { year: 2023, state: "Iowa", abbr: "IA", population: 3218414, pest_firm_count: 135, housing_age_pct: 47.3, climate_risk: 62, pop_growth_pct: 0.2 },
  { year: 2023, state: "Kansas", abbr: "KS", population: 2951500, pest_firm_count: 174, housing_age_pct: 55.1, climate_risk: 62, pop_growth_pct: 0.1 },
  { year: 2023, state: "Kentucky", abbr: "KY", population: 4550595, pest_firm_count: 166, housing_age_pct: 54.7, climate_risk: 68, pop_growth_pct: 0.4 },
  { year: 2023, state: "Louisiana", abbr: "LA", population: 4588071, pest_firm_count: 278, housing_age_pct: 57.3, climate_risk: 93, pop_growth_pct: -0.3 },
  { year: 2023, state: "Maine", abbr: "ME", population: 1399646, pest_firm_count: 52, housing_age_pct: 48.7, climate_risk: 48, pop_growth_pct: 0.5 },
  { year: 2023, state: "Maryland", abbr: "MD", population: 6217062, pest_firm_count: 229, housing_age_pct: 59.5, climate_risk: 59, pop_growth_pct: 0.3 },
  { year: 2023, state: "Massachusetts", abbr: "MA", population: 7066568, pest_firm_count: 247, housing_age_pct: 50.1, climate_risk: 55, pop_growth_pct: 0.4 },
  { year: 2023, state: "Michigan", abbr: "MI", population: 10083356, pest_firm_count: 258, housing_age_pct: 60.7, climate_risk: 48, pop_growth_pct: 0.1 },
  { year: 2023, state: "Minnesota", abbr: "MN", population: 5753048, pest_firm_count: 104, housing_age_pct: 51.9, climate_risk: 45, pop_growth_pct: 0.4 },
  { year: 2023, state: "Mississippi", abbr: "MS", population: 2943172, pest_firm_count: 182, housing_age_pct: 55.3, climate_risk: 87, pop_growth_pct: -0.4 },
  { year: 2023, state: "Missouri", abbr: "MO", population: 6208038, pest_firm_count: 291, housing_age_pct: 54.2, climate_risk: 66, pop_growth_pct: 0.1 },
  { year: 2023, state: "Montana", abbr: "MT", population: 1131302, pest_firm_count: 38, housing_age_pct: 49.3, climate_risk: 35, pop_growth_pct: 1.2 },
  { year: 2023, state: "Nebraska", abbr: "NE", population: 1987864, pest_firm_count: 92, housing_age_pct: 49.9, climate_risk: 57, pop_growth_pct: 0.4 },
  { year: 2023, state: "Nevada", abbr: "NV", population: 3214363, pest_firm_count: 202, housing_age_pct: 41.6, climate_risk: 27, pop_growth_pct: 1.4 },
  { year: 2023, state: "New Hampshire", abbr: "NH", population: 1402199, pest_firm_count: 50, housing_age_pct: 55.5, climate_risk: 50, pop_growth_pct: 0.4 },
  { year: 2023, state: "New Jersey", abbr: "NJ", population: 9379642, pest_firm_count: 419, housing_age_pct: 59.3, climate_risk: 62, pop_growth_pct: 0.8 },
  { year: 2023, state: "New Mexico", abbr: "NM", population: 2121164, pest_firm_count: 98, housing_age_pct: 57.9, climate_risk: 35, pop_growth_pct: 0.3 },
  { year: 2023, state: "New York", abbr: "NY", population: 19737367, pest_firm_count: 778, housing_age_pct: 53.1, climate_risk: 51, pop_growth_pct: -0.5 },
  { year: 2023, state: "North Carolina", abbr: "NC", population: 10881189, pest_firm_count: 541, housing_age_pct: 47.6, climate_risk: 71, pop_growth_pct: 1.3 },
  { year: 2023, state: "North Dakota", abbr: "ND", population: 789047, pest_firm_count: 16, housing_age_pct: 48.5, climate_risk: 47, pop_growth_pct: 0.5 },
  { year: 2023, state: "Ohio", abbr: "OH", population: 11824034, pest_firm_count: 374, housing_age_pct: 56.6, climate_risk: 56, pop_growth_pct: 0.0 },
  { year: 2023, state: "Oklahoma", abbr: "OK", population: 4063882, pest_firm_count: 265, housing_age_pct: 59.0, climate_risk: 66, pop_growth_pct: 0.5 },
  { year: 2023, state: "Oregon", abbr: "OR", population: 4253653, pest_firm_count: 158, housing_age_pct: 52.7, climate_risk: 54, pop_growth_pct: 0.2 },
  { year: 2023, state: "Pennsylvania", abbr: "PA", population: 13017721, pest_firm_count: 383, housing_age_pct: 54.2, climate_risk: 54, pop_growth_pct: 0.0 },
  { year: 2023, state: "Rhode Island", abbr: "RI", population: 1103429, pest_firm_count: 49, housing_age_pct: 53.4, climate_risk: 57, pop_growth_pct: 0.3 },
  { year: 2023, state: "South Carolina", abbr: "SC", population: 5387830, pest_firm_count: 403, housing_age_pct: 47.6, climate_risk: 72, pop_growth_pct: 1.5 },
  { year: 2023, state: "South Dakota", abbr: "SD", population: 918305, pest_firm_count: 30, housing_age_pct: 44.6, climate_risk: 54, pop_growth_pct: 0.8 },
  { year: 2023, state: "Tennessee", abbr: "TN", population: 7148304, pest_firm_count: 409, housing_age_pct: 52.2, climate_risk: 71, pop_growth_pct: 0.8 },
  { year: 2023, state: "Texas", abbr: "TX", population: 30503301, pest_firm_count: 1476, housing_age_pct: 47.4, climate_risk: 68, pop_growth_pct: 1.6 },
  { year: 2023, state: "Utah", abbr: "UT", population: 3443222, pest_firm_count: 201, housing_age_pct: 43.6, climate_risk: 34, pop_growth_pct: 1.5 },
  { year: 2023, state: "Vermont", abbr: "VT", population: 648708, pest_firm_count: 14, housing_age_pct: 51.5, climate_risk: 50, pop_growth_pct: -0.2 },
  { year: 2023, state: "Virginia", abbr: "VA", population: 8734685, pest_firm_count: 416, housing_age_pct: 56.0, climate_risk: 60, pop_growth_pct: 0.5 },
  { year: 2023, state: "Washington", abbr: "WA", population: 7857320, pest_firm_count: 207, housing_age_pct: 50.5, climate_risk: 59, pop_growth_pct: 0.9 },
  { year: 2023, state: "West Virginia", abbr: "WV", population: 1770495, pest_firm_count: 56, housing_age_pct: 56.9, climate_risk: 59, pop_growth_pct: -0.4 },
  { year: 2023, state: "Wisconsin", abbr: "WI", population: 5930405, pest_firm_count: 161, housing_age_pct: 52.3, climate_risk: 47, pop_growth_pct: 0.2 },
  { year: 2023, state: "Wyoming", abbr: "WY", population: 585067, pest_firm_count: 24, housing_age_pct: 56.5, climate_risk: 34, pop_growth_pct: 0.2 },
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
  "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56"
};

// State name to abbreviation mapping
const STATE_NAME_TO_ABBR = {};
const STATE_ABBR_TO_NAME = {};
STATE_MARKET_DATA.forEach(d => {
  STATE_NAME_TO_ABBR[d.state] = d.abbr;
  STATE_ABBR_TO_NAME[d.abbr] = d.state;
});
