// ============================================================
// MOI Dashboard - Application Controller
// ============================================================

(function () {
  "use strict";

  // --- State ---
  let allRawData = [...STATE_MARKET_DATA];
  let engine = new MOIEngine(allRawData);
  let currentYear = 2024;
  let currentData = [];
  let selectedState = null;
  let sortCol = "rank";
  let sortDir = "asc";
  let viewMode = "composite"; // composite | component
  let usGeoData = null;

  // Chart instances
  let quadrantChart = null;
  let scatterChart = null;
  let histogramChart = null;

  // --- DOM Refs ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Initialize ---
  async function init() {
    populateYearSelector();
    bindEvents();
    await loadMapData();
    refresh();
    // Auto-select top state
    if (currentData.length > 0) {
      selectState(currentData[0].abbr);
    }
  }

  function populateYearSelector() {
    const sel = $("#yearSelector");
    const years = engine.getAvailableYears();
    sel.innerHTML = years.map(y => `<option value="${y}"${y === currentYear ? " selected" : ""}>${y}</option>`).join("");
  }

  // --- Events ---
  function bindEvents() {
    // Year selector
    $("#yearSelector").addEventListener("change", (e) => {
      currentYear = parseInt(e.target.value);
      refresh();
      if (selectedState) selectState(selectedState);
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
      th.addEventListener("click", () => {
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

  // --- Refresh all ---
  function refresh() {
    currentData = engine.compute(currentYear);
    renderTable();
    renderMap();
    renderQuadrantChart();
    renderScatterChart();
    renderHistogram();
    renderMapLegend();
    $("#tableTitle").textContent = `50 States - ${currentYear}`;
  }

  // --- Hero Card ---
  function updateHeroCard(stateData) {
    if (!stateData) {
      $("#heroPlaceholder").style.display = "flex";
      $("#heroContent").style.display = "none";
      return;
    }

    $("#heroPlaceholder").style.display = "none";
    $("#heroContent").style.display = "block";

    const band = MOIEngine.getMOIBand(stateData.moi);

    $("#heroStateLabel").textContent = stateData.abbr;
    $("#heroStateFull").textContent = stateData.state;
    $("#heroMOI").textContent = stateData.moi.toFixed(1);
    $("#heroMOI").style.color = band.color;
    $(".hero-score-card::before");

    const heroCard = $(".hero-score-card");
    heroCard.style.borderTopColor = band.color;
    heroCard.querySelector("::before");

    // Update the top accent line
    heroCard.style.setProperty("--hero-accent", band.color);
    const styleTag = document.getElementById("hero-dynamic-style") || document.createElement("style");
    styleTag.id = "hero-dynamic-style";
    styleTag.textContent = `.hero-score-card::before { background: ${band.color} !important; }`;
    document.head.appendChild(styleTag);

    const bandEl = $("#heroBand");
    bandEl.textContent = band.label;
    bandEl.style.background = band.bg;
    bandEl.style.color = band.textColor;

    $("#heroRank").innerHTML = `Rank: <span>${stateData.rank}</span> of 50`;

    $("#heroMSS").textContent = stateData.mss.toFixed(1);
    $("#heroCDS").textContent = stateData.cds.toFixed(1);
    $("#heroPRS").textContent = stateData.prs.toFixed(1);
    $("#heroGTS").textContent = stateData.gts.toFixed(1);

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
    renderTable();
    highlightMapState(abbr);
    highlightChartPoint(abbr);
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

    const container = $("#us-map");
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight || 320;

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const projection = d3.geoAlbersUsa()
      .fitSize([width - 20, height - 20], topojson.feature(usGeoData, usGeoData.objects.states));

    const path = d3.geoPath().projection(projection);

    const states = topojson.feature(usGeoData, usGeoData.objects.states).features;

    // Build lookup by FIPS
    const dataByFips = {};
    currentData.forEach(d => {
      const fips = STATE_FIPS[d.abbr];
      if (fips) dataByFips[fips] = d;
    });

    const tooltip = $("#mapTooltip");

    svg.selectAll("path")
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

        tooltip.style.display = "block";
        tooltip.querySelector(".tt-state").textContent = sd.state;
        const moiEl = tooltip.querySelector(".tt-moi");
        moiEl.textContent = sd.moi.toFixed(1);
        moiEl.style.color = MOIEngine.getMOIColor(sd.moi);
        tooltip.querySelector(".tt-mss").textContent = sd.mss.toFixed(1);
        tooltip.querySelector(".tt-cds").textContent = sd.cds.toFixed(1);
        tooltip.querySelector(".tt-prs").textContent = sd.prs.toFixed(1);
        tooltip.querySelector(".tt-gts").textContent = sd.gts.toFixed(1);
        tooltip.querySelector(".tt-comp").textContent = sd.comp_density.toFixed(1);
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 10) + "px";

        // Keep tooltip on screen
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
        tooltip.style.display = "none";
      })
      .on("click", function (event, d) {
        const fips = String(d.id).padStart(2, "0");
        const sd = dataByFips[fips];
        if (sd) selectState(sd.abbr);
      });

    // Highlight selected
    if (selectedState) highlightMapState(selectedState);
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
      data = data.filter(d =>
        d.state.toLowerCase().includes(search) ||
        d.abbr.toLowerCase().includes(search)
      );
    }

    // Sort
    data.sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
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

    const tbody = $("#tableBody");
    const maxMOI = Math.max(...currentData.map(d => d.moi));

    tbody.innerHTML = data.map(d => {
      const isTop5 = d.rank <= 5;
      const isSelected = d.abbr === selectedState;
      const moiColor = MOIEngine.getMOIColor(d.moi);
      const barWidth = (d.moi / maxMOI) * 100;

      const rowClasses = [
        isTop5 ? "top-5" : "",
        isSelected ? "selected" : ""
      ].filter(Boolean).join(" ");

      const formatPop = d.population.toLocaleString();

      if (viewMode === "component") {
        return `<tr class="${rowClasses}" data-abbr="${d.abbr}">
          <td><span class="rank-badge${isTop5 ? " top" : ""}">${d.rank}</span></td>
          <td><strong>${d.state}</strong> <span style="color:var(--text-muted);font-size:0.7rem;">${d.abbr}</span></td>
          <td class="moi-cell" style="color:${moiColor}">${d.moi.toFixed(1)}</td>
          <td class="score-cell">${d.mss.toFixed(1)}</td>
          <td class="score-cell">${d.cds.toFixed(1)}</td>
          <td class="score-cell">${d.prs.toFixed(1)}</td>
          <td class="score-cell">${d.gts.toFixed(1)}</td>
          <td>${formatPop}</td>
          <td>${d.pest_firm_count.toLocaleString()}</td>
          <td>${d.comp_density.toFixed(1)}</td>
        </tr>`;
      }

      return `<tr class="${rowClasses}" data-abbr="${d.abbr}">
        <td><span class="rank-badge${isTop5 ? " top" : ""}">${d.rank}</span></td>
        <td><strong>${d.state}</strong> <span style="color:var(--text-muted);font-size:0.7rem;">${d.abbr}</span></td>
        <td>
          <div class="moi-bar-cell">
            <span class="moi-cell" style="color:${moiColor};min-width:42px;">${d.moi.toFixed(1)}</span>
            <div style="flex:1;background:rgba(0,0,0,0.06);border-radius:3px;height:6px;">
              <div class="moi-bar" style="width:${barWidth}%;background:${moiColor};"></div>
            </div>
          </div>
        </td>
        <td class="score-cell">${d.mss.toFixed(1)}</td>
        <td class="score-cell">${d.cds.toFixed(1)}</td>
        <td class="score-cell">${d.prs.toFixed(1)}</td>
        <td class="score-cell">${d.gts.toFixed(1)}</td>
        <td>${formatPop}</td>
        <td>${d.pest_firm_count.toLocaleString()}</td>
        <td>${d.comp_density.toFixed(1)}</td>
      </tr>`;
    }).join("");

    // Row click handlers
    $$("#tableBody tr").forEach(tr => {
      tr.addEventListener("click", () => {
        const abbr = tr.dataset.abbr;
        if (abbr) selectState(abbr);
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

  // Chart 1: Opportunity Quadrant (Market Size vs Competition Density)
  function renderQuadrantChart() {
    const ctx = $("#quadrantChart").getContext("2d");
    if (quadrantChart) quadrantChart.destroy();

    const data = currentData.map(d => ({
      x: d.comp_density,
      y: d.mss,
      label: d.abbr,
      state: d.state,
      moi: d.moi,
      cds: d.cds
    }));

    const avgX = data.reduce((s, d) => s + d.x, 0) / data.length;
    const avgY = data.reduce((s, d) => s + d.y, 0) / data.length;

    quadrantChart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [{
          data: data,
          backgroundColor: data.map(d => {
            const c = MOIEngine.getMOIColor(d.moi);
            return d.label === selectedState ? c : c + "99";
          }),
          borderColor: data.map(d =>
            d.label === selectedState ? "#0f172a" : "transparent"
          ),
          borderWidth: data.map(d => d.label === selectedState ? 2 : 0),
          pointRadius: data.map(d => d.label === selectedState ? 9 : 6),
          pointHoverRadius: 10
        }]
      },
      options: {
        ...getChartDefaults(),
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => {
                const d = items[0].raw;
                return d.state;
              },
              label: (item) => {
                const d = item.raw;
                return [
                  `MOI: ${d.moi.toFixed(1)}`,
                  `Market Size Score: ${d.y.toFixed(1)}`,
                  `Firms per 100K: ${d.x.toFixed(1)}`,
                  `Competition Score: ${d.cds.toFixed(1)}`
                ];
              }
            }
          },
          annotation: undefined
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: {
              display: true,
              text: "Firms per 100K Population →",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          },
          y: {
            ...getChartDefaults().scales.y,
            title: {
              display: true,
              text: "Market Size Score",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            selectState(data[idx].label);
          }
        }
      },
      plugins: [{
        id: "quadrantLines",
        afterDraw(chart) {
          const { ctx, scales: { x, y } } = chart;
          const xPixel = x.getPixelForValue(avgX);
          const yPixel = y.getPixelForValue(avgY);

          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 1;

          // Vertical line
          ctx.beginPath();
          ctx.moveTo(xPixel, y.top);
          ctx.lineTo(xPixel, y.bottom);
          ctx.stroke();

          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(x.left, yPixel);
          ctx.lineTo(x.right, yPixel);
          ctx.stroke();

          ctx.setLineDash([]);

          // Quadrant labels
          ctx.font = "600 10px Inter, sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.textAlign = "center";
          ctx.fillText("IDEAL", (x.left + xPixel) / 2, y.top + 18);
          ctx.fillText("Large + Competitive", (xPixel + x.right) / 2, y.top + 18);
          ctx.fillText("Small + Open", (x.left + xPixel) / 2, y.bottom - 8);
          ctx.fillText("AVOID", (xPixel + x.right) / 2, y.bottom - 8);

          // Draw state labels for selected and top states
          const dataset = chart.data.datasets[0].data;
          ctx.font = "600 9px Inter, sans-serif";
          ctx.textAlign = "center";
          dataset.forEach((d, i) => {
            const meta = chart.getDatasetMeta(0).data[i];
            if (d.label === selectedState || d.moi >= 65) {
              ctx.fillStyle = d.label === selectedState ? "#0f172a" : "rgba(0,0,0,0.4)";
              ctx.fillText(d.label, meta.x, meta.y - 12);
            }
          });

          ctx.restore();
        }
      }]
    });
  }

  // Chart 3: Competition vs Growth scatter
  function renderScatterChart() {
    const ctx = $("#scatterChart").getContext("2d");
    if (scatterChart) scatterChart.destroy();

    const data = currentData.map(d => ({
      x: d.comp_density,
      y: d.pop_growth_pct,
      label: d.abbr,
      state: d.state,
      moi: d.moi,
      cds: d.cds,
      gts: d.gts
    }));

    scatterChart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [{
          data: data,
          backgroundColor: data.map(d => {
            const c = MOIEngine.getMOIColor(d.moi);
            return d.label === selectedState ? c : c + "99";
          }),
          borderColor: data.map(d =>
            d.label === selectedState ? "#0f172a" : "transparent"
          ),
          borderWidth: data.map(d => d.label === selectedState ? 2 : 0),
          pointRadius: data.map(d => d.label === selectedState ? 9 : 6),
          pointHoverRadius: 10
        }]
      },
      options: {
        ...getChartDefaults(),
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          ...getChartDefaults().plugins,
          tooltip: {
            ...getChartDefaults().plugins.tooltip,
            callbacks: {
              title: (items) => items[0].raw.state,
              label: (item) => {
                const d = item.raw;
                return [
                  `MOI: ${d.moi.toFixed(1)}`,
                  `Firms per 100K: ${d.x.toFixed(1)}`,
                  `Pop Growth: ${d.y.toFixed(1)}%`,
                  `Growth Score: ${d.gts.toFixed(1)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            ...getChartDefaults().scales.x,
            title: {
              display: true,
              text: "Firms per 100K Population →",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          },
          y: {
            ...getChartDefaults().scales.y,
            title: {
              display: true,
              text: "← Population Growth %",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            selectState(data[elements[0].index].label);
          }
        }
      },
      plugins: [{
        id: "scatterLabels",
        afterDraw(chart) {
          const { ctx } = chart;
          const dataset = chart.data.datasets[0].data;
          ctx.save();
          ctx.font = "600 9px Inter, sans-serif";
          ctx.textAlign = "center";
          dataset.forEach((d, i) => {
            const meta = chart.getDatasetMeta(0).data[i];
            if (d.label === selectedState || d.y > 1.3 || (d.y > 0.8 && d.x < 10)) {
              ctx.fillStyle = d.label === selectedState ? "#0f172a" : "rgba(0,0,0,0.4)";
              ctx.fillText(d.label, meta.x, meta.y - 12);
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

    // Create bins: 0-10, 10-20, ..., 90-100
    const bins = [];
    for (let i = 0; i < 10; i++) {
      bins.push({ min: i * 10, max: (i + 1) * 10, count: 0, states: [], hasSelected: false });
    }

    currentData.forEach(d => {
      const idx = Math.min(Math.floor(d.moi / 10), 9);
      bins[idx].count++;
      bins[idx].states.push(d.abbr);
      if (d.abbr === selectedState) bins[idx].hasSelected = true;
    });

    const colors = bins.map(b => {
      const mid = (b.min + b.max) / 2;
      return MOIEngine.getMOIColor(mid);
    });

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
                const lines = [`${bin.count} state${bin.count !== 1 ? "s" : ""}`];
                if (bin.states.length <= 8) {
                  lines.push(bin.states.join(", "));
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
              text: "Number of States",
              color: "#64748b",
              font: { size: 11, weight: "600" }
            },
            ticks: {
              ...getChartDefaults().scales.y.ticks,
              stepSize: 2
            }
          }
        }
      },
      plugins: [{
        id: "selectedHighlight",
        afterDraw(chart) {
          if (!selectedState) return;
          const sd = currentData.find(d => d.abbr === selectedState);
          if (!sd) return;
          const idx = Math.min(Math.floor(sd.moi / 10), 9);
          const meta = chart.getDatasetMeta(0).data[idx];
          if (!meta) return;

          const { ctx } = chart;
          ctx.save();
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText(selectedState, meta.x, meta.y - 8);
          ctx.restore();
        }
      }]
    });
  }

  // Chart 2: Component Breakdown
  function renderBreakdown(stateData) {
    const container = $("#breakdownBars");
    const subtitle = $("#breakdownSubtitle");

    if (!stateData) {
      subtitle.textContent = "Select a state to view weighted contributions";
      container.innerHTML = "";
      return;
    }

    subtitle.textContent = `${stateData.state} - Weighted score breakdown`;

    const components = [
      { key: "Market Size", value: stateData.mss, weight: 0.35, color: "#3b82f6" },
      { key: "Competition", value: stateData.cds, weight: 0.30, color: "#10b981" },
      { key: "Pest Risk", value: stateData.prs, weight: 0.20, color: "#f59e0b" },
      { key: "Growth", value: stateData.gts, weight: 0.15, color: "#8b5cf6" }
    ];

    const totalWeighted = components.reduce((s, c) => s + c.value * c.weight, 0);

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
        <div class="breakdown-weighted-value" style="color:${MOIEngine.getMOIColor(stateData.moi)};font-size:1.1rem;">${stateData.moi.toFixed(1)}</div>
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

  function highlightChartPoint(abbr) {
    // Re-render charts with new selection highlights
    renderQuadrantChart();
    renderScatterChart();
  }

  // --- Boot ---
  document.addEventListener("DOMContentLoaded", init);
})();
