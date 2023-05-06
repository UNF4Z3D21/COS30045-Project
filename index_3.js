function put() {
    // Define the dimensions of the SVG element
var svgWidth = 1000;
var svgHeight = 360;

// Define the margins and padding for the chart
var margin = {top: 60, right: 20, bottom: 30, left: 50};
var padding = 40;

// Define the dimensions of the chart area
var chartWidth = svgWidth - margin.left - margin.right;
var chartHeight = svgHeight - margin.top - margin.bottom;

// Create the SVG element
var svg = d3.select("body")
  .append("svg")
  .attr("width", svgWidth)
  .attr("height", svgHeight);

// Create the chart area
var chart = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Define the scales and axes
var xScale = d3.scalePoint().range([padding, chartWidth - padding]).padding(0.5);
var yScale = d3.scaleLinear().range([chartHeight - padding, padding + 10]).nice();

var xAxis = d3.axisBottom(xScale);
var yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".2s"));

// Load the CSV data
d3.csv("asylum_seekers_monthly.csv", function(d) {
  // Parse numerical values
  d.Value = +d.Value;
  d.Year = +d.Year;
  return d;
}).then(function(data) {
  // Filter the data to only include records for Syria
  var syriaData = data.filter(function(d) { return d.Origin === "Syrian Arab Rep."; });

  // Group the data by year and sum the values
  var yearData = Array.from(d3.group(syriaData, d => d.Year), ([key, value]) => ({
    key: key,
    value: d3.sum(value, d => d.Value)}));

  /// Set the domains for the x and y scales
  xScale.domain(yearData.map(function (d) {
    return d.key;
  }));
  yScale.domain([0, d3.max(yearData, function (d) {
    return d.value;
  }) + 50000]);

  // Add the x and y axes

  var line = d3.line()
  .x(function(d) { return xScale(d.key); })
  .y(function(d) { return yScale(d.value); });

  
    // Add the line to the chart
    chart.append("path")
      .datum(yearData)
      .attr("class", "line")
      .attr("d", line)
      
    // Add the x-axis to the chart
    chart.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + (chartHeight - padding) + ")")
      .call(xAxis);

    // Add the x-axis label
    chart.append("text")
      .attr("class", "axis-label")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + (padding *0.1))
      .text("Year");

  // Add the y-axis to the chart
  chart.append("g")
    .attr("class", "y-axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);
    });

   // Add the y-axis label
   chart.append("text")
   .attr("class", "axis-label")
   .attr("x", -chartHeight / 2)
   .attr("y", -padding * 0.35)
   .attr("transform", "rotate(-90)")
   .attr("text-anchor", "middle")
   .text("Number of Refugees (in thousands)");

 // Add the chart title
 chart.append("text")
   .attr("class", "chart-title")
   .attr("x", chartWidth / 2)
   .attr("y", padding / 2)
   .attr("text-anchor", "middle")
   .text("Total Number of People Who Left Syria by Year");

   
}

// Call the function when the window loads
window.onload = put;
