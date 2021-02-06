((arrays, d3) => {
    const TYPE_GROUPED = 'grouped';

    class VerticalBarChart extends arrays.BarChart {
        constructor() {
            super();

            /**
             * Benchmarks
             * @private
             * @param {Benchmarks}
             */
            this._benchmarks = null;
        }

        /**
         * Initialize the VerticalBarChart
         * @public
         * @extends BarChart
         * @param {Object} data
         * @param {Object} options
         * @returns {VerticalBarChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                yDomainPadding: 0.1,
            });

            super.init(data, options);

            return this;
        }

        /**
         * Utility for creating custom static elements
         * @private
         * @extends BarChart
         */
        _renderCustomComponents() {
            super._renderCustomComponents();

            // add annotations layer
            this._annotations = this._svg.append('g')
                .attr('class', 'gist-annotations')
                .attr('pointer-events', 'none')
                .attr('transform', `translate(${this._margin.left},${this._margin.top})`);

            // add benchmarks
            if (this._benchmarkData.length && !this._options.normalize) {
                this._benchmarks = new arrays.Benchmarks(this._annotations, this._dimensions, this._yScale, this._benchmarkData);
            }
        }

        /**
         * Get x scale
         * @public
         * @extends CartesianChart
         * @returns {d3.scale}
         */
        getXScale() {
            if (d3.version > '3.x') {
                return d3.scaleBand(this.getXRange(), this._options.padding)
                    .domain(this.getXDomain());
            }

            return d3.scale.ordinal()
                .rangeBands(this.getXRange(), this._options.padding)
                .domain(this.getXDomain());
        }

        /**
         * Get x range
         * @public
         * @extends CartesianChart
         * @returns {Array}
         */
        getXRange() {
            if (this._options.sortDirection) {
                return [this._dimensions.innerWidth, 0];
            } else {
                return [0, this._dimensions.innerWidth];
            }
        }

        /**
         * Get x extent.
         * @public
         * @extends CartesianChart
         * @returns {String[]}
         */
        getXDomain() {
            return this._categories;
        }

        /**
         * Get y domain.
         * @public
         * @extends CartesianChart
         * @returns {Number[]}
         */
        getYDomain() {
            let domain = [];

            let min = this.getMinValue();
            let max = this.getMaxValue();

            this._benchmarkData = this._options.annotations.benchmarks || [];

            if (this._benchmarkData.length && !this._options.normalize) {
                const benchmarkExtent = d3.extent(this._benchmarkData, ({ value }) => value);

                if (benchmarkExtent[0] < min) {
                    min = benchmarkExtent[0] - (min - benchmarkExtent[0]);
                }

                if (benchmarkExtent[1] > max) {
                    max = benchmarkExtent[1] + (benchmarkExtent[1] - max);
                }
            }

            /**
             * Pad domain
             */
            if (this._options.yDomainPadding) {
                domain = this._padYDomain(min, max);
            } else {
                domain = [min, max];
            }

            return domain;
        }

        /**
         * Pad y domain.
         * Pad by percentage of y domain, to add above chart data (and below, if min is not 0)
         * @public
         * @returns {Array} - [min, max]
         */
        _padYDomain(min, max) {
            const padding = (max - min) * this._options.yDomainPadding;

            // if min is 0, don't force below
            if (min >= 0) {
                min = Math.max(0, min - padding);
            } else {
                min -= padding;
            }

            max += padding;

            return [min, max];
        }

        /**
         * Update x axis container
         * @public
         * @extends CartesianChart
         */
        updateXAxisContainer() {
            this._xAxisContainer.attr('transform', this.getXAxisTransform());

            const delay = (datum, i, j) => j * 4;

            if (this.renderOptions.xAxis) {
                if (this._options.puppeteerScreenshot) {
                    this._xAxisContainer
                        .call(this.getXAxis());
                } else {
                    this._xAxisContainer
                        .transition()
                        .duration(750)
                        .call(this.getXAxis())
                        .selectAll('g')
                        .delay(delay);
                }
            }
        }

        /**
         * Get x axis
         * @public
         * @extends CartesianChart
         * @returns {d3.svg.axis}
         */
        getXAxis() {
            const xAxis = d3.svg.axis()
                .scale(this._xScale)
                .orient('bottom');

            if (this._options.isGroupByPercent) {
               xAxis.tickFormat(this.getPercentFormatter);
            }

            return xAxis;
        }

        /**
         * Get y axis
         * @public
         * @extends CartesianChart
         * @returns {d3.svg.axis}
         */
        getYAxis() {
            const yAxis = d3.svg.axis()
                .scale(this._yScale)
                .orient('left');

            if (this.renderOptions.yAxisTicks) {
                if (this._options.isAggregateByPercent) {
                   yAxis.tickFormat(this.getPercentFormatter);
                } else {
                    yAxis.tickFormat(this.getValueFormatter());
                }
            }

            if (this._options.normalize) {
                yAxis.tickValues([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
            }

            return yAxis;
        }

        /*
         * Style x label
         * @public
         * @extends CartesianChart
         */
        styleXTickLabels() {
            if (this.renderOptions.xAxis) {
                const self = this;
                const { isExternalAccess } = this._options;
                let maxLabelLength = 0;

                const tickText = this._xAxisContainer.selectAll('g.tick text')
                    .each(function () {
                        const label = d3.select(this);

                        self.isLabelOrientationVertical(label, self._maxLabelWidth);

                        if (label.text().length > maxLabelLength) {
                            maxLabelLength = label.text().length;
                        }

                        return self.truncateLabel(label, self._maxLabelWidth);
                    });

                if (this._xAxisVert) {
                    let maxWidth = 0;

                    this._xAxisContainer.selectAll('g.tick text').each(function () {
                        const label = d3.select(this);
                        self.setVerticalLabel(label);

                        if (isExternalAccess) {
                            maxWidth = Math.max(label.node().getBBox().width, maxWidth);
                        }
                    });

                    // Update the SVG height with its new computed height for scrolling
                    const view = d3.select(this._options.viewSelector);
                    const visualization = view.select('.gist-visualization');
                    const currentHeight = visualization.node().getBoundingClientRect().height;

                    if (isExternalAccess) {
                        this._svg
                            .attr('viewBox', `0 0 ${this._dimensions.outerWidth} ${this._dimensions.outerHeight + maxWidth}`);
                    } else {
                        visualization.attr('height', currentHeight + maxLabelLength);
                        view.style('height', 'auto');
                    }
                }

                return tickText;
            }

            return this._xAxisContainer.selectAll('g')
                .style('visibility', 'hidden');
        }

        /*
         * Style y label
         * @public
         * @extends CartesianChart
         */
        styleYTickLabels() {
            if (this.renderOptions.yAxis) {
                this._yAxisContainer.selectAll('g')
                    .style('visibility', 'visible');
            }
        }

        /*
         * Set axis visibility
         * @public
         * @extends CartesianChart
         */
        setAxesVisibility() {
            const rangeBand = this._xScale.rangeBand();

            this._maxLabelWidth = rangeBand + (this._options.padding * rangeBand); // may need to halve padding

            if (this._maxLabelWidth < this._minVerticalLabelWidth) {
                this.renderOptions.xAxis = false;
            } else if (this._maxLabelWidth < this._minLabelWidth) {
                this.renderOptions.xAxis = true;
            } else {
                this.renderOptions.xAxis = true;
            }
        }

        /**
         * Transform bar to initial position - reusable d3 set of attr assignments
         * Use via d3.selection.call(this._transformBar, this)
         * @param  {d3.selection} selection
         * @param  {BarChart} boundThis
         * @private
         */
        _initialBarTransform(selection, boundThis) {
            const zeroY = boundThis._yScale(0);

            selection
                .attr('width', (datum, index, j) => boundThis.getBarWidth(datum, index, j))
                .attr('x', (datum, index, j) => boundThis.getBarX(datum, index, j))
                .attr('height', 0)
                .attr('y', zeroY);
        }

        /**
         * Get bar width
         * @return {Number}
         */
        getBarWidth() {
            let width = this._xScale.rangeBand();

            if (this._type === TYPE_GROUPED) {
                width /= this.maxGroups;
            }

            return width;
        }

        /**
         * Get bar height
         * @param  {Object} d - d3 bound data
         * @return {Number}
         */
        getBarHeight({ value }) {
            return Math.abs(this._yScale(value) - this._yScale(0));
        }

        /**
         * Get bar x
         * @param  {Object} datum - d3 bound data
         * @param  {Number} index - bar number within series
         * @param  {Number} j - series number
         * @return {Number}
         */
        getBarX(datum, index, j) {
            let x = this._xScale(this._categories[j]);
            const width = this.getBarWidth();

            if (this._type === TYPE_GROUPED) {
                x += index * width;
            }

            return x;
        }

        /**
         * Get bar y
         * @param  {Object} datum - d3 bound data
         * @param  {Number} index - bar number within series
         * @param  {Number} j - series number
         * @return {Number}
         */
        getBarY(datum, index, j) {
            let y = 0;
            let basePositive = 0;
            let baseNegative = 0;

            for (let k = 0; k <= index; k++) {
                const val = this._data[j][k].value; // was _chartData
                const size = Math.abs(val);

                // normal
                if (this._type === TYPE_GROUPED) {
                    y = val < 0 ? 0 : size;
                } else {
                    // stacked, (normal ok)
                    if (val < 0) {
                        y = baseNegative;
                        baseNegative -= size;
                    } else {
                        basePositive += size;
                        y = basePositive;
                    }
                }
            }

            return this._yScale(y);
        }
    }

    arrays.VerticalBarChart = VerticalBarChart;
})(window.arrays, window.d3);
