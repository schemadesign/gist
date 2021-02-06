/* global arrays, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new Scatterplot
 * @constructor
 * @extends CartesianChart
 */
arrays.Scatterplot = function () {
    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.CartesianChart.call(this);

    /**
     * Chart bubble minimum radius.
     * @private
     * @member {Number}
     */
    this._minRadius = 6;

    /**
     * Chart bubble maximum radius.
     * @private
     * @member {Number}
     */
    this._maxRadius = 32;

    /**
     * Base margin left value (extra var to save this for mobile mode switch)
     * @private
     * @member {Number}
     */
    this._marginLeft = this._maxRadius * 3;

    // Override title text
    this._titleText = 'interactive scatterplot';

    /**
     * Chart radius scale function.
     * @private
     * @member {d3.scale}
     */
    this._radiusScale = null;

    /**
     * Axes cell's height.
     * @private
     * @member {Integer}
     */
    this._axesHeight = 20;

    this.isNewD3Version = d3.version > '3.x';

    this.rawData = [];
};

// Create a Scatterplot.prototype object that inherits from CartesianChart.prototype.
arrays.Scatterplot.prototype = Object.create(arrays.CartesianChart.prototype);

// Set the "constructor" property to refer to Scatterplot
arrays.Scatterplot.prototype.constructor = arrays.Scatterplot;

/**
 * Initialize the Scatterplot
 * @public
 * @extends CartesianChart
 * @param {Object} data
 * @param {Object} options
 * @returns {Scatterplot}
 */
arrays.Scatterplot.prototype.init = function (data, options) {
    // Call the "parent" method
    arrays.CartesianChart.prototype.init.call(this, data, options);

    // override renderOptions defaults
    $.extend(true, this.renderOptions, {
        xAxisTicks: false,
        yAxisTicks: false,
    });

    return this;
};

/**
 * Set colors
 * @public
 * @extends {CartesianChart}
 * @return {Scatterplot}
 */
arrays.Scatterplot.prototype.setColors = function (colorOverrides) {
    // Call the "parent" method
    arrays.CartesianChart.prototype.setColors.call(this, colorOverrides);

    // Scatterplot uses brand accent color only (if specified)
    try {
        if (this._options.brandColor.accent) {
            this._colors = [this._options.brandColor.accent];
        } else {
            // don't do anything... will use d3 default color scheme
        }
    } catch (err) {
        // don't do anything... will use d3 default color scheme
    }
};

/**
 * Generate axis tick data
 * @private
 * @param {Number} binLength
 * @param {Function} scale
 * @returns {Array}
 */
arrays.Scatterplot.prototype._getTicks = function (binLength, scale) {
    var ticks = [];

    var min = d3.min(scale.range());
    var max = d3.max(scale.range());

    for (var i = min; i <= max; i += binLength) {
        ticks.push(scale.invert(i));
    }

    return ticks;
};

/**
 * Get axis interval length.
 * @private
 * @param {Number} value - scale "max" size.
 * @param {Number} size - value to scale
 * @returns {Number}
 */
arrays.Scatterplot.prototype._getBinLength = function (value, size) {
    var scaleLinear = this.isNewD3Version ? d3.scaleLinear : d3.scale.linear;
    var scale = scaleLinear().range([0, 15]).domain([0, value]);

    var length = scale(size);
    if (length < 75) {
        length = 75;
    }

    return length;
};

arrays.Scatterplot.prototype.getXScale = function () {
    if (!this._options.XAxisIsDate) {
        return arrays.CartesianChart.prototype.getXScale.call(this);
    }

    if (d3.version > '3.x') {
        return d3.scaleTime().range(this.getXRange()).domain(this.getXDomain());
    }

    return d3.time.scale().range(this.getXRange()).domain(this.getXDomain());
};

arrays.Scatterplot.prototype.getYScale = function () {
    if (!this._options.YAxisIsDate) {
        return arrays.CartesianChart.prototype.getYScale.call(this);
    }

    if (d3.version > '3.x') {
        return d3.scaleTime().range(this.getYRange()).domain(this.getYDomain());
    }

    return d3.time.scale().range(this.getYRange()).domain(this.getYDomain());
};

/**
 * Get y axis
 * @public
 * @returns {d3.svg.axis}
 */
