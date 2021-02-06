((arrays, d3) => {
    const TYPE_GROUPED = 'grouped';

    class HorizontalBarChart extends arrays.BarChart {
        constructor() {
            super();

            // override max label width
            this._maxLabelWidth = 105; // 120 (_margin.left) - ~3em
        }

        /**
         * Get x extent.
         * @public
         * @extends CartesianChart
         * @returns {String[]}
         */
        getXDomain() {
            return [this.getMinValue(), this.getMaxValue()];
        }

        /**
         * Get y scale
         * @public
         * @extends CartesianChart
         * @returns {d3.scale}
         */
        getYScale() {
            return d3.scale.ordinal()
                .rangeBands(this.getYRange(), this._options.padding)
                .domain(this.getYDomain());
        }

        /**
         * Get y range
         * @public
         * @extends CartesianChart
         * @returns {Array}
         */
        getYRange() {
            if (this._options.sortDirection) {
                return [0, this._dimensions.innerHeight];
            } else {
                return [this._dimensions.innerHeight, 0];
            }
        }

        /**
         * Get y extent.
         * @public
         * @extends CartesianChart
         * @returns {String[]}
         */
        getYDomain() {
            return this._categories;
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

            if (this.renderOptions.xAxisTicks) {
                if (this._options.isAggregateByPercent) {
                    xAxis.tickFormat(this.getPercentFormatter);
                } else {
                    xAxis.tickFormat(this.getValueFormatter());
                }

            } else {
                xAxis.ticks(0);
            }

            if (this._options.normalize) {
                xAxis.tickValues([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
            }

            return xAxis;
        }

        /**
         * Update y axis container
         * @public
         * @extends CartesianChart
         */
        updateYAxisContainer() {
            this._yAxisContainer.attr('transform', this.getYAxisTransform());

            const delay = (datum, i, j) => j * 4;

            if (this.renderOptions.xAxis) {
                if (this._options.puppeteerScreenshot) {
                    this._yAxisContainer
                        .call(this.getYAxis());
                } else {
                    this._yAxisContainer
                        .transition()
                        .duration(750)
                        .call(this.getYAxis())
                        .selectAll('g')
                        .delay(delay);
                }
            }
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

            if (this._options.isGroupByPercent) {
               yAxis.tickFormat(this.getPercentFormatter);
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
                let sum = 10;

                this._xAxisContainer
                    .selectAll('.tick')
                    .style('visibility', 'visible');

                const tickLabels = this._xAxisContainer
                    .selectAll('.tick text')
                    .each(function calculateWidth() {
                        const label = d3.select(this);
                        const { width = 0 } = label.node().getBBox();

                        sum += width;
                    });

                if (sum > this._dimensions.innerWidth) {
                    const { setVerticalLabel } = this;

                    tickLabels.each(function rotateLabel() {
                        const label = d3.select(this);

                        setVerticalLabel(label);
                    });
                }
            }
        }

        /*
         * Style y label
         * @public
         * @extends CartesianChart
         */
        styleYTickLabels() {
            if (this.renderOptions.yAxis) {
                const self = this;
                return this._yAxisContainer.selectAll('g.tick text')
                    .each(function () {
                        return self.truncateLabelByWidth(d3.select(this), self._maxLabelWidth);
                    });
            } else {
                return this._yAxisContainer.selectAll('g')
                    .style('visibility', 'hidden');
            }
        }

        /*
         * Set axis visibility
         * @public
         * @extends CartesianChart
         */
        setAxesVisibility() {
            // x axis
            this.renderOptions.xAxis = true;

            if (this._dimensions.outerHeight / this._categories.length < 36) { // ~2em
                this.renderOptions.yAxis = false;
                this._margin.left = 54; // 3em @ 18px
                this._dimensions.innerWidth = this._dimensions.outerWidth - this._margin.left - this._margin.right; // recalc
            } else {
                this.renderOptions.yAxis = true;
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
            const zeroX = boundThis._xScale(0);

            selection
                .attr('width', 0)
                .attr('height', (datum, index, j) => boundThis.getBarHeight(datum, index, j))
                .attr('x', zeroX)
                .attr('y', (datum, index, j) => boundThis.getBarY(datum, index, j));
        }

        /**
         * Get bar width
         * @param  {Object} d - d3 bound data
         * @return {Number}
         */
        getBarWidth({ value }) {
            return Math.abs(this._xScale(value) - this._xScale(0));
        }

        /**
         * Get bar height
         * @return {Number}
         */
        getBarHeight() {
            let height = this._yScale.rangeBand();

            if (this._type === TYPE_GROUPED) {
                height /= this.maxGroups;
            }

            return height;
        }

        /**
         * Get bar x
         * @param  {Object} datum - d3 bound data
         * @param  {Number} index - bar number within series
         * @param  {Number} j - series number
         * @return {Number}
         */
        getBarX(datum, index, j) {
            let x = 0;
            let basePositive = 0;
            let baseNegative = 0;

            for (let k = 0; k <= index; k++) {
                const val = this._data[j][k].value; // was _chartData
                const size = Math.abs(val);

                // normal
                if (this._type === TYPE_GROUPED) {
                    x = val < 0 ? 0 : size;
                } else {
                    // stacked, (normal ok)
                    if (val < 0) {
                        x = baseNegative;
                        baseNegative -= size;
                    } else {
                        basePositive += size;
                        x = basePositive;
                    }
                }
            }

            return datum.value < 0 ? this._xScale(datum.value + x) : this._xScale(x - datum.value);
        }

        /**
         * Get bar y
         * @param  {Object} datum - d3 bound data
         * @param  {Number} index - bar number within series
         * @param  {Number} j - series number
         * @return {Number}
         */
        getBarY(datum, index, j) {
            let y = this._yScale(this._categories[j]);
            const height = this.getBarHeight();

            if (this._type === TYPE_GROUPED) {
                y += index * height;
            }

            return y;
        }
    }

    arrays.HorizontalBarChart = HorizontalBarChart;
})(window.arrays, window.d3);
