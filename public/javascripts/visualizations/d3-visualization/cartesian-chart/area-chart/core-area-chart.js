((arrays, d3, _, moment) => {
    const TOOLTIP_WIDTH = 335;

    class CoreAreaChart extends arrays.AreaChart {
        constructor() {
            super();

            /**
             * Hover group
             * @member {d3.selection}
             */
            this._hoverGroup = null;

            /**
             * Line pointer
             * @member {d3.selection}
             */
            this._linePointer = null;

            /**
             * Benchmarks
             * @private
             * @param {Benchmarks}
             */
            this._benchmarks = null;
        }

        /**
         * Initialize the CoreAreaChart
         * @public
         * @extends AreaChart
         * @param {Object} data
         * @param {Object} options
         * @returns {CoreAreaChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                annotations: {},
            });

            super.init(data, options);

            return this;
        }

        /**
         * Update the extents of the data being visualized
         * @param  {number} min
         * @param  {number} max
         * @public
         */
        updateExtents(min, max) {
            // Filter data depending on extent.
            const data = this._unfilteredData.map(series => {
                return series.filter(({ x }) => x >= min && x <= max);
            });

            const nResults = _.sum(data.map(series => series.length));

            if (nResults) {
                this.replaceData(data, false);
            }
        }

        /**
         * Creates the static elements
         * @private
         * @extends AreaChart
         */
        _createStaticElements() {
            super._createStaticElements();

            // Create annotations and top line
            this._renderCustomComponents();

            if (this.renderOptions.mouseEvents) {
                // Append group for hover pointer and circles.
                this._hoverGroup = this._canvas.append('g').attr('pointer-events', 'none');

                // Render line pointer.
                this._linePointer = this._hoverGroup
                    .append('line')
                    .attr('class', 'gist-pointer')
                    .attr('y1', 0);

                // Append x-axis highlight to the container
                this._xAxisHighlight
                    .setOn(this._container.node(), 'gist-xaxis-highlight')
                    .setOffset('top', -this._dimensions.innerHeight - 30);

                // Append tooltip to the document body.
                this._tooltip
                    .setOn(this._container.node(), 'gist-chart-tooltip')
                    .setWidth(TOOLTIP_WIDTH)
                    .setOffset('top', -10);

                this.updateNearest();

                this.updateHoverComponents();

                this.onMouseOut();
            }
        }

        /**
         * Utility for creating custom static elements
         * @private
         */
        _renderCustomComponents() {
            // add annotations layer
            this._annotations = this._svg
                .append('g')
                .attr('class', 'gist-annotations')
                .attr('pointer-events', 'none')
                .attr('transform', `translate(${this._margin.left},${this._margin.top})`);

            // add benchmarks
            if (this._benchmarkData.length) {
                this._benchmarks = new arrays.Benchmarks(
                    this._annotations,
                    this._dimensions,
                    this._yScale,
                    this._benchmarkData
                );
            }

            // add text annotations
            if (this._options.annotations.overlayText) {
                new arrays.OverlayText(this._annotations, [this._options.annotations.overlayText]);
            }
        }

        /**
         * Get nearest index based on mouse position
         * @public
         * @return {Number} index suitable for use in this._dataDomain
         */
        getNearestIndex() {
            // Get mouse coordinate relative to parent element.
            const [mouseX] = d3.mouse(this._receiver.node());

            // Get date value under mouse pointer.
            let invertedData = this._xScale.invert(mouseX);
            if (this._options.groupBy_isDate) {
                invertedData = invertedData.getTime();
            }

            // Get nearest to x index
            return arrays.bisect(this._dataDomain, invertedData);
        }

        /**
         * Update nearest data, x and y based on optionally supplied index
         * @public
         * @param  {Number} [index] index appropriate for looking up data from this._dataDomain.
         * Optional; if not supplied, defaults to last/rightmost element
         */
        updateNearest(index) {
            // Get rightmost index if not supplied. note index can be 0 so is not falsy
            if (_.isNil(index)) {
                index = this._dataDomain.length - 1;
            }
            this._nearestIndex = index;

            // Get nearest data
            this._nearestData = this._options.groupBy_isDate
                ? new Date(this._dataDomain[index])
                : this._dataDomain[index];

            // Get nearest x position
            this._nearestX = this._xScale(this._nearestData);

            // Get nearest y position
            this._nearestY = this._yScale(this._nearestData);

            // Create series current values list.
            let x; // stash for benchmark data

            this._tooltipData = this._data.reduce((values, dataSet, i) => {
                // Push value into summary array, if any
                const dataPoint = _.find(dataSet, ['x', this._nearestData]);

                if (dataPoint && !_.isNil(dataPoint.x) && !_.isNil(dataPoint.y)) {
                    x = dataPoint.x;
                    // unshift so order of tooltip values matches y-order of areas
                    values.unshift({
                        x: dataPoint.x,
                        y0: dataPoint.y0,
                        y: dataPoint.y,
                        color: this._colors[i],
                        label: this._labels[i],
                    });
                }

                return values;
            }, []);

            const benchmarkValues = this._benchmarkData.reduce((values, { label, value }) => {
                if (label) {
                    values.push({
                        x,
                        y: value,
                        color: 'white',
                        label,
                        annotation: true,
                    });
                }

                return values;
            }, []);

            this._tooltipData = this._tooltipData.concat(benchmarkValues);
        }

        /**
         * Update line pointer
         * @public
         */
        updateLinePointer() {
            this._linePointer
                .attr('y2', this._dimensions.innerHeight)
                .attr('x1', this._nearestX)
                .attr('x2', this._nearestX);
        }

        /**
         * Update x axis highlight
         * @public
         */
        updateXAxisHighlight() {
            const [nearest] = this._tooltipData;
            let text = '';

            if (nearest.quarter) {
                text = nearest.quarter;
            } else if (this._options.groupBy_isDate) {
                text = moment
                    .utc(nearest.x, moment.ISO_8601)
                    .format(this._options.outputDateFormat || this._options.outputInFormat);
            } else {
                text = this._options.isGroupByPercent ? this.getPercentFormatter(nearest.x) : nearest.x;
            }

            const html = `<div class="gist-default-tooltip-content" id="gist-default-tooltip-content-date">${text}</div>`;

            this._xAxisHighlight
                .setPosition('left')
                .setOffset({
                    right: this._nearestX + this._margin.left + 30,
                    left: 0,
                })
                .setContent(html)
                .show();
        }

        /**
         * Update tooltip
         * @public
         */
        updateTooltip() {
            // Change tooltip position.
            if (this._nearestX < this._dimensions.innerWidth / 2) {
                this._tooltip.setPosition('right').setOffset({
                    left: TOOLTIP_WIDTH + this._margin.right + 10,
                    right: 0,
                });
            } else {
                this._tooltip.setPosition('left').setOffset({
                    right: TOOLTIP_WIDTH + this._margin.left + 10,
                    left: 0,
                });
            }

            // Update tooltip content.
            const units = (this._options.isAggregateByPercent && this._options.units) || '';

            const tooltipTemplate = _.template(
                `<li class="gist-legend-list-item">
                    <div class="gist-line-graph-item-container">
                        <svg height="16" width="16" style="margin-right: 15px;">
                            <circle cx="8" cy="8" r="7.5" stroke="#999" fill="<%= color %>" />
                        </svg>
                        <span><%= label %></span><span style="float: right;"><%= value %></span>
                    </div>
                </li>`
            );

            const tooltipListItems = this._tooltipData.reduce((html, { color, label, y }) => {
                html += tooltipTemplate({
                    color,
                    label: arrays.escape(label),
                    value: `${d3.format(',.1f')(y)}${units}`,
                });

                return html;
            }, '');

            this._tooltip
                .setContent(
                    `<div class="gist-default-tooltip-content">
                        <ul class="gist-line-graph-list">
                            ${tooltipListItems}
                        </ul>
                    </div>`
                )
                .show();
        }

        /**
         * Update data point highlights (circles)
         * @public
         */
        updateDataPointHighlights() {
            const circles = this._hoverGroup.selectAll('circle.gist-data-point').data(this._tooltipData);

            circles
                .enter()
                .append('circle')
                .attr('r', 5);

            circles
                .attr('class', ({ annotation }) => (annotation ? 'gist-data-point gist-annotation' : 'gist-data-point'))
                .attr('cx', ({ x }) => (x ? this._xScale(x) : 0))
                .attr('cy', ({ y0, y }) => this._yScale(y0 + y))
                .style('fill', ({ color }) => color);
        }

        /**
         * Callback for hover updates
         * @public
         * @extends CoreAreaChart
         */
        updateHoverComponents() {
            this.updateLinePointer();
            this.updateXAxisHighlight();
            this.updateTooltip();
            this.updateDataPointHighlights();
        }

        /**
         * Callback for mouse enter events
         * @public
         * @extends AreaChart
         */
        onMouseEnter() {
            // Show hover group.
            this._hoverGroup.style('display', 'block');
        }

        /**
         * Callback for mouse out events
         * @public
         * @extends AreaChart
         */
        onMouseOut() {
            // Hide tooltip.
            this._tooltip.hide();

            // Hide x-axis highlight.
            this._xAxisHighlight.hide();

            // Hide hover group.
            this._hoverGroup.style('display', 'none');
        }

        /**
         * Callback for mouse move events
         * @public
         * @extends AreaChart
         */
        onMouseMove() {
            // Get index closest to mouse x position
            const index = this.getNearestIndex();

            this.updateNearest(index);

            this.updateHoverComponents();
        }

        /**
         * Get y extent.
         * @public
         * @returns {Number[]}
         */
        getYDomain() {
            let domain = [];

            const flattenSeries = _.flatten(this._data);
            let max = d3.max(flattenSeries.map(({ y, y0 }) => y + y0));

            // for stacked area chart, force zero axis (for now)
            const min = 0;

            /**
             * Check against annotations
             */
            this._benchmarkData = this._options.annotations.benchmarks || [];

            if (this._benchmarkData.length) {
                const benchmarkExtent = d3.extent(this._benchmarkData, ({ value }) => value);

                // NOTE does not support negative benchmarks

                max = Math.max(max, benchmarkExtent[1]);
            }

            if (this._options.yDomainPadding) {
                domain = this._padYDomain(min, max);
            } else {
                domain = [min, max];
            }

            return domain;
        }

        /**
         * Handler for window resizing
         * @public
         * @extends AreaChart
         */
        update() {
            super.update();

            // Remove custom elements
            this._svg.selectAll('.gist-annotations').remove();

            // Add Custom elements back with the correct dimensions
            this._renderCustomComponents();
        }
    }

    arrays.CoreAreaChart = CoreAreaChart;
})(window.arrays, window.d3, window._, window.moment);
