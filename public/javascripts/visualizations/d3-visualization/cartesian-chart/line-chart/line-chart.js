((arrays, d3, _) => {
    class LineChart extends arrays.CartesianChart {
        constructor() {
            super();

            /**
             * Custom data domain (see getDomain())
             * @private
             * @member {Array}
             */
            this._dataDomain = null;

            // Override margin
            this._margin = {
                top: 25,
                right: 15,
                bottom: 50, // tooltip renders ~46px tall
                left: 70,
            };

            // Override title text
            this._titleText = 'interactive line chart';

            /**
             * Line generator.
             * @private
             * @member {d3.selection}
             */
            this._lineGenerator = null;
        }

        /**
         * Initialize the LineChart
         * @public
         * @extends CartesianChart
         * @param {Object} data
         * @param {Object} options
         * @returns {LineChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                yDomainPadding: 0.1,
            });

            super.init(data, options);

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

            if (d3.version > '3.x') {
                return d3
                    .scaleTime()
                    .range(this.getXRange())
                    .domain(this.getXDomain());
            }

            return d3.time
                .scale()
                .range(this.getXRange())
                .domain(this.getXDomain());
        }

        /**
         * Pre-process the Line Chart's data before saving it (hook)
         * @public
         * @param {Object[][]} data - incoming data
         * @returns {Object[][]} processed data
         */
        preProcessData(data) {
            // @todo refactor groupBy_isDate
            // process x data
            // TODO move this processing into the server-side cartesian data prep
            data.map(lineData =>
                lineData.map(data => {
                    if (this._options.groupBy_isDate) {
                        data.x = new Date(data.x);
                    } else {
                        // @todo for now, parse non-date as float. really the whole line chart was only designed for
                        // dates and will need more work.
                        data.x = parseFloat(data.x);
                    }
                    return data;
                })
            );

            data.map(function(d) {
                return d.sort(function(a, b) {
                    return a.x - b.x;
                });
            });
            return data;
        }

        /**
         * Creates the static elements
         * @private
         * @extends CartesianChart
         */
        _createStaticElements() {
            super._createStaticElements();

            // Create line generator
            this._lineGenerator = d3.version > '3.x' ? d3.line() : d3.svg.line();

            this._lineGenerator
                .defined(datum => !_.isNil(datum.x) && !_.isNil(datum.y))
                .x(datum => this._xScale(datum.x))
                .y(datum => this._yScale(datum.y));
        }

        /**
         * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
         * @private
         * @extends CartesianChart
         */
        _seriesEnterHook() {
            super._seriesEnterHook();

            this._seriesEnter
                .append('path')
                .attr('class', 'gist-line')
                .style('stroke', (datum, index) => this._colors[index]);
        }

        /**
         * Hook for d3 code affecting the series enter + update selection (use this._series)
         * @private
         * @extends CartesianChart
         */
        _seriesEnterUpdateHook() {
            super._seriesEnterUpdateHook();

            this._series.select('path').attr('d', this._lineGenerator);
        }

        /**
         * Get y domain.
         * @public
         * @extends CartesianChart
         * @returns {Number[]}
         */
        getYDomain() {
            let domain = [];

            const max = this._data.reduce((maxValue, dataSet) => {
                return Math.max(maxValue, dataSet.length ? _.max(dataSet.map(({ y }) => y)) : 0);
            }, 0);

            // chart min
            const min = _.min(
                this._data.map(series => {
                    // series min
                    return _.min(series.map(({ y }) => y));
                })
            );

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
    }

    arrays.LineChart = LineChart;
})(window.arrays, window.d3, window._);
