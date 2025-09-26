function init() {
  Promise.all([
    d3.csv("datasets/unique_characters.csv"),
    d3.csv("datasets/edges_filtered.csv")
  ]).then(([characters, edges]) => {
    createForceDirectedGraph(characters, edges, ".ForceDirectedGraph");
  });
}
