// ============================================================
// Orkin Pest Pressure Data - Aggregated to State Level
// Source: Orkin 2025 Top 50 City Rankings (4 pest categories)
// Methodology: Cities ranked by new residential treatments performed
// Scoring: Rank 1 = 50 pts, Rank 50 = 1 pt, summed per state
// States not appearing in any list receive a score of 0
// ============================================================

const PEST_PRESSURE_DATA = {
  // --- Per-state pest scores by category + city details ---
  "CA": {
    total: 443, normalized: 100.0, appearances: 13,
    scores: { "Mosquitoes": 98, "Bed Bugs": 58, "Termites": 131, "Rodents": 156 },
    cities: {
      "Mosquitoes": [{ city: "Los Angeles", rank: 1 }, { city: "San Francisco", rank: 15 }, { city: "San Diego", rank: 39 }],
      "Bed Bugs": [{ city: "Los Angeles", rank: 4 }, { city: "San Francisco", rank: 42 }, { city: "San Diego", rank: 49 }],
      "Termites": [{ city: "Los Angeles", rank: 2 }, { city: "San Diego", rank: 8 }, { city: "San Francisco", rank: 12 }],
      "Rodents": [{ city: "Los Angeles", rank: 1 }, { city: "San Francisco", rank: 4 }, { city: "Sacramento", rank: 19 }, { city: "San Diego", rank: 24 }]
    }
  },
  "FL": {
    total: 432, normalized: 97.5, appearances: 14,
    scores: { "Mosquitoes": 115, "Bed Bugs": 10, "Termites": 235, "Rodents": 72 },
    cities: {
      "Mosquitoes": [{ city: "Miami", rank: 12 }, { city: "Orlando", rank: 17 }, { city: "Tampa", rank: 18 }, { city: "West Palm Beach", rank: 42 }],
      "Bed Bugs": [{ city: "Miami", rank: 41 }],
      "Termites": [{ city: "Miami", rank: 1 }, { city: "Tampa", rank: 3 }, { city: "Orlando", rank: 5 }, { city: "West Palm Beach", rank: 6 }, { city: "Fort Myers", rank: 26 }, { city: "Jacksonville", rank: 30 }],
      "Rodents": [{ city: "Tampa", rank: 22 }, { city: "Miami", rank: 26 }, { city: "Orlando", rank: 33 }]
    }
  },
  "OH": {
    total: 388, normalized: 87.5, appearances: 14,
    scores: { "Mosquitoes": 92, "Bed Bugs": 182, "Termites": 20, "Rodents": 94 },
    cities: {
      "Mosquitoes": [{ city: "Cleveland", rank: 9 }, { city: "Columbus", rank: 23 }, { city: "Cincinnati", rank: 29 }],
      "Bed Bugs": [{ city: "Cleveland", rank: 2 }, { city: "Columbus", rank: 8 }, { city: "Cincinnati", rank: 13 }, { city: "Youngstown", rank: 22 }, { city: "Toledo", rank: 36 }, { city: "Dayton", rank: 43 }],
      "Termites": [{ city: "Cincinnati", rank: 32 }, { city: "Columbus", rank: 50 }],
      "Rodents": [{ city: "Cleveland", rank: 11 }, { city: "Columbus", rank: 21 }, { city: "Cincinnati", rank: 27 }]
    }
  },
  "TX": {
    total: 341, normalized: 76.8, appearances: 12,
    scores: { "Mosquitoes": 103, "Bed Bugs": 33, "Termites": 141, "Rodents": 64 },
    cities: {
      "Mosquitoes": [{ city: "Houston", rank: 6 }, { city: "Dallas", rank: 7 }, { city: "San Antonio", rank: 37 }],
      "Bed Bugs": [{ city: "Dallas", rank: 24 }, { city: "Houston", rank: 45 }],
      "Termites": [{ city: "Houston", rank: 7 }, { city: "Dallas", rank: 10 }, { city: "San Antonio", rank: 25 }, { city: "Austin", rank: 33 }, { city: "Waco", rank: 39 }],
      "Rodents": [{ city: "Dallas", rank: 15 }, { city: "Houston", rank: 23 }]
    }
  },
  "MI": {
    total: 313, normalized: 70.5, appearances: 12,
    scores: { "Mosquitoes": 92, "Bed Bugs": 130, "Termites": 11, "Rodents": 80 },
    cities: {
      "Mosquitoes": [{ city: "Detroit", rank: 5 }, { city: "Grand Rapids", rank: 25 }, { city: "Flint", rank: 31 }],
      "Bed Bugs": [{ city: "Detroit", rank: 3 }, { city: "Grand Rapids", rank: 7 }, { city: "Flint", rank: 16 }, { city: "Lansing", rank: 48 }],
      "Termites": [{ city: "Detroit", rank: 45 }, { city: "Grand Rapids", rank: 46 }],
      "Rodents": [{ city: "Detroit", rank: 7 }, { city: "Grand Rapids", rank: 25 }, { city: "Flint", rank: 41 }]
    }
  },
  "PA": {
    total: 263, normalized: 59.1, appearances: 9,
    scores: { "Mosquitoes": 63, "Bed Bugs": 65, "Termites": 61, "Rodents": 74 },
    cities: {
      "Mosquitoes": [{ city: "Philadelphia", rank: 11 }, { city: "Pittsburgh", rank: 28 }],
      "Bed Bugs": [{ city: "Pittsburgh", rank: 12 }, { city: "Philadelphia", rank: 25 }],
      "Termites": [{ city: "Philadelphia", rank: 15 }, { city: "Pittsburgh", rank: 29 }, { city: "Harrisburg", rank: 48 }],
      "Rodents": [{ city: "Philadelphia", rank: 8 }, { city: "Pittsburgh", rank: 20 }]
    }
  },
  "IL": {
    total: 262, normalized: 58.9, appearances: 8,
    scores: { "Mosquitoes": 51, "Bed Bugs": 110, "Termites": 38, "Rodents": 63 },
    cities: {
      "Mosquitoes": [{ city: "Chicago", rank: 2 }, { city: "Davenport", rank: 49 }],
      "Bed Bugs": [{ city: "Chicago", rank: 1 }, { city: "Champaign", rank: 9 }, { city: "Peoria", rank: 33 }],
      "Termites": [{ city: "Chicago", rank: 13 }],
      "Rodents": [{ city: "Chicago", rank: 2 }, { city: "Champaign", rank: 37 }]
    }
  },
  "NC": {
    total: 260, normalized: 58.4, appearances: 10,
    scores: { "Mosquitoes": 81, "Bed Bugs": 47, "Termites": 97, "Rodents": 35 },
    cities: {
      "Mosquitoes": [{ city: "Raleigh-Durham", rank: 13 }, { city: "Charlotte", rank: 14 }, { city: "Greensboro", rank: 45 }],
      "Bed Bugs": [{ city: "Raleigh", rank: 23 }, { city: "Charlotte", rank: 32 }],
      "Termites": [{ city: "Raleigh", rank: 17 }, { city: "Greenville", rank: 19 }, { city: "Charlotte", rank: 20 }],
      "Rodents": [{ city: "Raleigh", rank: 32 }, { city: "Charlotte", rank: 35 }]
    }
  },
  "IN": {
    total: 187, normalized: 41.8, appearances: 7,
    scores: { "Mosquitoes": 35, "Bed Bugs": 83, "Termites": 23, "Rodents": 46 },
    cities: {
      "Mosquitoes": [{ city: "Indianapolis", rank: 16 }],
      "Bed Bugs": [{ city: "Indianapolis", rank: 5 }, { city: "South Bend", rank: 27 }, { city: "Fort Wayne", rank: 38 }],
      "Termites": [{ city: "Indianapolis", rank: 28 }],
      "Rodents": [{ city: "Indianapolis", rank: 14 }, { city: "South Bend", rank: 42 }]
    }
  },
  "NY": {
    total: 185, normalized: 41.4, appearances: 8,
    scores: { "Mosquitoes": 48, "Bed Bugs": 51, "Termites": 35, "Rodents": 51 },
    cities: {
      "Mosquitoes": [{ city: "New York", rank: 3 }],
      "Bed Bugs": [{ city: "New York", rank: 15 }, { city: "Buffalo", rank: 37 }, { city: "Syracuse", rank: 50 }],
      "Termites": [{ city: "New York", rank: 16 }],
      "Rodents": [{ city: "New York", rank: 3 }, { city: "Albany", rank: 49 }, { city: "Buffalo", rank: 50 }]
    }
  },
  "TN": {
    total: 181, normalized: 40.5, appearances: 10,
    scores: { "Mosquitoes": 62, "Bed Bugs": 29, "Termites": 79, "Rodents": 11 },
    cities: {
      "Mosquitoes": [{ city: "Nashville", rank: 21 }, { city: "Memphis", rank: 34 }, { city: "Knoxville", rank: 36 }],
      "Bed Bugs": [{ city: "Knoxville", rank: 29 }, { city: "Nashville", rank: 44 }],
      "Termites": [{ city: "Nashville", rank: 21 }, { city: "Memphis", rank: 22 }, { city: "Knoxville", rank: 35 }, { city: "Chattanooga", rank: 47 }],
      "Rodents": [{ city: "Nashville", rank: 40 }]
    }
  },
  "GA": {
    total: 161, normalized: 35.9, appearances: 6,
    scores: { "Mosquitoes": 52, "Bed Bugs": 34, "Termites": 42, "Rodents": 33 },
    cities: {
      "Mosquitoes": [{ city: "Atlanta", rank: 4 }, { city: "Augusta", rank: 46 }],
      "Bed Bugs": [{ city: "Atlanta", rank: 17 }],
      "Termites": [{ city: "Atlanta", rank: 11 }, { city: "Savannah", rank: 49 }],
      "Rodents": [{ city: "Atlanta", rank: 18 }]
    }
  },
  "MD": {
    total: 152, normalized: 33.9, appearances: 4,
    scores: { "Mosquitoes": 31, "Bed Bugs": 40, "Termites": 42, "Rodents": 39 },
    cities: {
      "Mosquitoes": [{ city: "Baltimore", rank: 20 }],
      "Bed Bugs": [{ city: "Baltimore", rank: 11 }],
      "Termites": [{ city: "Baltimore", rank: 9 }],
      "Rodents": [{ city: "Baltimore", rank: 12 }]
    }
  },
  "VA": {
    total: 151, normalized: 33.6, appearances: 8,
    scores: { "Mosquitoes": 45, "Bed Bugs": 43, "Termites": 37, "Rodents": 26 },
    cities: {
      "Mosquitoes": [{ city: "Norfolk", rank: 27 }, { city: "Richmond", rank: 30 }],
      "Bed Bugs": [{ city: "Richmond", rank: 28 }, { city: "Norfolk", rank: 31 }],
      "Termites": [{ city: "Norfolk", rank: 24 }, { city: "Richmond", rank: 41 }],
      "Rodents": [{ city: "Norfolk", rank: 29 }, { city: "Richmond", rank: 47 }]
    }
  },
  "SC": {
    total: 141, normalized: 31.4, appearances: 8,
    scores: { "Mosquitoes": 42, "Bed Bugs": 21, "Termites": 57, "Rodents": 21 },
    cities: {
      "Mosquitoes": [{ city: "Greenville", rank: 22 }, { city: "Columbia", rank: 41 }, { city: "Myrtle Beach", rank: 48 }],
      "Bed Bugs": [{ city: "Greenville", rank: 30 }],
      "Termites": [{ city: "Charleston", rank: 23 }, { city: "Myrtle Beach", rank: 36 }, { city: "Columbia", rank: 37 }],
      "Rodents": [{ city: "Greenville", rank: 30 }]
    }
  },
  "CO": {
    total: 126, normalized: 28.0, appearances: 4,
    scores: { "Mosquitoes": 41, "Bed Bugs": 37, "Termites": 7, "Rodents": 41 },
    cities: {
      "Mosquitoes": [{ city: "Denver", rank: 10 }],
      "Bed Bugs": [{ city: "Denver", rank: 14 }],
      "Termites": [{ city: "Denver", rank: 44 }],
      "Rodents": [{ city: "Denver", rank: 10 }]
    }
  },
  "WI": {
    total: 101, normalized: 22.3, appearances: 5,
    scores: { "Mosquitoes": 13, "Bed Bugs": 41, "Termites": 0, "Rodents": 47 },
    cities: {
      "Mosquitoes": [{ city: "Milwaukee", rank: 38 }],
      "Bed Bugs": [{ city: "Milwaukee", rank: 10 }],
      "Rodents": [{ city: "Milwaukee", rank: 16 }, { city: "Madison", rank: 44 }, { city: "Eau Claire", rank: 46 }]
    }
  },
  "OK": {
    total: 96, normalized: 21.1, appearances: 5,
    scores: { "Mosquitoes": 46, "Bed Bugs": 17, "Termites": 33, "Rodents": 0 },
    cities: {
      "Mosquitoes": [{ city: "Oklahoma City", rank: 24 }, { city: "Tulsa", rank: 32 }],
      "Bed Bugs": [{ city: "Oklahoma City", rank: 34 }],
      "Termites": [{ city: "Oklahoma City", rank: 31 }, { city: "Tulsa", rank: 38 }]
    }
  },
  "MO": {
    total: 95, normalized: 20.9, appearances: 6,
    scores: { "Mosquitoes": 4, "Bed Bugs": 33, "Termites": 20, "Rodents": 38 },
    cities: {
      "Mosquitoes": [{ city: "St. Louis", rank: 47 }],
      "Bed Bugs": [{ city: "St. Louis", rank: 18 }],
      "Termites": [{ city: "St. Louis", rank: 40 }, { city: "Kansas City", rank: 42 }],
      "Rodents": [{ city: "St. Louis", rank: 28 }, { city: "Kansas City", rank: 36 }]
    }
  },
  "MN": {
    total: 85, normalized: 18.6, appearances: 3,
    scores: { "Mosquitoes": 32, "Bed Bugs": 11, "Termites": 0, "Rodents": 42 },
    cities: {
      "Mosquitoes": [{ city: "Minneapolis", rank: 19 }],
      "Bed Bugs": [{ city: "Minneapolis", rank: 40 }],
      "Rodents": [{ city: "Minneapolis", rank: 9 }]
    }
  },
  "IA": {
    total: 79, normalized: 17.3, appearances: 3,
    scores: { "Mosquitoes": 18, "Bed Bugs": 61, "Termites": 0, "Rodents": 0 },
    cities: {
      "Mosquitoes": [{ city: "Cedar Rapids", rank: 33 }],
      "Bed Bugs": [{ city: "Cedar Rapids", rank: 20 }, { city: "Davenport", rank: 21 }]
    }
  },
  "WA": {
    total: 71, normalized: 15.5, appearances: 3,
    scores: { "Mosquitoes": 25, "Bed Bugs": 12, "Termites": 0, "Rodents": 34 },
    cities: {
      "Mosquitoes": [{ city: "Seattle", rank: 26 }],
      "Bed Bugs": [{ city: "Seattle", rank: 39 }],
      "Rodents": [{ city: "Seattle", rank: 17 }]
    }
  },
  "CT": {
    total: 69, normalized: 15.0, appearances: 3,
    scores: { "Mosquitoes": 7, "Bed Bugs": 16, "Termites": 0, "Rodents": 46 },
    cities: {
      "Mosquitoes": [{ city: "Hartford", rank: 44 }],
      "Bed Bugs": [{ city: "Hartford", rank: 35 }],
      "Rodents": [{ city: "Hartford", rank: 5 }]
    }
  },
  "WV": {
    total: 56, normalized: 12.0, appearances: 2,
    scores: { "Mosquitoes": 0, "Bed Bugs": 32, "Termites": 24, "Rodents": 0 },
    cities: {
      "Bed Bugs": [{ city: "Charleston", rank: 19 }],
      "Termites": [{ city: "Charleston", rank: 27 }]
    }
  },
  "MA": {
    total: 53, normalized: 11.4, appearances: 3,
    scores: { "Mosquitoes": 11, "Bed Bugs": 4, "Termites": 0, "Rodents": 38 },
    cities: {
      "Mosquitoes": [{ city: "Boston", rank: 40 }],
      "Bed Bugs": [{ city: "Boston", rank: 47 }],
      "Rodents": [{ city: "Boston", rank: 13 }]
    }
  },
  "LA": {
    total: 50, normalized: 10.7, appearances: 3,
    scores: { "Mosquitoes": 1, "Bed Bugs": 0, "Termites": 37, "Rodents": 12 },
    cities: {
      "Mosquitoes": [{ city: "New Orleans", rank: 50 }],
      "Termites": [{ city: "New Orleans", rank: 14 }],
      "Rodents": [{ city: "New Orleans", rank: 39 }]
    }
  },
  "AZ": {
    total: 46, normalized: 9.8, appearances: 2,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 33, "Rodents": 13 },
    cities: {
      "Termites": [{ city: "Phoenix", rank: 18 }],
      "Rodents": [{ city: "Phoenix", rank: 38 }]
    }
  },
  "NE": {
    total: 25, normalized: 5.0, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 25, "Termites": 0, "Rodents": 0 },
    cities: {
      "Bed Bugs": [{ city: "Omaha", rank: 26 }]
    }
  },
  "NM": {
    total: 24, normalized: 4.8, appearances: 2,
    scores: { "Mosquitoes": 16, "Bed Bugs": 0, "Termites": 0, "Rodents": 8 },
    cities: {
      "Mosquitoes": [{ city: "Albuquerque", rank: 35 }],
      "Rodents": [{ city: "Albuquerque", rank: 43 }]
    }
  },
  "OR": {
    total: 20, normalized: 3.9, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 20 },
    cities: {
      "Rodents": [{ city: "Portland", rank: 31 }]
    }
  },
  "HI": {
    total: 17, normalized: 3.2, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 17, "Rodents": 0 },
    cities: {
      "Termites": [{ city: "Honolulu", rank: 34 }]
    }
  },
  "KY": {
    total: 17, normalized: 3.2, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 17 },
    cities: {
      "Rodents": [{ city: "Louisville", rank: 34 }]
    }
  },
  "NV": {
    total: 11, normalized: 1.8, appearances: 2,
    scores: { "Mosquitoes": 0, "Bed Bugs": 5, "Termites": 0, "Rodents": 6 },
    cities: {
      "Bed Bugs": [{ city: "Las Vegas", rank: 46 }],
      "Rodents": [{ city: "Reno", rank: 45 }]
    }
  },
  "KS": {
    total: 8, normalized: 1.1, appearances: 1,
    scores: { "Mosquitoes": 8, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 },
    cities: {
      "Mosquitoes": [{ city: "Kansas City", rank: 43 }]
    }
  },
  "AL": {
    total: 8, normalized: 1.1, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 8, "Rodents": 0 },
    cities: {
      "Termites": [{ city: "Mobile", rank: 43 }]
    }
  },
  "VT": {
    total: 3, normalized: 0.0, appearances: 1,
    scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 3 },
    cities: {
      "Rodents": [{ city: "Burlington", rank: 48 }]
    }
  },
  // States with no cities in any Orkin 2025 Top 50 list
  "AK": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "AR": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "DE": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "ID": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "ME": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "MS": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "MT": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "ND": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "NH": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "NJ": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "RI": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "SD": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "UT": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} },
  "WY": { total: 0, normalized: 0, appearances: 0, scores: { "Mosquitoes": 0, "Bed Bugs": 0, "Termites": 0, "Rodents": 0 }, cities: {} }
};

