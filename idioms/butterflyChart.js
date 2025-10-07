// General Butterfly Chart Implementation using Pre-computed Data
class GeneralButterflyChart {
    constructor(containerId, dataUrl = 'butterfly_data.json') {
        console.log(
            'ButterflyChart constructor called with:',
            containerId,
            dataUrl
        )
        this.container = d3.select(containerId)
        console.log('Container selected:', this.container.node())

        if (this.container.empty()) {
            throw new Error(`Container not found: ${containerId}`)
        }

        this.dataUrl = dataUrl
        this.margin = { top: 60, right: 120, bottom: 60, left: 120 }
        // Width and height will be calculated dynamically in setupChart

        // Available comparison types - now using pre-computed data
        this.comparisonTypes = [
            {
                id: 'domain_comparison_grouped',
                name: 'Domain Groups',
                description: 'Compare character counts by grouped domains ',
                dataKey: 'domains_grouped',
            },
            {
                id: 'domain_comparison_individual',
                name: 'Individual Domains',
                description: 'Compare character counts by specific domains',
                dataKey: 'domains_individual',
            },
            {
                id: 'type_comparison',
                name: 'Character Type',
                description: 'Compare different character types',
                dataKey: 'types',
            },
            {
                id: 'gender_by_author',
                name: 'Gender by Author',
                description: 'Compare character gender distribution by author',
                dataKey: 'gender_by_author',
            },
            {
                id: 'gender_by_type',
                name: 'Gender by Type',
                description: 'Compare gender distribution by character type',
                dataKey: 'gender_by_type',
            },
            {
                id: 'overall_gender',
                name: 'Overall Gender Distribution',
                description: 'Overall gender distribution in the dataset',
                dataKey: 'overall_gender',
            },
        ]

        this.currentComparison = this.comparisonTypes[0].id
        this.data = null

        // Inclusive gender color mapping with accessible, diverse colors
        // This system supports any gender identity and automatically assigns
        // appropriate colors while maintaining accessibility standards
        this.genderColors = {
            male: '#4472C4', // Professional blue
            female: '#E15759', // Warm red/pink
            'non-binary': '#70AD47', // Green
            agender: '#FFC000', // Golden yellow
            genderfluid: '#9F4F96', // Purple
            transgender: '#5B9BD5', // Light blue
            demigender: '#A5A5A5', // Gray
            bigender: '#FF6B35', // Orange
            pangender: '#44546A', // Dark blue-gray
            genderqueer: '#C55A11', // Brown-orange
            unknown: '#BDC3C7', // Light gray
            missing: '#95A5A6', // Medium gray
            other: '#8E44AD', // Dark purple
        }

        this.loadDataAndInit()
    }

    // Get inclusive color for any gender identity
    getGenderColor(gender) {
        if (!gender || gender === 'null' || gender === 'undefined') {
            return this.genderColors.missing
        }

        const normalizedGender = gender.toString().toLowerCase().trim()

        // Direct match
        if (this.genderColors[normalizedGender]) {
            return this.genderColors[normalizedGender]
        }

        // Fuzzy matching for common variations
        if (
            normalizedGender.includes('male') &&
            !normalizedGender.includes('female')
        ) {
            return this.genderColors.male
        }
        if (normalizedGender.includes('female')) {
            return this.genderColors.female
        }
        if (
            normalizedGender.includes('non') &&
            normalizedGender.includes('binary')
        ) {
            return this.genderColors['non-binary']
        }
        if (normalizedGender.includes('trans')) {
            return this.genderColors.transgender
        }
        if (normalizedGender.includes('fluid')) {
            return this.genderColors.genderfluid
        }

        // Generate a consistent color for unknown genders based on hash
        const hash = this.hashString(normalizedGender)
        const colorKeys = Object.keys(this.genderColors)
        const colorIndex = Math.abs(hash) % colorKeys.length
        return this.genderColors[colorKeys[colorIndex]]
    }

