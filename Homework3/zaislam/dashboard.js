// Load the csv file
d3.csv("data/mxmh_survey_results.csv").then(function(data) {
    // Clean the data
    data = data.filter(d =>
        d["Fav genre"] &&
        d["Music effects"] &&
        d["Anxiety"] !== "" &&
        d["Hours per day"] !== ""
    );
    
    // Convert from strings to numbers
    data.forEach(d => {
        d["Anxiety"] = +d["Anxiety"];
        d["Hours per day"] = +d["Hours per day"];
    });

    // Call the functions to create the charts
    createBarChart(data)
    createScatterPlot(data)
    createSankeyDiagram(data)
});

function createBarChart(data) {
    // Average depression score per genre
    const genreDepression = d3.rollup(
        data,
        v => d3.mean(v, d => d["Depression"]),
        d => d["Fav genre"]
    );

    const genreData = Array.from(genreDepression, ([genre, avgDepression]) => ({
        genre,
        avgDepression
    }));

    // Set chart dimensions
    const width = 450;
    const height = 280;
    const margin = { top: 35, right: 15, bottom: 75, left: 45 };

    let currentSort = "alphabetical";

    // Track selected genres in a Set
    const selectedGenres = new Set();

    const container = d3.select("#bar-chart");

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "black");

    const controlDiv = container.append("div")
        .attr("id", "bar-controls")
        .style("text-align", "center")
        .style("margin-top", "5px")
        .style("font-size", "12px");

    controlDiv.append("label")
        .attr("for", "sortMode")
        .text("Sort by: ");

    controlDiv.append("select")
        .attr("id", "sortMode")
        .style("background-color", "black")
        .style("color", "#C3B7F7")
        .style("border", "1px solid #C3B7F7")
        .style("padding", "3px")
        .style("font-size", "12px")
        .selectAll("option")
        .data(["alphabetical", "ascending", "descending"])
        .join("option")
        .attr("value", d => d)
        .text(d => {
            if (d === "alphabetical") return "Alphabetical";
            if (d === "ascending") return "Ascending Score";
            return "Descending Score";
        });

    // Scales
    const x = d3.scaleBand()
        .domain(genreData.map(d => d.genre))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(genreData, d => d.avgDepression)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal()
        .domain(genreData.map(d => d.genre))
        .range(d3.schemeTableau10);

    const barGroup = svg.append("g").attr("class", "bars");

    barGroup.selectAll("rect")
        .data(genreData, d => d.genre)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.avgDepression))
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(d.avgDepression))
        .attr("fill", d => colorScale(d.genre))
        // Make bars look clickable
        .style("cursor", "pointer")
        // Toggle selection state on click
        .on("click", function(event, d) {
            if (selectedGenres.has(d.genre)) {
                // Deselect if already selected
                selectedGenres.delete(d.genre);
                // Remove stroke if deselected
                d3.select(this).attr("stroke", null);

                // Remove label when deselected
                svg.selectAll(`.persistent-label-${d.genre.replace(/[^a-zA-Z0-9]/g, '')}`).remove();
            } else {
                // Add to selection set
                selectedGenres.add(d.genre);
                // Add visual stroke for selected bar
                d3.select(this).attr("stroke", "#FFFFFF").attr("stroke-width", 2);

                // Add persistent label on selection
                svg.append("text")
                    .attr("class", `bar-label persistent-label-${d.genre.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .attr("x", x(d.genre) + x.bandwidth() / 2)
                    .attr("y", y(d.avgDepression) - 5)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#C3B7F7")
                    .style("font-size", "12px")
                    .text(d.avgDepression.toFixed(2));
            }
        })
        .on("mouseover", function (event, d) {
            d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
            barGroup.selectAll("rect").filter(r => r !== d)
                .transition().duration(200).style("opacity", 0.3);

            // Only add hover label if it's not already selected
            if (!selectedGenres.has(d.genre)) {
                barGroup.append("text")
                    .attr("class", "bar-label")
                    .attr("x", x(d.genre) + x.bandwidth() / 2)
                    .attr("y", y(d.avgDepression) - 5)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#C3B7F7")
                    .style("font-size", "12px")
                    .text(d.avgDepression.toFixed(2));
            }
        })
        .on("mouseout", function (event, d) {
            // Keep stroke if bar is selected
            if (!selectedGenres.has(d.genre)) {
                d3.select(this).attr("stroke", null);
            }
            // Remove only temporary hover label
            barGroup.selectAll("text.bar-label").filter(function() {
                // Only remove non-persistent labels
                return !this.classList.value.includes("persistent-label");
            }).remove();
            barGroup.selectAll("rect")
                .transition().duration(200).style("opacity", 1);
        });

    // Draw axes
    const xAxisGroup = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("fill", "#C3B7F7");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(7))
        .selectAll("text")
        .attr("fill", "#C3B7F7");

    svg.selectAll(".domain, .tick line").attr("stroke", "#C3B7F7");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#C3B7F7")
        .style("font-size", "15px")
        .text("Average Depression Score by Favorite Genre of Music");

    d3.select("#sortMode").on("change", function () {
        currentSort = this.value;
        if (currentSort === "descending") {
            genreData.sort((a, b) => b.avgDepression - a.avgDepression);
        } else if (currentSort === "ascending") {
            genreData.sort((a, b) => a.avgDepression - b.avgDepression);
        } else {
            genreData.sort((a, b) => d3.ascending(a.genre, b.genre));
        }

        x.domain(genreData.map(d => d.genre));

        svg.selectAll("rect.bar")
            .data(genreData, d => d.genre)
            .transition()
            .duration(1000)
            .attr("x", d => x(d.genre));

        xAxisGroup.transition()
            .duration(1000)
            .call(d3.axisBottom(x));

        xAxisGroup.selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("fill", "#C3B7F7");

        svg.selectAll(".domain, .tick line").attr("stroke", "#C3B7F7");
    });
}

function createScatterPlot(data) {
    // Dimensions and margins
    const width = 450;
    const height = 280;
    const margin = { top: 35, right: 15, bottom: 50, left: 45 };

    // Create SVG
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "black");

    // Scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d["Hours per day"])])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, 10])
        .range([height - margin.bottom, margin.top]);

    // Color scale for genres
    const allGenres = [...new Set(data.map(d => d["Fav genre"]))];
    const colorScale = d3.scaleOrdinal()
        .domain(allGenres)
        .range(d3.schemeTableau10);

    // Control panel
    const controls = d3.select("#scatter-plot")
        .append("div")
        .style("margin-top", "10px")
        .style("text-align", "center");

    // Genre filter dropdown
    controls.append("label")
        .style("color", "#C3B7F7")
        .text("Filter Genres:");

    const genreSelect = controls.append("select")
        .style("background-color", "black")
        .style("color", "#C3B7F7")
        .style("border", "1px solid #C3B7F7")
        .on("change", function() {
            currentGenre = this.value;
            renderDots();
            svg.select(".brush").call(brush.move, null); // Clear brush on filter change
        });

    genreSelect.selectAll("option")
        .data(["All", ...allGenres])
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    // Stats display container
    const statsBox = svg.append("g")
        .attr("class", "stats-box")
        .attr("transform", `translate(${width - 150}, 20)`);

    // Brush tool
    const brush = d3.brush()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on("brush", brushed)
        .on("end", brushEnded);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // Initial render
    let currentGenre = "All";
    renderDots();

    // Main dot rendering function
    function renderDots() {
        const filteredData = currentGenre === "All" 
            ? data 
            : data.filter(d => d["Fav genre"] === currentGenre);

        // DATA JOIN
        const dots = svg.selectAll("circle")
            .data(filteredData, d => d["Fav genre"] + d["Hours per day"] + d["Depression"]);

        // EXIT old circles
        dots.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .style("opacity", 0)
            .remove();

        // UPDATE existing circles
        dots.transition()
            .duration(600)
            .attr("cx", d => x(d["Hours per day"]))
            .attr("cy", d => y(d["Depression"]))
            .attr("fill", d => colorScale(d["Fav genre"]))
            .style("opacity", 0.8);

        // ENTER new circles
        dots.enter()
            .append("circle")
            .attr("cx", d => x(d["Hours per day"]))
            .attr("cy", d => y(d["Depression"]))
            .attr("r", 0)
            .attr("fill", d => colorScale(d["Fav genre"]))
            .style("opacity", 0)
            .transition()
            .duration(600)
            .attr("r", 4)
            .style("opacity", 0.8);
    }

    // Brush handlers
    function brushed(event) {
        if (!event.selection) return;
        const [[x0, y0], [x1, y1]] = event.selection;
        
        svg.selectAll("circle")
            .attr("opacity", d => {
                const cx = x(d["Hours per day"]);
                const cy = y(d["Depression"]);
                return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? 1 : 0.2;
            });
    }

    function brushEnded(event) {
        if (!event.selection) {
            statsBox.selectAll("*").remove();
            svg.selectAll("circle").attr("opacity", 0.8);
            return;
        }

        const [[x0, y0], [x1, y1]] = event.selection;
        const brushedPoints = data.filter(d => {
            const cx = x(d["Hours per day"]);
            const cy = y(d["Depression"]);
            return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
        });

        // Calculate stats
        const avgHours = d3.mean(brushedPoints, d => d["Hours per day"]);
        const avgDepression = d3.mean(brushedPoints, d => d["Depression"]);

        // Update stats display
        statsBox.selectAll("*").remove();
        statsBox.append("rect")
            .attr("width", 130)
            .attr("height", 50)
            .attr("fill", "#333")
            .attr("rx", 5);

        statsBox.append("text")
            .attr("x", 5)
            .attr("y", 15)
            .attr("fill", "#C3B7F7")
            .text(`Points: ${brushedPoints.length}`);

        statsBox.append("text")
            .attr("x", 5)
            .attr("y", 30)
            .attr("fill", "#C3B7F7")
            .text(`Avg Hours: ${avgHours.toFixed(1)}`);

        statsBox.append("text")
            .attr("x", 5)
            .attr("y", 45)
            .attr("fill", "#C3B7F7")
            .text(`Avg Depr: ${avgDepression.toFixed(1)}`);
    }

    // Axes and labels
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("fill", "#C3B7F7");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("fill", "#C3B7F7");

    svg.selectAll(".domain, .tick line")
        .attr("stroke", "#C3B7F7");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#C3B7F7")
        .text("Music Listening vs Depression");
}

function createSankeyDiagram(data) {
    const allGenres = [...new Set(data.map(d => d["Fav genre"]))];

    const container = d3.select("#sankey-diagram");

    const filterRow = container.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px");

    filterRow.append("label")
        .style("color", "#C3B7F7")
        .style("font-size", "12px")
        .style("margin-right", "5px")
        .text("Filter Genres:");

    const select = filterRow.append("select")
        .style("background-color", "black")
        .style("color", "#C3B7F7")
        .style("border", "1px solid #C3B7F7")
        .style("padding", "3px")
        .style("font-size", "12px");

    select.selectAll("option")
        .data(["All", ...allGenres])
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    const width = 1000;
    const height = 600;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "black");

    const sankeyGroup = svg.append("g").attr("class", "sankey-group");

    const colorScale = d3.scaleOrdinal()
        .domain(allGenres)
        .range(d3.schemeSet3);

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(15)
        .extent([[1, 1], [width - 1, height - 6]]);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#333")
        .style("color", "#C3B7F7")
        .style("padding", "6px")
        .style("font-size", "12px")
        .style("border-radius", "4px")
        .style("opacity", 0)
        .style("pointer-events", "none");

    function updateSankey(selectedGenres) {
        sankeyGroup.selectAll("*").remove();

        let filteredData = data;
        if (!selectedGenres.includes("All")) {
            filteredData = data.filter(d => selectedGenres.includes(d["Fav genre"]));
        }

        const linkMap = d3.rollup(
            filteredData,
            v => v.length,
            d => d["Fav genre"],
            d => d["Music effects"]
        );

        const links = [];
        const nodesSet = new Set();

        linkMap.forEach((targetMap, source) => {
            targetMap.forEach((value, target) => {
                links.push({ source, target, value });
                nodesSet.add(source);
                nodesSet.add(target);
            });
        });

        const nodes = Array.from(nodesSet).map(name => ({ name }));
        const nodeIndex = Object.fromEntries(nodes.map((d, i) => [d.name, i]));

        const indexedLinks = links.map(d => ({
            source: nodeIndex[d.source],
            target: nodeIndex[d.target],
            value: d.value,
            originalSource: d.source,
            originalTarget: d.target
        }));

        const sankeyData = sankey({
            nodes: nodes.map(d => ({ ...d })),
            links: indexedLinks
        });

        // Animate links
        sankeyGroup.append("g")
            .selectAll("path")
            .data(sankeyData.links)
            .join(
                enter => enter.append("path")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("fill", "none")
                    .attr("stroke", d => colorScale(d.originalSource))
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0)
                    .attr("class", d => `link-${d.originalSource.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .transition()
                    .duration(800)
                    .attr("stroke-width", d => Math.max(1, d.width))
                    .attr("stroke-opacity", 0.4),
                update => update.transition()
                    .duration(800)
                    .attr("stroke-width", d => Math.max(1, d.width))
                    .attr("stroke-opacity", 0.4),
                exit => exit.transition().duration(400).style("opacity", 0).remove()
            )
            .on("mouseover", function (event, d) {
                d3.select(this).attr("stroke-opacity", 1);
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(
                    `<strong>${d.originalSource} → ${d.originalTarget}</strong><br/>Value: ${d.value}`
                )
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke-opacity", 0.4);
                tooltip.transition().duration(300).style("opacity", 0);
            });

        // Animate nodes
        const node = sankeyGroup.append("g")
            .selectAll("g")
            .data(sankeyData.nodes)
            .join("g");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("width", d => d.x1 - d.x0)
            .attr("y", d => d.y0)
            .attr("height", 0)
            .attr("fill", "#C3B7F7")
            .attr("stroke", "#222")
            .transition()
            .duration(800)
            .attr("height", d => d.y1 - d.y0);

        node.append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .attr("fill", "#C3B7F7")
            .style("font-size", "12px")
            .text(d => d.name);

        // Optional fade-in of whole diagram
        sankeyGroup
            .attr("opacity", 0)
            .transition()
            .duration(800)
            .attr("opacity", 1);

        // Enhanced node hover with genre stats
        node.selectAll("rect")
            .on("mouseover", function (event, d) {
                const outgoing = sankeyData.links.filter(l => l.source.name === d.name);
                const total = d3.sum(outgoing, l => l.value);
                const counts = { Improve: 0, "No effect": 0, Worsen: 0 };
                outgoing.forEach(l => {
                    const t = l.target.name;
                    if (t in counts) counts[t] += l.value;
                });

                const percent = {
                    Improve: ((counts.Improve / total) * 100).toFixed(1),
                    "No effect": ((counts["No effect"] / total) * 100).toFixed(1),
                    Worsen: ((counts.Worsen / total) * 100).toFixed(1)
                };

                d3.selectAll(`.link-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .attr("stroke-opacity", 1);

                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(
                    `<strong>${d.name}</strong><br/>
                     Improve: ${percent.Improve}%<br/>
                     No effect: ${percent["No effect"]}%<br/>
                     Worsen: ${percent.Worsen}%`
                )
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                d3.selectAll(`.link-${d.name.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .attr("stroke-opacity", 0.4);
                tooltip.transition().duration(300).style("opacity", 0);
            });
    }

    select.on("change", function () {
        const selected = Array.from(this.selectedOptions).map(opt => opt.value);
        updateSankey(selected);
    });

    select.selectAll("option").property("selected", d => d === "All");
    updateSankey(allGenres);
}