((arrays, $, d3) => {
    /**
     * Abstract class representing a 2d cartesian d3 visualization with axes, scales, etc
     * @constructor
     * @extends D3Visualization
     */
    arrays.CartesianChart = function() {
        // Call the parent constructor, making sure (using Function#call)
        // that "this" is set correctly during the call
        arrays.D3Visualization.call(this);

        /**
         * SVG g element, container for the x axis
         * @member {d3.selection}
         * @private
         */
        this._xAxisContainer = null;

        /**
         * SVG g element, container for the y axis
         * @member {d3.selection}
         * @private
         */
        this._yAxisContainer = null;

        /**
         * SVG g element, container for the zero axis
         * @member {d3.selection}
         * @private
         */
        this._zeroAxisContainer = null;

        /**
         * Chart x label container.
         * @private
         * @member {d3.selection}
         */
        this._xLabelContainer = null;

        /**
         * Chart y label container.
         * @private
         * @member {d3.selection}
         */
        this._yLabelContainer = null;

        /**
         * d3 data bound selection for the data series
         * expressed as svg <g class="series">
         * acts as an update selection, then an enter + update selection
         * @member {d3.selection}
         * @private
         */
        this._series = null;

        /**
         * d3 data bound "enter" selection
         * @member {d3.selection}
         * @private
         */
        this._seriesEnter = null;

        /**
         * d3 data bound "exit" selection
         * @member {d3.selection}
         * @private
         */
        this._seriesExit = null;

        /**
         * Chart x scale function.
         * @private
         * @member {d3.scale}
         */
        this._xScale = null;

        /**
         * Chart y scale function.
         * @private
         * @param {d3.scale}
         */
        this._yScale = null;

        /**
         * X-Axis highlight tooltip.
         * @private
         */
        this._xAxisHighlight = new arrays.Tooltip();

        /**
         * X axis height.
         * @private
         * @param {Integer}
         */
        this._xAxisHeight = 20;

        /**
         * Mouse event receiver
         * @private
         * @param {d3.selection}
         */
        this._receiver = null;

        /**
         * Brush
         * @private
         * @param {Brush}
         */
        this._brush = null;

        /**
         * Nav state
         * @private
         * @member {Array}
         */
        this._extent = null;

        /**
         * Brush target
         * @private
         * @param {Visualization}
         */
        this._brushTarget = null;

        /**
         * Visualization dimensions
         * @private
         * @param {Object}
         */
        this._dimensions = {
            innerWidth: 0,
            innerHeight: 0,
            outerWidth: 0,
            outerHeight: 0,
        };
    };

    // Create a CartesianChart.prototype object that inherits from D3Visualization.prototype.
    arrays.CartesianChart.prototype = Object.create(arrays.D3Visualization.prototype);

    // Set the "constructor" property to refer to CartesianChart
    arrays.CartesianChart.prototype.constructor = arrays.CartesianChart;

    /**
     * Initialize the CartesianChart
     * @public
     * @extends D3Visualization
     * @param {Object} options
     * @returns {CartesianChart}
     */
    arrays.CartesianChart.prototype.init = function(data, options) {
        // Augment default options
        $.extend(true, this._options, {
            xAxisLabel: 'x',
            yAxisLabel: 'y',
        });

        // Call the "parent" method first
        arrays.D3Visualization.prototype.init.call(this, data, options);

        try {
            this._extent = options.extent;
        } catch (e) {
            // chart options does not contain extents
        }

        // Augment render options
        $.extend(true, this.renderOptions, {
            xAxis: true,
            yAxis: true,
            xAxisTicks: false,
            yAxisTicks: true,
            xAxisLabel: false,
            yAxisLabel: false,
            mouseEvents: true,
            brush: false,
        });

        return this;
    };

    /**
     * Getters
     */

    /**
     * Get x extent.
     * @public
     * @returns {Date[]}
     */
    arrays.CartesianChart.prototype.getXDomain = function() {
        return d3.extent(
            this._data.reduce(function(extent, dataSet) {
                return extent.concat(dataSet.map(({ x }) => x));
            }, [])
        );
    };

    /**
     * Get y extent.
     * @public
     * @returns {Number[]}
     */
    arrays.CartesianChart.prototype.getYDomain = function() {
        const max = this._data.reduce(function(maxValue, dataSet) {
            return Math.max(
                maxValue,
                dataSet.length ?
                    d3.max(
                        dataSet.map(function(d) {
                            return d.y;
                        })
                    ) :
                    0
            );
        }, 0);

        let min = this._data.reduce(function(minValue, dataSet) {
            return Math.min(
                minValue,
                dataSet.length ?
                    d3.min(
                        dataSet.map(function(d) {
                            return d.y;
                        })
                    ) :
                    0
            );
        }, 0);

        min = min < 0 ? min : 0;

        return [min, max];
    };

    /**
     * Get x range
     * @public
     * @returns {Array}
     */
    arrays.CartesianChart.prototype.getXRange = function() {
        return [0, this._dimensions.innerWidth];
    };

    /**
     * Get y range
     * @public
     * @returns {Array}
     */
    arrays.CartesianChart.prototype.getYRange = function() {
        return [this._dimensions.innerHeight, 0];
    };

    /**
     * Get x scale
     * @public
     * @returns {d3.scale}
     */
    arrays.CartesianChart.prototype.getXScale = function() {
        if (d3.version > '3.x') {
            return d3
                .scaleLinear()
                .range(this.getXRange())
                .domain(this.getXDomain());
        } else {
            return d3.scale
                .linear()
                .range(this.getXRange())
                .domain(this.getXDomain());
        }
    };

    /**
     * Get y scale
     * @public
     * @returns {d3.scale}
     */
    arrays.CartesianChart.prototype.getYScale = function() {
        if (d3.version > '3.x') {
            return d3
                .scaleLinear()
                .range(this.getYRange())
                .domain(this.getYDomain());
        } else {
            return d3.scale
                .linear()
                .range(this.getYRange())
                .domain(this.getYDomain());
        }
    };

    /**
     * Get x axis CSS transform (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getXAxisTransform = function() {
        return 'translate(0,' + this._dimensions.innerHeight + ')';
    };

    /**
     * Get y axis CSS transform (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getYAxisTransform = function() {
        return 'translate(0,0)';
    };

    /**
     * Get zero axis CSS transform (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getZeroAxisTransform = function() {
        return 'translate(0,' + this._yScale(0) + ')';
    };

    /**
     * Get x label CSS transform (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getXLabelTransform = function() {
        return (
            'translate(' +
            (this._margin.left + this._dimensions.innerWidth / 2) +
            ', ' +
            (this._dimensions.outerHeight - 18) +
            ')'
        );
    };

    /**
     * Get y label CSS transform (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getYLabelTransform = function() {
        return 'translate(15, ' + (this._margin.top + this._dimensions.innerHeight / 2) + ') rotate(-90)';
    };

    /**
     * Get x label CSS visibility (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getXLabelVisibility = function() {
        return this._isMobileMode() ? 'hidden' : 'visible';
    };

    /**
     * Get y label CSS visibility (as a string)
     * @public
     * @returns {string}
     */
    arrays.CartesianChart.prototype.getYLabelVisibility = function() {
        return this._isMobileMode() ? 'hidden' : 'visible';
    };

    /**
     * Get x axis
     * @public
     * @returns {d3.svg.axis}
     */
    arrays.CartesianChart.prototype.getXAxis = function() {
        let xAxis;
        if (d3.version > '3.x') {
            xAxis = d3.axisBottom().scale(this._xScale);
        } else {
            xAxis = d3.svg
                .axis()
                .scale(this._xScale)
                .orient('bottom');
        }
        if (this._options.groupBy_isDate || this._options.XAxisIsDate) {
            const formatters = [
                ['.%L', datum => datum.getMilliseconds()],
                [':%S', datum => datum.getSeconds()],
                ['%I:%M', datum => datum.getMinutes()],
                ['%I %p', datum => datum.getHours()],
                ['%a %d', datum => datum.getDay() && datum.getDate() !== 1],
                ['%b %d', datum => datum.getDate() !== 1],
                ['%B', datum => datum.getMonth()],
                ['%-Y', () => true],
            ];

            if (d3.version > '3.x') {
                xAxis.tickFormat(d3.timeParse(formatters));
            } else {
                xAxis.tickFormat(d3.time.format.multi(formatters));
            }
        } else if (this._options.isXAxisPercent || this._options.isGroupByPercent) {
            xAxis.tickFormat(this.getPercentFormatter);
        } else {
            xAxis.tickFormat(this.getValueFormatter());
        }

        if (this.renderOptions.xAxisTicks) {
            xAxis.tickSize(-this._dimensions.innerHeight, 0);
        } else {
            xAxis.tickSize(6, 0);
        }

        xAxis.ticks(this.getXAxisTicksAmount());

        return xAxis;
    };

    /**
     * Get y axis
     * @public
     * @returns {d3.svg.axis}
     */
    arrays.CartesianChart.prototype.getYAxis = function() {
        const self = this;
        let yAxis;

        if (d3.version > '3.x') {
            yAxis = d3.axisLeft().scale(this._yScale);
        } else {
            yAxis = d3.svg
                .axis()
                .scale(this._yScale)
                .orient('left');
        }

        yAxis.tickPadding(25);

        if (this._options.isYAxisPercent || this._options.isAggregateByPercent) {
            yAxis.tickFormat(this.getPercentFormatter);
        } else {
            yAxis.tickFormat(this.getValueFormatter());
        }

        if (this.renderOptions.yAxisTicks) {
            yAxis.tickSize(-this._dimensions.innerWidth, 0);
        } else {
            yAxis.tickSize(0, 0);
        }

        return yAxis;
    };

    /**
     * Create x axis container
     * @public
     */
    arrays.CartesianChart.prototype.createXAxisContainer = function() {
        this._xAxisContainer = this._canvas.append('g').attr('class', 'gist-axis gist-x-axis');

        this.updateXAxisContainer();
    };

    /**
     * Create y axis container
     * @public
     */
    arrays.CartesianChart.prototype.createYAxisContainer = function() {
        this._yAxisContainer = this._canvas.append('g').attr('class', 'gist-axis gist-y-axis');

        this.updateYAxisContainer();
    };

    /**
     * Create zero axis container
     * @public
     */
    arrays.CartesianChart.prototype.createZeroAxisContainer = function() {
        this._zeroAxisContainer = this._canvas.append('g').attr('class', 'gist-axis gist-zero-axis');

        this.updateZeroAxisContainer();
    };

    /**
     * Create x axis label (not tick labels) container
     * @public
     */
    arrays.CartesianChart.prototype.createXLabelContainer = function() {
        this._xLabelContainer = this._svg
            .append('g')
            .attr('class', 'label x-label')
            .attr('text-anchor', 'middle')
            .attr('class', 'axis-label');

        this._xLabelContainer.append('text').text(this.getXLabelText());
    };

    /**
     * Create y axis label (not tick labels) container
     * @public
     */
    arrays.CartesianChart.prototype.createYLabelContainer = function() {
        this._yLabelContainer = this._svg
            .append('g')
            .attr('class', 'label y-label')
            .attr('text-anchor', 'middle')
            .attr('class', 'axis-label');

        this._yLabelContainer.append('text').text(this.getYLabelText());
    };

    /**
     * Get x axis label text (not tick labels)
     * @public
     * @returns {String}
     */
    arrays.CartesianChart.prototype.getXLabelText = function() {
        return this._normalizeLabel(this._options.xAxisLabel);
    };

    /**
     * Get y axis label text (not tick labels)
     * @public
     * @returns {String}
     */
    arrays.CartesianChart.prototype.getYLabelText = function() {
        return this._normalizeLabel(this._options.yAxisLabel);
    };

    /**
     * Update x axis container
     * @public
     */
    arrays.CartesianChart.prototype.updateXAxisContainer = function() {
        this._xAxisContainer.attr('transform', this.getXAxisTransform());

        if (this.renderOptions.xAxis) {
            this._xAxisContainer.call(this.getXAxis());
        }

        this._xAxisContainer.attr('font-size', 'inherit').attr('font-family', 'inherit');
    };

    /**
     * Update y axis container
     * @public
     */
    arrays.CartesianChart.prototype.updateYAxisContainer = function() {
        this._yAxisContainer.attr('transform', this.getYAxisTransform());

        if (this.renderOptions.yAxis) {
            this._yAxisContainer.call(this.getYAxis());
        }

        this._yAxisContainer.attr('font-size', 'inherit').attr('font-family', 'inherit');
    };

    /**
     * Update zero axis container, if needed
     * @public
     */
    arrays.CartesianChart.prototype.updateZeroAxisContainer = function() {
        if (this._yScale.domain()[0] < 0) {
            this._zeroAxisContainer.attr('transform', this.getZeroAxisTransform());

            this._zeroAxisContainer.selectAll('line').remove();
            this._zeroAxisContainer
                .append('line')
                .attr('x1', 0)
                .attr('x2', this._dimensions.innerWidth);
        }
    };

    /**
     * Update x axis label container
     * @public
     */
    arrays.CartesianChart.prototype.updateXLabelContainer = function() {
        this._xLabelContainer
            .attr('transform', this.getXLabelTransform())
            .style('visibility', this.getXLabelVisibility());
    };

    /**
     * Update y axis label container
     * @public
     */
    arrays.CartesianChart.prototype.updateYLabelContainer = function() {
        this._yLabelContainer
            .attr('transform', this.getYLabelTransform())
            .style('visibility', this.getYLabelVisibility());
    };

    /**
     * Set brush target
     * @public
     * @param {Visualization} brushTarget
     * @return {CartesianChart}
     */
    arrays.CartesianChart.prototype.setBrushTarget = function(brushTarget) {
        this._brushTarget = brushTarget;

        return this;
    };

    /**
     * Create scales
     * @public
     */
    arrays.CartesianChart.prototype.createScales = function() {
        this._xScale = this.getXScale();
        this._yScale = this.getYScale();
    };

    /**
     * Create x and y axes
     * @public
     */
    arrays.CartesianChart.prototype.createAxes = function() {
        this.createXAxisContainer();
        this.createYAxisContainer();
        this.createZeroAxisContainer();
        if (this.renderOptions.xAxisLabel) {
            this.createXLabelContainer();
        }
        if (this.renderOptions.yAxisLabel) {
            this.createYLabelContainer();
        }
    };

    /**
     * Update x and y axes
     * @public
     */
    arrays.CartesianChart.prototype.updateAxes = function() {
        this.updateXAxisContainer();
        this.updateYAxisContainer();
        this.updateZeroAxisContainer();
        if (this.renderOptions.xAxisLabel) {
            this.updateXLabelContainer();
        }
        if (this.renderOptions.yAxisLabel) {
            this.updateYLabelContainer();
        }
    };

    /**
     * Creates the static elements
     * @private
     * @extends D3Visualization
     */
    arrays.CartesianChart.prototype._createStaticElements = function() {
        arrays.D3Visualization.prototype._createStaticElements.call(this);

        this.createScales();
        this.createAxes();

        this._seriesContainer = this._canvas.append('g').attr('class', 'gist-series-container');

        // Create the mouse event receiver?
        // @todo: refactor... mouseEvents as true/false is making less sense across multiple chart types
        if (this.renderOptions.mouseEvents) {
            this._createMouseEventReceiver();
        }

        // Create the brush?
        if (this.renderOptions.brush) {
            const target = this._brushTarget ? this._brushTarget : this;
            this._brush = new arrays.Brush(
                this._xScale,
                this._canvas,
                this._dimensions.innerHeight + this._xAxisHeight,
                this._dispatch,
                target,
                this._extent
            );
            this._dispatch.on('updateBrush', function(extent0, extent1) {
                if (extent0) {
                    this.updateExtents(extent0, extent1);
                }
            });

            // Append x axis bottom border line
            this._xAxisBorder = this._xAxisContainer
                .append('line')
                .attr('y1', this._xAxisHeight)
                .attr('y2', this._xAxisHeight);
        }
    };

    /**
     * Renders a CartesianChart
     * Idempotent: only include d3 rendering code that can be run over and over
     * @private
     * @extends D3Visualization
     */
    arrays.CartesianChart.prototype._renderVisualization = function() {
        arrays.D3Visualization.prototype._renderVisualization.call(this);

        this._createSeriesUpdateSelection();
        this._createSeriesEnterSelection();
        this._seriesEnterHook();
        this._seriesEnterUpdateHook();
        this._createSeriesExitSelection();
        this._seriesExitHook();
    };

    /**
     * Get the unique key for the d3 bound data, to enable d3 object constancy
     * @param  {Object} d - d3 bound data
     * @return {String|Number}   unique key
     */
    arrays.CartesianChart.prototype._getKeyForObject = function(d) {
        // classes extending this method should return something appropriate
        // to the data if possible/relevant, like d.id or d.title (see e.g. Scatterplot)
        // but as a baseline we'll just stringify to get a unique-ish result
        return JSON.stringify(d);
    };

    /**
     * Create the series update selection
     * @private
     */
    arrays.CartesianChart.prototype._createSeriesUpdateSelection = function() {
        const self = this;
        this._series = this._seriesContainer.selectAll('g').data(this._data, function(d) {
            return self._getKeyForObject(d);
        });
    };

    /**
     * Create the series enter selection
     * @private
     */
    arrays.CartesianChart.prototype._createSeriesEnterSelection = function() {
        this._seriesEnter = this._series.enter().append('g');
    };

    /**
     * Create the series exit selection
     * @private
     */
    arrays.CartesianChart.prototype._createSeriesExitSelection = function() {
        this._seriesExit = this._series.exit();
    };

    /**
     * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
     * @private
     */
    arrays.CartesianChart.prototype._seriesEnterHook = function() {
        this._seriesEnter.attr('class', 'gist-series');
    };

    /**
     * Hook for d3 code affecting the series enter + update selection (use this._series)
     * @private
     */
    arrays.CartesianChart.prototype._seriesEnterUpdateHook = function() {
        if (this.renderOptions.mouseEvents) {
            this._series.attr('pointer-events', 'none');
        }
    };

    /**
     * Hook for d3 code affecting the series exit selection (use this._seriesExit)
     * @private
     */
    arrays.CartesianChart.prototype._seriesExitHook = function() {
        this._seriesExit.remove();
    };

    /**
     * Updates a CartesianChart
     * @public
     * @extends D3Visualization
     */
    arrays.CartesianChart.prototype.update = function() {
        this.postProcessData();
        this.createScales();
        this.updateAxes();

        // Call the "parent" method
        arrays.D3Visualization.prototype.update.call(this);

        if (this._receiver) {
            // Resize receiver
            if (this._dimensions.innerWidth > 0 && this._dimensions.innerHeight > 0) {
                this._receiver
                    .attr('width', this._dimensions.innerWidth)
                    .attr('height', this._dimensions.innerHeight + this._margin.bottom);
            }

            // Update receiver
            this.onMouseOut();
        }

        if (this._brush) {
            // Change x axis bottom border length.
            this._xAxisBorder.attr('x2', this._dimensions.innerWidth);

            // Update brush and pass in extents from options
            this._brush.update(this._xScale, this._dimensions.innerHeight + this._xAxisHeight, this._extent);
        }
    };

    /**
     * Create a mouse event receiver
     * @private
     */
    arrays.CartesianChart.prototype._createMouseEventReceiver = function() {
        // Append mouse events receiver to canvas
        this._receiver = this._canvas
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .style('fill', 'transparent')
            .on(
                'mouseenter',
                function() {
                    this.onMouseEnter();
                }.bind(this)
            )
            .on(
                'mouseleave',
                function() {
                    this.onMouseOut();
                }.bind(this)
            )
            .on(
                'mousemove',
                function() {
                    this.onMouseMove();
                }.bind(this)
            )
            .on(
                'click',
                function() {
                    this.onClick();
                }.bind(this)
            );
    };

    /**
     * Callback for mouse enter events
     * @public
     */
    arrays.CartesianChart.prototype.onMouseEnter = function() {};

    /**
     * Callback for mouse out events
     * @public
     */
    arrays.CartesianChart.prototype.onMouseOut = function() {};

    /**
     * Callback for mouse move events
     * @public
     */
    arrays.CartesianChart.prototype.onMouseMove = function() {};

    /**
     * Callback for mouse click events
     * @public
     */
    arrays.CartesianChart.prototype.onClick = function() {};

    /**
     * Update the extents of the data being visualized
     * @param  {number} min
     * @param  {number} max
     * @public
     */
    arrays.CartesianChart.prototype.updateExtents = function(min, max) {
        const data = this._unfilteredData.map(function(series) {
            return series.filter(function(d) {
                if (d.x >= min && d.x <= max) {
                    return true;
                } else {
                    return false;
                }
            });
        });

        const nResults = data
            .map(function(item) {
                return item.length;
            })
            .reduce(function(a, b) {
                return a + b;
            }, 0);

        /*
         * Replace data, if there are any results
         */
        if (nResults) {
            this.replaceData(data, false);
        }
    };

    /**
     * Normalize axis label.
     * @private
     * @param {String} label
     * @return {String}
     */
    arrays.CartesianChart.prototype._normalizeLabel = label => label.replace(/_/g, ' ');

    /**
     * Check enough size for axes.
     * @private
     * @returns {Boolean}
     */
    arrays.CartesianChart.prototype._isMobileMode = function() {
        const dimensions = this._container.node().getBoundingClientRect();
        return dimensions.width < 400;
    };

    /**
     * Get x axis ticks amount
     * @public
     * @extends CartesianChart
     * @returns {Number}
     */
    arrays.CartesianChart.prototype.getXAxisTicksAmount = function() {
        // Evaluate amount of required ticks to display only years.
        const datesDomainLength = this._dataDomain.length;
        const tickSize = (this._options.groupBy_isDate || this._options.XAxisIsDate) ? 125 : 50;
        const xScaleTicksAmount = Math.max(this._dimensions.innerWidth / tickSize, 2);

        return Math.min(datesDomainLength, xScaleTicksAmount);
    };

    /**
     * Gets the domain
     * @public
     * @returns {Array}
     */
    arrays.CartesianChart.prototype.getDomain = function() {
        // Take _dataFrames for bubble chart because _data have only data for one frame
        //TODO Change it after refactor bubble chart
        const dataFrames = this._dataFrames && _.map(this._dataFrames, ({ data }) => data);
        let data = dataFrames || this._data;
        data = _.isArray(data[0]) ? data : [data];
        return _.uniq(data.reduce((data, dataSet) => data.concat(dataSet.map(({ x }) => x)), [])).sort((a, b) => a - b);
    };

    /**
     * Get value formatter for ticks
     * @returns {Function}
     */
    arrays.CartesianChart.prototype.getValueFormatter = function() {
        return function(d) {
            if (!d) {
                return '';
            }

            const precise = _.get(this, ['options', 'precise'], 2);
            const generalNumber = _.round(d, precise);

            return arrays.orderOfMagnitude(generalNumber, precise);
        };
    };

    arrays.CartesianChart.prototype.postProcessData = function() {
        // Update all possible x values and sort them for future bisect function.
        this._dataDomain = this.getDomain();
    };
})(window.arrays, window.jQuery, window.d3);