    // Simple hash function for consistent color assignment
    hashString(str) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = (hash << 5) - hash + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return hash
    }

    async loadDataAndInit() {
        try {
            console.log('Loading butterfly chart data from:', this.dataUrl)
            this.data = await d3.json(this.dataUrl)
            console.log('Butterfly chart data loaded successfully:', this.data)
            this.init()
        } catch (error) {
            console.error('Error loading butterfly chart data:', error)
            this.showError(
                'Failed to load data for butterfly chart: ' + error.message
            )
        }
    }

    showError(message) {
        this.container.selectAll('*').remove()
        this.container
            .append('div')
            .style('text-align', 'center')
            .style('color', 'red')
            .style('padding', '20px')
            .text(message)
    }

    init() {
        console.log(
            'ButterflyChart init() called, data available:',
            !!this.data
        )
        if (!this.data) {
            console.error('No data available in init()')
            return
        }

        // Clear container
        this.container.selectAll('*').remove()
        console.log('Container cleared, starting initialization')

        // Create comparison selector
        const selectorContainer = this.container
            .append('div')
            .style('text-align', 'center')
            .style('margin-bottom', '20px')

        const select = selectorContainer
            .append('select')
            .style('padding', '8px 12px')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px')
            .style('font-size', '14px')
            .on('change', (event) => {
                this.currentComparison = event.target.value
                this.drawChart()
            })

        select
            .selectAll('option')
            .data(this.comparisonTypes)
            .enter()
            .append('option')
            .attr('value', (d) => d.id)
            .text((d) => d.name)
            .attr('title', (d) => d.description)

        // Create responsive SVG following timeline chart pattern
        const containerElement = this.container.node()
        const fullWidth = containerElement.offsetWidth || 800
        const fullHeight = containerElement.offsetHeight || 600
        this.width = fullWidth - this.margin.left - this.margin.right
        this.height = fullHeight - this.margin.top - this.margin.bottom

        this.svgRoot = this.container
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')

        // Add background rect for interactions
        this.svgRoot
            .append('rect')
            .attr('width', fullWidth)
            .attr('height', fullHeight)
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')

        this.g = this.svgRoot
            .append('g')
            .attr(
                'transform',
                `translate(${this.margin.left},${this.margin.top})`
            )

        // Draw initial chart
        this.drawChart()

        // Add resize handler for responsive behavior
        window.addEventListener('resize', () => this.handleResize())
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout)
        this.resizeTimeout = setTimeout(() => {
            const containerElement = this.container.node()
            const fullWidth = containerElement.offsetWidth || 800
            const fullHeight = containerElement.offsetHeight || 600

            // Update dimensions
            this.width = fullWidth - this.margin.left - this.margin.right
            this.height = fullHeight - this.margin.top - this.margin.bottom

            // Update viewBox
            this.svgRoot.attr('viewBox', `0 0 ${fullWidth} ${fullHeight}`)

            // Redraw chart with new dimensions
            this.drawChart()
        }, 250)
    }

    processDataForVisualization() {
        const currentType = this.comparisonTypes.find(
            (t) => t.id === this.currentComparison
        )
        const rawData = this.data[currentType.dataKey]

        if (!rawData) {
            return {
                title: 'No data available',
                type: 'single',
                categories: [],
            }
        }

        switch (this.currentComparison) {
            case 'domain_comparison_grouped':
                return this.processSingleComparison(
                    rawData,
                    'Character Count by Domain Groups'
                )

            case 'domain_comparison_individual':
                return this.processSingleComparison(
                    rawData,
                    'Character Count by Individual Domains'
                )

            case 'type_comparison':
                return this.processSingleComparison(
                    rawData,
                    'Character Count by Type'
                )

            case 'overall_gender':
                return this.processSingleComparison(
                    rawData,
                    'Overall Gender Distribution'
                )

            case 'gender_by_author':
                return this.processGroupedComparison(
                    rawData,
                    'Gender Distribution by Author'
                )

            case 'gender_by_type':
                return this.processGroupedComparison(
                    rawData,
                    'Gender Distribution by Character Type'
                )

            default:
                return {
                    title: 'Unknown comparison type',
                    type: 'single',
                    categories: [],
                }
        }
    }

    processSingleComparison(data, title) {
        const entries = Object.entries(data).slice(0, 6) // Top 6 items
        return {
            title: title,
            type: 'single',
            categories: entries.map(([name, value], index) => ({
                name: name,
                value: value,
                side: index % 2 === 0 ? 'left' : 'right',
                color: d3.schemeCategory10[index % 10],
            })),
        }
    }

    processGroupedComparison(data, title) {
        // Get top 2 groups by total count
        const groupTotals = Object.entries(data)
            .map(([group, genderData]) => {
                const total = Object.values(genderData).reduce(
                    (sum, count) => sum + count,
                    0
                )
                return { group, total, genderData }
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 2)

        if (groupTotals.length < 2) {
            // Fallback to single comparison
            const flatData = {}
            Object.entries(data).forEach(([group, genderData]) => {
                flatData[group] = Object.values(genderData).reduce(
                    (sum, count) => sum + count,
                    0
                )
            })
            return this.processSingleComparison(flatData, title)
        }

        return {
            title: `${title}: ${groupTotals[0].group} vs ${groupTotals[1].group}`,
            type: 'grouped',
            groups: [
                {
                    name: groupTotals[0].group,
                    side: 'left',
                    categories: Object.entries(groupTotals[0].genderData).map(
                        ([gender, count]) => ({
                            name:
                                gender.charAt(0).toUpperCase() +
                                gender.slice(1),
                            value: count,
                            color: this.getGenderColor(gender),
                        })
                    ),
                },
                {
                    name: groupTotals[1].group,
                    side: 'right',
                    categories: Object.entries(groupTotals[1].genderData).map(
                        ([gender, count]) => ({
                            name:
                                gender.charAt(0).toUpperCase() +
                                gender.slice(1),
                            value: count,
                            color: this.getGenderColor(gender),
                        })
                    ),
                },
            ],
        }
    }

    drawChart() {
        // Clear previous chart
        this.g.selectAll('*').remove()

        const data = this.processDataForVisualization()

        if (data.type === 'single') {
            this.drawSingleComparison(data)
        } else {
            this.drawGroupedComparison(data)
        }
    }

    drawSingleComparison(data) {
        if (data.categories.length === 0) {
            this.g
                .append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Arial, sans-serif')
                .attr('font-size', '14px')
                .attr('fill', '#666')
                .text('No data available for this comparison')
            return
        }

        const maxValue = Math.max(...data.categories.map((d) => d.value))
        const xScale = d3
            .scaleLinear()
            .domain([0, maxValue])
            .range([0, this.width / 2 - 30])

        const yScale = d3
            .scaleBand()
            .domain(data.categories.map((d) => d.name))
            .range([60, this.height - 40])
            .padding(0.15)

        // Draw center line
        this.g
            .append('line')
            .attr('x1', this.width / 2)
            .attr('x2', this.width / 2)
            .attr('y1', 40)
            .attr('y2', this.height - 20)
            .attr('stroke', '#34495E')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.7)

        // Draw bars and labels
        data.categories.forEach((category) => {
            const barHeight = yScale.bandwidth()
            const y = yScale(category.name)
            const barWidth = xScale(category.value)

            let x
            if (category.side === 'left') {
                x = this.width / 2 - barWidth
            } else {
                x = this.width / 2
            }

            // Draw bar with enhanced styling
            this.g
                .append('rect')
                .attr('x', x)
                .attr('y', y)
                .attr('width', 0) // Start with 0 width for animation
                .attr('height', barHeight)
                .attr('fill', category.color)
                .attr('opacity', 0.85)
                .attr('rx', 3) // Rounded corners
                .attr('ry', 3)
                .style('cursor', 'pointer')
                .transition()
                .duration(800)
                .ease(d3.easeBackOut)
                .attr('width', barWidth)
                .selection()
                .on('mouseover', function (event) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('opacity', 1)
                        .attr('stroke', '#2C3E50')
                        .attr('stroke-width', 2)

                    // Show tooltip
                    const tooltip = d3
                        .select('body')
                        .append('div')
                        .attr('class', 'butterfly-tooltip')
                        .style('opacity', 0)
                        .style('position', 'absolute')
                        .style('background', 'rgba(0,0,0,0.8)')
                        .style('color', 'white')
                        .style('padding', '8px 12px')
                        .style('border-radius', '4px')
                        .style('font-size', '12px')
                        .style('pointer-events', 'none')

                    tooltip.transition().duration(200).style('opacity', 1)

                    tooltip
                        .html(`${category.name}: ${category.value}`)
                        .style('left', event.pageX + 10 + 'px')
                        .style('top', event.pageY - 10 + 'px')
                })
                .on('mouseout', function () {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('opacity', 0.85)
                        .attr('stroke', 'none')

                    d3.selectAll('.butterfly-tooltip').remove()
                })

            // Add value labels with enhanced styling
            const labelX = category.side === 'left' ? x - 10 : x + barWidth + 10
            this.g
                .append('text')
                .attr('x', labelX)
                .attr('y', y + barHeight / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', category.side === 'left' ? 'end' : 'start')
                .attr('font-family', 'Arial, sans-serif')
                .attr('font-size', '13px')
                .attr('font-weight', 'bold')
                .attr('fill', '#2C3E50')
                .style('opacity', 0)
                .transition()
                .delay(400)
                .duration(600)
                .style('opacity', 1)
                .selection()
                .text(category.value)

            // Add category labels with enhanced styling
            const catLabelX =
                category.side === 'left' ? x - 35 : x + barWidth + 35
            this.g
                .append('text')
                .attr('x', catLabelX)
                .attr('y', y + barHeight / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', category.side === 'left' ? 'end' : 'start')
                .attr('font-family', 'Arial, sans-serif')
                .attr('font-size', '12px')
                .attr('font-weight', '500')
                .attr('fill', '#34495E')
                .style('opacity', 0)
                .transition()
                .delay(200)
                .duration(600)
                .style('opacity', 1)
                .selection()
                .text(category.name)
        })

        // Add title with enhanced styling
        this.g
            .append('text')
            .attr('x', this.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('fill', '#2C3E50')
            .style('opacity', 0)
            .transition()
            .duration(600)
            .style('opacity', 1)
            .selection()
            .text(data.title)
    }

    drawGroupedComparison(data) {
        const allValues = data.groups.flatMap((g) =>
            g.categories.map((c) => c.value)
        )
        const maxValue = Math.max(...allValues)

        const xScale = d3
            .scaleLinear()
            .domain([0, maxValue])
            .range([0, this.width / 2 - 30])

        const yScale = d3
            .scaleBand()
            .domain(data.groups[0].categories.map((c) => c.name))
            .range([80, this.height - 80])
            .padding(0.3)

        // Draw center line with enhanced styling
        this.g
            .append('line')
            .attr('x1', this.width / 2)
            .attr('x2', this.width / 2)
            .attr('y1', 60)
            .attr('y2', this.height - 40)
            .attr('stroke', '#34495E')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.7)

        // Draw bars for each group
        data.groups.forEach((group) => {
            group.categories.forEach((category) => {
                const barHeight = yScale.bandwidth() / 2.2
                const baseY = yScale(category.name)
                const y = group.side === 'left' ? baseY : baseY + barHeight + 5
                const barWidth = xScale(category.value)

                let x
                if (group.side === 'left') {
                    x = this.width / 2 - barWidth
                } else {
                    x = this.width / 2
                }

                // Draw bar with enhanced styling and animation
                this.g
                    .append('rect')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('width', 0)
                    .attr('height', barHeight)
                    .attr('fill', category.color)
                    .attr('opacity', 0.85)
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(800)
                    .ease(d3.easeBackOut)
                    .attr('width', barWidth)
                    .selection()
                    .on('mouseover', function (event) {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('opacity', 1)
                            .attr('stroke', '#2C3E50')
                            .attr('stroke-width', 1)

                        // Show tooltip
                        const tooltip = d3
                            .select('body')
                            .append('div')
                            .attr('class', 'butterfly-tooltip')
                            .style('opacity', 0)
                            .style('position', 'absolute')
                            .style('background', 'rgba(0,0,0,0.8)')
                            .style('color', 'white')
                            .style('padding', '6px 10px')
                            .style('border-radius', '4px')
                            .style('font-size', '11px')
                            .style('pointer-events', 'none')

                        tooltip.transition().duration(200).style('opacity', 1)

                        tooltip
                            .html(`${category.name}: ${category.value}`)
                            .style('left', event.pageX + 10 + 'px')
                            .style('top', event.pageY - 10 + 'px')
                    })
                    .on('mouseout', function () {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('opacity', 0.85)
                            .attr('stroke', 'none')

                        d3.selectAll('.butterfly-tooltip').remove()
                    })

                // Add value labels with enhanced styling
                const labelX =
                    group.side === 'left' ? x - 12 : x + barWidth + 12
                this.g
                    .append('text')
                    .attr('x', labelX)
                    .attr('y', y + barHeight / 2)
                    .attr('dy', '0.35em')
                    .attr(
                        'text-anchor',
                        group.side === 'left' ? 'end' : 'start'
                    )
                    .attr('font-family', 'Arial, sans-serif')
                    .attr('font-size', '12px')
                    .attr('font-weight', 'bold')
                    .attr('fill', '#2C3E50')
                    .style('opacity', 0)
                    .transition()
                    .delay(400)
                    .duration(600)
                    .style('opacity', 1)
                    .selection()
                    .text(category.value)
            })
        })

        // Add category labels in center with enhanced styling
        data.groups[0].categories.forEach((category) => {
            this.g
                .append('text')
                .attr('x', this.width / 2)
                .attr('y', yScale(category.name) + yScale.bandwidth() / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .attr('font-family', 'Arial, sans-serif')
                .attr('font-size', '13px')
                .attr('font-weight', 'bold')
                .attr('fill', '#2C3E50')
                .style('opacity', 0)
                .transition()
                .delay(200)
                .duration(600)
                .style('opacity', 1)
                .selection()
                .text(category.name)
        })

        // Add group labels with enhanced styling
        this.g
            .append('text')
            .attr('x', this.width / 4)
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-size', '15px')
            .attr('font-weight', 'bold')
            .attr('fill', '#3498DB')
            .style('opacity', 0)
            .transition()
            .duration(600)
            .style('opacity', 1)
            .selection()
            .text(data.groups[0].name)

        this.g
            .append('text')
            .attr('x', (3 * this.width) / 4)
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-size', '15px')
            .attr('font-weight', 'bold')
            .attr('fill', '#E74C3C')
            .style('opacity', 0)
            .transition()
            .duration(600)
            .style('opacity', 1)
            .selection()
            .text(data.groups[1].name)

        // Add title with enhanced styling
        this.g
            .append('text')
            .attr('x', this.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('fill', '#2C3E50')
            .style('opacity', 0)
            .transition()
            .duration(600)
            .style('opacity', 1)
            .selection()
            .text(data.title)
    }
}

// Initialize function to be called from main script
function createGeneralButterflyChart(
    containerId,
    dataUrl = 'butterfly_data.json'
) {
    console.log(
        'Creating GeneralButterflyChart with container:',
        containerId,
        'and dataUrl:',
        dataUrl
    )
    try {
        const chart = new GeneralButterflyChart(containerId, dataUrl)
        console.log('GeneralButterflyChart created successfully')
        return chart
    } catch (error) {
        console.error('Error creating GeneralButterflyChart:', error)
        throw error
    }
}

// Test function to demonstrate inclusive gender color system
function testGenderColorSystem() {
    const chart = new GeneralButterflyChart('#test')
    const testGenders = [
        'male',
        'female',
        'non-binary',
        'agender',
        'genderfluid',
        'transgender',
        'demigender',
        'bigender',
        'pangender',
        'genderqueer',
        'unknown',
        'other',
        'custom-identity',
    ]

    console.log('🏳️‍⚧️ Inclusive Gender Color System Test:')
    testGenders.forEach((gender) => {
        console.log(`  ${gender}: ${chart.getGenderColor(gender)}`)
    })
}
