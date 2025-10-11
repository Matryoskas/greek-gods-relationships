// Initialize function to be called from main script
function createButterflyChart(containerId, dataUrl = 'butterfly_data.json') {
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

        // Add defs for clip paths (simpler approach)
        const defs = svg.append('defs')

        // Create a unique ID for this chart instance
        const chartId = Math.random().toString(36).substr(2, 9)

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

            // Create male bars (left side) - rectangles with left-only rounded corners
            const maleBars = svg.selectAll('.male-bar').data(categories)

            maleBars
                .enter()
                .append('rect')
                .attr('class', 'male-bar')
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

            // Add covering rectangles to hide right rounded corners of male bars
            const maleCoverBars = svg.selectAll('.male-cover').data(categories)

            maleCoverBars
                .enter()
                .append('rect')
                .attr('class', 'male-cover')
                .merge(maleCoverBars)
                .transition()
                .duration(500)
                .attr('x', width / 2 - 6)
                .attr('y', (d) => yScale(d))
                .attr('width', 6)
                .attr('height', yScale.bandwidth())
                .attr('fill', '#f4a261')

            maleCoverBars.exit().remove()

            maleBars.exit().remove()

            // Create female bars (right side) - rectangles with right-only rounded corners
            const femaleBars = svg.selectAll('.female-bar').data(categories)

            femaleBars
                .enter()
                .append('rect')
                .attr('class', 'female-bar')
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

            // Add covering rectangles to hide left rounded corners of female bars
            const femaleCoverBars = svg
                .selectAll('.female-cover')
                .data(categories)

            femaleCoverBars
                .enter()
                .append('rect')
                .attr('class', 'female-cover')
                .merge(femaleCoverBars)
                .transition()
                .duration(500)
                .attr('x', width / 2)
                .attr('y', (d) => yScale(d))
                .attr('width', 6)
                .attr('height', yScale.bandwidth())
                .attr('fill', '#2a9d8f')

            femaleCoverBars.exit().remove()

            femaleBars.exit().remove()

            // Add labels to male bars
            const maleLabels = svg.selectAll('.male-label').data(categories)

            maleLabels
                .enter()
                .append('text')
                .attr('class', 'bar-label male-label')
                .merge(maleLabels)
                .transition()
                .duration(500)
                .attr('x', (d) => xScaleLeft(selectedData[d].male))
                .attr('y', (d) => yScale(d) + yScale.bandwidth() / 2)
                .attr('dy', '0.35em')
                .text((d) => selectedData[d].male)

            maleLabels.exit().remove()

            // Add labels to female bars
            const femaleLabels = svg.selectAll('.female-label').data(categories)

            femaleLabels
                .enter()
                .append('text')
                .attr('class', 'bar-label female-label')
                .merge(femaleLabels)
                .transition()
                .duration(500)
                .attr(
                    'x',
                    (d) => width / 2 + xScaleRight(selectedData[d].female) / 2
                )
                .attr('y', (d) => yScale(d) + yScale.bandwidth() / 2)
                .attr('dy', '0.35em')
                .text((d) => selectedData[d].female)

            femaleLabels.exit().remove()
        }

        // Initial chart rendering
        updateChart('gender_by_author')

        // Add event listener for dropdown
        d3.select('#data-select').on('change', function () {
            updateChart(this.value)
        })
    })
}
