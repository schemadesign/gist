/* global arrays */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new BubbleChart (adds in tooltip)
 * @constructor
 * @extends Scatterplot
 */
arrays.BubbleChart = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Scatterplot.call(this);

    // Override title text
    this._titleText = 'interactive bubble chart';

    /**
     * Data frames (all data passed into the visualization, covering a time series)
     * @member {Array}
     * @private
     */
    this._dataFrames = [];

    /**
     * d3 dispatch for sending/receiving events
     * @member {d3.dispatch}
     * @private
     */
    this._dispatch = null;

    /**
     * Timeline Control for scrubbing the visualization
     * @member {TimelineControl}
     * @private
     */
    this._timelineControl = null;
};

// Create a BubbleChart.prototype object that inherits from Scatterplot.prototype.
arrays.BubbleChart.prototype = Object.create(arrays.Scatterplot.prototype);

// Set the "constructor" property to refer to BubbleChart
arrays.BubbleChart.prototype.constructor = arrays.BubbleChart;

/**
 * Initialize the BubbleChart
 * @public
 * @extends Scatterplot
 * @param {Object} data
 * @param {Object} options
 * @returns {BubbleChart}
 */
arrays.BubbleChart.prototype.init = function (data, options) {
    // Augment default options
    $.extend(true, this._options, {
        timelineControlSelector: '.timeline-control',
    });

    // Call the "parent" method
    arrays.Scatterplot.prototype.init.call(this, data, options);

    // override renderOptions defaults
    $.extend(true, this.renderOptions, {
        xAxisLabel: false,
        yAxisLabel: false,
    });

    this._initDispatch();

    this._initTimelineControl();

    return this;
};

/**
 * Init the d3 dispatch. Override as necessary to add to the valid dispatch events
 * @private
 */
arrays.BubbleChart.prototype._initDispatch = function () {
    this._dispatch = d3.dispatch('timelineControl_change');
};

/**
 * Init the timeline control
 * @private
 */
arrays.BubbleChart.prototype._initTimelineControl = function () {

    if ($(this._options.timelineControlSelector).length === 0) {
        console.warn('BubbleChart could not initiate TimelineControl because there is no HTML element with selector `' + this._options.timelineControlSelector + '`');
        return;
    }

    const timeValues = {
        data: this._dataFrames
            .filter(({timeValue}) => timeValue && timeValue.isValid())
            .map(({timeValue}) => timeValue.toDate()),
    };
    // TODO: allow additional timeline control options to be passed through bubble chart options
    var timelineControlOptions = {
        timeValue: {
            timeValue: this._options.timeValue.timeValue.toDate(),
            outputFormat: this._options.timeValue.outputFormat,
        },
    };
    this._timelineControl = new arrays.TimelineControl()
        .init(timeValues, timelineControlOptions)
        .render(this._options.timelineControlSelector)
        .setDispatch(this._dispatch);

    this._options.timeValue = moment.utc(this._options.timeValue.timeValue).format(this._options.timeValue.outputFormat);

    // update the chart when a change event is received from the timeline control
    this._dispatch.on('timelineControl_change', (timeValue, formattedTimeValue) => {

        // get the data frame associated with the time value that the timeline control just changed to
        var dataFrame = this.getDataFrame(moment.utc(timeValue));

        this.showElementOnLegend(dataFrame);

        // replace the data without recreating the chart
        this.replaceData(dataFrame, false);

        // update the URL without reloading the window
        arrays.updateQuery(this._options, 'timeValue', formattedTimeValue);
    });
};

/**
 * Set colors
 * @public
 * @extends {CartesianChart}
 * @return {BubbleChart}
 */
arrays.BubbleChart.prototype.setColors = function (colorOverrides) {

    this._colors = colorOverrides;

    return this;
};

/**
 * Resize callback triggered by window resize (typically)
 * @public
 */
arrays.BubbleChart.prototype.resize = function () {

    // Call the "parent" method
    arrays.Scatterplot.prototype.resize.call(this);

    if (this._timelineControl) {
        this._timelineControl.resize();
    }
};

/**
 * Get bubble color
 * @param  {d3.selection} d
 * @param  {Number} i
 * @return {String}   hex string
 */
arrays.BubbleChart.prototype._getBubbleColor = function (d, i) {
    var colorIndex = this._labels.indexOf(d.title) % this._colors.length;

    return this._colors[colorIndex];
};

/**
 * Get a data "frame" (i.e. the data for a particular time value)
 * @public
 * @param  {Object} timeValue - moment datetime object representing the desired time value
 * @param  {Array} data      [Array of data frames - optional (will use this._dataFrames as fallback)]
 * @return {Array}           The data for the given time value
 */
