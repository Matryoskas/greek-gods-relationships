function init() {
    Promise.all([
        d3.csv('datasets/unique_characters.csv', (d) => ({
            name: d.name,
            description: d.description,
            gender: d.gender,
            father: d.Father,
            mother: d.Mother,
            aliases: d.aliases,
            level1: d.level1,
            level2: d.level2,
            level3: d.level3,
            level4: d.level4,
            domain: d.domain,
            // add other fields if needed
        })),
        d3.csv('datasets/edges_filtered.csv', (d) => ({
            source: d.source,
            target: d.target,
            normalized_weight: +d.normalized_weight, // convert to number
            author: d.author,
            title: d.title,
            period: d.period,
        })),
    ]).then(([characters, edges]) => {
        createForceDirectedGraph(characters, edges, '.ForceDirectedGraph')
    })
}
