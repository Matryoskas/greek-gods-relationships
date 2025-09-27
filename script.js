function init() {
  Promise.all([
    d3.csv("datasets/unique_characters.csv", d => ({
      name: d.name,
      description: d.description,
      gender: d.gender
      // add other fields if needed
    })),
    d3.csv("datasets/edges_filtered.csv", d => ({
      source: d.source,
      target: d.target,
      normalized_weight: +d.normalized_weight,  // convert to number
      author: d.author,
      title: d.title,
      period: d.period
    }))
]).then(([characters, edges]) => {
    createForceDirectedGraph(characters, edges, ".ForceDirectedGraph");
  });
}