arrays.BubbleChart.prototype.getDataFrame = function (timeValue, data) {
    if (!data) {
        data = this._dataFrames;
    }

    // find data frame
    var dataFrame = _.find(data, function (d) {
        return d.timeValue.isSame(timeValue);
    });

    return _.get(dataFrame, 'data', []);
};

/**
 * Pre-process a Visualization's data before saving it (hook)
 * @public
 * @param {Object[][]} data - incoming data
 * @returns {Object[][]} processed data
 * @extends {Scatterplot}
 */
arrays.BubbleChart.prototype.preProcessData = function (data) {

    // convert time values to moment objects
    data.forEach(function (d) {
        d.timeValue = moment(d.timeValue).utc();
    });

    // save all data frames
    this._dataFrames = data;

    // if timeValue is specified
    if (this._options.timeValue.timeValue) {
        // convert to moment object
        this._options.timeValue.timeValue = moment(this._options.timeValue.timeValue).utc();
    } else {
        // default to first frame
        this._options.timeValue.timeValue = data[0].timeValue;
    }

    var processedData = this.getDataFrame(this._options.timeValue.timeValue, data);

    // sort by title
    processedData = _.sortBy(processedData, ['title']);

    return processedData;
};

/**
 * Get x extent.
 * @public
 * @returns {Number[]}
 */
arrays.BubbleChart.prototype.getXDomain = function () {

    // across all data frames

    var xValues = _.flatMap(this._dataFrames, function (frame) {
        return frame.data.map(function (object) {
            return object.x;
        });
    });

    var domain = d3.extent(xValues);

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
arrays.BubbleChart.prototype.getYDomain = function () {

    // across all data frames

    var yValues = _.flatMap(this._dataFrames, function (frame) {
        return frame.data.map(function (object) {
            return object.y;
        });
    });

    var domain = d3.extent(yValues);

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
 * Get radius domain
 * @public
 * @returns {Array}
 */
arrays.BubbleChart.prototype.getRadiusDomain = function () {

    // across all data frames

    var radiusValues = _.flatMap(this._dataFrames, function (frame) {
        return frame.data.map(function (object) {
            return object.radius !== 0 ? object.radius : undefined;
        });
    });

    return d3.extent(radiusValues);
};

/**
 * Get radius label text (not tick labels)
 * @public
 * @returns {String}
 */
arrays.BubbleChart.prototype.getRadiusLabelText = function () {
    return this._normalizeLabel(this._options.radiusLabel);
};

arrays.Scatterplot.prototype.getTooltipRows = function (data) {
    const formatter = (isPercent) => isPercent ? this.getPercentFormatter : this.getValueFormatter();

    return [
        [this.getXLabelText(), formatter(this._options.isXAxisPercent)(data.x)],
        [this.getYLabelText(), formatter(this._options.isYAxisPercent)(data.y)],
        [this.getRadiusLabelText(), formatter(this._options.isRadiusPercent)(data.radius)],
    ];
};

/**
 * Hook for d3 code affecting the series enter + update selection (use this._series)
 * @private
 * @extends Scatterplot
 */
arrays.BubbleChart.prototype._seriesEnterUpdateHook = function () {
    var self = this;

    // Call the "parent" method first (CartesianChart not Scatterplot because we don't want to inherit the
    // transitions/etc of Scatterplot in this case)
    arrays.CartesianChart.prototype._seriesEnterUpdateHook.call(this);

    // update aria-label, set id for easy selection from legend list callback
    this._series.select('a')
        .attr('aria-label', function (d) {
            return 'Bubble Chart item titled: ' + d.title + ', has ' + self._options.xAxisLabel + ': ' + d.x + ', and ' + self._options.yAxisLabel + ': ' + d.y;
        })
        .attr('id', function (d) {
            return _.kebabCase(d.title);
        });

    // transition location and radius, and match duration to timeline control play delay
    this._series.select('circle')
        .style('fill', function (d, i) {
            return self._getBubbleColor(d, i);
        })
        .transition()
        .duration(this._timelineControl._options.playDelay)
        .ease('linear')
        .attr('cx', function (d) {
            return self._xScale(d.x);
        })
        .attr('cy', function (d) {
            return self._yScale(d.y);
        })
        .attr('r', function (d) {
            return d.radius !== 0 ? self._radiusScale(d.radius) : 0;
        });
};

/**
 * Hook for d3 code affecting the series exit selection (use this._seriesExit)
 * Override for no transition on exit
 * @private
 * @extends Scatterplot
 */
arrays.BubbleChart.prototype._seriesExitHook = function () {
    this._seriesExit.remove();
};
