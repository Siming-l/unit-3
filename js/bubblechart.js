// Week 8 D3 Foundations
// Activity 8 Bubble Chart
// Simple bubble chart based on the Week 2 city population dataset

// execute script when window is loaded
window.onload = function(){

    // =======================
    // SVG dimension variables
    // =======================
    var w = 980,
        h = 500;

    // =======================
    // Create SVG container
    // =======================
    var container = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container");

    // =======================
    // Create inner rectangle
    // =======================
    var innerRect = container.append("rect")
        .datum(400)
        .attr("width", function(d){
            return d * 2;   // 800
        })
        .attr("height", function(d){
            return d;       // 400
        })
        .attr("class", "innerRect")
        .attr("x", 90)
        .attr("y", 70)
        .style("fill", "#FFFFFF");

    // =======================
    // Week 2 dataset
    // =======================
    var cityPop = [
        {
            city: "Madison",
            population: 233209
        },
        {
            city: "Milwaukee",
            population: 594833
        },
        {
            city: "Green Bay",
            population: 104057
        },
        {
            city: "Superior",
            population: 27244
        }
    ];

    // =======================
    // Find minimum and maximum population values
    // =======================
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    // =======================
    // Create scales
    // =======================
    var x = d3.scaleLinear()
        .range([130, 760])
        .domain([0, 3]);

    var y = d3.scaleLinear()
        .range([430, 70])
        .domain([0, 700000]);

    var color = d3.scaleLinear()
        .range(["#FDBE85", "#D94701"])
        .domain([minPop, maxPop]);

    // =======================
    // Create y-axis
    // =======================
    var yAxis = d3.axisLeft(y);

    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(90, 0)")
        .call(yAxis);

    // =======================
    // Create title
    // =======================
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 490)
        .attr("y", 40)
        .text("City Populations");

    // =======================
    // Create circles
    // =======================
    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){
            var area = d.population * 0.01;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function(d, i){
            return x(i);
        })
        .attr("cy", function(d){
            return y(d.population);
        })
        .style("fill", function(d){
            return color(d.population);
        });

    // =======================
    // Create labels
    // =======================
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            return y(d.population) - 8;
        });

    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d, i){
            var radius = Math.sqrt(d.population * 0.01 / Math.PI);
            return x(i) + radius + 5;
        })
        .text(function(d){
            return d.city;
        });

    var format = d3.format(",");

    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d, i){
            var radius = Math.sqrt(d.population * 0.01 / Math.PI);
            return x(i) + radius + 5;
        })
        .attr("dy", "15")
        .text(function(d){
            return "Pop. " + format(d.population);
        });

};