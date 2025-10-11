// Initialize function to be called from main script
function createButterflyChart(
    containerId,
    parentGroups,
    dataUrl = 'butterfly_data.json'
) {
    d3.json(dataUrl).then((data) => {
        // Set up dimensions
        const margin = { top: 60, right: 120, bottom: 40, left: 120 }
        const container = d3.select(containerId).node()
        const fullWidth = container.offsetWidth || 700
        const fullHeight = container.offsetHeight || 400
        const width = fullWidth - margin.left - margin.right
        const height = fullHeight - margin.top - margin.bottom
        // Create SVG
        const svg = d3
            .select(containerId)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)

        const groups = parentGroups

        console.log(groups)

        // Create scales
        const xScaleRight = d3.scaleLinear().range([0, width / 2])
        const xScaleLeft = d3.scaleLinear().range([width / 2, 0])

        const yScale = d3.scaleBand().range([0, height]).padding(0.4)

        // Create axes
        const xAxisLeft = d3.axisBottom(xScaleLeft)
        const xAxisRight = d3.axisBottom(xScaleRight)
        const yAxis = d3.axisLeft(yScale)

        // Add groups for axes
        const xAxisLeftGroup = svg
            .append('g')
            .attr('class', 'x-axis-left')
            .attr('transform', `translate(0, ${height})`)

        const xAxisRightGroup = svg
            .append('g')
            .attr('class', 'x-axis-right')
            .attr('transform', `translate(${width / 2}, ${height})`)

        const yAxisGroup = svg.append('g').attr('class', 'y-axis')

        // Create simple tooltip
        const tooltip = d3
            .select('body')
            .append('div')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('visibility', 'hidden')

        // Add title (similar to timeline chart)
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '1vw')
            .style('font-weight', 'bold')
            .text('Gender Distribution Analysis')

        // Function to update the chart based on selected data
        function updateChart(dataType) {
            const selectedData = data[dataType]
            const categories = Object.keys(selectedData)

            // Calculate the maximum value for scaling
            const maxValue = d3.max(categories, (d) =>
                Math.max(selectedData[d].male, selectedData[d].female)
            )

            // Update scales
            xScaleRight.domain([0, maxValue])
            xScaleLeft.domain([0, maxValue])
            yScale.domain(categories)

            // Update axes
            xAxisLeftGroup.call(xAxisLeft)
            xAxisRightGroup.call(xAxisRight)
            yAxisGroup.call(yAxis)

            // Add axis labels
            svg.selectAll('.axis-label').remove()
            svg.selectAll('.y-axis-label').remove()

            svg.append('text')
                .attr('class', 'axis-label')
                .attr('x', width / 4)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text('Male')

            svg.append('text')
                .attr('class', 'axis-label')
                .attr('x', (width * 3) / 4)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text('Female')

            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 30)
                .attr('x', -height / 2)
                .attr('text-anchor', 'middle')
                .text(dataType === 'gender_by_author' ? 'Author' : 'Type')

            // Create male bars (left side) - rectangles with rounded corners
            const maleBars = svg
                .selectAll('.male-bar')
                .data(categories, (d) => d)

            maleBars
                .enter()
                .append('rect')
                .attr('class', 'male-bar')
                .on('mouseover', function (event, d) {
                    // Show tooltip
                    tooltip
                        .style('visibility', 'visible')
                        .html(
                            `<strong>${d}</strong><br/>Male: ${selectedData[d].male}`
                        )

                    // Apply hover effect to main bar - scale up and style changes
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth() * 1.2)
                        .attr('y', yScale(d) - yScale.bandwidth() * 0.1)
                        .attr('fill', '#e9940e') // Slightly darker shade of orange
                    // .attr('fill-opacity', 0.9)
                })
                .on('mousemove', function (event) {
                    tooltip
                        .style('top', event.pageY - 10 + 'px')
                        .style('left', event.pageX + 10 + 'px')
                })
                .on('mouseout', function (event, d) {
                    // Hide tooltip
                    tooltip.style('visibility', 'hidden')

                    // Reset hover effect for both bars
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth())
                        .attr('y', yScale(d))
                        .attr('fill', '#f4a261') // Reset to original color
                    // .attr('fill-opacity', 1)
                })
                .merge(maleBars)
                .transition()
                .duration(500)
                .attr('x', (d) => xScaleLeft(selectedData[d].male))
                .attr('y', (d) => yScale(d))
                .attr(
                    'width',
                    (d) => width / 2 - xScaleLeft(selectedData[d].male)
                )
                .attr('height', yScale.bandwidth())
                .attr('fill', '#f4a261')
                .attr('rx', 6)
                .attr('ry', 6)

            maleBars.exit().remove()

            // Create female bars (right side) - rectangles with rounded corners
            const femaleBars = svg
                .selectAll('.female-bar')
                .data(categories, (d) => d)

            femaleBars
                .enter()
                .append('rect')
                .attr('class', 'female-bar')
                .on('mouseover', function (event, d) {
                    // Show tooltip
                    tooltip
                        .style('visibility', 'visible')
                        .html(
                            `<strong>${d}</strong><br/>Female: ${selectedData[d].female}`
                        )

                    // Apply hover effect to main bar - scale up and style changes
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth() * 1.2)
                        .attr('y', yScale(d) - yScale.bandwidth() * 0.1)
                        .attr('fill', '#238d7a') // Slightly darker shade of teal
                    // .attr('fill-opacity', 0.9)
                })
                .on('mousemove', function (event) {
                    tooltip
                        .style('top', event.pageY - 10 + 'px')
                        .style('left', event.pageX + 10 + 'px')
                })
                .on('mouseout', function (event, d) {
                    // Hide tooltip
                    tooltip.style('visibility', 'hidden')

                    // Reset hover effect for both bars
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth())
                        .attr('y', yScale(d))
                        .attr('fill', '#2a9d8f') // Reset to original color
                    // .attr('fill-opacity', 1)
                })
                .merge(femaleBars)
                .transition()
                .duration(500)
                .attr('x', width / 2)
                .attr('y', (d) => yScale(d))
                .attr('width', (d) => xScaleRight(selectedData[d].female))
                .attr('height', yScale.bandwidth())
                .attr('fill', '#2a9d8f')
                .attr('rx', 6)
                .attr('ry', 6)

            femaleBars.exit().remove()
        }

        // Initial chart rendering
        updateChart('gender_by_author')

        // Set dropdown to match initial chart state
        d3.select('#data-select').property('value', 'gender_by_author')

        // Add event listener for dropdown
        d3.select('#data-select').on('change', function () {
            updateChart(this.value)
        })
    })
}
