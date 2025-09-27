function filterTopNEdges(edges, n = 5) {
  // Group edges by source node
  const grouped = d3.group(edges, d => d.source.name || d.source);

  const topEdges = [];

  grouped.forEach((edgeList, source) => {
    // Sort descending by weight
    edgeList.sort((a, b) => d3.descending(+a.normalized_weight, +b.normalized_weight));

    // Take top-N
    topEdges.push(...edgeList.slice(0, n));
  });

  return topEdges;
}

async function createForceDirectedGraph(nodes, edges, containerId) {
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  edges = edges.filter(d => d.normalized_weight > 0.2);
  edges = filterTopNEdges(edges, 5);

  const connected = new Set();
  edges.forEach(e => {
    connected.add(e.source.name || e.source);
    connected.add(e.target.name || e.target);
  });

  nodes = nodes.filter(n => connected.has(n.name));

  const div = document.querySelector(containerId);
  const width = div.clientWidth;
  const height = div.clientHeight;
  const svg = d3.select(containerId)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Initialize simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.name).distance(100).strength(1))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const linkWidth = d3.scaleLinear()
  .domain([0, 1])   // input: normalized_weight
  .range([1, 5]);   // output: stroke-width in pixels

  // Draw edges (links)
  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(edges)
    .join("line")
      .attr("stroke-width", d => linkWidth(+d.normalized_weight));

  // Draw nodes
  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", 10)
      .attr("fill", d => color(d.name))
      .call(drag(simulation));

  // Add labels
  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
      .text(d => d.name)
      .attr("font-size", 12)
      .attr("dy", -12)
      .attr("text-anchor", "middle");

  // Simulation tick update
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  // Drag behavior
  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
}
