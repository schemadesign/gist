/* global arrays, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new TimelineControl
 * @constructor
 * @extends D3Visualization
 */
arrays.TimelineControl = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.D3Visualization.call(this);

    /**
     * d3 dispatch for sending events
     * @member {d3.dispatch}
     * @private
     */
    this._dispatch = null;

    /**
     * SVG g element, container for the axis
     * @member {d3.selection}
     * @private
     */
    this._axisContainer = null;

    /**
    * Chart time scale function.
    * @private
    * @member {d3.scale}
    */
    this._timeScale = null;

    /**
     * Current index into the timeline data
     * @private
     * @member {Number}
     */
    this._currentIndex = null;

    /**
     * Current time value
     * @private
     * @member {Date}
     */
    this._currentTimeValue = null;

    /**
     * Is the timeline currently playing?
     * @type {Boolean}
     */
    this._isPlaying = false;
};

// Create a TimelineControl.prototype object that inherits from D3Visualization.prototype.
arrays.TimelineControl.prototype = Object.create(arrays.D3Visualization.prototype);
arrays.TimelineControl.prototype.constructor = arrays.TimelineControl;


/**
 * Initialize the TimelineControl
 * @public
 * @extends D3Visualization
 * @param {Object} options
 * @returns {TimelineControl}
 */
arrays.TimelineControl.prototype.init = function (data, options) {
    $.extend(true, this._options, {
        margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        },
        width: 275,
        playDelay: 250
    });

    arrays.D3Visualization.prototype.init.call(this, data, options);

    // TODO: standardize on date/time comparison via either moment or date objects, and try and avoid doing this
    this._currentTimeValue = options.timeValue.timeValue;
    this._currentIndex = _.findIndex(this._data, function(d) {
        return d.getTime() === options.timeValue.timeValue.getTime();
    });

    // Augment render options
    $.extend(true, this.renderOptions, {
        ticks: true,
        tickLabels: false,
        tickSize: 12,
        handleRadius: 9,
        handleTextOffsetY: -20,
        playControlOffsetX: -40
    });

    return this;
};

/**
 * Set dispatch
 * @param {Object} [dispatch]
 * @return {TimelineControl}
 */
arrays.TimelineControl.prototype.setDispatch = function (dispatch) {
    this._dispatch = dispatch;

    return this;
};

/**
 * Calculate margin - optionally calculate the margin instead of setting it via options (hook)
 * @private
 * @extends D3Visualization
 * @returns {Object} margin (top, right, bottom, left)
 */
arrays.TimelineControl.prototype._calculateMargin = function () {
    return this._options.margin;
};

/**
 * Get domain
 * @public
 * @returns {Date[]}
 */
arrays.TimelineControl.prototype.getDomain = function () {
    return d3.extent(this._data);
};

/**
 * Get range
 * @public
 * @returns {Array}
 */
arrays.TimelineControl.prototype.getRange = function () {
    return [0, this._options.width];
};

/**
 * Get axis CSS transform (as a string)
 * @public
 * @returns {string}
 */
arrays.TimelineControl.prototype.getAxisTransform = function () {
    const x = (this._dimensions.outerWidth - this._options.width) * 0.5;
    const y = (this._dimensions.innerHeight - this.renderOptions.tickSize) * 0.5;

    return `translate(${x},${y})`;
};

/**
 * Get axis
 * @public
 * @returns {d3.svg.axis}
 */
arrays.TimelineControl.prototype.getAxis = function () {
    const axis = d3.svg.axis()
        .scale(this._timeScale)
        .orient('bottom');

    axis.ticks(this._data.length);

    const self = this;
    axis.tickFormat(function (d) {
        return self.renderOptions.tickLabels ? self.getFormattedDate(d) : '';
    });

    axis.tickSize(this.renderOptions.tickSize, 0);

    return axis;
};

/**
 * Create axis container
 * @public
 */
arrays.TimelineControl.prototype.createAxisContainer = function () {
    this._axisContainer = this._canvas.append('g')
        .attr('class', 'gist-axis gist-x-axis');

    this.updateAxisContainer();
};

/**
 * Update axis container
 * @public
 */
arrays.TimelineControl.prototype.updateAxisContainer = function () {
    this._axisContainer.attr('transform', this.getAxisTransform());

    if (this.renderOptions.ticks) {
        this._axisContainer.call(this.getAxis());
    }
};

/**
 * Create scales
 * @public
 */
arrays.TimelineControl.prototype.createScales = function () {
    this._timeScale = d3.time.scale.utc()
        .domain(this.getDomain())
        .range(this.getRange())
        .clamp(true);
};

/**
 * Create axis
 * @public
 */
arrays.TimelineControl.prototype.createAxes = function () {
    this.createAxisContainer();
};

/**
 * Update axis
 * @public
 */
arrays.TimelineControl.prototype.updateAxes = function () {
    this.updateAxisContainer();
};

/**
 * Creates the static elements
 * @private
 * @extends {D3Visualization}
 */