arrays.Scatterplot.prototype.getYAxis = function () {
    var yAxis = this.isNewD3Version ? d3.axisLeft().scale(this._yScale) : d3.svg.axis().scale(this._yScale).orient('left');

    if (this._options.YAxisIsDate) {
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
            yAxis.tickFormat(d3.timeParse(formatters));
        } else {
            yAxis.tickFormat(d3.time.format.multi(formatters));
        }
    } else if (this._options.isYAxisPercent) {
        yAxis.tickFormat(this.getPercentFormatter);
    } else {
        yAxis.tickFormat(this.getValueFormatter());
    }

    if (this.renderOptions.yAxisTicks) {
        yAxis.tickSize(-this._dimensions.innerWidth, 0);
    } else {
        yAxis.tickSize(this._maxRadius, 0);
    }

    return yAxis;
};

/**
 * Get x extent.
 * @public
 * @returns {Number[]}
 */
arrays.Scatterplot.prototype.getXDomain = function () {
    var domain = d3.extent(this._data, function (d) {
        return _.toNumber(d.x);
    });

    /*
     * If domain has no range - simulate it as 10% interval from the value.
     */
    if (domain[0] === domain[1]) {
        domain[0] *= 0.9;
        domain[1] *= 1.1;
    }

    return domain;
};

/**
 * Get y extent.
 * @public
 * @returns {Number[]}
 */
arrays.Scatterplot.prototype.getYDomain = function () {
    var domain = d3.extent(this._data, function (d) {
        return _.toNumber(d.y);
    });

    /*
     * If domain has no range - simulate it as 10% interval from the value.
     */
    if (domain[0] === domain[1]) {
        domain[0] *= 0.9;
        domain[1] *= 1.1;
    }

    return domain;
};

/**
 * Get radius range
 * @public
 * @returns {Array}
 */
arrays.Scatterplot.prototype.getRadiusRange = function () {
    return [this._minRadius, this._maxRadius];
};

/**
 * Get radius domain
 * @public
 * @returns {Array}
 */
arrays.Scatterplot.prototype.getRadiusDomain = function () {
    return d3.extent(
        this._data.map(function (d) {
            // ignore 0 values so min is not 0
            return d.radius !== 0 ? d.radius : undefined;
        }),
    );
};

/**
 * Get radius scale
 * @public
 * @returns {d3.scale}
 */
arrays.Scatterplot.prototype.getRadiusScale = function () {
    var scaleLinear = this.isNewD3Version ? d3.scaleLinear : d3.scale.linear;
    var radiusScale = scaleLinear().range(this.getRadiusRange()).domain(this.getRadiusDomain());

    /**
     * Check to see how much area the bubbles would occupy
     */
    var chartArea = this._dimensions.innerHeight * this._dimensions.innerWidth;
    var totalBubbleArea = this._data.reduce(function (a, d) {
        return a + Math.pow(radiusScale(d.radius), 2) * Math.PI;
    }, 0);
    var radiusFactor = chartArea / totalBubbleArea;
    if (radiusFactor > 1) {
        radiusFactor = 1;
    }

    /**
     * Adjust the scale range
     */
    radiusScale.range([
        radiusScale.range()[0],
        radiusScale.range()[1] * radiusFactor,
    ]);
    return radiusScale;
};

/**
 * Create scales
 * @public
 */
arrays.Scatterplot.prototype.createScales = function () {
    // Call the "parent" method first
    arrays.CartesianChart.prototype.createScales.call(this);

    this._radiusScale = this.getRadiusScale();
};

/**
 * Pre-process a Visualization's data before saving it (hook)
 * @public
 * @param {Object[][]} data - incoming data
 * @returns {Object[][]} processed data
 * @extends {Visualization}
 */
arrays.Scatterplot.prototype.preProcessData = function (data) {
    var chartData = [];
    const { XAxisIsDate, YAxisIsDate } = this._options;

    if (XAxisIsDate || YAxisIsDate) {
        data = _.map(data, ({ x, y, ...rest }) => ({
            x: XAxisIsDate ? new Date(x) : x,
            y: YAxisIsDate ? new Date(y) : y,
            ...rest,
        }));
    }

    var densityMatrix = this.getDensityMatrix(data);

    this.rawData = data;

    for (var i in densityMatrix) {
        for (var j in densityMatrix[i]) {
            var d = densityMatrix[i][j];
            if (d.density > 1) {
                // aggregate title
                d.title = d.density + ' Records';
            }
            chartData.push(densityMatrix[i][j]);
        }
    }

    return chartData;
};

/**
 * Get bubbles distrubution matrix.
 * @public
 * @param {Object} data
 * @return {Integer[][]|Object}
 */