// Pest category colors for charts
const PEST_COLORS = {
  "Mosquitoes": "#0ea5e9",
  "Bed Bugs": "#ef4444",
  "Termites": "#f59e0b",
  "Rodents": "#8b5cf6"
};

// Pest category icons (unicode)
const PEST_ICONS = {
  "Mosquitoes": "\ud83e\udeb3",
  "Bed Bugs": "\ud83d\uded0",
  "Termites": "\ud83e\udeb5",
  "Rodents": "\ud83d\udc00"
};

// ============================================================
// City-Level Pest Pressure Data
// Extracted from Orkin 2025 state rankings (city sub-entries)
// Score = 51 - rank (Rank 1 = 50 pts, Rank 50 = 1 pt)
// ============================================================

const CITY_PEST_PRESSURE_DATA = {
  "Los Angeles, CA": { total: 196, normalized: 100.0, appearances: 4, scores: { "Bed Bugs": 47, "Mosquitoes": 50, "Rodents": 50, "Termites": 49 }, ranks: { "Bed Bugs": 4, "Mosquitoes": 1, "Rodents": 1, "Termites": 2 } },
  "Chicago, IL": { total: 186, normalized: 94.9, appearances: 4, scores: { "Bed Bugs": 50, "Mosquitoes": 49, "Rodents": 49, "Termites": 38 }, ranks: { "Bed Bugs": 1, "Mosquitoes": 2, "Rodents": 2, "Termites": 13 } },
  "New York, NY": { total: 167, normalized: 85.1, appearances: 4, scores: { "Bed Bugs": 36, "Mosquitoes": 48, "Rodents": 48, "Termites": 35 }, ranks: { "Bed Bugs": 15, "Mosquitoes": 3, "Rodents": 3, "Termites": 16 } },
  "Atlanta, GA": { total: 154, normalized: 78.5, appearances: 4, scores: { "Bed Bugs": 34, "Mosquitoes": 47, "Rodents": 33, "Termites": 40 }, ranks: { "Bed Bugs": 17, "Mosquitoes": 4, "Rodents": 18, "Termites": 11 } },
  "Baltimore, MD": { total: 152, normalized: 77.4, appearances: 4, scores: { "Bed Bugs": 40, "Mosquitoes": 31, "Rodents": 39, "Termites": 42 }, ranks: { "Bed Bugs": 11, "Mosquitoes": 20, "Rodents": 12, "Termites": 9 } },
  "Dallas, TX": { total: 148, normalized: 75.4, appearances: 4, scores: { "Bed Bugs": 27, "Mosquitoes": 44, "Rodents": 36, "Termites": 41 }, ranks: { "Bed Bugs": 24, "Mosquitoes": 7, "Rodents": 15, "Termites": 10 } },
  "Philadelphia, PA": { total: 145, normalized: 73.8, appearances: 4, scores: { "Bed Bugs": 26, "Mosquitoes": 40, "Rodents": 43, "Termites": 36 }, ranks: { "Bed Bugs": 25, "Mosquitoes": 11, "Rodents": 8, "Termites": 15 } },
  "Detroit, MI": { total: 144, normalized: 73.3, appearances: 4, scores: { "Bed Bugs": 48, "Mosquitoes": 46, "Rodents": 44, "Termites": 6 }, ranks: { "Bed Bugs": 3, "Mosquitoes": 5, "Rodents": 7, "Termites": 45 } },
  "Indianapolis, IN": { total: 141, normalized: 71.8, appearances: 4, scores: { "Bed Bugs": 46, "Mosquitoes": 35, "Rodents": 37, "Termites": 23 }, ranks: { "Bed Bugs": 5, "Mosquitoes": 16, "Rodents": 14, "Termites": 28 } },
  "San Francisco, CA": { total: 131, normalized: 66.7, appearances: 4, scores: { "Bed Bugs": 9, "Mosquitoes": 36, "Rodents": 47, "Termites": 39 }, ranks: { "Bed Bugs": 42, "Mosquitoes": 15, "Rodents": 4, "Termites": 12 } },
  "Cleveland, OH": { total: 131, normalized: 66.7, appearances: 3, scores: { "Bed Bugs": 49, "Mosquitoes": 42, "Rodents": 40 }, ranks: { "Bed Bugs": 2, "Mosquitoes": 9, "Rodents": 11 } },
  "Denver, CO": { total: 126, normalized: 64.1, appearances: 4, scores: { "Bed Bugs": 37, "Mosquitoes": 41, "Rodents": 41, "Termites": 7 }, ranks: { "Bed Bugs": 14, "Mosquitoes": 10, "Rodents": 10, "Termites": 44 } },
  "Miami, FL": { total: 124, normalized: 63.1, appearances: 4, scores: { "Bed Bugs": 10, "Mosquitoes": 39, "Rodents": 25, "Termites": 50 }, ranks: { "Bed Bugs": 41, "Mosquitoes": 12, "Rodents": 26, "Termites": 1 } },
  "Houston, TX": { total: 123, normalized: 62.6, appearances: 4, scores: { "Bed Bugs": 6, "Mosquitoes": 45, "Rodents": 28, "Termites": 44 }, ranks: { "Bed Bugs": 45, "Mosquitoes": 6, "Rodents": 23, "Termites": 7 } },
  "Pittsburgh, PA": { total: 115, normalized: 58.5, appearances: 4, scores: { "Bed Bugs": 39, "Mosquitoes": 23, "Rodents": 31, "Termites": 22 }, ranks: { "Bed Bugs": 12, "Mosquitoes": 28, "Rodents": 20, "Termites": 29 } },
  "Tampa, FL": { total: 110, normalized: 55.9, appearances: 3, scores: { "Mosquitoes": 33, "Rodents": 29, "Termites": 48 }, ranks: { "Mosquitoes": 18, "Rodents": 22, "Termites": 3 } },
  "Cincinnati, OH": { total: 103, normalized: 52.3, appearances: 4, scores: { "Bed Bugs": 38, "Mosquitoes": 22, "Rodents": 24, "Termites": 19 }, ranks: { "Bed Bugs": 13, "Mosquitoes": 29, "Rodents": 27, "Termites": 32 } },
  "Charlotte, NC": { total: 103, normalized: 52.3, appearances: 4, scores: { "Bed Bugs": 19, "Mosquitoes": 37, "Rodents": 16, "Termites": 31 }, ranks: { "Bed Bugs": 32, "Mosquitoes": 14, "Rodents": 35, "Termites": 20 } },
  "Columbus, OH": { total: 102, normalized: 51.8, appearances: 4, scores: { "Bed Bugs": 43, "Mosquitoes": 28, "Rodents": 30, "Termites": 1 }, ranks: { "Bed Bugs": 8, "Mosquitoes": 23, "Rodents": 21, "Termites": 50 } },
  "Grand Rapids, MI": { total: 101, normalized: 51.3, appearances: 4, scores: { "Bed Bugs": 44, "Mosquitoes": 26, "Rodents": 26, "Termites": 5 }, ranks: { "Bed Bugs": 7, "Mosquitoes": 25, "Rodents": 25, "Termites": 46 } },
  "Orlando, FL": { total: 98, normalized: 49.7, appearances: 3, scores: { "Mosquitoes": 34, "Rodents": 18, "Termites": 46 }, ranks: { "Mosquitoes": 17, "Rodents": 33, "Termites": 5 } },
  "Norfolk, VA": { total: 93, normalized: 47.2, appearances: 4, scores: { "Bed Bugs": 20, "Mosquitoes": 24, "Rodents": 22, "Termites": 27 }, ranks: { "Bed Bugs": 31, "Mosquitoes": 27, "Rodents": 29, "Termites": 24 } },
  "Milwaukee, WI": { total: 89, normalized: 45.1, appearances: 3, scores: { "Bed Bugs": 41, "Mosquitoes": 13, "Rodents": 35 }, ranks: { "Bed Bugs": 10, "Mosquitoes": 38, "Rodents": 16 } },
  "Minneapolis, MN": { total: 85, normalized: 43.1, appearances: 3, scores: { "Bed Bugs": 11, "Mosquitoes": 32, "Rodents": 42 }, ranks: { "Bed Bugs": 40, "Mosquitoes": 19, "Rodents": 9 } },
  "San Diego, CA": { total: 84, normalized: 42.6, appearances: 4, scores: { "Bed Bugs": 2, "Mosquitoes": 12, "Rodents": 27, "Termites": 43 }, ranks: { "Bed Bugs": 49, "Mosquitoes": 39, "Rodents": 24, "Termites": 8 } },
  "Raleigh, NC": { total: 119, normalized: 60.5, appearances: 4, scores: { "Bed Bugs": 28, "Mosquitoes": 38, "Rodents": 19, "Termites": 34 }, ranks: { "Bed Bugs": 23, "Mosquitoes": 13, "Rodents": 32, "Termites": 17 } },
  "Nashville, TN": { total: 78, normalized: 39.5, appearances: 4, scores: { "Bed Bugs": 7, "Mosquitoes": 30, "Rodents": 11, "Termites": 30 }, ranks: { "Bed Bugs": 44, "Mosquitoes": 21, "Rodents": 40, "Termites": 21 } },
  "Greenville, SC": { total: 71, normalized: 35.9, appearances: 3, scores: { "Bed Bugs": 21, "Mosquitoes": 29, "Rodents": 21 }, ranks: { "Bed Bugs": 30, "Mosquitoes": 22, "Rodents": 30 } },
  "St. Louis, MO": { total: 71, normalized: 35.9, appearances: 4, scores: { "Bed Bugs": 33, "Mosquitoes": 4, "Rodents": 23, "Termites": 11 }, ranks: { "Bed Bugs": 18, "Mosquitoes": 47, "Rodents": 28, "Termites": 40 } },
  "Seattle, WA": { total: 71, normalized: 35.9, appearances: 3, scores: { "Bed Bugs": 12, "Mosquitoes": 25, "Rodents": 34 }, ranks: { "Bed Bugs": 39, "Mosquitoes": 26, "Rodents": 17 } },
  "Hartford, CT": { total: 69, normalized: 34.9, appearances: 3, scores: { "Bed Bugs": 16, "Mosquitoes": 7, "Rodents": 46 }, ranks: { "Bed Bugs": 35, "Mosquitoes": 44, "Rodents": 5 } },
  "Flint, MI": { total: 65, normalized: 32.8, appearances: 3, scores: { "Bed Bugs": 35, "Mosquitoes": 20, "Rodents": 10 }, ranks: { "Bed Bugs": 16, "Mosquitoes": 31, "Rodents": 41 } },
  "Oklahoma City, OK": { total: 64, normalized: 32.3, appearances: 3, scores: { "Bed Bugs": 17, "Mosquitoes": 27, "Termites": 20 }, ranks: { "Bed Bugs": 34, "Mosquitoes": 24, "Termites": 31 } },
  "Richmond, VA": { total: 58, normalized: 29.2, appearances: 4, scores: { "Bed Bugs": 23, "Mosquitoes": 21, "Rodents": 4, "Termites": 10 }, ranks: { "Bed Bugs": 28, "Mosquitoes": 30, "Rodents": 47, "Termites": 41 } },
  "Champaign, IL": { total: 56, normalized: 28.2, appearances: 2, scores: { "Bed Bugs": 42, "Rodents": 14 }, ranks: { "Bed Bugs": 9, "Rodents": 37 } },
  "Charleston, WV": { total: 56, normalized: 28.2, appearances: 2, scores: { "Bed Bugs": 32, "Termites": 24 }, ranks: { "Bed Bugs": 19, "Termites": 27 } },
  "West Palm Beach, FL": { total: 54, normalized: 27.2, appearances: 2, scores: { "Mosquitoes": 9, "Termites": 45 }, ranks: { "Mosquitoes": 42, "Termites": 6 } },
  "Knoxville, TN": { total: 53, normalized: 26.7, appearances: 3, scores: { "Bed Bugs": 22, "Mosquitoes": 15, "Termites": 16 }, ranks: { "Bed Bugs": 29, "Mosquitoes": 36, "Termites": 35 } },
  "Boston, MA": { total: 53, normalized: 26.7, appearances: 3, scores: { "Bed Bugs": 4, "Mosquitoes": 11, "Rodents": 38 }, ranks: { "Bed Bugs": 47, "Mosquitoes": 40, "Rodents": 13 } },
  "New Orleans, LA": { total: 50, normalized: 25.1, appearances: 3, scores: { "Mosquitoes": 1, "Rodents": 12, "Termites": 37 }, ranks: { "Mosquitoes": 50, "Rodents": 39, "Termites": 14 } },
  "Cedar Rapids, IA": { total: 49, normalized: 24.6, appearances: 2, scores: { "Bed Bugs": 31, "Mosquitoes": 18 }, ranks: { "Bed Bugs": 20, "Mosquitoes": 33 } },
  "Memphis, TN": { total: 46, normalized: 23.1, appearances: 2, scores: { "Mosquitoes": 17, "Termites": 29 }, ranks: { "Mosquitoes": 34, "Termites": 22 } },
  "Phoenix, AZ": { total: 46, normalized: 23.1, appearances: 2, scores: { "Rodents": 13, "Termites": 33 }, ranks: { "Rodents": 38, "Termites": 18 } },
  "San Antonio, TX": { total: 40, normalized: 20.0, appearances: 2, scores: { "Mosquitoes": 14, "Termites": 26 }, ranks: { "Mosquitoes": 37, "Termites": 25 } },
  // "Raleigh-Durham, NC" mosquito data (rank 13) merged into "Raleigh, NC" above
  "South Bend, IN": { total: 33, normalized: 16.4, appearances: 2, scores: { "Bed Bugs": 24, "Rodents": 9 }, ranks: { "Bed Bugs": 27, "Rodents": 42 } },
  "Sacramento, CA": { total: 32, normalized: 15.9, appearances: 1, scores: { "Rodents": 32 }, ranks: { "Rodents": 19 } },
  "Greenville, NC": { total: 32, normalized: 15.9, appearances: 1, scores: { "Termites": 32 }, ranks: { "Termites": 19 } },
  "Tulsa, OK": { total: 32, normalized: 15.9, appearances: 2, scores: { "Mosquitoes": 19, "Termites": 13 }, ranks: { "Mosquitoes": 32, "Termites": 38 } },
  "Davenport, IA": { total: 32, normalized: 15.9, appearances: 2, scores: { "Bed Bugs": 30, "Mosquitoes": 2 }, ranks: { "Bed Bugs": 21, "Mosquitoes": 49 } },
  "Youngstown, OH": { total: 29, normalized: 14.4, appearances: 1, scores: { "Bed Bugs": 29 }, ranks: { "Bed Bugs": 22 } },
  "Charleston, SC": { total: 28, normalized: 13.8, appearances: 1, scores: { "Termites": 28 }, ranks: { "Termites": 23 } },
  "Fort Myers, FL": { total: 25, normalized: 12.3, appearances: 1, scores: { "Termites": 25 }, ranks: { "Termites": 26 } },
  "Omaha, NE": { total: 25, normalized: 12.3, appearances: 1, scores: { "Bed Bugs": 25 }, ranks: { "Bed Bugs": 26 } },
  "Columbia, SC": { total: 24, normalized: 11.8, appearances: 2, scores: { "Mosquitoes": 10, "Termites": 14 }, ranks: { "Mosquitoes": 41, "Termites": 37 } },
  "Kansas City, MO": { total: 24, normalized: 11.8, appearances: 2, scores: { "Rodents": 15, "Termites": 9 }, ranks: { "Rodents": 36, "Termites": 42 } },
  "Albuquerque, NM": { total: 24, normalized: 11.8, appearances: 2, scores: { "Mosquitoes": 16, "Rodents": 8 }, ranks: { "Mosquitoes": 35, "Rodents": 43 } },
  "Jacksonville, FL": { total: 21, normalized: 10.3, appearances: 1, scores: { "Termites": 21 }, ranks: { "Termites": 30 } },
  "Portland, OR": { total: 20, normalized: 9.7, appearances: 1, scores: { "Rodents": 20 }, ranks: { "Rodents": 31 } },
  "Austin, TX": { total: 18, normalized: 8.7, appearances: 1, scores: { "Termites": 18 }, ranks: { "Termites": 33 } },
  "Peoria, IL": { total: 18, normalized: 8.7, appearances: 1, scores: { "Bed Bugs": 18 }, ranks: { "Bed Bugs": 33 } },
  "Myrtle Beach, SC": { total: 18, normalized: 8.7, appearances: 2, scores: { "Mosquitoes": 3, "Termites": 15 }, ranks: { "Mosquitoes": 48, "Termites": 36 } },
  "Honolulu, HI": { total: 17, normalized: 8.2, appearances: 1, scores: { "Termites": 17 }, ranks: { "Termites": 34 } },
  "Louisville, KY": { total: 17, normalized: 8.2, appearances: 1, scores: { "Rodents": 17 }, ranks: { "Rodents": 34 } },
  "Toledo, OH": { total: 15, normalized: 7.2, appearances: 1, scores: { "Bed Bugs": 15 }, ranks: { "Bed Bugs": 36 } },
  "Buffalo, NY": { total: 15, normalized: 7.2, appearances: 2, scores: { "Bed Bugs": 14, "Rodents": 1 }, ranks: { "Bed Bugs": 37, "Rodents": 50 } },
  "Fort Wayne, IN": { total: 13, normalized: 6.2, appearances: 1, scores: { "Bed Bugs": 13 }, ranks: { "Bed Bugs": 38 } },
  "Waco, TX": { total: 12, normalized: 5.6, appearances: 1, scores: { "Termites": 12 }, ranks: { "Termites": 39 } },
  "Dayton, OH": { total: 8, normalized: 3.6, appearances: 1, scores: { "Bed Bugs": 8 }, ranks: { "Bed Bugs": 43 } },
  "Kansas City, KS": { total: 8, normalized: 3.6, appearances: 1, scores: { "Mosquitoes": 8 }, ranks: { "Mosquitoes": 43 } },
  "Mobile, AL": { total: 8, normalized: 3.6, appearances: 1, scores: { "Termites": 8 }, ranks: { "Termites": 43 } },
  "Madison, WI": { total: 7, normalized: 3.1, appearances: 1, scores: { "Rodents": 7 }, ranks: { "Rodents": 44 } },
  "Greensboro, NC": { total: 6, normalized: 2.6, appearances: 1, scores: { "Mosquitoes": 6 }, ranks: { "Mosquitoes": 45 } },
  "Reno, NV": { total: 6, normalized: 2.6, appearances: 1, scores: { "Rodents": 6 }, ranks: { "Rodents": 45 } },
  "Augusta, GA": { total: 5, normalized: 2.1, appearances: 1, scores: { "Mosquitoes": 5 }, ranks: { "Mosquitoes": 46 } },
  "Eau Claire, WI": { total: 5, normalized: 2.1, appearances: 1, scores: { "Rodents": 5 }, ranks: { "Rodents": 46 } },
  "Las Vegas, NV": { total: 5, normalized: 2.1, appearances: 1, scores: { "Bed Bugs": 5 }, ranks: { "Bed Bugs": 46 } },
  "Chattanooga, TN": { total: 4, normalized: 1.5, appearances: 1, scores: { "Termites": 4 }, ranks: { "Termites": 47 } },
  "Lansing, MI": { total: 3, normalized: 1.0, appearances: 1, scores: { "Bed Bugs": 3 }, ranks: { "Bed Bugs": 48 } },
  "Harrisburg, PA": { total: 3, normalized: 1.0, appearances: 1, scores: { "Termites": 3 }, ranks: { "Termites": 48 } },
  "Burlington, VT": { total: 3, normalized: 1.0, appearances: 1, scores: { "Rodents": 3 }, ranks: { "Rodents": 48 } },
  // "Davenport, IL" mosquito data (rank 49) merged into "Davenport, IA" above (Quad Cities metro)
  "Albany, NY": { total: 2, normalized: 0.5, appearances: 1, scores: { "Rodents": 2 }, ranks: { "Rodents": 49 } },
  "Savannah, GA": { total: 2, normalized: 0.5, appearances: 1, scores: { "Termites": 2 }, ranks: { "Termites": 49 } },
  "Syracuse, NY": { total: 1, normalized: 0.0, appearances: 1, scores: { "Bed Bugs": 1 }, ranks: { "Bed Bugs": 50 } },
};
