// Activity 10: Coordinated D3 Visualization
// Theme: Socioeconomic Development Across the 16 German States
// This script extends the Activity 9 basemap into a classed choropleth map
// with a coordinated bar chart for comparing one expressed attribute.

/* Wrap everything in a self-executing anonymous function
   so variables and functions are kept out of the global scope. */
(function () {

    // Pseudo-global variables for loaded datasets
    let csvData, germanyTopo, neighborTopo;

    // List of numerical attributes available in the CSV dataset
    var attrArray = [
        "area_km2",
        "population_2023",
        "population_density_2023",
        "hdi_2022",
        "gdp_per_capita_eur_2023",
        "unemployment_rate_nov_2025"
    ];

    // Human-readable labels used in chart title and tooltip
    var attrNames = {
        area_km2: "Area (km²)",
        population_2023: "Population (2023)",
        population_density_2023: "Population Density (2023)",
        hdi_2022: "HDI (2022)",
        gdp_per_capita_eur_2023: "GDP per Capita (€ 2023)",
        unemployment_rate_nov_2025: "Unemployment Rate (Nov. 2025)"
    };

    // Initial attribute shown on both the choropleth map and bar chart
    var expressed = "gdp_per_capita_eur_2023";

    // Begin script when window loads
    window.onload = setMap;

    // Redraw map and chart after resize to maintain responsive layout
    window.addEventListener("resize", debounce(redrawVisualization, 180));

    /* Function: setMap
       Purpose: Load external files needed for the map and chart. */
    function setMap() {
        var promises = [
            d3.csv("data/germany_16_states_lab2.csv"),
            d3.json("data/germany_16_states_lab2.topojson"),
            d3.json("data/germany_neighbor_regions_background.topojson")
        ];

        // Use Promise.all to load all files in parallel
        Promise.all(promises)
            .then(callback)
            .catch(function (error) {
                console.error("Error loading data:", error);
            });
    }

    /* Function: callback
       Purpose: Store loaded datasets and initialize drawing. */
    function callback(data) {
        csvData = data[0];
        germanyTopo = data[1];
        neighborTopo = data[2];

        redrawVisualization();
    }

    /* Function: redrawVisualization
       Purpose: Clear existing SVG elements and redraw the full interface.
       This allows the layout to remain responsive when the browser resizes. */
    function redrawVisualization() {
        if (!csvData || !germanyTopo || !neighborTopo) return;

        d3.select("#map-container").selectAll("*").remove();
        d3.select("#chart-container").selectAll("*").remove();
        d3.select(".infoLabel").remove();

        drawVisualization();
    }

    /* Function: drawVisualization
       Purpose: Build the choropleth map and the coordinated bar chart. */
    function drawVisualization() {
        var mapContainer = document.getElementById("map-container");
        var chartContainer = document.getElementById("chart-container");

        if (!mapContainer || !chartContainer) {
            console.error("Map or chart container not found.");
            return;
        }

        // Responsive dimensions based on available container size
        var mapWidth = mapContainer.clientWidth;
        var mapHeight = Math.max(560, Math.min(760, mapWidth * 0.72));

        var chartWidth = chartContainer.clientWidth;
        var chartHeight = Math.max(560, Math.min(760, mapHeight));

        // Create SVG container for the map
        var map = d3.select("#map-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Use a conic equal-area projection appropriate for choropleth mapping
        var projection = d3.geoConicEqualArea()
            .center([0, 51.0])
            .rotate([-10.5, 0])
            .parallels([47, 55])
            .translate([mapWidth / 2, mapHeight / 2]);

        var path = d3.geoPath()
            .projection(projection);

        // Translate Germany TopoJSON into GeoJSON features
        var states = topojson.feature(
            germanyTopo,
            germanyTopo.objects.NUTS_RG_10M_2024_4326
        ).features;

        // Keep only Germany NUTS level 1 state polygons
        states = states.filter(function (d) {
            return d.properties.CNTR_CODE === "DE" && d.properties.LEVL_CODE === 1;
        });

        // Translate neighboring regions TopoJSON into GeoJSON features
        var neighbors = topojson.feature(
            neighborTopo,
            neighborTopo.objects["germany_neighbor_regions_background.topojson"]
        ).features;

        // Join CSV attributes to the Germany state polygons
        states = joinData(states, csvData);

        /* Fit projection only to Germany state polygons.
           This keeps Germany large, centered, and visually prominent,
           while neighbor polygons remain background context only. */
        projection.fitExtent(
            [[30, 30], [mapWidth - 30, mapHeight - 30]],
            {
                type: "FeatureCollection",
                features: states
            }
        );

        // Build one classed color scale shared by both map and chart
        var colorScale = makeColorScale(csvData);

        // Draw map layers and coordinated chart
        setGraticule(map, path);
        setNeighbors(neighbors, map, path);
        setEnumerationUnits(states, map, path, colorScale);
        setChart(csvData, chartWidth, chartHeight, colorScale);
    }

    /* Function: setGraticule
       Purpose: Draw subtle graticule background lines for geographic context. */
    function setGraticule(map, path) {
        var graticule = d3.geoGraticule().step([5, 5]);

        map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);

        map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
    }

    /* Function: setNeighbors
       Purpose: Draw neighboring background polygons behind Germany. */
    function setNeighbors(neighbors, map, path) {
        map.selectAll(".neighbor")
            .data(neighbors)
            .enter()
            .append("path")
            .attr("class", "neighbor")
            .attr("d", path);
    }

    /* Function: joinData
       Purpose: Join CSV attribute data to GeoJSON state features using NUTS-1 codes. */
    function joinData(states, csvData) {
        var csvLookup = {};

        // Build a lookup object for faster matching by NUTS code
        csvData.forEach(function (row) {
            var key = String(row.nuts1).trim();
            csvLookup[key] = row;
        });

        // Loop through GeoJSON features and attach matching CSV attributes
        states.forEach(function (feature) {
            var geojsonProps = feature.properties;
            var geojsonKey = String(geojsonProps.NUTS_ID).trim();
            var match = csvLookup[geojsonKey];

            if (match) {
                geojsonProps.state = match.state;
                geojsonProps.state_code = match.state_code;

                // Convert CSV strings to numbers before storing them
                attrArray.forEach(function (attr) {
                    geojsonProps[attr] = parseFloat(match[attr]);
                });
            } else {
                // If no match exists, store neutral fallback values
                geojsonProps.state = geojsonProps.NUTS_NAME || "Unknown state";
                geojsonProps.state_code = geojsonProps.NUTS_ID || "NA";

                attrArray.forEach(function (attr) {
                    geojsonProps[attr] = null;
                });
            }
        });

        return states;
    }

    /* Function: makeColorScale
       Purpose: Create a quantile color scale for classed choropleth mapping. */
    function makeColorScale(data) {
        var colorClasses = [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c"
        ];

        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        // Build domain array from all values of the currently expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            if (!isNaN(val)) {
                domainArray.push(val);
            }
        }

        colorScale.domain(domainArray);
        return colorScale;
    }

    /* Function: choropleth
       Purpose: Return the correct fill color for a feature,
       or a neutral gray if no data are available. */
    function choropleth(props, colorScale) {
        var value = props[expressed];
        if (value != null && !isNaN(value)) {
            return colorScale(value);
        } else {
            return "#ccc";
        }
    }

    /* Function: setEnumerationUnits
       Purpose: Draw Germany states and symbolize them as a choropleth map. */
    function setEnumerationUnits(states, map, path, colorScale) {
        map.selectAll(".states")
            .data(states)
            .enter()
            .append("path")
            .attr("class", function (d) {
                var code = sanitizeClass(d.properties.state_code || d.properties.NUTS_ID || "NA");
                return "states " + code;
            })
            .attr("d", path)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
                setLabel(event, d.properties);
            })
            .on("mousemove", moveLabel)
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
                d3.select(".infoLabel").remove();
            });
    }

    /* Function: setChart
       Purpose: Create a coordinated bar chart using the same expressed attribute
       shown on the choropleth map. */
    function setChart(data, chartWidth, chartHeight, colorScale) {
        // Chart paddings create room for the axis, title, and rotated labels
        var leftPadding = 58,
            rightPadding = 14,
            topPadding = 55,
            bottomPadding = 105,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topPadding - bottomPadding,
            translate = "translate(" + leftPadding + "," + topPadding + ")";

        var chart = d3.select("#chart-container")
            .append("svg")
            .attr("class", "chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("viewBox", "0 0 " + chartWidth + " " + chartHeight)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Background rectangle helps visually define the plotting area
        chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // Find max value to build a proportional y scale
        var maxValue = d3.max(data, function (d) {
            return parseFloat(d[expressed]);
        });

        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, maxValue * 1.05]);

        /* Sort states from low to high value.
           This makes the chart easier to read as a ranked comparison. */
        var sortedData = data.slice().sort(function (a, b) {
            return parseFloat(a[expressed]) - parseFloat(b[expressed]);
        });

        // Draw one bar for each German state
        chart.selectAll(".bar")
            .data(sortedData)
            .enter()
            .append("rect")
            .attr("class", function (d) {
                return "bar " + sanitizeClass(d.state_code);
            })
            .attr("width", chartInnerWidth / sortedData.length - 2)
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / sortedData.length) + leftPadding;
            })
            .attr("y", function (d) {
                var value = parseFloat(d[expressed]);
                return yScale(value) + topPadding;
            })
            .attr("height", function (d) {
                var value = parseFloat(d[expressed]);
                return chartInnerHeight - yScale(value);
            })
            .style("fill", function (d) {
                return colorScale(parseFloat(d[expressed]));
            })
            .on("mouseover", function (event, d) {
                highlight(d);
                setLabel(event, d);
            })
            .on("mousemove", moveLabel)
            .on("mouseout", function (event, d) {
                dehighlight(d);
                d3.select(".infoLabel").remove();
            });

        // Dynamic chart title reflects the currently expressed variable
        chart.append("text")
            .attr("x", leftPadding)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .text(attrNames[expressed] + " across German States");

        // Create and place vertical axis
        var yAxis = d3.axisLeft(yScale).ticks(6);

        chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // Add short state-code labels under the bars
        chart.selectAll(".barLabel")
            .data(sortedData)
            .enter()
            .append("text")
            .attr("class", "barLabel")
            .attr("transform", function (d, i) {
                var x = i * (chartInnerWidth / sortedData.length) + leftPadding + (chartInnerWidth / sortedData.length) / 2;
                var y = topPadding + chartInnerHeight + 12;
                return "translate(" + x + "," + y + ") rotate(-60)";
            })
            .text(function (d) {
                return d.state_code;
            });

        // Draw chart frame last so it sits on top of the background
        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    }

    /* Function: highlight
       Purpose: Highlight matching map and chart elements when the user hovers. */
    function highlight(props) {
        var className = sanitizeClass(props.state_code || props.NUTS_ID || "NA");

        d3.selectAll("." + className)
            .style("stroke", "#111")
            .style("stroke-width", "2.5px");
    }

    /* Function: dehighlight
       Purpose: Reset matched map and chart elements back to default styling. */
    function dehighlight(props) {
        var className = sanitizeClass(props.state_code || props.NUTS_ID || "NA");

        d3.selectAll("." + className).each(function () {
            var element = d3.select(this);

            if (element.classed("states")) {
                element
                    .style("stroke", "#666")
                    .style("stroke-width", "1.15px");
            } else if (element.classed("bar")) {
                element
                    .style("stroke", "#fff")
                    .style("stroke-width", "1px");
            }
        });
    }

    /* Function: setLabel
       Purpose: Create a tooltip showing the state name and attribute values. */
    function setLabel(event, props) {
        var stateName = props.state || props.NUTS_NAME || "Unknown state";
        var stateCode = props.state_code || props.NUTS_ID || "NA";

        var labelAttribute =
            "<h2>" + stateName +
            " <span class='infolabel-name'>(" + stateCode + ")</span></h2>";

        var info =
            "<b>" + attrNames[expressed] + ":</b> " + formatValue(expressed, props[expressed]) +
            "<br><b>Population:</b> " + formatValue("population_2023", props.population_2023) +
            "<br><b>Density:</b> " + formatValue("population_density_2023", props.population_density_2023) +
            "<br><b>GDP per Capita:</b> " + formatValue("gdp_per_capita_eur_2023", props.gdp_per_capita_eur_2023) +
            "<br><b>Unemployment:</b> " + formatValue("unemployment_rate_nov_2025", props.unemployment_rate_nov_2025) +
            "<br><b>HDI:</b> " + formatValue("hdi_2022", props.hdi_2022);

        d3.select(".infoLabel").remove();

        d3.select("body")
            .append("div")
            .attr("class", "infoLabel")
            .html(labelAttribute + info);

        moveLabel(event);
    }

    /* Function: moveLabel
       Purpose: Keep the tooltip positioned near the cursor
       while preventing it from running off the screen. */
    function moveLabel(event) {
        var label = d3.select(".infoLabel");
        if (label.empty()) return;

        var labelWidth = label.node().getBoundingClientRect().width;
        var x = event.clientX + 15;
        var y = event.clientY - 75;

        if (x + labelWidth > window.innerWidth - 20) {
            x = event.clientX - labelWidth - 15;
        }

        if (y < 20) {
            y = event.clientY + 20;
        }

        label
            .style("left", x + "px")
            .style("top", y + "px");
    }

    /* Function: formatValue
       Purpose: Format different attribute values for readable tooltip display. */
    function formatValue(attr, value) {
        if (value == null || isNaN(value)) return "No data";

        if (attr === "area_km2") {
            return d3.format(",.0f")(value) + " km²";
        }
        if (attr === "population_2023") {
            return d3.format(",.0f")(value);
        }
        if (attr === "population_density_2023") {
            return d3.format(",.1f")(value);
        }
        if (attr === "hdi_2022") {
            return d3.format(".3f")(value);
        }
        if (attr === "gdp_per_capita_eur_2023") {
            return "€" + d3.format(",.0f")(value);
        }
        if (attr === "unemployment_rate_nov_2025") {
            return d3.format(".1f")(value) + "%";
        }

        return value;
    }

    /* Function: sanitizeClass
       Purpose: Convert codes into safe CSS class names. */
    function sanitizeClass(value) {
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    /* Function: debounce
       Purpose: Prevent resize-triggered redraw from firing too often. */
    function debounce(func, wait) {
        var timeout;

        return function () {
            var context = this;
            var args = arguments;

            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(context, args);
            }, wait);
        };
    }

})();