arrays.Scatterplot.prototype.getDensityMatrix = function (data) {
    var densityMatrix = {};

    data.forEach(function (d) {
        var xValue = Number(d.x);
        var yValue = Number(d.y);

        if (!densityMatrix[xValue]) {
            densityMatrix[xValue] = {};
        }

        if (densityMatrix[xValue][yValue]) {
            densityMatrix[xValue][yValue].density++;
        } else {
            d.density = 1;
            densityMatrix[xValue][yValue] = d;
            if (densityMatrix[xValue][yValue].hasOwnProperty('count')) {
                densityMatrix[xValue][yValue].density = d.count;
            }
        }
    });

    return densityMatrix;
};

/**
 * Get the unique key for the d3 bound data, to enable d3 object constancy
 * @param  {Object} d - d3 bound data
 * @return {String|Number}   unique key
 */
arrays.Scatterplot.prototype._getKeyForObject = function (d) {
    return d.title;
};

/**
 * Get bubble color
 * @return {String}   hex string
 */
arrays.Scatterplot.prototype._getBubbleColor = function () {
    return this._colors[0];
};

/**
 * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
 * @private
 * @extends CartesianChart
 */
arrays.Scatterplot.prototype._seriesEnterHook = function () {
    this._seriesEnter.attr('class', 'bubble').append('a').attr('xlink:href', function () {
        return 'javascript:void(0)';
    }).style(
        'cursor',
        this._options.viewOptions.viewInteractivity ? 'pointer' : 'default',
    ).append('circle').attr('class', 'bubble').style('opacity', 0.5).attr('r', 0);
};

/**
 * Hook for d3 code affecting the series enter + update selection (use this._seriesEnter)
 * @private
 * @extends CartesianChart
 */
arrays.Scatterplot.prototype._seriesEnterUpdateHook = function () {
    var self = this;
    var animationDuration = this._options.puppeteer ? 0 : 1000;

    // Call the "parent" method first
    arrays.CartesianChart.prototype._seriesEnterUpdateHook.call(this);

    this._seriesEnter.select('a').attr('aria-label', function (d) {
        return (`Scatterplot bubble titled: ${d.title}, has ${self._options.xAxisLabel}: ${d.x}, and ${self._options.yAxisLabel}: ${d.y}`);
    });

    this._seriesEnter.select('circle').attr('cx', function (d) {
        return self._xScale(_.toNumber(d.x));
    }).attr('cy', function (d) {
        return self._yScale(_.toNumber(d.y));
    }).style('fill', function (d, i) {
        return self._getBubbleColor(d, i);
    }).transition().duration(animationDuration).attr('r', function (d) {
        return d.radius !== 0 ? self._radiusScale(d.radius) : 0;
    });
};

/**
 * Hook for d3 code affecting the series exit selection (use this._seriesExit)
 * @private
 * @extends CartesianChart
 */
arrays.Scatterplot.prototype._seriesExitHook = function () {
    this._seriesExit.transition().duration(1000).attr('r', 0).remove();
};

/**
 * Calculate margin - optionally calculate the margin instead of setting it via options (hook)
 * @private
 * @returns {Object} margin (top, right, bottom, left)
 */
arrays.Scatterplot.prototype._calculateMargin = function () {
    return {
        top: this._maxRadius * 3,
        right: this._maxRadius * 2,
        bottom: this._maxRadius * 3,
        left: this._isMobileMode() ? this._axesHeight + 1 : this._marginLeft,
    };
};

arrays.Scatterplot.prototype.getTooltipRows = function (data) {
    return [
        [this.getXLabelText(), data.xLabel || this.getValueFormatter()(data.x)],
        [this.getYLabelText(), data.yLabel || this.getValueFormatter()(data.y)],
    ];
};

/**
 * Show tooltip.
 * @public
 */
arrays.Scatterplot.prototype.showTooltip = function (bubble, data) {
    const templateOptions = {
        title: [
            arrays.escape(
                this._options.isTitleByPercent ? this.getPercentFormatter(data.title) : data.title,
            ),
        ],
        rows: this.getTooltipRows(data),
    };

    /*
     * Set up and show tooltip.
     */
    this._tooltip.applyTemplate(templateOptions).setPosition('top').setOffset('top', 15).show(bubble);
};

/**
 * Hide tooltip.
 * @public
 */
arrays.Scatterplot.prototype.hideTooltip = function () {
    this._tooltip.hide();
};
