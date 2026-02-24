// ============================================================
// MOI Dashboard - Application Controller
// ============================================================

(function () {
  "use strict";

  // --- State ---
  let dataMode = "states"; // "states" | "cities"
  // ── Featured city whitelist ─────────────────────────────────
  // Only these 10 markets are surfaced in city mode.
  // city_data.js retains all 159 cities as the scoring backend.
  const CITY_WHITELIST = new Set([
    "Houston|TX",
    "Dallas|TX",
    "Fort Worth|TX",    // Dallas–FW metro
    "Los Angeles|CA",
    "Washington|DC",
    "Miami|FL",
    "Phoenix|AZ",
    "Atlanta|GA",
    "New York|NY",
    "Chicago|IL",
    "Philadelphia|PA",
  ]);
  const filterToFeatured = (data) =>
    data.filter(d => CITY_WHITELIST.has(`${d.city}|${d.state_abbr}`));

  let allRawData = [...STATE_MARKET_DATA];
  // Run growth rate validation on city data (fixes Mobile AL and any future pipeline errors)
  const { corrected: _initialCityData, flags: validationFlags, corrections: validationCorrections } = validateAndCorrectGrowthRates([...CITY_MARKET_DATA]);
  let correctedCityData = _initialCityData; // `let` so NOAA enrichment can swap in enriched copy
  if (validationFlags.length > 0) {
    console.group("📋 MOI Growth Rate Validation");
    validationFlags.forEach(f => console.warn(f.recommendation, f));
    console.groupEnd();
  }
  if (validationCorrections.length > 0) {
    console.group("✏️ Corrections Applied");
    validationCorrections.forEach(c => console.log(`${c.city}, ${c.state}: pop ${c.original_population.toLocaleString()} → ${c.corrected_population.toLocaleString()}, growth ${c.original_growth_pct}% → ${c.corrected_growth_pct}%`));
    console.groupEnd();
  }
  let engine = new MOIEngine(allRawData);
  let currentYear = 2025;
  let currentData = [];
  let selectedState = null;
  let selectedCity = null; // "CityName, ST" format
  let sortCol = "rank";
  let sortDir = "asc";
  let viewMode = "composite"; // composite | component
  let usGeoData = null;

  // Chart instances — Executive Intelligence
  let oppBubbleChart = null;
  let satGaugeChart = null;
  let oppGapBarChart = null;
  let acqTargetChart = null;
  let histogramChart = null;
  // Chart instances — Pest Intelligence
  let pestGrowthBubbleChart = null;
  let pestRankingChart = null;

  // --- DOM Refs ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Mode Helpers ---
  function isStateMode() { return dataMode === "states"; }
  function getSelectedKey() { return isStateMode() ? selectedState : selectedCity; }
  function getItemKey(d) { return isStateMode() ? d.abbr : (d.city + ", " + d.state_abbr); }
  function getItemLabel(d) { return isStateMode() ? d.abbr : d.city; }
  function getItemName(d) { return isStateMode() ? d.state : (d.city + ", " + d.state_abbr); }
  function getItemCount() { return isStateMode() ? 50 : currentData.length; }
  function getItemTypeLabel(plural) { return isStateMode() ? (plural ? "States" : "State") : (plural ? "Cities" : "City"); }
  function getActivePestData() {
    if (isStateMode()) return PEST_PRESSURE_DATA;
    return (typeof CITY_PEST_PRESSURE_DATA !== "undefined") ? CITY_PEST_PRESSURE_DATA : {};
  }

  // --- Metric Definitions (user-friendly) ---
  const METRIC_DEFINITIONS = {
    rank: "Where this market ranks overall. #1 is the best place to expand into.",
    moi: "Overall opportunity score from 0 to 100. Higher means better expansion potential.",
    mss: "How large the market is. Higher score = more potential customers in the area.",
    cds: "How much room there is for your business. A high score means fewer pest control companies are fighting over customers in that area.",
    prs: "How much pest demand exists due to climate and older housing. Higher score = more pest problems to solve.",
    gts: "How fast the population is growing. Higher score = more new homes and customers moving in.",
    population: "Total number of residents. Bigger populations mean a larger pool of potential customers.",
    pest_firm_count: "Number of pest control businesses already operating in this market. For cities, this is counted by searching Google Maps for pest control companies within the city boundary — the same way a customer would search for a local exterminator. For states, it's an aggregate count from the same method across all major cities. Think of it as: if you searched 'pest control near me' in that city, roughly how many businesses would show up as competitors?",
    comp_density: "How many pest control firms per 100,000 residents. Lower means less competition for you.",
    histogram: "Shows how many markets fall into each score range. Helps you see where the opportunities cluster.",
    pestRanking: "Markets ranked by how often they appear in Orkin's Top 50 lists for mosquitoes, bed bugs, termites, and rodents.",
    pestHeatmap: "Breaks down pest activity by type. See which markets have the highest demand for each pest category.",
    oppBubble: "Shows MOI score vs. firm density. Bubbles in the upper-left are ideal: high opportunity with low competition. Bubble size represents market population.",
    satGauge: "Rates the selected market's saturation level. ENTER means low competition and high upside. EXIT means the market is oversupplied.",
    oppGapBar: "Measures the gap between opportunity and market saturation. Green bars are underserved markets. Red bars are oversupplied.",
    acqTarget: "Markets that combine high MOI with high competition — best candidates for entering through acquiring an existing operator.",
    pestGrowthBubble: "Combines pest pressure, population growth, and MOI to find fast-growing areas with high pest demand and strong fundamentals.",
    expansionMap: "Compare any two states head-to-head across all key metrics. Green values indicate the winning state for each metric. Also shows a geographic MOI heat map when no comparison is active.",
    compDensityTable: "Ranked list of underserved markets — those with fewer than 50 pest control firms per 100,000 residents — where organic entry is most viable.",
  };

  // --- Initialize ---
  async function init() {
    currentYear = engine.getAvailableYears()[0]; // always latest available year
    bindEvents();
    // One-time scroll guard: hide map tooltip when user scrolls
    document.addEventListener("scroll", () => {
      const tip = $("#mapTooltip");
      if (tip) tip.classList.remove("visible");
    }, { passive: true });
    initInfoTooltips();
    await loadMapData();
    refresh();
    // Auto-select top item
    if (currentData.length > 0) {
      selectState(currentData[0].abbr);
    }

    // NOAA climate enrichment — non-blocking background fetch.
    // First visit: fetches NOAA CDO data per city, stores in localStorage (30-day TTL).
    // Subsequent visits: instant from cache. Re-renders silently if city mode is active.
    if (typeof enrichWithNOAAClimate === "function") {
      enrichWithNOAAClimate(correctedCityData).then(enriched => {
        correctedCityData = enriched;
        // If user is currently in city mode, rebuild engine and re-render with real climate data
        if (!isStateMode()) {
          allRawData = filterToFeatured(correctedCityData);
          engine = new MOIEngine(allRawData);
          refresh();
          if (selectedCity) selectCity(selectedCity);
        }
      }).catch(err => {
        console.warn("NOAA climate enrichment skipped:", err.message);
      });
    }
  }

  // --- Events ---
  function bindEvents() {
    // Data mode toggle
    $$(".data-mode-toggle button").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.mode === dataMode) return;
        $$(".data-mode-toggle button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        switchDataMode(btn.dataset.mode);
      });
    });

    // View toggle
    $$(".view-toggle button").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".view-toggle button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        viewMode = btn.dataset.view;
        renderTable();
      });
    });

    // Table sort
    $$("#stateTable thead th").forEach(th => {
      th.addEventListener("click", (e) => {
        if (e.target.closest(".info-icon")) return; // Don't sort when clicking info icon
        const col = th.dataset.col;
        if (!col) return;
        if (sortCol === col) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortCol = col;
          sortDir = col === "state" ? "asc" : "desc";
        }
        renderTable();
      });
    });

    // Table search
    $("#tableSearch").addEventListener("input", () => renderTable());
  }

  // --- Info Tooltips ---
  function initInfoTooltips() {
    const tip = document.createElement("div");
    tip.className = "info-tooltip";
    tip.id = "infoTooltip";
    document.body.appendChild(tip);

    document.addEventListener("mouseover", (e) => {
      const icon = e.target.closest(".info-icon");
      if (!icon) return;
      const metric = icon.dataset.metric;
      const def = METRIC_DEFINITIONS[metric];
      if (!def) return;
      tip.textContent = def;
      tip.classList.add("visible");
      const rect = icon.getBoundingClientRect();
      tip.style.left = (rect.left + rect.width / 2) + "px";
      tip.style.top = (rect.bottom + 6) + "px";
      // Bounds check
      requestAnimationFrame(() => {
        const tipRect = tip.getBoundingClientRect();
        if (tipRect.right > window.innerWidth - 10) {
          tip.style.left = (window.innerWidth - tipRect.width - 10) + "px";
        }
        if (tipRect.bottom > window.innerHeight - 10) {
          tip.style.top = (rect.top - tipRect.height - 6) + "px";
        }
      });
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(".info-icon")) {
        tip.classList.remove("visible");
      }
    });
  }

  // --- Switch Data Mode ---
  function switchDataMode(mode) {
    dataMode = mode;
    selectedState = null;
    selectedCity = null;


    if (isStateMode()) {
      allRawData = [...STATE_MARKET_DATA];
    } else {
      allRawData = filterToFeatured(correctedCityData);
    }

    engine = new MOIEngine(allRawData);
    currentYear = engine.getAvailableYears()[0]; // always latest available year

    // Reset sort
    sortCol = "rank";
    sortDir = "asc";

    // Update UI text
    $("#tableSearch").placeholder = isStateMode() ? "Search state..." : "Search city...";
    $("#mapSubtitle").textContent = isStateMode()
      ? "Click a state to drill into its expansion profile"
      : "Click a city to drill into its expansion profile";

    // Update table "State" column header
    const stateHeader = $('#stateTable thead th[data-col="state"]');
    if (stateHeader) stateHeader.firstChild.textContent = (isStateMode() ? "State " : "City ");

    // Update comparison card title and dropdown labels
    const cmpTitle = $("#compareCardTitle");
    const cmpSub = $("#compareCardSubtitle");
    if (isStateMode()) {
      if (cmpTitle) cmpTitle.childNodes[0].textContent = "State Comparison ";
      if (cmpSub) cmpSub.textContent = "Compare two states side-by-side across all key metrics";
    } else {
      if (cmpTitle) cmpTitle.childNodes[0].textContent = "City Comparison ";
      if (cmpSub) cmpSub.textContent = "Compare two cities side-by-side across all key metrics";
    }

    // Reset comparison dropdowns on mode switch
    const cmpA = $("#compareStateA");
    const cmpB = $("#compareStateB");
    if (cmpA) cmpA.innerHTML = isStateMode() ? '<option value="">Select State A</option>' : '<option value="">Select City A</option>';
    if (cmpB) cmpB.innerHTML = isStateMode() ? '<option value="">Select State B</option>' : '<option value="">Select City B</option>';

    refresh();

    // Auto-select top item
    if (currentData.length > 0) {
      if (isStateMode()) selectState(currentData[0].abbr);
      else selectCity(getItemKey(currentData[0]));
    }
  }

  // --- Refresh all ---
  function refresh() {
    currentData = engine.compute(currentYear);
    renderTable();
    renderMap();
    renderMapLegend();
    // Executive Intelligence
    renderOppBubbleChart();
    renderOppGapBarChart();
    renderAcqTargetChart();
    renderHistogram();
    renderSatGauge(null);
    // Pest Intelligence
    renderPestGrowthBubbleChart();
    renderPestRankingChart();
    renderPestHeatmap();
    renderCompDensityTable();
    renderExpansionMiniMap();
    $("#tableTitle").textContent = `${getItemCount()} ${getItemTypeLabel(true)}`;
    const tableSubEl = $("#tableSubtitle");
    if (tableSubEl) tableSubEl.textContent = isStateMode()
      ? "All 50 states ranked by composite MOI score"
      : "10 priority cities ranked by composite MOI score";
  }

  // --- Hero Card ---
  function updateHeroCard(itemData) {
    if (!itemData) {
      $("#heroPlaceholder").style.display = "flex";
      $("#heroContent").style.display = "none";
      return;
    }

    $("#heroPlaceholder").style.display = "none";
    $("#heroContent").style.display = "block";

    const band = MOIEngine.getMOIBand(itemData.moi);

    if (isStateMode()) {
      $("#heroStateLabel").textContent = itemData.abbr;
      $("#heroStateFull").textContent = itemData.state;
    } else {
      $("#heroStateLabel").textContent = itemData.state_abbr;
      $("#heroStateFull").textContent = itemData.city;
    }

    $("#heroMOI").textContent = itemData.moi.toFixed(1);
    $("#heroMOI").style.color = band.color;

    const heroCard = $(".hero-score-card");
    heroCard.style.borderTopColor = band.color;
    heroCard.style.setProperty("--hero-accent", band.color);
    const styleTag = document.getElementById("hero-dynamic-style") || document.createElement("style");
    styleTag.id = "hero-dynamic-style";
    styleTag.textContent = `.hero-score-card::before { background: ${band.color} !important; }`;
    document.head.appendChild(styleTag);

    const bandEl = $("#heroBand");
    bandEl.textContent = band.label;
    bandEl.style.background = band.bg;
    bandEl.style.color = band.textColor;

    $("#heroRank").innerHTML = `Rank: <span>${itemData.rank}</span> of ${getItemCount()}`;

    $("#heroMSS").textContent = itemData.mss.toFixed(1);
    $("#heroCDS").textContent = itemData.cds.toFixed(1);
    $("#heroPRS").textContent = itemData.prs.toFixed(1);
    $("#heroGTS").textContent = itemData.gts.toFixed(1);

    // Animate
    $("#heroContent").classList.remove("animate-scale");
    void $("#heroContent").offsetWidth;
    $("#heroContent").classList.add("animate-scale");
  }

  // --- Select State ---
  function selectState(abbr) {
    selectedState = abbr;
    const stateData = currentData.find(d => d.abbr === abbr);
    updateHeroCard(stateData);
    renderBreakdown(stateData);
    renderPestBreakdown(abbr);
    renderTable();
    highlightMapState(abbr);
    renderSatGauge(stateData);
    highlightChartPoint();
    renderHistogram();
  }

  // --- Select City ---
  function selectCity(cityKey) {
    selectedCity = cityKey;
    const cityData = currentData.find(d => (d.city + ", " + d.state_abbr) === cityKey);
    updateHeroCard(cityData);
    renderBreakdown(cityData);
    renderPestBreakdown(cityKey);
    renderTable();
    highlightMapCity(cityKey);
    renderSatGauge(cityData);
    highlightChartPoint();
    renderHistogram();
  }

  // --- Map ---
  async function loadMapData() {
    try {
      const response = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
      usGeoData = await response.json();
    } catch (e) {
      console.error("Failed to load map data:", e);
      $("#us-map").innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Map data unavailable - please check your internet connection.</p>';
    }
  }

  function renderMap() {
    if (!usGeoData) return;
    if (isStateMode()) {
      renderStateChoropleth();
    } else {
      renderCityBubbleMap();
    }
  }

  function renderStateChoropleth() {
    const container = $("#us-map");
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight || 320;

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Zoomable group
    const zoomGroup = svg.append("g");

    const projection = d3.geoAlbersUsa()
      .fitSize([width - 20, height - 20], topojson.feature(usGeoData, usGeoData.objects.states));

    const path = d3.geoPath().projection(projection);
    const states = topojson.feature(usGeoData, usGeoData.objects.states).features;

    const dataByFips = {};
    currentData.forEach(d => {
      const fips = STATE_FIPS[d.abbr];
      if (fips) dataByFips[fips] = d;
    });

    const tooltip = $("#mapTooltip");
    tooltip.classList.remove("visible"); // reset any stuck tooltip on re-render

    zoomGroup.selectAll("path")
      .data(states)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const fips = String(d.id).padStart(2, "0");
        const sd = dataByFips[fips];
        return sd ? MOIEngine.getMOIColorScale(sd.moi) : "#e2e8f0";
      })
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1)
      .attr("class", "map-state")
      .style("cursor", "pointer")
      .style("transition", "opacity 0.2s")
      .on("mouseover", function (event, d) {
        const fips = String(d.id).padStart(2, "0");
        const sd = dataByFips[fips];
        if (!sd) return;

        d3.select(this).attr("stroke", "#1e293b").attr("stroke-width", 2).raise();

        tooltip.classList.add("visible");
        tooltip.querySelector(".tt-state").textContent = sd.state;
        const moiEl = tooltip.querySelector(".tt-moi");
        moiEl.textContent = sd.moi.toFixed(1);
        moiEl.style.color = MOIEngine.getMOIColor(sd.moi);
        tooltip.querySelector(".tt-pop").textContent = sd.population.toLocaleString();
        tooltip.querySelector(".tt-rank").textContent = "#" + sd.rank + " of 50";
        tooltip.querySelector(".tt-comp").textContent = sd.comp_density.toFixed(1) + " firms per 100K";
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 10) + "px";
        const rect = tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          tooltip.style.left = (event.clientX - rect.width - 16) + "px";
        }
        if (rect.bottom > window.innerHeight) {
          tooltip.style.top = (event.clientY - rect.height - 10) + "px";
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#cbd5e1").attr("stroke-width", 1);
        tooltip.classList.remove("visible");
      })
      .on("click", function (event, d) {
        const fips = String(d.id).padStart(2, "0");
        const sd = dataByFips[fips];
        if (sd) selectState(sd.abbr);
      });

    // Zoom & Pan — scale stroke widths inversely to keep borders crisp
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        const k = event.transform.k;
        zoomGroup.selectAll(".map-state")
          .attr("stroke-width", d => {
            const fips = String(d.id).padStart(2, "0");
            const isSelected = selectedState && STATE_FIPS[selectedState] === fips;
            return (isSelected ? 2 : 1) / k;
          });
      });
    svg.call(zoom);

    // Hide tooltip when mouse leaves the entire map area
    svg.on("mouseleave", () => tooltip.classList.remove("visible"));

    svg.append("text")
      .attr("x", width - 8)
      .attr("y", height - 8)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("fill", "#94a3b8")
      .text("Scroll to zoom \u00b7 drag to pan");

    if (selectedState) highlightMapState(selectedState);
  }

  function renderCityBubbleMap() {
    const container = $("#us-map");
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight || 320;

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Zoomable group — all map content goes inside this
    const zoomGroup = svg.append("g");

    const projection = d3.geoAlbersUsa()
      .fitSize([width - 20, height - 20], topojson.feature(usGeoData, usGeoData.objects.states));

    const path = d3.geoPath().projection(projection);
    const states = topojson.feature(usGeoData, usGeoData.objects.states).features;

    // Light gray state outlines as background
    zoomGroup.selectAll("path")
      .data(states)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#f1f5f9")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 0.5);

    // Population scale for bubble size
    const popExtent = d3.extent(currentData, d => d.population);
    const radiusScale = d3.scaleSqrt().domain(popExtent).range([3, 16]);

    const tooltip = $("#mapTooltip");
    tooltip.classList.remove("visible"); // reset any stuck tooltip on re-render

    // Sort by population descending so smaller bubbles draw on top
    const sortedData = [...currentData].sort((a, b) => b.population - a.population);

    const cityGroup = zoomGroup.append("g");

    cityGroup.selectAll("circle")
      .data(sortedData)
      .enter()
      .append("circle")
      .attr("class", "city-bubble")
      .attr("cx", d => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[0] : -100;
      })
      .attr("cy", d => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[1] : -100;
      })
      .attr("r", d => radiusScale(d.population))
      .attr("fill", d => MOIEngine.getMOIColorScale(d.moi))
      .attr("fill-opacity", 0.75)
      .attr("stroke", d => {
        const key = d.city + ", " + d.state_abbr;
        return key === selectedCity ? "#0f172a" : "#fff";
      })
      .attr("stroke-width", d => {
        const key = d.city + ", " + d.state_abbr;
        return key === selectedCity ? 2.5 : 1;
      })
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#1e293b").attr("stroke-width", 2.5).raise();

        tooltip.classList.add("visible");
        tooltip.querySelector(".tt-state").textContent = d.city + ", " + d.state_abbr;
        const moiEl = tooltip.querySelector(".tt-moi");
        moiEl.textContent = d.moi.toFixed(1);
        moiEl.style.color = MOIEngine.getMOIColor(d.moi);
        tooltip.querySelector(".tt-pop").textContent = d.population.toLocaleString();
        tooltip.querySelector(".tt-rank").textContent = "#" + d.rank + " of " + currentData.length;
        tooltip.querySelector(".tt-comp").textContent = d.comp_density.toFixed(1) + " firms per 100K";
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 10) + "px";
        const rect = tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          tooltip.style.left = (event.clientX - rect.width - 16) + "px";
        }
        if (rect.bottom > window.innerHeight) {
          tooltip.style.top = (event.clientY - rect.height - 10) + "px";
        }
      })
      .on("mouseout", function (event, d) {
        const key = d.city + ", " + d.state_abbr;
        d3.select(this)
          .attr("stroke", key === selectedCity ? "#0f172a" : "#fff")
          .attr("stroke-width", key === selectedCity ? 2.5 : 1);
        tooltip.classList.remove("visible");
      })
      .on("click", function (event, d) {
        selectCity(d.city + ", " + d.state_abbr);
      });

    // Labels for top 10 cities by MOI
    const topCities = [...currentData].sort((a, b) => b.moi - a.moi).slice(0, 10);
    cityGroup.selectAll(".city-label")
      .data(topCities)
      .enter()
      .append("text")
      .attr("class", "city-label")
      .attr("x", d => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[0] : -100;
      })
      .attr("y", d => {
        const coords = projection([d.lng, d.lat]);
        return coords ? coords[1] - radiusScale(d.population) - 4 : -100;
      })
      .text(d => d.city)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-weight", "600")
      .attr("fill", "#334155")
      .style("pointer-events", "none");

    // Zoom & Pan behavior — aggressively shrink bubbles so zooming in reveals overlapping cities
    const zoom = d3.zoom()
      .scaleExtent([1, 12])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        const k = event.transform.k;
        const shrink = Math.pow(k, 1.4); // aggressive shrink factor
        cityGroup.selectAll(".city-bubble")
          .attr("r", d => radiusScale(d.population) / shrink)
          .attr("stroke-width", d => {
            const key = d.city + ", " + d.state_abbr;
            return (key === selectedCity ? 2.5 : 1) / k;
          });
        cityGroup.selectAll(".city-label")
          .attr("font-size", (8 / k) + "px")
          .attr("y", d => {
            const coords = projection([d.lng, d.lat]);
            return coords ? coords[1] - radiusScale(d.population) / shrink - 3 / k : -100;
          });
      });

    svg.call(zoom);

    // Hide tooltip when mouse leaves the entire map area
    svg.on("mouseleave", () => tooltip.classList.remove("visible"));

    // Add zoom hint text
    svg.append("text")
      .attr("x", width - 8)
      .attr("y", height - 8)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("fill", "#94a3b8")
      .text("Scroll to zoom \u00b7 drag to pan");
  }

  function highlightMapState(abbr) {
    const fips = STATE_FIPS[abbr];
    d3.selectAll(".map-state")
      .attr("stroke", function (d) {
        return String(d.id).padStart(2, "0") === fips ? "#1e293b" : "#cbd5e1";
      })
      .attr("stroke-width", function (d) {
        return String(d.id).padStart(2, "0") === fips ? 2 : 1;
      });
  }

  function highlightMapCity(cityKey) {
    d3.selectAll(".city-bubble")
      .attr("stroke", function (d) {
        const key = d.city + ", " + d.state_abbr;
        return key === cityKey ? "#0f172a" : "#fff";
      })
      .attr("stroke-width", function (d) {
        const key = d.city + ", " + d.state_abbr;
        return key === cityKey ? 2.5 : 1;
      });
  }

  function renderMapLegend() {
    const legend = $("#mapLegend");
    const items = [
      { label: "80-100", color: "#064e3b" },
      { label: "60-79", color: "#047857" },
      { label: "40-59", color: "#fbbf24" },
      { label: "20-39", color: "#ea580c" },
      { label: "0-19", color: "#991b1b" }
    ];
    legend.innerHTML = items.map(i =>
      `<div class="legend-item"><div class="legend-swatch" style="background:${i.color}"></div>${i.label}</div>`
    ).join("");
  }

  // --- Table ---
  function renderTable() {
    const search = ($("#tableSearch").value || "").toLowerCase();
    let data = [...currentData];

    if (search) {
      if (isStateMode()) {
        data = data.filter(d =>
          d.state.toLowerCase().includes(search) ||
          d.abbr.toLowerCase().includes(search)
        );
      } else {
        data = data.filter(d =>
          d.city.toLowerCase().includes(search) ||
          d.state_abbr.toLowerCase().includes(search) ||
          d.state_name.toLowerCase().includes(search)
        );
      }
    }

    // Sort
    data.sort((a, b) => {
      let va, vb;
      if (sortCol === "state") {
        va = isStateMode() ? a.state : a.city;
        vb = isStateMode() ? b.state : b.city;
      } else {
        va = a[sortCol];
        vb = b[sortCol];
      }
      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    // Update sort indicators
    $$("#stateTable thead th").forEach(th => {
      th.classList.toggle("sorted", th.dataset.col === sortCol);
      const icon = th.querySelector(".sort-icon");
      if (icon && th.dataset.col === sortCol) {
        icon.textContent = sortDir === "asc" ? "▲" : "▼";
      }
    });

    // Show/hide sub-score columns based on view mode
    const subScoreCols = ["mss", "cds", "prs", "gts"];
    $$("#stateTable thead th").forEach(th => {
      if (subScoreCols.includes(th.dataset.col)) {
        th.style.display = viewMode === "component" ? "" : "none";
      }
    });

    const tbody = $("#tableBody");
    const maxMOI = Math.max(...currentData.map(d => d.moi));

    const selKey = getSelectedKey();

    tbody.innerHTML = data.map(d => {
      const itemKey = getItemKey(d);
      const isTop5 = d.rank <= 5;
      const isSelected = itemKey === selKey;
      const moiColor = MOIEngine.getMOIColor(d.moi);
      const barWidth = (d.moi / maxMOI) * 100;

      const rowClasses = [
        isTop5 ? "top-5" : "",
        isSelected ? "selected" : ""
      ].filter(Boolean).join(" ");

      const formatPop = d.population.toLocaleString();
      const displayName = isStateMode() ? d.state : d.city;
      const displayTag = isStateMode() ? d.abbr : d.state_abbr;
      const firmCount = d.pest_firm_count.toLocaleString();
      const firmDisplay = (!isStateMode() && d.pest_firm_truncated) ? firmCount + "+" : firmCount;
      const hideStyle = viewMode === "component" ? "" : "display:none;";

      return `<tr class="${rowClasses}" data-item-key="${itemKey}">
        <td><span class="rank-badge${isTop5 ? " top" : ""}">${d.rank}</span></td>
        <td><strong>${displayName}</strong> <span style="color:var(--text-muted);font-size:0.7rem;">${displayTag}</span></td>
        <td>
          <div class="moi-bar-cell">
            <span class="moi-cell" style="color:${moiColor};min-width:42px;">${d.moi.toFixed(1)}</span>
            <div style="flex:1;background:rgba(0,0,0,0.06);border-radius:3px;height:6px;">
              <div class="moi-bar" style="width:${barWidth}%;background:${moiColor};"></div>
            </div>
          </div>
        </td>
        <td class="score-cell" style="${hideStyle}">${d.mss.toFixed(1)}</td>
        <td class="score-cell" style="${hideStyle}">${d.cds.toFixed(1)}</td>
        <td class="score-cell" style="${hideStyle}">${d.prs.toFixed(1)}</td>
        <td class="score-cell" style="${hideStyle}">${d.gts.toFixed(1)}</td>
        <td>${formatPop}</td>
        <td>${firmDisplay}</td>
        <td>${d.comp_density.toFixed(1)}</td>
      </tr>`;
    }).join("");

    // Row click handlers
    $$("#tableBody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const key = tr.dataset.itemKey;
        if (!key) return;
        if (isStateMode()) selectState(key);
        else selectCity(key);
      });
    });
  }

  // --- Charts ---
  function getChartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(255,255,255,0.96)",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          titleColor: "#0f172a",
          bodyColor: "#475569",
          titleFont: { size: 13, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.06)", drawBorder: false },
          ticks: { color: "#64748b", font: { size: 11 } }
        },
        y: {
          grid: { color: "rgba(0,0,0,0.06)", drawBorder: false },
          ticks: { color: "#64748b", font: { size: 11 } }
        }
      }
    };
  }

  // ============================================================
  // EXECUTIVE INTELLIGENCE CHARTS
  // ============================================================

  // Chart 1: Opportunity vs Competition Bubble
  function renderOppBubbleChart() {
    const canvas = $("#oppBubbleChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (oppBubbleChart) oppBubbleChart.destroy();

    const selKey = getSelectedKey();
    const popExtent = d3.extent(currentData, d => d.population);
    const rScale = d3.scaleSqrt().domain(popExtent).range([3, 14]);

    // Build data with bubble radius
    const all = currentData.map(d => ({
      x: d.comp_density,
      y: d.moi,
      r: rScale(d.population),
      label: getItemLabel(d),
      key: getItemKey(d),
      name: getItemName(d),
      moi: d.moi,
      pop: d.population,
      cds: d.cds,
      comp_density: d.comp_density
    }));

    // Determine top 15 by MOI
    const sorted = [...all].sort((a, b) => b.moi - a.moi);
    const topKeys = new Set(sorted.slice(0, 15).map(d => d.key));
    if (selKey) topKeys.add(selKey);

    // Medians for quadrant lines
    const medX = [...all].sort((a, b) => a.x - b.x)[Math.floor(all.length / 2)].x;
    const medY = [...all].sort((a, b) => a.y - b.y)[Math.floor(all.length / 2)].y;

    // Split into background (tiny faded) and foreground (labeled)
    const bg = all.filter(d => !topKeys.has(d.key)).map(d => ({ ...d, r: 2 }));
    const fg = all.filter(d => topKeys.has(d.key));

    oppBubbleChart = new Chart(ctx, {
      type: "bubble",
      data: {
        datasets: [
          {
            label: "Other markets",
            data: bg,
            backgroundColor: "rgba(148,163,184,0.25)",
            borderColor: "transparent",
            borderWidth: 0,
            hoverRadius: 4
          },
          {
            label: "Top markets",
            data: fg,
            backgroundColor: fg.map(d => {
              const c = MOIEngine.getMOIColor(d.moi);
              return d.key === selKey ? c : c + "CC";
            }),
            borderColor: fg.map(d => d.key === selKey ? "#0f172a" : "rgba(255,255,255,0.8)"),
            borderWidth: fg.map(d => d.key === selKey ? 2.5 : 1),
            hoverRadius: 2
          }
        ]
      },
      options: {
        ...getChartDefaults(),
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => items[0].raw.name,
              label: (item) => {
                const d = item.raw;
                return [
                  `MOI Score: ${d.moi.toFixed(1)}`,
                  `Firms per 100K: ${d.comp_density.toFixed(1)}`,
                  `Population: ${d.pop.toLocaleString()}`,
                  `Opportunity Gap: ${d.cds.toFixed(1)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: { display: true, text: "Firms per 100K (fewer = less competition) →", color: "#64748b", font: { size: 11, weight: "600" } }
          },
          y: {
            ...getChartDefaults().scales.y,
            title: { display: true, text: "← MOI Score (higher = better opportunity)", color: "#64748b", font: { size: 11, weight: "600" } },
            min: 0, max: 105
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const dsIdx = elements[0].datasetIndex;
            const ds = dsIdx === 0 ? bg : fg;
            const key = ds[elements[0].index].key;
            if (isStateMode()) selectState(key);
            else selectCity(key);
          }
        }
      },
      plugins: [{
        id: "oppBubbleQuadrants",
        afterDraw(chart) {
          const { ctx, scales: { x, y } } = chart;
          const xPx = x.getPixelForValue(medX);
          const yPx = y.getPixelForValue(medY);

          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(0,0,0,0.10)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(xPx, y.top); ctx.lineTo(xPx, y.bottom); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x.left, yPx); ctx.lineTo(x.right, yPx); ctx.stroke();
          ctx.setLineDash([]);

          // Quadrant labels
          ctx.font = "600 10px Inter, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.textAlign = "center";
          ctx.fillText("EXPANSION PRIORITY", (x.left + xPx) / 2, y.top + 16);
          ctx.fillText("ACQUISITION TARGET", (xPx + x.right) / 2, y.top + 16);
          ctx.fillText("TEST MARKET", (x.left + xPx) / 2, y.bottom - 8);
          ctx.fillText("AVOID", (xPx + x.right) / 2, y.bottom - 8);

          // Labels on foreground bubbles
          const fgMeta = chart.getDatasetMeta(1);
          ctx.font = "600 9px Inter, sans-serif";
          fg.forEach((d, i) => {
            if (!fgMeta.data[i]) return;
            const pt = fgMeta.data[i];
            ctx.fillStyle = d.key === selKey ? "#0f172a" : "rgba(0,0,0,0.5)";
            ctx.textAlign = "center";
            ctx.fillText(d.label, pt.x, pt.y - d.r - 4);
          });

          ctx.restore();
        }
      }]
    });
  }

  // Chart 2: Saturation Risk Meter (Gauge)
  function renderSatGauge(itemData) {
    const container = $("#gaugeContainer");
    const placeholder = $("#gaugePlaceholder");
    const content = $("#gaugeContent");
    const zoneLabel = $("#gaugeZoneLabel");
    const densityVal = $("#gaugeDensityValue");
    if (!container) return;

    if (!itemData) {
      placeholder.style.display = "flex";
      content.style.display = "none";
      if (satGaugeChart) { satGaugeChart.destroy(); satGaugeChart = null; }
      return;
    }

    placeholder.style.display = "none";
    content.style.display = "block";

    const density = itemData.comp_density;
    // Zone thresholds and colors
    const zones = [
      { max: 8, label: "ENTER", color: "#059669", desc: "Low competition — ideal for organic entry" },
      { max: 18, label: "ACQUIRE", color: "#2563eb", desc: "Moderate density — consider acquiring" },
      { max: 30, label: "DEFEND", color: "#d97706", desc: "Competitive — protect existing position" },
      { max: 999, label: "EXIT", color: "#dc2626", desc: "Oversaturated — exit or consolidate" }
    ];
    const zone = zones.find(z => density <= z.max);

    zoneLabel.textContent = zone.label;
    zoneLabel.style.color = zone.color;
    densityVal.textContent = density.toFixed(1) + " firms per 100K";

    // Gauge arc data: [ENTER, ACQUIRE, DEFEND, EXIT]
    const arcValues = [8, 10, 12, 20]; // zone widths on 0-50 scale
    const arcColors = ["#059669", "#2563eb", "#d97706", "#dc2626"];

    if (satGaugeChart) satGaugeChart.destroy();
    const canvas = $("#satGaugeChart");
    if (!canvas) return;

    satGaugeChart = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        datasets: [{
          data: arcValues,
          backgroundColor: arcColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        cutout: "75%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      },
      plugins: [{
        id: "gaugeNeedle",
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          const cx = (chartArea.left + chartArea.right) / 2;
          const cy = chartArea.bottom - 4;
          const outerR = (chartArea.right - chartArea.left) / 2;
          const needleLen = outerR * 0.7;

          // Map density (0-50) to angle (-PI to 0)
          const clampedDensity = Math.min(Math.max(density, 0), 50);
          const angle = -Math.PI + (clampedDensity / 50) * Math.PI;

          ctx.save();
          ctx.translate(cx, cy);
          // Needle
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * needleLen, Math.sin(angle) * needleLen);
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.stroke();
          // Center dot
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#0f172a";
          ctx.fill();
          ctx.restore();
        }
      }]
    });
  }

  // Chart 3: Opportunity Gap Bar (horizontal)
  function renderOppGapBarChart() {
    const canvas = $("#oppGapBarChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (oppGapBarChart) oppGapBarChart.destroy();

    const selKey = getSelectedKey();

    // gap = moi - (100 - cds): positive = underserved, negative = oversaturated
    const all = currentData.map(d => ({
      gap: d.moi - (100 - d.cds),
      label: getItemLabel(d),
      key: getItemKey(d),
      name: getItemName(d),
      moi: d.moi,
      cds: d.cds
    }));

    // Top 15 (highest gap) + bottom 5 (lowest gap), deduplicated
    const byGap = [...all].sort((a, b) => b.gap - a.gap);
    const top15 = byGap.slice(0, 15);
    const bottom5 = byGap.slice(-5);
    const seenKeys = new Set(top15.map(d => d.key));
    const combined = [...top15];
    bottom5.forEach(d => { if (!seenKeys.has(d.key)) combined.push(d); });
    combined.sort((a, b) => b.gap - a.gap);

    // Dynamic height: 22px per bar + 60px for axes/padding
    canvas.parentElement.style.minHeight = Math.max(280, combined.length * 22 + 60) + "px";

    oppGapBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: combined.map(d => d.label),
        datasets: [{
          data: combined.map(d => d.gap),
          backgroundColor: combined.map(d => {
            if (d.key === selKey) return "#0f172a";
            return d.gap >= 0 ? "rgba(5,150,105,0.75)" : "rgba(220,38,38,0.65)";
          }),
          borderRadius: 3,
          barThickness: 14
        }]
      },
      options: {
        ...getChartDefaults(),
        indexAxis: "y",
        animation: { duration: 600 },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => combined[items[0].dataIndex].name,
              label: (item) => {
                const d = combined[item.dataIndex];
                return [
                  `Opportunity Gap: ${d.gap >= 0 ? "+" : ""}${d.gap.toFixed(1)}`,
                  `MOI: ${d.moi.toFixed(1)}`,
                  `Opportunity Gap Score: ${d.cds.toFixed(1)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: { display: true, text: "← Oversaturated | Underserved →", color: "#64748b", font: { size: 11, weight: "600" } },
            grid: { color: (ctx) => ctx.tick.value === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.06)" }
          },
          y: {
            ...getChartDefaults().scales.y,
            ticks: { color: "#64748b", font: { size: 10 } }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const key = combined[elements[0].index].key;
            if (isStateMode()) selectState(key);
            else selectCity(key);
          }
        }
      }
    });
  }

  // Chart 4: Acquisition Target Finder (horizontal bar)
  function renderAcqTargetChart() {
    const canvas = $("#acqTargetChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (acqTargetChart) acqTargetChart.destroy();

    const selKey = getSelectedKey();

    // Medians
    const moiVals = currentData.map(d => d.moi).sort((a, b) => a - b);
    const densVals = currentData.map(d => d.comp_density).sort((a, b) => a - b);
    const medMoi = moiVals[Math.floor(moiVals.length / 2)];
    const medDens = densVals[Math.floor(densVals.length / 2)];

    // Filter: high MOI + high competition → acquire existing operator
    const targets = currentData
      .filter(d => d.moi >= medMoi && d.comp_density >= medDens)
      .map(d => ({
        moi: d.moi,
        density: d.comp_density,
        label: getItemLabel(d),
        key: getItemKey(d),
        name: getItemName(d)
      }))
      .sort((a, b) => b.moi - a.moi)
      .slice(0, 15);

    // Dynamic height: 22px per bar + 60px for axes/padding
    canvas.parentElement.style.minHeight = Math.max(280, targets.length * 22 + 60) + "px";

    acqTargetChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: targets.map(d => d.label),
        datasets: [{
          data: targets.map(d => d.moi),
          backgroundColor: targets.map(d => {
            if (d.key === selKey) return "#0f172a";
            return MOIEngine.getMOIColor(d.moi) + "CC";
          }),
          borderRadius: 3,
          barThickness: 14
        }]
      },
      options: {
        ...getChartDefaults(),
        indexAxis: "y",
        animation: { duration: 600 },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => targets[items[0].dataIndex].name,
              label: (item) => {
                const d = targets[item.dataIndex];
                return [
                  `MOI: ${d.moi.toFixed(1)}`,
                  `Firms per 100K: ${d.density.toFixed(1)}`,
                  `Strategy: Enter via acquisition`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: { display: true, text: "MOI Score →", color: "#64748b", font: { size: 11, weight: "600" } },
            min: 0, max: 100
          },
          y: {
            ...getChartDefaults().scales.y,
            ticks: { color: "#64748b", font: { size: 10 } }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const key = targets[elements[0].index].key;
            if (isStateMode()) selectState(key);
            else selectCity(key);
          }
        }
      },
      plugins: [{
        id: "acqDensityLabels",
        afterDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          ctx.font = "600 9px Inter, sans-serif";
          ctx.fillStyle = "#64748b";
          ctx.textAlign = "left";
          targets.forEach((d, i) => {
            const meta = chart.getDatasetMeta(0).data[i];
            if (meta) {
              ctx.fillText(d.density.toFixed(0) + "/100K", meta.x + 6, meta.y + 3);
            }
          });
          ctx.restore();
        }
      }]
    });
  }

  // Chart 4: MOI Distribution Histogram
  function renderHistogram() {
    const ctx = $("#histogramChart").getContext("2d");
    if (histogramChart) histogramChart.destroy();

    const selKey = getSelectedKey();

    // Create bins: 0-10, 10-20, ..., 90-100
    const bins = [];
    for (let i = 0; i < 10; i++) {
      bins.push({ min: i * 10, max: (i + 1) * 10, count: 0, items: [], hasSelected: false });
    }

    currentData.forEach(d => {
      const idx = Math.min(Math.floor(d.moi / 10), 9);
      const key = getItemKey(d);
      bins[idx].count++;
      bins[idx].items.push(getItemLabel(d));
      if (key === selKey) bins[idx].hasSelected = true;
    });

    const colors = bins.map(b => {
      const mid = (b.min + b.max) / 2;
      return MOIEngine.getMOIColor(mid);
    });

    const typeLabel = getItemTypeLabel(false).toLowerCase();

    histogramChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: bins.map(b => `${b.min}-${b.max}`),
        datasets: [{
          data: bins.map(b => b.count),
          backgroundColor: bins.map((b, i) => b.hasSelected ? colors[i] : colors[i] + "77"),
          borderColor: bins.map(b => b.hasSelected ? "#0f172a" : "transparent"),
          borderWidth: bins.map(b => b.hasSelected ? 2 : 0),
          borderRadius: 4,
          barPercentage: 0.85,
          categoryPercentage: 0.9
        }]
      },
      options: {
        ...getChartDefaults(),
        animation: { duration: 600, easing: "easeOutQuart" },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => `MOI Range: ${items[0].label}`,
              label: (item) => {
                const bin = bins[item.dataIndex];
                const lines = [`${bin.count} ${typeLabel}${bin.count !== 1 ? "s" : ""}`];
                if (bin.items.length <= 8) {
                  lines.push(bin.items.join(", "));
                }
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: {
              display: true,
              text: "MOI Score Range",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          },
          y: {
            ...getChartDefaults().scales.y,
            beginAtZero: true,
            title: {
              display: true,
              text: `Number of ${getItemTypeLabel(true)}`,
              color: "#64748b",
              font: { size: 11, weight: "600" }
            },
            ticks: {
              ...getChartDefaults().scales.y.ticks,
              stepSize: isStateMode() ? 2 : 5
            }
          }
        }
      },
      plugins: [{
        id: "selectedHighlight",
        afterDraw(chart) {
          const selK = getSelectedKey();
          if (!selK) return;
          const sd = currentData.find(d => getItemKey(d) === selK);
          if (!sd) return;
          const idx = Math.min(Math.floor(sd.moi / 10), 9);
          const meta = chart.getDatasetMeta(0).data[idx];
          if (!meta) return;

          const { ctx } = chart;
          ctx.save();
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText(getItemLabel(sd), meta.x, meta.y - 8);
          ctx.restore();
        }
      }]
    });
  }

  // Chart 2: Component Breakdown
  function renderBreakdown(itemData) {
    const container = $("#breakdownBars");
    const subtitle = $("#breakdownSubtitle");

    if (!itemData) {
      subtitle.textContent = `Select a ${getItemTypeLabel(false).toLowerCase()} to view weighted contributions`;
      container.innerHTML = "";
      return;
    }

    subtitle.textContent = `${getItemName(itemData)} - Weighted score breakdown`;

    const components = [
      { key: "Market Size", value: itemData.mss, weight: 0.35, color: "#3b82f6" },
      { key: "Opportunity Gap", value: itemData.cds, weight: 0.30, color: "#10b981" },
      { key: "Pest Risk", value: itemData.prs, weight: 0.20, color: "#f59e0b" },
      { key: "Growth", value: itemData.gts, weight: 0.15, color: "#8b5cf6" }
    ];

    container.innerHTML = components.map(c => {
      const weighted = (c.value * c.weight).toFixed(1);
      const pct = (c.value).toFixed(1);
      return `
        <div class="breakdown-row">
          <div class="breakdown-label">${c.key}</div>
          <div class="breakdown-bar-wrapper">
            <div class="breakdown-bar-fill" style="width:${c.value}%;background:${c.color};">
              ${pct}
            </div>
          </div>
          <div class="breakdown-weight" style="color:${c.color};">×${c.weight}</div>
          <div class="breakdown-weighted-value" style="color:${c.color};">${weighted}</div>
        </div>
      `;
    }).join("") + `
      <div class="breakdown-row" style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px;">
        <div class="breakdown-label" style="font-weight:700;color:var(--text-primary);">MOI</div>
        <div style="flex:1;"></div>
        <div class="breakdown-weight"></div>
        <div class="breakdown-weighted-value" style="color:${MOIEngine.getMOIColor(itemData.moi)};font-size:1.1rem;">${itemData.moi.toFixed(1)}</div>
      </div>
    `;

    // Animate bars
    requestAnimationFrame(() => {
      container.querySelectorAll(".breakdown-bar-fill").forEach(bar => {
        const w = bar.style.width;
        bar.style.width = "0%";
        requestAnimationFrame(() => {
          bar.style.width = w;
        });
      });
    });
  }

  function highlightChartPoint() {
    renderOppBubbleChart();
    renderOppGapBarChart();
    renderAcqTargetChart();
    renderPestGrowthBubbleChart();
    renderCompDensityTable();
  }

  // --- Pest Activity Intelligence ---

  // Pest breakdown for selected item
  function renderPestBreakdown(key) {
    const placeholder = $("#pestPlaceholder");
    const detail = $("#pestDetail");
    const subtitle = $("#pestBreakdownSubtitle");

    const pestData = getActivePestData();

    if (!key || !pestData[key]) {
      if (placeholder) placeholder.style.display = "flex";
      if (detail) detail.style.display = "none";
      subtitle.textContent = `Select a ${getItemTypeLabel(false).toLowerCase()} to view pest pressure by category`;
      return;
    }

    const pd = pestData[key];
    const displayName = isStateMode() ? (STATE_ABBR_TO_NAME[key] || key) : key;

    placeholder.style.display = "none";
    detail.style.display = "block";
    subtitle.textContent = `${displayName} - Pest activity from Orkin 2025 rankings`;

    $("#pestScoreValue").textContent = pd.normalized.toFixed(0);

    // Category bars
    const maxCatScore = 160;
    const pestTypes = ["Mosquitoes", "Bed Bugs", "Termites", "Rodents"];
    const bars = $("#pestCategoryBars");

    bars.innerHTML = pestTypes.map(pest => {
      const score = pd.scores[pest] || 0;
      const pct = Math.min((score / maxCatScore) * 100, 100);
      const color = PEST_COLORS[pest];
      return `
        <div class="pest-bar-row">
          <span class="pest-bar-label">${pest}</span>
          <div class="pest-bar-track">
            <div class="pest-bar-fill" style="width:${pct}%;background:${color};"></div>
          </div>
          <span class="pest-bar-value">${score}</span>
        </div>
      `;
    }).join("");

    // City list / Rank info
    const cityList = $("#pestCityList");
    const citySectionHeader = detail.querySelector("h4");

    if (isStateMode()) {
      if (citySectionHeader) citySectionHeader.textContent = "Top Ranked Cities in State";
      const allCities = [];
      pestTypes.forEach(pest => {
        const cities = pd.cities[pest] || [];
        cities.forEach(c => {
          allCities.push({ ...c, pest, color: PEST_COLORS[pest] });
        });
      });
      allCities.sort((a, b) => a.rank - b.rank);

      if (allCities.length === 0) {
        cityList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">No cities in Orkin 2025 Top 50 lists</p>';
      } else {
        cityList.innerHTML = allCities.slice(0, 10).map(c => `
          <div class="pest-city-item">
            <span class="pest-city-rank">#${c.rank}</span>
            <span class="pest-city-name">${c.city}</span>
            <span class="pest-city-type" style="background:${c.color};">${c.pest}</span>
          </div>
        `).join("");
      }
    } else {
      // City mode: show this city's national rankings
      if (citySectionHeader) citySectionHeader.textContent = "National Rankings (Orkin Top 50)";
      const ranks = pd.ranks || {};
      const rankedPests = pestTypes.filter(p => ranks[p]);
      if (rankedPests.length === 0) {
        cityList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;">No individual category rankings available</p>';
      } else {
        cityList.innerHTML = rankedPests.map(pest => `
          <div class="pest-city-item">
            <span class="pest-city-rank">#${ranks[pest]}</span>
            <span class="pest-city-name">${pest}</span>
            <span class="pest-city-type" style="background:${PEST_COLORS[pest]};">National</span>
          </div>
        `).join("");
      }
    }

    // Animate bars
    requestAnimationFrame(() => {
      bars.querySelectorAll(".pest-bar-fill").forEach(bar => {
        const w = bar.style.width;
        bar.style.width = "0%";
        requestAnimationFrame(() => { bar.style.width = w; });
      });
    });
  }

  // ============================================================
  // PEST INTELLIGENCE CHARTS
  // ============================================================

  // Chart 5: Pest Pressure vs Growth Bubble
  function renderPestGrowthBubbleChart() {
    const canvas = $("#pestGrowthBubbleChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (pestGrowthBubbleChart) pestGrowthBubbleChart.destroy();

    const selKey = getSelectedKey();
    const pestData = getActivePestData();

    // Only include items with pest data
    const all = currentData
      .map(d => {
        const key = getItemKey(d);
        const pd = pestData[key] || { normalized: 0, appearances: 0 };
        return {
          x: d.pop_growth_pct,
          y: pd.normalized,
          r: Math.max(3, d.moi / 8),
          label: getItemLabel(d),
          key: key,
          name: getItemName(d),
          moi: d.moi,
          pestScore: pd.normalized,
          appearances: pd.appearances || 0,
          growth: d.pop_growth_pct
        };
      })
      .filter(d => d.appearances > 0);

    // Top 10 by (moi + pestScore) get labels
    const ranked = [...all].sort((a, b) => (b.moi + b.pestScore) - (a.moi + a.pestScore));
    const topKeys = new Set(ranked.slice(0, 10).map(d => d.key));
    if (selKey) topKeys.add(selKey);

    const bg = all.filter(d => !topKeys.has(d.key)).map(d => ({ ...d, r: 3 }));
    const fg = all.filter(d => topKeys.has(d.key));

    pestGrowthBubbleChart = new Chart(ctx, {
      type: "bubble",
      data: {
        datasets: [
          {
            label: "Other markets",
            data: bg,
            backgroundColor: "rgba(148,163,184,0.25)",
            borderColor: "transparent",
            borderWidth: 0,
            hoverRadius: 4
          },
          {
            label: "Top markets",
            data: fg,
            backgroundColor: fg.map(d => {
              const c = MOIEngine.getMOIColor(d.moi);
              return d.key === selKey ? c : c + "CC";
            }),
            borderColor: fg.map(d => d.key === selKey ? "#0f172a" : "rgba(255,255,255,0.8)"),
            borderWidth: fg.map(d => d.key === selKey ? 2.5 : 1),
            hoverRadius: 2
          }
        ]
      },
      options: {
        ...getChartDefaults(),
        animation: { duration: 600 },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => items[0].raw.name,
              label: (item) => {
                const d = item.raw;
                return [
                  `MOI: ${d.moi.toFixed(1)}`,
                  `Pest Pressure: ${d.pestScore.toFixed(0)}/100`,
                  `Pop Growth: ${d.growth.toFixed(1)}%`,
                  `Orkin Appearances: ${d.appearances}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: { display: true, text: "Population Growth % →", color: "#64748b", font: { size: 11, weight: "600" } }
          },
          y: {
            ...getChartDefaults().scales.y,
            title: { display: true, text: "← Pest Pressure Score (Orkin)", color: "#64748b", font: { size: 11, weight: "600" } },
            min: 0, max: 105
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const dsIdx = elements[0].datasetIndex;
            const ds = dsIdx === 0 ? bg : fg;
            const key = ds[elements[0].index].key;
            if (isStateMode()) selectState(key);
            else selectCity(key);
          }
        }
      },
      plugins: [{
        id: "pestBubbleLabels",
        afterDraw(chart) {
          const { ctx } = chart;
          const fgMeta = chart.getDatasetMeta(1);
          ctx.save();
          ctx.font = "600 9px Inter, sans-serif";
          fg.forEach((d, i) => {
            if (!fgMeta.data[i]) return;
            const pt = fgMeta.data[i];
            ctx.fillStyle = d.key === selKey ? "#0f172a" : "rgba(0,0,0,0.5)";
            ctx.textAlign = "center";
            ctx.fillText(d.label, pt.x, pt.y - d.r - 4);
          });
          ctx.restore();
        }
      }]
    });
  }

  // Chart 6: State/City Comparison
  function renderExpansionMiniMap() {
    const body = $("#stateCompareBody");
    const selectA = $("#compareStateA");
    const selectB = $("#compareStateB");
    if (!body || !selectA || !selectB) return;

    // Populate dropdowns based on current mode
    if (selectA.options.length <= 1) {
      if (isStateMode()) {
        const stateEngine = new MOIEngine([...STATE_MARKET_DATA]);
        const stateData = stateEngine.compute(currentYear);
        const sorted = [...stateData].sort((a, b) => a.state.localeCompare(b.state));
        sorted.forEach(d => {
          selectA.add(new Option(d.state, d.abbr));
          selectB.add(new Option(d.state, d.abbr));
        });
        if (selectedState) selectA.value = selectedState;
      } else {
        const sorted = [...currentData].sort((a, b) => a.city.localeCompare(b.city));
        sorted.forEach(d => {
          const key = d.city + ", " + d.state_abbr;
          selectA.add(new Option(key, key));
          selectB.add(new Option(key, key));
        });
        if (selectedCity) selectA.value = selectedCity;
      }
      selectA.onchange = () => renderStateComparison();
      selectB.onchange = () => renderStateComparison();
    }

    // Auto-update A when selection changes on main map
    if (isStateMode() && selectedState && selectA.value !== selectedState) {
      selectA.value = selectedState;
    } else if (!isStateMode() && selectedCity && selectA.value !== selectedCity) {
      selectA.value = selectedCity;
    }

    renderStateComparison();
  }

  function renderStateComparison() {
    const body = $("#stateCompareBody");
    const abbrA = $("#compareStateA").value;
    const abbrB = $("#compareStateB").value;
    const itemLabel = isStateMode() ? "states" : "cities";

    if (!abbrA || !abbrB) {
      body.innerHTML = `<div class="compare-prompt">Select two ${itemLabel} above to compare</div>`;
      return;
    }

    if (abbrA === abbrB) {
      body.innerHTML = `<div class="compare-prompt">Please select two different ${itemLabel}</div>`;
      return;
    }

    let a, b, pestA, pestB;

    if (isStateMode()) {
      const stateEngine = new MOIEngine([...STATE_MARKET_DATA]);
      const stateData = stateEngine.compute(currentYear);
      a = stateData.find(d => d.abbr === abbrA);
      b = stateData.find(d => d.abbr === abbrB);
      if (!a || !b) return;
      pestA = PEST_PRESSURE_DATA[abbrA] || { normalized: 0 };
      pestB = PEST_PRESSURE_DATA[abbrB] || { normalized: 0 };
    } else {
      a = currentData.find(d => (d.city + ", " + d.state_abbr) === abbrA);
      b = currentData.find(d => (d.city + ", " + d.state_abbr) === abbrB);
      if (!a || !b) return;
      pestA = PEST_PRESSURE_DATA[a.state_abbr] || { normalized: 0 };
      pestB = PEST_PRESSURE_DATA[b.state_abbr] || { normalized: 0 };
    }

    const nameA = isStateMode() ? a.state : (a.city + ", " + a.state_abbr);
    const nameB = isStateMode() ? b.state : (b.city + ", " + b.state_abbr);
    const totalItems = isStateMode() ? 50 : currentData.length;

    const metrics = [
      { label: "MOI Score",      a: a.moi,            b: b.moi,            hib: true,  fmt: v => v.toFixed(1) },
      { label: "Rank",           a: a.rank,           b: b.rank,           hib: false, fmt: v => "#" + v + " of " + totalItems },
      { label: "Opportunity Gap",a: a.cds,            b: b.cds,            hib: true,  fmt: v => v.toFixed(1) },
      { label: "Market Size",    a: a.mss,            b: b.mss,            hib: true,  fmt: v => v.toFixed(1) },
      { label: "Pest Risk",      a: a.prs,            b: b.prs,            hib: true,  fmt: v => v.toFixed(1) },
      { label: "Growth",         a: a.gts,            b: b.gts,            hib: true,  fmt: v => v.toFixed(1) },
      { label: "Population",     a: a.population,     b: b.population,     hib: true,  fmt: v => v.toLocaleString() },
      { label: "Firms/100K",     a: a.comp_density,   b: b.comp_density,   hib: false, fmt: v => v.toFixed(1) },
      { label: "Pest Pressure",  a: pestA.normalized, b: pestB.normalized, hib: true,  fmt: v => v.toFixed(0) },
      { label: "Pop Growth %",   a: a.pop_growth_pct, b: b.pop_growth_pct, hib: true,  fmt: v => v.toFixed(2) + "%" }
    ];

    let html = '<div class="compare-grid">';
    html += '<div class="compare-header">';
    html += `<div class="compare-header-name"><span class="compare-moi-badge" style="background:${MOIEngine.getMOIColor(a.moi)}">${a.moi.toFixed(1)}</span> ${nameA}</div>`;
    html += '<div class="compare-header-metric">Metric</div>';
    html += `<div class="compare-header-name" style="text-align:right;">${nameB} <span class="compare-moi-badge" style="background:${MOIEngine.getMOIColor(b.moi)}">${b.moi.toFixed(1)}</span></div>`;
    html += '</div>';

    metrics.forEach(m => {
      const aWins = m.hib ? m.a > m.b : m.a < m.b;
      const bWins = m.hib ? m.b > m.a : m.b < m.a;
      const tie = m.a === m.b;
      const maxVal = Math.max(Math.abs(m.a), Math.abs(m.b), 0.01);
      const barA = (Math.abs(m.a) / maxVal) * 100;
      const barB = (Math.abs(m.b) / maxVal) * 100;
      const clsA = tie ? "compare-tie" : (aWins ? "compare-winner" : "compare-loser");
      const clsB = tie ? "compare-tie" : (bWins ? "compare-winner" : "compare-loser");
      const colorA = aWins ? "#059669" : (tie ? "#64748b" : "#e2e8f0");
      const colorB = bWins ? "#059669" : (tie ? "#64748b" : "#e2e8f0");

      html += '<div class="compare-row">';
      html += `<div class="compare-val compare-val-a ${clsA}">${m.fmt(m.a)}<span class="compare-bar" style="width:${barA}%;background:${colorA};"></span></div>`;
      html += `<div class="compare-metric-label">${m.label}</div>`;
      html += `<div class="compare-val compare-val-b ${clsB}"><span class="compare-bar" style="width:${barB}%;background:${colorB};"></span>${m.fmt(m.b)}</div>`;
      html += '</div>';
    });

    html += '</div>';
    body.innerHTML = html;
  }

  // Chart 7: Underserved Markets Table (DOM)
  function renderCompDensityTable() {
    const tbody = $("#compDensityTableBody");
    if (!tbody) return;

    const selKey = getSelectedKey();

    // Filter underserved: comp_density < 50, sort by MOI desc, top 15
    const underserved = currentData
      .filter(d => d.comp_density < 50)
      .sort((a, b) => b.moi - a.moi)
      .slice(0, 15);

    if (underserved.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data-msg">No underserved markets found</td></tr>';
      return;
    }

    const pestData = getActivePestData();

    tbody.innerHTML = underserved.map((d, i) => {
      const key = getItemKey(d);
      const pd = pestData[key] || { normalized: 0 };
      const density = d.comp_density;
      // Color-code density: green <8, blue 8-18, amber 18-50
      let densColor = "#059669";
      if (density >= 18) densColor = "#d97706";
      else if (density >= 8) densColor = "#2563eb";

      const isSelected = key === selKey;

      return `<tr class="comp-density-row${isSelected ? " comp-density-selected" : ""}" data-key="${key}">
        <td style="color:#94a3b8;">${i + 1}</td>
        <td style="font-weight:600;">${getItemName(d)}</td>
        <td style="color:${densColor};font-weight:600;">${density.toFixed(1)}</td>
        <td>${d.moi.toFixed(1)}</td>
        <td>${pd.normalized.toFixed(0)}</td>
        <td>${d.pop_growth_pct.toFixed(1)}%</td>
      </tr>`;
    }).join("");

    // Clickable rows
    tbody.querySelectorAll(".comp-density-row").forEach(row => {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => {
        const key = row.dataset.key;
        if (isStateMode()) selectState(key);
        else selectCity(key);
      });
    });
  }

  // Top 15 by Pest Pressure - horizontal bar chart
  function renderPestRankingChart() {
    const canvas = $("#pestRankingChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (pestRankingChart) pestRankingChart.destroy();

    const pestData = getActivePestData();

    const ranked = Object.entries(pestData)
      .filter(([, d]) => d.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15);

    const labels = ranked.map(([key]) => isStateMode() ? (STATE_ABBR_TO_NAME[key] || key) : key);
    const pestTypes = ["Mosquitoes", "Bed Bugs", "Termites", "Rodents"];

    // Dynamic height
    canvas.parentElement.style.minHeight = Math.max(280, ranked.length * 24 + 60) + "px";

    pestRankingChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: pestTypes.map(pest => ({
          label: pest,
          data: ranked.map(([, d]) => d.scores[pest] || 0),
          backgroundColor: PEST_COLORS[pest],
          borderRadius: 2,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }))
      },
      options: {
        ...getChartDefaults(),
        indexAxis: "y",
        animation: { duration: 800 },
        plugins: {
          ...getChartDefaults().plugins,
          legend: {
            display: true,
            position: "top",
            labels: {
              boxWidth: 12,
              padding: 12,
              font: { size: 11, weight: "500" },
              color: "#475569"
            }
          },
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            mode: "index",
            callbacks: {
              afterBody: (items) => {
                const total = items.reduce((s, i) => s + (i.raw || 0), 0);
                return `Total: ${total}`;
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            stacked: true,
            title: {
              display: true,
              text: "Pest Pressure Score",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          },
          y: {
            ...getChartDefaults().scales.y,
            stacked: true,
            ticks: {
              color: "#475569",
              font: { size: 11, weight: "500" }
            }
          }
        }
      }
    });
  }

  // Pest Heatmap Table
  function renderPestHeatmap() {
    const tbody = $("#pestHeatmapBody");
    if (!tbody) return;

    const pestData = getActivePestData();
    const selKey = getSelectedKey();

    const ranked = Object.entries(pestData)
      .filter(([, d]) => d.total > 0)
      .sort((a, b) => b[1].normalized - a[1].normalized)
      .slice(0, 20);

    const maxScores = {
      "Mosquitoes": 120, "Bed Bugs": 185, "Termites": 240, "Rodents": 160
    };

    tbody.innerHTML = ranked.map(([key, pd]) => {
      const displayName = isStateMode() ? (STATE_ABBR_TO_NAME[key] || key) : key;
      const displayTag = isStateMode() ? key : "";
      const pestTypes = ["Mosquitoes", "Bed Bugs", "Termites", "Rodents"];

      const cells = pestTypes.map(pest => {
        const score = pd.scores[pest] || 0;
        const maxS = maxScores[pest];
        const intensity = Math.min(score / maxS, 1);
        const color = PEST_COLORS[pest];
        const bg = score > 0
          ? `${color}${Math.round(intensity * 40 + 15).toString(16).padStart(2, "0")}`
          : "transparent";
        return `<td><span class="pest-heat-cell" style="background:${bg};color:${score > 0 ? color : "var(--text-muted)"}">${score || "-"}</span></td>`;
      }).join("");

      const isSelected = key === selKey;
      return `<tr style="${isSelected ? "background:var(--bg-secondary);font-weight:600;" : ""}" data-pest-key="${key}">
        <td><strong>${displayName}</strong>${displayTag ? ` <span style="color:var(--text-muted);font-size:0.7rem;">${displayTag}</span>` : ""}</td>
        <td><strong>${pd.normalized.toFixed(0)}</strong></td>
        ${cells}
      </tr>`;
    }).join("");

    // Click handlers
    tbody.querySelectorAll("tr").forEach(tr => {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => {
        const key = tr.dataset.pestKey;
        if (!key) return;
        if (isStateMode()) selectState(key);
        else selectCity(key);
      });
    });
  }

  // --- Boot ---
  document.addEventListener("DOMContentLoaded", init);
})();