arrays.TimelineControl.prototype._createStaticElements = function () {
    arrays.D3Visualization.prototype._createStaticElements.call(this);

    this.createScales();
    this.createAxes();

    this._slider = this._canvas.append('g')
        .attr('class', 'slider')
        .attr('tabindex', '0')
        .on('keypress', () => {
            if (d3.event.key === 'Enter') {
                this._timelineControlPlayEventHandler();
            }
        });

    this._track = this._slider.append('line')
        .attr('class', 'track')
        .attr('aria-label', 'Timeline control track - drag to change time')
        .attr('x1', this._timeScale.range()[0])
        .attr('x2', this._timeScale.range()[1])
        .select(function() {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr('class', 'track-overlay');

    this._handle = this._slider.insert('g', '.track-overlay');

    this._handle.append('circle')
        .attr('class', 'gist-handle')
        .attr('aria-label', 'Timeline control handle - drag to change time')
        .attr('r', this.renderOptions.handleRadius)
        .attr('cx', 0);

    const text = this.getFormattedDate(this._currentTimeValue);
    this._handle.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'handle-label')
        .attr('aria-label', `Timeline control handle label with text ${text} - drag to change time`)
        .attr('x', 0)
        .attr('y', this.renderOptions.handleTextOffsetY)
        .text(text);

    let prevNearestIndex;

    const self = this;
    const drag = d3.behavior.drag()
        .on('drag', function() {
            const invertedData = self._timeScale.invert(d3.event.x);

            self._currentIndex = arrays.bisect(self._data, invertedData);

            if (self._currentIndex !== prevNearestIndex) {
                prevNearestIndex = self._currentIndex;
                self._timelineControlChangeEventHandler();
            }
        });

    this._track
        .call(drag);

    this._playControl = this._slider.append('polygon')
        .attr('class', 'play-control')
        .attr('aria-label', 'Timeline play/stop control - click to play')
        .attr('transform', `translate(${this.renderOptions.playControlOffsetX},0)`)
        .attr('y', 0)
        .attr('points', '0,-7 12,0 0,7');

    this._playControl.on('click', function() {
        self._timelineControlPlayEventHandler();
    });
};

/**
 * Renders a TimelineControl
 * Idempotent: only include d3 rendering code that can be run over and over
 * @private
 */
arrays.TimelineControl.prototype._renderVisualization = function () {
    const x = (this._dimensions.outerWidth - this._options.width) * 0.5;
    const y = this._dimensions.innerHeight * 0.5;

    this._slider
        .attr('transform', `translate(${x},${y})`);
};


/**
 * Updates a TimelineControl
 * @public
 * @extends D3Visualization
 */
arrays.TimelineControl.prototype.update = function () {
    this.postProcessData();
    this.createScales();
    this.updateAxes();

    arrays.D3Visualization.prototype.update.call(this);
    this._timelineControlChangeEventHandler();
};

/**
 * Gets the formatted date by converting the date to a string based on the output format (e.g. 'YYYY')
 * @param  {Date} d - Date to convert
 * @public
 * @return {String}   Text to display for ticks
 */
arrays.TimelineControl.prototype.getFormattedDate = function (d) {
    return moment.utc(d).format(this._options.timeValue.outputFormat);
};

/**
 * Timeline Control change event handler (triggered when the current time value changes)
 * Updates the timeline control itself, and dispatches an event that other visualizations can respond to
 * @private
 */
arrays.TimelineControl.prototype._timelineControlChangeEventHandler = function () {
    this._currentTimeValue = this._data[this._currentIndex];
    const nearestX = this._timeScale(this._currentTimeValue);

    this._handle.attr('transform', `translate(${nearestX}, 0)`);
    this._handle.select('text').text(this.getFormattedDate(this._currentTimeValue));

    // dispatch the change event with the current time value as a date and as a string, formatted according to the output format
    if (this._dispatch) {
        this._dispatch.timelineControl_change(this._currentTimeValue, moment.utc(this._currentTimeValue).format(this._options.timeValue.outputFormat));
    }
};

/**
 * Timeline Control play event handler (triggered when the play/stop button is clicked)
 * Updates the timeline control itself, as well as the isPlaying state, and dispatches a play or stop event that other visualizations can respond to
 * Also triggers the change event ('play' only)
 * @private
 */
arrays.TimelineControl.prototype._timelineControlPlayEventHandler = function () {
    if (this._dispatch) {
        if (!this._isPlaying) {
            this._isPlaying = true;

            this._playControl
                .attr('aria-label', 'Timeline play/stop control - click to stop')
                .attr('points', '0,-7 14,-7 14,7 0,7');

            const self = this;
            this._playInterval = setInterval(function() {
                self._currentIndex = (self._currentIndex + 1) % self._data.length;
                self._timelineControlChangeEventHandler();
            }, this._options.playDelay);

            // dispatch the play event
            this._dispatch.timelineControl_play();
        } else {
            this._isPlaying = false;

            this._playControl
                .attr('aria-label', 'Timeline play/stop control - click to play')
                .attr('points', '0,-7 12,0 0,7');

            clearInterval(this._playInterval);

            // dispatch the stop event
            this._dispatch.timelineControl_stop();
        }
    }
};
