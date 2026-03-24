// Activity 9: D3 Basemap
// Germany states basemap with neighboring regional background
// Interaction for lab 2

window.onload = setMap;
window.addEventListener("resize", debounce(redrawMap, 180));

// Global variables for loaded datasets
let csvData, germanyTopo, neighborTopo;

// Attribute array from the Germany CSV file
var attrArray = [
    "area_km2",
    "population_2023",
    "population_density_2023",
    "hdi_2022",
    "gdp_per_capita_eur_2023",
    "unemployment_rate_nov_2025"
];

// Human-readable labels for tooltip
var attrNames = {
    area_km2: "Area (km²)",
    population_2023: "Population (2023)",
    population_density_2023: "Population Density (2023)",
    hdi_2022: "HDI (2022)",
    gdp_per_capita_eur_2023: "GDP per Capita (€ 2023)",
    unemployment_rate_nov_2025: "Unemployment Rate (2025)"
};

// Default attribute shown first in tooltip
var expressed = attrArray[0];

// Load external files
function setMap() {
    var promises = [
        d3.csv("data/germany_16_states_lab2.csv"),
        d3.json("data/germany_16_states_lab2.topojson"),
        d3.json("data/germany_neighbor_regions_background.topojson")
    ];

    Promise.all(promises).then(callback).catch(function(error) {
        console.error("Error loading data:", error);
    });

    function callback(data) {
        csvData = data[0];
        germanyTopo = data[1];
        neighborTopo = data[2];

        console.log("CSV loaded:", csvData);
        console.log("Germany TopoJSON loaded:", germanyTopo);
        console.log("Neighbor TopoJSON loaded:", neighborTopo);

        drawMap();
    }
}

// Redraw map after resize
function redrawMap() {
    if (csvData && germanyTopo && neighborTopo) {
        drawMap();
    }
}

// Draw the map
function drawMap() {
    var container = document.getElementById("map-container");

    if (!container) {
        console.error("map-container not found in index.html");
        return;
    }

    // Clear previous map before redraw
    d3.select("#map-container").selectAll("*").remove();

    var width = container.clientWidth;
    var height = Math.max(560, Math.min(820, width * 0.72));

    // Create SVG container
    var map = d3.select("#map-container")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Projection for Germany
    var projection = d3.geoConicEqualArea()
        .center([0, 51.0])
        .rotate([-10.5, 0])
        .parallels([47, 55])
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    // Convert Germany TopoJSON to GeoJSON
    var states = topojson.feature(
        germanyTopo,
        germanyTopo.objects.NUTS_RG_10M_2024_4326
    ).features;

    // Keep only Germany NUTS level 1 states
    states = states.filter(function(d) {
        return d.properties.CNTR_CODE === "DE" && d.properties.LEVL_CODE === 1;
    });

    // Join CSV data to state polygons
    states = joinData(states, csvData);

    // Convert neighboring background TopoJSON to GeoJSON
    var neighbors = topojson.feature(
        neighborTopo,
        neighborTopo.objects["germany_neighbor_regions_background.topojson"]
    ).features;

    // Fit projection to Germany only
    projection.fitExtent(
        [[30, 30], [width - 30, height - 30]],
        {
            type: "FeatureCollection",
            features: states
        }
    );

    // Optional graticule
    var graticule = d3.geoGraticule()
        .step([5, 5]);

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

    // Draw neighboring regions first
    map.selectAll(".neighbor")
        .data(neighbors)
        .enter()
        .append("path")
        .attr("class", "neighbor")
        .attr("d", path);

    // Draw Germany states on top
    map.selectAll(".states")
        .data(states)
        .enter()
        .append("path")
        .attr("class", function(d) {
            var code = d.properties.state_code || d.properties.NUTS_ID || "NA";
            return "states " + code;
        })
        .attr("d", path)
        .on("mouseover", function(event, d) {
            highlight(d.properties);
            setLabel(event, d.properties);
        })
        .on("mousemove", moveLabel)
        .on("mouseout", function(event, d) {
            dehighlight(d.properties);
            d3.select(".infoLabel").remove();
        });

    console.log("Germany states drawn:", states.length);
    console.log("Neighbor regions drawn:", neighbors.length);
}

// Join CSV attributes to GeoJSON by matching NUTS1 codes
function joinData(states, csvData) {
    var csvLookup = {};

    csvData.forEach(function(row) {
        var key = String(row.nuts1).trim();
        csvLookup[key] = row;
    });

    states.forEach(function(feature) {
        var geojsonProps = feature.properties;
        var geojsonKey = String(geojsonProps.NUTS_ID).trim();
        var match = csvLookup[geojsonKey];

        if (match) {
            geojsonProps.state = match.state;
            geojsonProps.state_code = match.state_code;

            attrArray.forEach(function(attr) {
                geojsonProps[attr] = parseFloat(match[attr]);
            });
        } else {
            console.warn("No CSV match found for:", geojsonKey, geojsonProps.NUTS_NAME);

            geojsonProps.state = geojsonProps.NUTS_NAME || "Unknown state";
            geojsonProps.state_code = geojsonProps.NUTS_ID || "NA";

            attrArray.forEach(function(attr) {
                geojsonProps[attr] = null;
            });
        }
    });

    return states;
}

// Highlight state boundary on hover
function highlight(props) {
    var className = props.state_code || props.NUTS_ID || "NA";

    d3.selectAll("." + className)
        .style("stroke", "#111")
        .style("stroke-width", "2px");
}

// Reset style on mouseout
function dehighlight(props) {
    var className = props.state_code || props.NUTS_ID || "NA";

    d3.selectAll("." + className)
        .style("stroke", "#666")
        .style("stroke-width", "1.15px");
}

// Create tooltip
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

// Move tooltip with cursor
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

// Format values for tooltip
function formatValue(attr, value) {
    if (value == null || isNaN(value)) return "No data";

    if (attr === "area_km2") {
        return d3.format(",.0f")(value);
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

// Debounce helper for resize redraw
function debounce(func, wait) {
    var timeout;

    return function() {
        var context = this;
        var args = arguments;

        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}