((arrays, d3, _) => {
    class AreaChart extends arrays.CartesianChart {
        constructor() {
            super();

            /**
             * Custom data domain (see getDomain())
             * @private
             * @member {Array}
             */
            this._dataDomain = null;

            this._margin = {
                top: 25,
                right: 15,
                bottom: 50, // tooltip renders ~46px tall
                left: 70,
            };

            this._titleText = 'interactive area chart';

            /**
             * Area generator.
             * @private
             * @member {d3.selection}
             */
            this._areaGenerator = null;

            this._stackLayout = null;
        }

        /**
         * Initialize the AreaChart
         * @public
         * @extends CartesianChart
         * @param {Object} data
         * @param {Object} options
         * @returns {AreaChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                yDomainPadding: 0.1,
            });

            super.init(data, options);

            return this;
        }

        /**
         * Set colors
         * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
         * @public
         * @extends D3Visualization
         * @return {AreaChart}
         */
        setColors(colorOverrides) {
            this._colors = colorOverrides || this._colorOverrides || arrays.constants.CHART_DEFAULT_COLORS;

            const patterns = this.createPatterns();
            const patternsCreated = patterns && patterns.length > 0;

            if (patternsCreated) {
                this._colors = patterns;
            }

            return this;
        }

        /**
         * Get x scale
         * @public
         * @extends CartesianChart
         * @returns {d3.scale}
         */
        getXScale() {
            if (!this._options.groupBy_isDate) {
                return super.getXScale();
            }

            return d3.time
                .scale()
                .range(this.getXRange())
                .domain(this.getXDomain());
        }

        /**
         * Pre-process the AreaChart's data before saving it (hook)
         * @public
         * @param {Object[][]} data - incoming data
         * @returns {Object[][]} processed data
         */
        preProcessData(data) {
            // @todo refactor groupBy_isDate

            if (this._options.groupBy_isDate) {
                data.forEach(series => {
                    series.forEach(item => (item.x = new Date(item.x)));
                });
            }

            return data;
        }

        /**
         * Post-process the AreaChart's data (hook)
         * @public
         */
        postProcessData() {
            super.postProcessData();

            const allXValues = _.sortBy(_.uniq(_.flatten(this._data).map(({ x }) => x.valueOf())));
            const data = this._data.map(series => {
                return allXValues.map(x => {
                    const item = series.find(item => item.x.valueOf() === x);
                    return item || { x, y: 0 };
                });
            });

            // Compute stack layout
            this._stackLayout = d3.layout.stack();

            this._data = this._stackLayout(data);
        }

        /**
         * Creates the static elements
         * @private
         * @extends CartesianChart
         */
        _createStaticElements() {
            super._createStaticElements();

            // Create area generator
            this._areaGenerator = d3.svg
                .area()
                .defined(({ x, y }) => !_.isNil(x) && !_.isNil(y))
                .x(({ x }) => this._xScale(x))
                .y0(({ y0 }) => this._yScale(y0))
                .y1(({ y0, y }) => this._yScale(y0 + y));
        }

        /**
         * Get x extent.
         * @public
         * @returns {Date[]}
         */
        getXDomain() {
            return d3.extent(
                this._data.reduce(function(extent, dataSet) {
                    return extent.concat(
                        dataSet.map(function(d) {
                            return d.x;
                        })
                    );
                }, [])
            );
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
         * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
         * @private
         * @extends CartesianChart
         */
        _seriesEnterHook() {
            super._seriesEnterHook();

            this._seriesEnter
                .append('a')
                .attr('tabindex', '0')
                .attr('role', 'link')
                .attr('aria-label', (datum, index) => {
                    const areaData = datum.map(({ y }) => y);
                    return `Area ${this._labels[index]} has a minimum value of ${_.min(
                        areaData
                    )} and a maximum value of ${_.max(areaData)}`;
                })
                .append('path')
                .attr('class', 'gist-area')
                .style('fill', (datum, index) => this._colors[index]);
        }

        /**
         * Hook for d3 code affecting the series enter + update selection (use this._series)
         * @private
         * @extends CartesianChart
         */
        _seriesEnterUpdateHook() {
            super._seriesEnterUpdateHook();

            this._series.select('path').attr('d', datum => this._areaGenerator(datum));
        }
    }

    arrays.AreaChart = AreaChart;
})(window.arrays, window.d3, window._);
