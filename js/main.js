// Lab 2 Final Version
// Coordinated D3 Visualization
// Topic: Socioeconomic Development Across the 16 German States


(function () {

    // ------------------------------------------------------------
    // Global variables used across multiple functions
    // ------------------------------------------------------------

    let csvData, germanyTopo, neighborTopo;

    // Save the map svg and path so they can be reused later
    let mapSvg, mapPath;

    // This object helps quickly match a state code to its feature
    let stateFeatureLookup = {};

    // List of attributes used in the visualization
    var attrArray = [
        "area_km2",
        "population_2023",
        "population_density_2023",
        "hdi_2022",
        "gdp_per_capita_eur_2023",
        "unemployment_rate_nov_2025"
    ];

    // Nicer labels for dropdown, chart title, tooltip, and legend
    var attrNames = {
        area_km2: "Area (km²)",
        population_2023: "Population (2023)",
        population_density_2023: "Population Density (2023)",
        hdi_2022: "HDI (2022)",
        gdp_per_capita_eur_2023: "GDP per Capita (€), 2023",
        unemployment_rate_nov_2025: "Unemployment Rate (Nov. 2025)"
    };

    // Initial attribute shown when the page first loads
    var expressed = "area_km2";

    // Chart size variables
    var chartWidth,
        chartHeight,
        leftPadding = 100,
        rightPadding = 14,
        topPadding = 55,
        bottomPadding = 105,
        chartInnerWidth,
        chartInnerHeight,
        translate,
        yScale;

    // Start drawing when the page loads
    window.onload = setMap;

    // Redraw the visualization when the window is resized
    window.addEventListener("resize", debounce(redrawVisualization, 180));

    // ------------------------------------------------------------
    // Load files
    // ------------------------------------------------------------

    function setMap() {
        // Load CSV data and TopoJSON files
        var promises = [
            d3.csv("data/germany_16_states_lab2.csv"),
            d3.json("data/germany_16_states_lab2.topojson"),
            d3.json("data/germany_neighbor_regions_background.topojson")
        ];

        Promise.all(promises)
            .then(callback)
            .catch(function (error) {
                console.error("Error loading data:", error);
            });
    }

    function callback(data) {
        // Save loaded data
        csvData = data[0];
        germanyTopo = data[1];
        neighborTopo = data[2];

        // Convert numeric values from strings to numbers
        csvData.forEach(function (d) {
            attrArray.forEach(function (attr) {
                d[attr] = parseFloat(d[attr]);
            });
        });

        redrawVisualization();
    }

    // ------------------------------------------------------------
    // Redraw everything
    // ------------------------------------------------------------

    function redrawVisualization() {
        if (!csvData || !germanyTopo || !neighborTopo) return;

        // Clear old graphics before drawing new ones
        d3.select("#map-container").selectAll("*").remove();
        d3.select("#chart-container").selectAll("*").remove();
        d3.select(".infoLabel").remove();

        drawVisualization();
    }

    // ------------------------------------------------------------
    // Main drawing function
    // ------------------------------------------------------------

    function drawVisualization() {
        var mapContainer = document.getElementById("map-container");
        var chartContainer = document.getElementById("chart-container");

        if (!mapContainer || !chartContainer) {
            console.error("Map or chart container not found.");
            return;
        }

        // Set responsive map size
        var mapWidth = mapContainer.clientWidth;
        var mapHeight = window.innerWidth <= 768
            ? Math.max(420, Math.min(560, mapWidth * 0.78))
            : Math.max(560, Math.min(760, mapWidth * 0.72));

        // Set responsive chart size
        chartWidth = chartContainer.clientWidth;
        chartHeight = window.innerWidth <= 768
            ? Math.max(420, Math.min(560, mapHeight))
            : Math.max(560, Math.min(760, mapHeight));

        chartInnerWidth = chartWidth - leftPadding - rightPadding;
        chartInnerHeight = chartHeight - topPadding - bottomPadding;
        translate = "translate(" + leftPadding + "," + topPadding + ")";

        // Create map svg
        mapSvg = d3.select("#map-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Add dropdown menu
        createDropdown(csvData);

        // Create projection for Germany
        var projection = d3.geoConicEqualArea()
            .center([0, 51.0])
            .rotate([-10.5, 0])
            .parallels([47, 55])
            .translate([mapWidth / 2, mapHeight / 2]);

        mapPath = d3.geoPath().projection(projection);

        // Convert TopoJSON to GeoJSON features
        var states = topojson.feature(
            germanyTopo,
            germanyTopo.objects.NUTS_RG_10M_2024_4326
        ).features;

        // Keep only Germany NUTS-1 states
        states = states.filter(function (d) {
            return d.properties.CNTR_CODE === "DE" && d.properties.LEVL_CODE === 1;
        });

        // Join CSV values to state polygons
        states = joinData(states, csvData);

        // Save states in a lookup object for highlighting
        stateFeatureLookup = {};
        states.forEach(function (feature) {
            var code = feature.properties.state_code || feature.properties.NUTS_ID || "NA";
            stateFeatureLookup[code] = feature;
        });

        // Fit the projection to Germany only
        projection.fitExtent(
            [[30, 30], [mapWidth - 30, mapHeight - 30]],
            {
                type: "FeatureCollection",
                features: states
            }
        );

        // Build neighboring countries background
        var neighborCountries = buildNeighborCountries(neighborTopo);

        // Create one color scale for both map and chart
        var colorScale = makeColorScale(csvData);

        // Draw everything
        setGraticule(mapSvg, mapPath);
        setNeighbors(neighborCountries, mapSvg, mapPath);
        setEnumerationUnits(states, mapSvg, mapPath, colorScale);
        setChart(csvData, colorScale);
        setLegend(colorScale);
    }

    // ------------------------------------------------------------
    // Dropdown menu
    // ------------------------------------------------------------

    function createDropdown(csvData) {
        // Remove old dropdown if the page redraws
        d3.select(".dropdown").remove();

        var dropdown = d3.select("#map-container")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                if (this.value !== "none") {
                    changeAttribute(this.value, csvData);
                }
            });

        // Add a title option
        dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", true)
            .attr("value", "none")
            .text("Select an indicator");

        // Add all attributes to the menu
        dropdown.selectAll(".attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("class", "attrOptions")
            .attr("value", function (d) { return d; })
            .property("selected", function (d) { return d === expressed; })
            .text(function (d) { return attrNames[d]; });
    }

    // ------------------------------------------------------------
    // Join CSV data to GeoJSON features
    // ------------------------------------------------------------

    function joinData(states, csvData) {
        var csvLookup = {};

        // Make a lookup table using the NUTS code
        csvData.forEach(function (row) {
            var key = String(row.nuts1).trim();
            csvLookup[key] = row;
        });

        // Copy CSV values into each matching state feature
        states.forEach(function (feature) {
            var props = feature.properties;
            var key = String(props.NUTS_ID).trim();
            var match = csvLookup[key];

            if (match) {
                props.state = match.state;
                props.state_code = match.state_code;

                attrArray.forEach(function (attr) {
                    props[attr] = match[attr];
                });
            } else {
                // If something does not match, fill with fallback values
                props.state = props.NUTS_NAME || "Unknown state";
                props.state_code = props.NUTS_ID || "NA";

                attrArray.forEach(function (attr) {
                    props[attr] = null;
                });
            }
        });

        return states;
    }

    // ------------------------------------------------------------
    // Build background countries
    // ------------------------------------------------------------

    function buildNeighborCountries(topology) {
        // Group neighboring geometries by country code
        // Germany is excluded because it is the main thematic layer

        var objectName = "germany_neighbor_regions_background.topojson";
        var topoObject = topology.objects[objectName];

        // If the object name is different, use the first available key
        if (!topoObject) {
            var objectKeys = Object.keys(topology.objects);
            topoObject = topology.objects[objectKeys[0]];
        }

        if (!topoObject || !topoObject.geometries) {
            console.warn("Neighbor TopoJSON object not found or has no geometries.");
            return [];
        }

        var countryGroups = d3.group(
            topoObject.geometries.filter(function (g) {
                var props = g.properties || {};
                return props.CNTR_CODE && props.CNTR_CODE !== "DE";
            }),
            function (g) {
                return g.properties.CNTR_CODE;
            }
        );

        // Merge pieces of the same country into one feature
        var mergedCountries = [];
        countryGroups.forEach(function (geoms, countryCode) {
            var mergedGeometry = topojson.merge(topology, geoms);

            mergedCountries.push({
                type: "Feature",
                properties: {
                    CNTR_CODE: countryCode
                },
                geometry: mergedGeometry
            });
        });

        return mergedCountries;
    }

    // ------------------------------------------------------------
    // Color scale
    // ------------------------------------------------------------

    function makeColorScale(data) {
        // Five green classes for the choropleth
        var colorClasses = [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c"
        ];

        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        // Build the domain using the current attribute
        var domainArray = [];
        data.forEach(function (d) {
            var value = parseFloat(d[expressed]);
            if (!isNaN(value)) {
                domainArray.push(value);
            }
        });

        colorScale.domain(domainArray);
        return colorScale;
    }

    function choropleth(props, colorScale) {
        // Return a color based on the current attribute value
        var value = props[expressed];
        if (value != null && !isNaN(value)) {
            return colorScale(value);
        } else {
            return "#ccc";
        }
    }

    // ------------------------------------------------------------
    // Legend
    // ------------------------------------------------------------

    function setLegend(colorScale) {
        // Remove old legend before drawing a new one
        d3.select(".legend").remove();

        var legendWidth = 210;
        var legendHeight = 150;

        var legend = d3.select("#map-container")
            .append("svg")
            .attr("class", "legend")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("position", "absolute")
            .style("right", "12px")
            .style("bottom", "12px")
            .style("z-index", "15")
            .style("background", "rgba(255,255,255,0.94)")
            .style("border", "1px solid #999")
            .style("border-radius", "4px")
            .style("box-shadow", "2px 2px 6px rgba(0,0,0,0.18)");

        // Legend title
        legend.append("text")
            .attr("x", 12)
            .attr("y", 20)
            .style("font-size", "12px")
            .style("font-weight", "700")
            .text(attrNames[expressed]);

        var colors = colorScale.range();
        var quantiles = colorScale.quantiles();
        var domainMin = d3.min(colorScale.domain());
        var domainMax = d3.max(colorScale.domain());

        // Build the legend intervals
        var legendData = colors.map(function (color, i) {
            var minValue = (i === 0) ? domainMin : quantiles[i - 1];
            var maxValue = (i < quantiles.length) ? quantiles[i] : domainMax;

            return {
                color: color,
                min: minValue,
                max: maxValue
            };
        });

        var legendItems = legend.selectAll(".legendItem")
            .data(legendData)
            .enter()
            .append("g")
            .attr("class", "legendItem")
            .attr("transform", function (d, i) {
                return "translate(12," + (i * 22 + 34) + ")";
            });

        legendItems.append("rect")
            .attr("width", 18)
            .attr("height", 14)
            .attr("stroke", "#777")
            .attr("stroke-width", 0.5)
            .style("fill", function (d) {
                return d.color;
            });

        legendItems.append("text")
            .attr("x", 26)
            .attr("y", 11)
            .style("font-size", "11px")
            .text(function (d) {
                return formatLegendValue(d.min) + " - " + formatLegendValue(d.max);
            });
    }

    function formatLegendValue(value) {
        // Format legend values based on the current attribute
        if (value == null || isNaN(value)) return "No data";

        if (expressed === "area_km2") {
            return d3.format(",.0f")(value);
        } else if (expressed === "population_2023") {
            return d3.format(",.0f")(value);
        } else if (expressed === "population_density_2023") {
            return d3.format(",.1f")(value);
        } else if (expressed === "hdi_2022") {
            return d3.format(".2f")(value);
        } else if (expressed === "gdp_per_capita_eur_2023") {
            return "€" + d3.format(",.0f")(value);
        } else if (expressed === "unemployment_rate_nov_2025") {
            return d3.format(".1f")(value) + "%";
        }

        return d3.format(",.0f")(value);
    }

    // ------------------------------------------------------------
    // Map drawing functions
    // ------------------------------------------------------------

    function setGraticule(map, path) {
        // Add graticule lines for background reference
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

    function setNeighbors(neighborCountries, map, path) {
        // Draw neighboring countries behind Germany
        map.selectAll(".neighbor")
            .data(neighborCountries)
            .enter()
            .append("path")
            .attr("class", "neighbor")
            .attr("d", path);
    }

    function setEnumerationUnits(states, map, path, colorScale) {
        // Draw Germany states
        var regions = map.selectAll(".states")
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
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", function (event) {
                moveLabel(event);
            });

        // Save original outline style
        regions.append("desc")
            .text('{"stroke": "#666", "stroke-width": "1.15px"}');
    }

    // ------------------------------------------------------------
    // Bar chart
    // ------------------------------------------------------------

    function setChart(data, colorScale) {
        // Create chart svg
        var chart = d3.select("#chart-container")
            .append("svg")
            .attr("class", "chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("viewBox", "0 0 " + chartWidth + " " + chartHeight)
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Add chart background
        chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // Set y scale
        updateYScale(data);

        // Sort data from highest to lowest
        var sortedData = data.slice().sort(function (a, b) {
            return b[expressed] - a[expressed];
        });

        // Create bars
        var bars = chart.selectAll(".bar")
            .data(sortedData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + sanitizeClass(d.state_code);
            })
            .attr("width", chartInnerWidth / sortedData.length - 2)
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
            })
            .on("mousemove", function (event) {
                moveLabel(event);
            });

        // Save original bar outline style
        bars.append("desc")
            .text('{"stroke": "#ffffff", "stroke-width": "1px"}');

        // Add chart title
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", 18)
            .attr("y", 30);

        // Add y-axis group
        chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate);

        // Add short state labels below the bars
        chart.selectAll(".barLabel")
            .data(sortedData)
            .enter()
            .append("text")
            .attr("class", function (d) {
                return "barLabel " + sanitizeClass(d.state_code);
            })
            .text(function (d) {
                return d.state_code;
            });

        // Add chart frame
        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // Draw bars for the first time
        updateChart(d3.selectAll(".bar"), sortedData.length, colorScale);
    }

    // ------------------------------------------------------------
    // Reexpress interaction
    // ------------------------------------------------------------

    function changeAttribute(attribute, csvData) {
        // Update the selected attribute
        expressed = attribute;

        // Create a new color scale
        var colorScale = makeColorScale(csvData);

        // Recolor the map
        d3.selectAll(".states")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale);
            });

        // Update y scale
        updateYScale(csvData);

        // Sort and animate the bars
        var bars = d3.selectAll(".bar")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 20;
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);

        // Update the legend too
        setLegend(colorScale);

        // Remove any open label or highlight
        d3.select(".infoLabel").remove();
        d3.selectAll(".stateHighlight").remove();
    }

    function updateYScale(data) {
        // Update the y-axis domain using the max value
        var maxValue = d3.max(data, function (d) {
            return parseFloat(d[expressed]);
        });

        yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, maxValue * 1.05]);
    }

    function updateChart(bars, n, colorScale) {
        // Position, resize, and recolor the bars
        bars.attr("x", function (d, i) {
                return i * (chartInnerWidth / n) + leftPadding;
            })
            .attr("height", function (d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d) {
                return yScale(parseFloat(d[expressed])) + topPadding;
            })
            .style("fill", function (d) {
                var value = d[expressed];
                if (value != null && !isNaN(value)) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        // Update chart title
        d3.select(".chartTitle")
            .text(attrNames[expressed] + " across German states");

        // Format the y-axis differently depending on the variable
        var yAxis;

        if (expressed === "population_2023") {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(d3.format(","));
        } else if (expressed === "gdp_per_capita_eur_2023") {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(function (d) {
                    return "€" + d3.format(",.0f")(d);
                });
        } else if (expressed === "population_density_2023") {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(d3.format(",.0f"));
        } else if (expressed === "hdi_2022") {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(d3.format(".2f"));
        } else if (expressed === "unemployment_rate_nov_2025") {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(function (d) {
                    return d3.format(".1f")(d) + "%";
                });
        } else {
            yAxis = d3.axisLeft(yScale)
                .ticks(6)
                .tickFormat(d3.format(",.0f"));
        }

        // Update axis with animation
        d3.select(".axis")
            .transition()
            .duration(1000)
            .call(yAxis);

        // Move bar labels when sorting changes
        d3.selectAll(".barLabel")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 20;
            })
            .duration(500)
            .attr("transform", function (d, i) {
                var x = i * (chartInnerWidth / n) + leftPadding + (chartInnerWidth / n) / 2;
                var y = topPadding + chartInnerHeight + 12;
                return "translate(" + x + "," + y + ") rotate(-60)";
            });
    }

    // ------------------------------------------------------------
    // Retrieve interaction: highlight and dehighlight
    // ------------------------------------------------------------

    function highlight(props) {
        var className = sanitizeClass(props.state_code || props.NUTS_ID || "NA");
        var stateCode = props.state_code || props.NUTS_ID || "NA";

        // Remove previous highlight
        d3.selectAll(".stateHighlight").remove();

        // Draw highlight around the matching state
        var feature = stateFeatureLookup[stateCode];
        if (feature) {
            var outerFeature = getExteriorBoundaryFeature(feature);

            mapSvg.append("path")
                .datum(outerFeature)
                .attr("class", "stateHighlight")
                .attr("d", mapPath);
        }

        // Highlight the matching bar
        d3.selectAll(".bar." + className)
            .style("stroke", "blue")
            .style("stroke-width", "2.5px");

        // Show info label
        setLabel(props);
    }

    function dehighlight(props) {
        var className = sanitizeClass(props.state_code || props.NUTS_ID || "NA");

        // Reset bar style
        d3.selectAll(".bar." + className)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        // Remove map highlight and label
        d3.selectAll(".stateHighlight").remove();
        d3.select(".infoLabel").remove();
    }

    function getStyle(element, styleName) {
        // Read saved style values from desc
        var desc = d3.select(element).select("desc");

        if (desc.empty()) {
            if (styleName === "stroke") return "#ffffff";
            if (styleName === "stroke-width") return "1px";
        }

        var styleText = desc.text();
        var styleObject = JSON.parse(styleText);
        return styleObject[styleName];
    }

    function getExteriorBoundaryFeature(feature) {
        // Keep only the outer boundary for highlight drawing
        var geometry = feature.geometry;
        var newGeometry;

        if (geometry.type === "Polygon") {
            newGeometry = {
                type: "Polygon",
                coordinates: [geometry.coordinates[0]]
            };
        } else if (geometry.type === "MultiPolygon") {
            newGeometry = {
                type: "MultiPolygon",
                coordinates: geometry.coordinates.map(function (polygon) {
                    return [polygon[0]];
                })
            };
        } else {
            newGeometry = geometry;
        }

        return {
            type: "Feature",
            properties: feature.properties,
            geometry: newGeometry
        };
    }

    // ------------------------------------------------------------
    // Dynamic label
    // ------------------------------------------------------------

    function setLabel(props) {
        // Create label content for the hovered state
        var stateName = props.state || props.NUTS_NAME || "Unknown state";
        var stateCode = props.state_code || props.NUTS_ID || "NA";
        var valueText = formatValue(expressed, props[expressed]);

        var labelHtml =
            "<h2>" + stateName + " (" + stateCode + ")" + "</h2>" +
            "<div><b>" + attrNames[expressed] + ":</b> " + valueText + "</div>";

        // Remove old label first
        d3.select(".infoLabel").remove();

        d3.select("body")
            .append("div")
            .attr("class", "infoLabel")
            .html(labelHtml);
    }

    function moveLabel(event) {
        // Make the label follow the mouse
        var label = d3.select(".infoLabel");
        if (label.empty()) return;

        var labelWidth = label.node().getBoundingClientRect().width;

        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        var y = event.clientY < 75 ? y2 : y1;

        label
            .style("left", x + "px")
            .style("top", y + "px");
    }

    // ------------------------------------------------------------
    // Value formatting
    // ------------------------------------------------------------

    function formatValue(attr, value) {
        if (value == null || isNaN(value)) return "No data";

        if (attr === "area_km2") {
            return d3.format(",.0f")(value) + " km²";
        }
        if (attr === "population_2023") {
            return d3.format(",.0f")(value) + " people";
        }
        if (attr === "population_density_2023") {
            return d3.format(",.1f")(value) + " people per km²";
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

    // ------------------------------------------------------------
    // Helper functions
    // ------------------------------------------------------------

    function sanitizeClass(value) {
        // Replace unsafe characters for CSS class names
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function debounce(func, wait) {
        // Delay repeated resize calls
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