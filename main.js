document.addEventListener("DOMContentLoaded", function () {
  // global variable 'currentYear' initially set to 2011
  var currentYear = 2011;
  var intervalId;

  //load csv data
  Promise.all([
    d3.csv("demographics.csv"),
    d3.csv("asylum_seekers.csv"),
    d3.json("world_countries.json"),
  ]).then(function (values) {
    //storing data from data files into variables
    immigration_data = values[0];
    demographic_data = values[1].filter((d) => d.Origin == "Syrian Arab Rep.");
    map_data = values[2];

    immigration_data.forEach((element) => {
      element["F: Total"] = +element["F: Total"];
      element["M: Total"] = +element["M: Total"];
    });
    demographic_data.forEach((d) => {
      d.decisions_recognized = +d.decisions_recognized;
    });

    createMap(immigration_data, map_data, currentYear, demographic_data);
  });

  // Get references to the play button, pause button, and year slider
  var playButton = document.getElementById("play-button"); // replace 'play-button' with the id of your play button
  var pauseButton = document.getElementById("pause-button"); // replace 'pause-button' with the id of your pause button
  var yearSlider = document.getElementById("year-slider"); // replace 'year-slider' with the id of your year slider

  function createMap(immigration_data, data, year, demographic_data) {
    // Define the dimensions and margins of the graph. This space will be used for axes' labels, title etc.
    var margin = { top: 50, right: 20, bottom: 80, left: 100 },
      width = 1200 - margin.left - margin.right,
      height = 800 - margin.top - margin.bottom;

    // Filter data for the specific year
    year_data_pie = immigration_data.filter((d) => d.Year == year);

    year_data = demographic_data.filter((d) => d.Year == year);

    // Create a list of unique countries from the data
    const countries = Array.from(
      new Set(
        year_data.map((d) => d["Country / territory of asylum/residence"])
      )
    );

    // Map over the array of countries, and for each country calculate the total number of female and male immigrants
    const result = countries.map((country) => ({
      country,
      // Filter all records for a specific country and then sum up the female immigrants
      female: year_data_pie
        .filter((d) => d["Country / territory of asylum/residence"] === country)
        .reduce((acc, curr) => +acc + +curr["F: Total"], 0),
      // Similar to above, but sum up the male immigrants
      male: year_data_pie
        .filter((d) => d["Country / territory of asylum/residence"] === country)
        .reduce((acc, curr) => +acc + +curr["M: Total"], 0),
      immigrants: year_data
        .filter((d) => d["Country / territory of asylum/residence"] === country)
        .reduce((acc, curr) => +acc + +curr["decisions_recognized"], 0),
    }));

    // For each record in the result, calculate the total immigrants by adding up the number of female and male immigrants
    result.forEach((d) => {
      d.total = d.female + d.male;
    });

    // Define a scale for the radii of the circles. This scale is a square root scale which is used for area encoding of data
    var scale = d3
      .scaleSqrt()
      .domain([0, d3.max(result, (d) => d.immigrants)]) // Domain represents the range of input values
      .range([1, 15]); // Range represents the range of output values

    // Join the map data with the result data. For each feature in the map data, find the corresponding record from the result data and assign the total immigrants
    data.features.forEach((feature) => {
      var countryData = result.find(
        (d) => d.country === feature.properties.name
      );
      if (countryData) {
        feature.total = countryData.immigrants;
      } else {
        feature.total = null;
      }
    });

    // Append the SVG object to the div with the id "charts". The SVG will have the specified width and height
    var svg = d3
      .select("#charts")
      .append("svg")
      .attr("id", "map")
      .attr("width", width)
      .attr("height", height);

    var Mapsvg = svg.append("g");

    // Define a projection for the map. This projection will translate and scale the geographical coordinates to fit into the SVG
    projection = d3
      .geoMercator()
      .translate([width / 2 - 50, height / 2 + 130]) // translate to center of screen
      .scale([160]); // scale things down so see entire world

    // Define a path generator that converts GeoJSON to SVG paths, and set the defined projection for it
    path = d3.geoPath().projection(projection);

    // Add a title to the map. The title is centered at the top of the map
    title = Mapsvg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "20px");

    // Draw the map by appending paths for each country. Excludes Greenland and Antarctica
    Mapsvg.selectAll("path")
      .data(data.features.filter((d) => d.id !== "GRL" && d.id !== "ATA"))
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "black")
      .attr("class", "Country")
      .attr("stroke-width", "1")
      .attr("fill", "grey");

    // Add circles to the map for each country. The radius of the circle is based on the total immigrants and the location is based on the centroid of the country
    Mapsvg.selectAll("circle")
      .data(data.features)
      .enter()
      .append("circle")
      .attr("cx", (d) => path.centroid(d)[0])
      .attr("cy", (d) => path.centroid(d)[1])
      .attr("r", (d) => (d.total ? scale(d.total) : 0))
      .style("fill", "red") // Or any other color
      .style("opacity", 0.6)
      .attr("stroke", "white")
      // Define mouseover event to highlight the circle and show the tooltip with country name and total immigrants
      // Define mouseleave event to restore the circle and hide the tooltip
      // Define click event to filter data for the clicked country and call createPieChart function
      .on("mousemove", function (event, d) {
        d3.select(this)
          .attr("stroke", "black")
          .attr("stroke-width", "2px")
          .style("cursor", "pointer")
          .style("opacity", 1);

        d3.select("#tooltip")
          .html(
            "<b>Country:</b>" +
              d.properties.name +
              "<br/><b>Total immigrants: </b>" +
              d.total
          )
          .style("left", event.pageX + 25 + "px")
          .style("top", event.pageY - 28 + "px")
          .style("opacity", 1);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", "1px")
          .style("cursor", "default")
          .style("opacity", 0.6);
        d3.select("#tooltip")
          .style("opacity", 0)
          .style("left", 0 + "px")
          .style("top", 0 + "px");
      })
      .on("click", function (event, d) {
        var countryData = immigration_data.filter(
          (a) =>
            a["Country / territory of asylum/residence"] == d.properties.name
        );
        const pieData = [
          {
            female: d3.sum(countryData, (a) => a["F: Total"]),
            male: d3.sum(countryData, (a) => a["M: Total"]),
          },
        ];
        createPieChart(pieData, d.properties.name);
      });

    // Append text to the SVG to display the current year. The text is positioned at the top-left corner of the map
    var yearText = Mapsvg.append("text")
      .attr("x", 50)
      .attr("y", 50)
      .style("font-size", "20px")
      .text(`Year: ${currentYear}`);

    // Define zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", function (event) {
        Mapsvg.attr("transform", event.transform);
      });

    // Apply zoom behavior
    svg.call(zoom);

    function updateYear() {
      // Increment the current year. If it's already 2016, reset it to 2011.
      // This allows for the visualization to loop through the years 2011-2016
      currentYear = currentYear < 2016 ? currentYear + 1 : 2011;

      // Update the slider's value to match the current year. This is important for keeping the slider in sync with the current state of the visualization.
      yearSlider.value = currentYear;

      // Filter the data for the current year. This gives us a new dataset that only includes records for the current year.
      // Filter data for the specific year
      year_data_pie = immigration_data.filter((d) => d.Year == currentYear);

      year_data = demographic_data.filter((d) => d.Year == currentYear);

      // Create a list of unique countries from the data
      const countries = Array.from(
        new Set(
          year_data.map((d) => d["Country / territory of asylum/residence"])
        )
      );

      // Map over the array of countries, and for each country calculate the total number of female and male immigrants
      const result = countries.map((country) => ({
        country,
        // Filter all records for a specific country and then sum up the female immigrants
        female: year_data_pie
          .filter(
            (d) => d["Country / territory of asylum/residence"] === country
          )
          .reduce((acc, curr) => +acc + +curr["F: Total"], 0),
        // Similar to above, but sum up the male immigrants
        male: year_data_pie
          .filter(
            (d) => d["Country / territory of asylum/residence"] === country
          )
          .reduce((acc, curr) => +acc + +curr["M: Total"], 0),
        immigrants: year_data
          .filter(
            (d) => d["Country / territory of asylum/residence"] === country
          )
          .reduce((acc, curr) => +acc + +curr["decisions_recognized"], 0),
      }));

      // For each record in the result, calculate the total immigrants by adding up the number of female and male immigrants
      result.forEach((d) => {
        d.total = d.female + d.male;
      });

      // Update the domain of the scale to match the new data. This ensures that the radius of the circles will be appropriately sized for the current year's data.
      scale.domain([0, d3.max(result, (d) => d.immigrants)]);

      // Join the map data with the result data. This associates each country in the map with its corresponding data from the result array.
      data.features.forEach((feature) => {
        var countryData = result.find(
          (d) => d.country === feature.properties.name
        );
        if (countryData) {
          feature.total = countryData.immigrants;
        } else {
          feature.total = null;
        }
      });

      // Update the circles on the map to reflect the new data. This includes both updating the data associated with each circle and adjusting the radius of each circle.
      Mapsvg.selectAll("circle")
        .data(data.features)
        .transition() // Start a transition to animate the changes.
        .duration(1000) // Set the duration of the transition to 1000 milliseconds.
        .attr("r", (d) => (d.total ? scale(d.total) : 0)); // Adjust the radius of each circle based on the new data.

      // Update the year text to reflect the new current year.
      yearText.text(`Year: ${currentYear}`);
    }

    // The play button's click event listener
    playButton.addEventListener("click", function () {
      // If the interval is not already running (intervalId is falsy), start it
      // The setInterval function runs updateYear function every 1000 milliseconds (1 second)
      // and assigns the ID it returns to intervalId to control the interval later
      if (!intervalId) {
        intervalId = setInterval(updateYear, 1000);
      }
    });

    // The pause button's click event listener
    pauseButton.addEventListener("click", function () {
      // If the interval is currently running (intervalId is truthy), stop it
      // clearInterval function stops the interval with the given ID
      if (intervalId) {
        clearInterval(intervalId);
        // Reset intervalId to null to indicate that the interval is not running
        intervalId = null;
      }
    });

    // The slider's input event listener
    yearSlider.addEventListener("input", function () {
      // When the slider value changes, update the current year
      // The plus sign before yearSlider.value is a shorthand to convert the string value to a number
      currentYear = +yearSlider.value;

      // Call the updateYear function immediately when the slider value changes
      // This makes the map show the new year's data right away, without waiting for the next interval
      updateYear();
    });
  }
  function createPieChart(data, countryName) {
    // Remove any existing pie chart
    d3.select(".pie").remove();
    // Convert the original object data into an array of key-value pair objects
    data = Object.keys(data[0]).map((key) => ({
      key: key, // key is the property name (e.g., 'female' or 'male')
      value: data[0][key], // value is the property value (e.g., 5814154)
    }));

    // Calculate the sum of all values (i.e., total population)
    const sum = d3.sum(data, (d) => d.value);

    // Define dimensions for the chart
    var width = 300;
    var height = 500;
    var radius = Math.min(width, height) / 2; // Radius is half the smaller of width and height

    // Create an SVG element in the body, set its size, and move its center to the middle of the element
    var svg = d3
      .select("body")
      .append("svg")
      .attr("class", "pie") // 'pie' class allows us to easily find/remove it later
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + 950 + "," + -550 + ")")
      .append("g") // g element groups SVG shapes together
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    if (sum == 0) {
      // Add a title to the pie chart
      svg
        .append("text")
        .attr("x", 0)
        .attr("y", radius + 20) // Position the title above the pie chart
        .attr("text-anchor", "middle") // Center the title
        .style("font-size", "17px")
        .style("text-decoration", "underline") // Underline the title
        .text("No Gender Distribution Available"); // The title text includes the country name
    } else {
      // Generate the arcs for pie slices
      var arc = d3.arc().innerRadius(0).outerRadius(radius);

      // Compute the pie slice angles based on their values
      var pie = d3
        .pie()
        .value(function (d) {
          return d.value;
        })
        .sort(null); // Keeps original data's order

      // Draw the pie slices
      var path = svg
        .selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc) // "d" attribute defines the path of the slice
        .attr("fill-opacity", 0.75) // 75% opacity
        .attr("fill", function (d, i) {
          // Fill pie slices: pink for females, blue for males
          return i === 0 ? "pink" : "blue";
        })
        .each(function (d) {
          this._current = d; // Store the initial angles for later use
        });

      // Define arc for labels
      var labelArc = d3
        .arc()
        .innerRadius(radius - 50)
        .outerRadius(radius - 150);

      // Add labels
      svg
        .selectAll("text")
        .data(pie(data))
        .enter()
        .append("text")
        .attr("transform", function (d) {
          // Position each label at its slice's centroid, slightly offset to avoid collision with the slice
          var c = labelArc.centroid(d);
          return "translate(" + c[0] * 1.5 + "," + c[1] * 1.5 + ")";
        })
        .attr("text-anchor", "middle") // Center the labels
        .style("font-size", "16px")
        .text(function (d) {
          // Each label shows the key and the percentage of the total population
          return (
            d.data.key + ": " + ((d.data.value / sum) * 100).toFixed(2) + "%"
          );
        });

      // Add a title to the pie chart
      svg
        .append("text")
        .attr("x", 0)
        .attr("y", radius + 20) // Position the title above the pie chart
        .attr("text-anchor", "middle") // Center the title
        .style("font-size", "17px")
        .style("text-decoration", "underline") // Underline the title
        .text("Gender Distribution for " + countryName); // The title text includes the country name
    }
  }
});
