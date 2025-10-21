// Initialize function to be called from main script
function createButterflyChart(
    containerId,
    parentGroups,
    dataUrl = 'butterfly_data.json'
) {
    d3.json(dataUrl).then((data) => {
        // Make butterfly data globally accessible for domain character mapping
        window.butterflyData = data

        // Set up dimensions
        const margin = { top: 60, right: 160, bottom: 40, left: 180 }
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

        // Animation state tracking
        let isAnimating = false
        let currentSelectedGroup = null // Track current selection to prevent hover interference

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

        // Function to update description based on selected data type
        function updateDescription(dataType) {
            const descriptions = {
                gender_by_author:
                    'Shows gender distribution across different authors in Greek literature',
                gender_by_type:
                    'Compares male vs female character representation by character type',
                domains_grouped_by_gender:
                    'Gender distribution within major domain categories (Water & Sea, War & Conflict, etc.)',
            }

            const descElement = d3.select('#view-description')
            if (!descElement.empty()) {
                descElement
                    .transition()
                    .duration(200)
                    .style('opacity', 0)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .text(
                        descriptions[dataType] ||
                            'Analyzing character data distribution'
                    )
            }
        }

        // Function to get appropriate axis labels based on data type
        function getAxisLabels(dataType) {
            if (
                dataType.startsWith('gender_by_') ||
                dataType.includes('_by_gender')
            ) {
                return {
                    left: 'Male',
                    right: 'Female',
                    y: getYAxisLabel(dataType),
                }
            } else {
                return { left: 'Primary', right: 'Secondary', y: 'Category' }
            }
        }

        // Helper function to get Y-axis label
        function getYAxisLabel(dataType) {
            if (dataType === 'gender_by_author') return 'Author'
            if (dataType === 'gender_by_type') return 'Character Type'
            if (dataType.includes('domains_grouped')) return 'Domain Group'
            return 'Category'
        }

        // Function to update the chart based on selected data
        function updateChart(dataType) {
            // Clear current selection tracking when updating chart
            currentSelectedGroup = null
            
            // Set animation state to prevent hover interactions during transitions
            isAnimating = true

            // Hide tooltip and reset any interrupted hover effects
            tooltip.style('visibility', 'hidden')
            svg.selectAll('.male-bar, .female-bar')
                .interrupt() // Stop any ongoing hover transitions
                .attr('height', yScale.bandwidth())
                .attr('fill', function () {
                    return d3.select(this).classed('male-bar')
                        ? '#f4a261'
                        : '#2a9d8f'
                })

            const selectedData = data[dataType]

            // Update the description based on data type
            updateDescription(dataType)

            let categories, maxValue

            // Handle different data structures
            if (
                dataType.startsWith('gender_by_') ||
                dataType.includes('_by_gender')
            ) {
                // Gender data has male/female structure
                categories = Object.keys(selectedData)
                maxValue = d3.max(categories, (d) =>
                    Math.max(
                        selectedData[d].male || 0,
                        selectedData[d].female || 0
                    )
                )
            } else {
                // Other data types are simple counts - split them for visual balance
                categories = Object.keys(selectedData)
                maxValue = d3.max(categories, (d) => selectedData[d])

                // Convert simple count data to split visualization
                const convertedData = {}
                categories.forEach((category) => {
                    const totalCount = selectedData[category]
                    // Split the count roughly in half for visual balance
                    const leftSide = Math.ceil(totalCount * 0.6) // 60% on left
                    const rightSide = Math.floor(totalCount * 0.4) // 40% on right

                    convertedData[category] = {
                        male: leftSide,
                        female: rightSide,
                    }
                })
                Object.assign(selectedData, convertedData)
                // Recalculate max value after conversion
                maxValue = d3.max(categories, (d) =>
                    Math.max(selectedData[d].male, selectedData[d].female)
                )
            }

            // Update scales
            xScaleRight.domain([0, maxValue])
            xScaleLeft.domain([0, maxValue])
            yScale.domain(categories)

            // Update axes with smooth transitions
            xAxisLeftGroup
                .transition()
                .duration(500)
                .ease(d3.easeCircleOut)
                .call(xAxisLeft)

            xAxisRightGroup
                .transition()
                .duration(500)
                .ease(d3.easeCircleOut)
                .call(xAxisRight)

            yAxisGroup
                .transition()
                .duration(500)
                .ease(d3.easeCircleOut)
                .call(yAxis)

            // Add axis labels with fade transition
            svg.selectAll('.axis-label')
                .transition()
                .duration(200)
                .style('opacity', 0)
                .remove()

            svg.selectAll('.y-axis-label')
                .transition()
                .duration(200)
                .style('opacity', 0)
                .remove()

            // Add new labels with fade-in effect
            setTimeout(() => {
                const labels = getAxisLabels(dataType)

                svg.append('text')
                    .attr('class', 'axis-label')
                    .attr('x', width / 4)
                    .attr('y', -10)
                    .attr('text-anchor', 'middle')
                    .style('opacity', 0)
                    .text(labels.left)
                    .transition()
                    .duration(300)
                    .style('opacity', 1)

                if (labels.right) {
                    svg.append('text')
                        .attr('class', 'axis-label')
                        .attr('x', (width * 3) / 4)
                        .attr('y', -10)
                        .attr('text-anchor', 'middle')
                        .style('opacity', 0)
                        .text(labels.right)
                        .transition()
                        .duration(300)
                        .style('opacity', 1)
                }

                svg.append('text')
                    .attr('class', 'y-axis-label')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', -margin.left + 30)
                    .attr('x', -height / 2)
                    .attr('text-anchor', 'middle')
                    .style('opacity', 0)
                    .text(labels.y)
                    .transition()
                    .duration(300)
                    .style('opacity', 1)
            }, 250)

            // Create male bars (left side) - rectangles with rounded corners
            const maleBars = svg
                .selectAll('.male-bar')
                .data(categories, (d) => d)

            // Handle entering bars with smooth animation
            const maleEnter = maleBars
                .enter()
                .append('rect')
                .attr('class', 'male-bar')
                .attr('x', width / 2) // Start from center
                .attr('y', (d) => yScale(d))
                .attr('width', 0) // Start with zero width
                .attr('height', yScale.bandwidth())
                .attr('fill', '#f4a261')
                .attr('rx', 6)
                .attr('ry', 6)
                .attr('opacity', 0) // Start transparent
                .on('mouseover', function (event, d) {
                    // Don't apply hover effects during animations
                    if (isAnimating) return

                    // Show tooltip with contextual content
                    const isGenderData =
                        dataType.startsWith('gender_by_') ||
                        dataType.includes('_by_gender')
                    const tooltipContent = isGenderData
                        ? `<strong>${d}</strong><br/>Male: ${
                              selectedData[d].male
                          }<br/>Female: ${selectedData[d].female || 0}`
                        : `<strong>${d}</strong><br/>Total Count: ${
                              selectedData[d].male + selectedData[d].female
                          }<br/>Left: ${selectedData[d].male} | Right: ${
                              selectedData[d].female
                          }`

                    tooltip.style('visibility', 'visible').html(tooltipContent)

                    // Apply hover effect
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth() * 1.2)
                        .attr('y', yScale(d) - yScale.bandwidth() * 0.1)
                        .attr('fill', '#e9940e') // Slightly darker shade of orange
                })
                .on('mousemove', function (event) {
                    tooltip
                        .style('top', event.pageY - 10 + 'px')
                        .style('left', event.pageX + 10 + 'px')
                })
                .on('mouseout', function (event, d) {
                    // Don't apply hover effects during animations
                    if (isAnimating) return

                    // Hide tooltip
                    tooltip.style('visibility', 'hidden')

                    // Reset hover effect (unless this bar is currently selected)
                    if (
                        !currentSelectedGroup ||
                        currentSelectedGroup !== d ||
                        (dataType !== 'gender_by_type' &&
                            dataType !== 'domains_grouped_by_gender' &&
                            dataType !== 'gender_by_author')
                    ) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr('height', yScale.bandwidth())
                            .attr('y', yScale(d))
                            .attr('fill', '#f4a261') // Reset to original male color
                    }
                })

            // Handle exiting bars with smooth animation
            maleBars
                .exit()
                .transition()
                .duration(400)
                .ease(d3.easeCircleIn)
                .attr('width', 0)
                .attr('x', width / 2) // Move to center
                .attr('opacity', 0)
                .remove()

            // Update all bars (entering + existing)
            maleEnter
                .merge(maleBars)
                .on('click', function (event, d) {
                    event.stopPropagation() // Prevent background deselection
                    if (dataType === 'gender_by_author') {
                        console.log('Author selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    } else if (dataType === 'gender_by_type') {
                        console.log('Character type selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    } else if (dataType === 'domains_grouped_by_gender') {
                        console.log('Domain group selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    }
                })
                .transition()
                .duration(600)
                .delay((d, i) => i * 50) // Stagger animation
                .ease(d3.easeCircleOut)
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
                .attr('opacity', 1)

            // Create female bars (right side) - rectangles with rounded corners
            const femaleBars = svg
                .selectAll('.female-bar')
                .data(categories, (d) => d)

            // Handle entering bars with smooth animation
            const femaleEnter = femaleBars
                .enter()
                .append('rect')
                .attr('class', 'female-bar')
                .attr('x', width / 2) // Start from center
                .attr('y', (d) => yScale(d))
                .attr('width', 0) // Start with zero width
                .attr('height', yScale.bandwidth())
                .attr('fill', '#2a9d8f')
                .attr('rx', 6)
                .attr('ry', 6)
                .attr('opacity', 0) // Start transparent
                .on('mouseover', function (event, d) {
                    // Don't apply hover effects during animations
                    if (isAnimating) return

                    // Show tooltip with contextual content
                    const isGenderData =
                        dataType.startsWith('gender_by_') ||
                        dataType.includes('_by_gender')
                    const tooltipContent = isGenderData
                        ? `<strong>${d}</strong><br/>Male: ${
                              selectedData[d].male || 0
                          }<br/>Female: ${selectedData[d].female}`
                        : `<strong>${d}</strong><br/>Total Count: ${
                              selectedData[d].male + selectedData[d].female
                          }<br/>Left: ${selectedData[d].male} | Right: ${
                              selectedData[d].female
                          }`

                    tooltip.style('visibility', 'visible').html(tooltipContent)

                    // Apply hover effect
                    d3.select(this)
                        .transition()
                        .duration(150)
                        .attr('height', yScale.bandwidth() * 1.2)
                        .attr('y', yScale(d) - yScale.bandwidth() * 0.1)
                        .attr('fill', '#207b6aeb') // Slightly darker shade of teal
                })
                .on('mousemove', function (event) {
                    tooltip
                        .style('top', event.pageY - 10 + 'px')
                        .style('left', event.pageX + 10 + 'px')
                })
                .on('mouseout', function (event, d) {
                    // Don't apply hover effects during animations
                    if (isAnimating) return

                    // Hide tooltip
                    tooltip.style('visibility', 'hidden')

                    // Reset hover effect (unless this bar is currently selected)
                    if (
                        !currentSelectedGroup ||
                        currentSelectedGroup !== d ||
                        (dataType !== 'gender_by_type' &&
                            dataType !== 'domains_grouped_by_gender' &&
                            dataType !== 'gender_by_author')
                    ) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr('height', yScale.bandwidth())
                            .attr('y', yScale(d))
                            .attr('fill', '#2a9d8f') // Reset to original color
                    }
                })

            // Handle exiting bars with smooth animation
            femaleBars
                .exit()
                .transition()
                .duration(400)
                .ease(d3.easeCircleIn)
                .attr('width', 0)
                .attr('opacity', 0)
                .remove()

            // Update all bars (entering + existing)
            femaleEnter
                .merge(femaleBars)
                .on('click', function (event, d) {
                    event.stopPropagation() // Prevent background deselection
                    if (dataType === 'gender_by_author') {
                        console.log('Author selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    } else if (dataType === 'gender_by_type') {
                        console.log('Character type selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    } else if (dataType === 'domains_grouped_by_gender') {
                        console.log('Domain group selected:', d)
                        if (window.globalSelection) {
                            window.globalSelection.setGroup(d)
                        }
                    }
                })
                .transition()
                .duration(600)
                .delay((d, i) => i * 50) // Stagger animation
                .ease(d3.easeCircleOut)
                .attr('x', width / 2)
                .attr('y', (d) => yScale(d))
                .attr('width', (d) => xScaleRight(selectedData[d].female))
                .attr('height', yScale.bandwidth())
                .attr('fill', '#2a9d8f')
                .attr('rx', 6)
                .attr('ry', 6)
                .attr('opacity', 1)
                .on('end', function (d, i) {
                    // Reset animation state when the last bar finishes animating
                    if (i === categories.length - 1) {
                        isAnimating = false
                    }
                })

            // Ensure background rect stays behind all bars
            backgroundRect.lower()
        }

        // Create background click area for deselection (outside updateChart to avoid duplicates)
        const backgroundRect = svg
            .append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .lower() // make sure it's behind all bars
            .on('click', function () {
                console.log('Background clicked - clearing all selections')
                if (window.globalSelection) {
                    // Clear all possible selections to ensure consistency across charts
                    window.globalSelection.setGroup(null) // Clear group/type/domain selections
                    window.globalSelection.setAuthor(null) // Clear author selections
                }
            })

        // Initial chart rendering
        let dataType = 'gender_by_author'
        updateChart(dataType)

        // Set dropdown to match initial chart state
        d3.select('#data-select').property('value', 'gender_by_author')

        // Add event listener for dropdown
        d3.select('#data-select').on('change', function () {
            // Clear any existing selection when changing views
            currentSelectedGroup = null
            if (window.globalSelection) {
                window.globalSelection.setGroup(null)
            }
            
            dataType = this.value
            updateChart(dataType)
        })

        // Add global selection handling
        if (window.globalSelection) {
            window.globalSelection.onGroupChange(function (selectedGroup) {
                console.log(
                    'Butterfly chart received selection:',
                    selectedGroup
                )
                console.log(dataType)

                // Update current selection tracking
                currentSelectedGroup = selectedGroup

                // Apply highlighting similar to timeline chart
                if (
                    dataType === 'gender_by_type' ||
                    dataType === 'domains_grouped_by_gender' ||
                    dataType === 'gender_by_author'
                ) {
                    svg.selectAll('.male-bar, .female-bar').each(function (d) {
                        const bar = d3.select(this)
                        if (selectedGroup === d) {
                            // Highlight selected bars - make them darker and bigger like hover
                            bar.transition()
                                .duration(300)
                                .attr('opacity', 1)
                                .attr('height', yScale.bandwidth() * 1.2)
                                .attr('y', yScale(d) - yScale.bandwidth() * 0.1)
                                .attr(
                                    'fill',
                                    bar.classed('male-bar')
                                        ? '#e9940e'
                                        : '#207b6aeb'
                                )
                        } else if (selectedGroup) {
                            // Dim non-selected bars
                            bar.transition()
                                .duration(300)
                                .attr('opacity', 0.2)
                                .attr('height', yScale.bandwidth())
                                .attr('y', yScale(d))
                                .attr(
                                    'fill',
                                    bar.classed('male-bar')
                                        ? '#f4a261'
                                        : '#2a9d8f'
                                )
                        } else {
                            // Reset all bars when no selection
                            bar.transition()
                                .duration(300)
                                .attr('opacity', 1)
                                .attr('height', yScale.bandwidth())
                                .attr('y', yScale(d))
                                .attr(
                                    'fill',
                                    bar.classed('male-bar')
                                        ? '#f4a261'
                                        : '#2a9d8f'
                                )
                        }
                    })

                    // Update y-axis labels
                    yAxisGroup.selectAll('text').each(function (d) {
                        const label = d3.select(this)
                        if (selectedGroup === d) {
                            label
                                .attr('font-weight', 'bold')
                                .attr('fill', '#000')
                        } else if (selectedGroup) {
                            label
                                .attr('font-weight', 'normal')
                                .attr('fill', '#666')
                        } else {
                            label
                                .attr('font-weight', 'normal')
                                .attr('fill', '#000')
                        }
                    })
                }
            })
        }
    })
}
