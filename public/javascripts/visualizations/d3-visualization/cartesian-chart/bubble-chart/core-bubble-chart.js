/* global arrays */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new CoreBubbleChart (adds in tooltip)
 * @constructor
 * @extends BubbleChart
 */
arrays.CoreBubbleChart = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.BubbleChart.call(this);

    /**
     * Chart tooltip.
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();

    /**
     * Legend list
     * @private
     * @member {LegendList}
     */
    this._legendList = null;
};

// Create a CoreBubbleChart.prototype object that inherits from BubbleChart.prototype.
arrays.CoreBubbleChart.prototype = Object.create(arrays.BubbleChart.prototype);

// Set the "constructor" property to refer to CoreBubbleChart
arrays.CoreBubbleChart.prototype.constructor = arrays.CoreBubbleChart;

/**
 * Initialize the CoreBubbleChart
 * @public
 * @extends BubbleChart
 * @param {Object} data
 * @param {Object} options
 * @returns {CoreBubbleChart}
 */
arrays.CoreBubbleChart.prototype.init = function (data, options) {
    var lastSavedData = { x: {}, y: {}, radius: {} };
    var newData = data;

    // Add previous radius, x or y value to next data if previous is known and next is undefined, otherwise remove it
    newData.data = newData.data.map(
        function (data) {
            data.data = data.data.map(
                function (data) {
                    _.forEach(lastSavedData, function (item, key) {
                        if (_.isNil(data[key])) {
                            data[key] = item[data.title];
                        } else {
                            lastSavedData[key][data.title] = data[key];
                        }
                    });

                    if (_.isNil(data.y) || _.isNil(data.x) || _.isNil(data.radius)) {
                        return null;
                    }

                    return data;
                });

            data.data = _.compact(data.data);

            return data;
        });

    // Augment default options
    $.extend(true, this._options, {
        legendListSelector: '.gist-legend-list',
    });

    // Call the "parent" method
    arrays.BubbleChart.prototype.init.call(this, newData, options);

    // override renderOptions defaults
    $.extend(true, this.renderOptions, {
        mouseEvents: false,
    });

    this._initLegendList();

    return this;
};

/**
 * Init the d3 dispatch. Override as necessary to add to the valid dispatch events
 * @extends {BubbleChart}
 * @private
 */
arrays.CoreBubbleChart.prototype._initDispatch = function () {
    this._dispatch = d3.dispatch(
        'timelineControl_change',
        'timelineControl_play',
        'timelineControl_stop',
        'legendListItem_mouseenter',
        'legendList_mouseout',
    );
};


/**
 * Show active elements in legend
 * @private
 */
arrays.CoreBubbleChart.prototype.showElementOnLegend = function (data) {
    const legendData = data.reduce((data, { title }) => ({ ...data, [title]: true }), {});

    this._legendList.showElements(legendData);
};

/**
 * Init the Legend List
 * @private
 */
arrays.CoreBubbleChart.prototype._initLegendList = function () {

    if ($(this._options.legendListSelector).length === 0) {
        console.warn(`CoreBubbleChart could not initiate LegendList because there is no HTML element with selector '${this._options.legendListSelector}'`);
        return;
    }

    const formatter = this._options.isAggregateByPercent ? this.getPercentFormatter : _.identity;
    const legendData = { data: this._labels.map((label) => ({ label, textLabel: formatter(label) })) };

    this._legendList = new arrays.LegendList()
        .setDispatch(this._dispatch)
        .init(legendData, this._options)
        .setColors(this._colors)
        .render(this._options.legendListSelector);

    this.showElementOnLegend(this._data);

    this._dispatch.on('legendListItem_mouseenter', (element, d) => {
        const title = _.kebabCase(d.label);
        const bubble = $(`#${title}`)[0];

        this._bubbleMouseOverEventHandler(bubble);
    });

    this._dispatch.on('legendList_mouseout', () => {
        this._bubbleMouseOutEventHandler();
    });
};

/**
 * Creates the static elements
 * @private
 * @extends BubbleChart
 */
arrays.CoreBubbleChart.prototype._createStaticElements = function () {
    arrays.BubbleChart.prototype._createStaticElements.call(this);

    this._tooltip
        .setOn(this._container.node(), 'gist-chart-tooltip')
        .setOffset('top', -10);
};

/**
 * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
 * @private
 * @extends BubbleChart
 */
arrays.CoreBubbleChart.prototype._seriesEnterHook = function () {

    // Call the "parent" method first
    arrays.BubbleChart.prototype._seriesEnterHook.call(this);

    var self = this;

    // add circle hover event handlers
    this._seriesEnter.select('a').on('focus', function (d) {
        self._bubbleMouseOverEventHandler(this);
    }).on('focusout', function () {
        self._bubbleMouseOutEventHandler(this);
    }).on('mouseover', function (d) {
        self._bubbleMouseOverEventHandler(this);
    }).on('mouseout', function () {
        self._bubbleMouseOutEventHandler(this);
    });
};

/**
 * Hook for d3 code affecting the series enter + update selection (use this._series)
 * @private
 * @extends BubbleChart
 */
arrays.CoreBubbleChart.prototype._seriesEnterUpdateHook = function () {

    // Call the "parent" method first
    arrays.BubbleChart.prototype._seriesEnterUpdateHook.call(this);

    const flatDataFrames = _.flatten(this._dataFrames.map(({ data }) => data));
    // update link
    this._series
        .select('a')
        .on('click', (d) => this.getBubbleClick(d, flatDataFrames));
};

arrays.CoreBubbleChart.prototype.getBubbleClick = function ({ objectId }, flatDataFrames) {
    const index = _.findIndex(flatDataFrames, (data) => data.objectId === objectId);

    arrays.showDetailViewModal(objectId, index, 'bubble-chart', this._options);
};

/**
 * Bubble mouse over event handler.
 * @private
 * @param {d3.selection} bubble
 */
arrays.CoreBubbleChart.prototype._bubbleMouseOverEventHandler = function (bubble) {
    /*
     * Highlight bubble.
     */
    this._seriesContainer.selectAll('a')
        .style('opacity', 0.5);
    d3.select(bubble)
        .style('opacity', 1);
    /*
     * Show tooltip.
     */

    // TODO: accessing __data__ like this is kind of hacky,
    // but since this mouseOver can be programmatically called,
    // we need to get the data from the DOM node directly
    this.showTooltip(bubble, bubble.__data__);
};

/**
 * Bubble mouse over event handler.
 * @private
 */
arrays.CoreBubbleChart.prototype._bubbleMouseOutEventHandler = function () {
    /*
     * Fade bubble.
     */
    this._seriesContainer.selectAll('a')
        .style('opacity', 1.0);
    /*
     * Hide tooltip.
     */
    this.hideTooltip();
};
