/* global arrays */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new CoreScatterplot (adds in tooltip)
 * @constructor
 * @extends Scatterplot
 */
arrays.CoreScatterplot = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Scatterplot.call(this);

    /**
     * Chart tooltip.
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();
};

// Create a CoreScatterplot.prototype object that inherits from Scatterplot.prototype.
arrays.CoreScatterplot.prototype = Object.create(arrays.Scatterplot.prototype);

// Set the "constructor" property to refer to CoreScatterplot
arrays.CoreScatterplot.prototype.constructor = arrays.CoreScatterplot;

/**
 * Initialize the CoreScatterplot
 * @public
 * @extends Scatterplot
 * @param {Object} data
 * @param {Object} options
 * @returns {CoreScatterplot}
 */
arrays.CoreScatterplot.prototype.init = function (data, options) {

    // Call the "parent" method
    arrays.Scatterplot.prototype.init.call(this, data, options);

    // override renderOptions defaults
    $.extend(true, this.renderOptions, {
        mouseEvents: false,
    });

    return this;
};

/**
 * Creates the static elements
 * @private
 * @extends Scatterplot
 */
arrays.CoreScatterplot.prototype._createStaticElements = function () {
    arrays.Scatterplot.prototype._createStaticElements.call(this);

    this._tooltip
        .setOn(this._container.node(), 'gist-chart-tooltip')
        .setOffset('top', -10);
};

/**
 * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
 * @private
 * @extends Scatterplot
 */
arrays.CoreScatterplot.prototype._seriesEnterHook = function () {

    // Call the "parent" method first
    arrays.Scatterplot.prototype._seriesEnterHook.call(this);

    var self = this;
    const sortedData = _.sortBy(this.rawData, ['x', 'y', 'objectId']);

    this._seriesEnter.select('a')
        .attr('xlink:href', (d) => this._getBubbleLink(d))
        .on('click', (d) => this.getBubbleClick(d, sortedData));

    // add circle hover event handlers
    this._seriesEnter.select('#scatterplot a')
        .on('focus', function (d) {
            self._bubbleMouseOverEventHandler(this, d);
        })
        .on('focusout', function () {
            self._bubbleMouseOutEventHandler(this);
        })
        .on('mouseover', function (d) {
            self._bubbleMouseOverEventHandler(this, d);
        })
        .on('mouseout', function () {
            self._bubbleMouseOutEventHandler(this);
        });
};


arrays.CoreScatterplot.prototype.getBubbleClick = function (d, sortedData) {
    if (d.density === 1) {
        const index = _.findIndex(sortedData, ({ objectId }) => objectId === d.objectId);

        arrays.showDetailViewModal(d.objectId, index, 'scatterplot', this._options);
    }
};

arrays.CoreScatterplot.prototype._getBubbleLink = function (d) {
    if (!this._options.viewOptions.viewInteractivity || d.density === 1 || !this._options.clickThroughView) {
        return 'javascript:void(0)';
    }

    /*
     * Check point density. If density equals to 1 set direct link to the object page.
     * Otherwise set link to set of objects on gallery view.
     */
    if (d.density !== 1) {
        const filters = {
            [this.getXLabelText()]: {
                min: d.x,
                max: d.x + 1,
            },
            [this.getYLabelText()]: {
                min: d.y,
                max: d.y + 1,
            },
        };

        return arrays.changeRoutePath(this._options.array_source_key, this._options.clickThroughView, filters, ['xAxis', 'yAxis', 'aggregateBy']);
    }
};

/**
 * Bubble mouse over event handler.
 * @private
 * @param {d3.selection} bubble
 * @param {Object} data
 */
arrays.CoreScatterplot.prototype._bubbleMouseOverEventHandler = function (bubble, data) {
    /*
     * Highlight bubble.
     */
    this._seriesContainer.selectAll('circle')
        .style('opacity', 0.25);
    d3.select(bubble).select('circle')
        .style('opacity', 1);
    /*
     * Show tooltip.
     */

    this.showTooltip(bubble, data);
};

/**
 * Bubble mouse over event handler.
 * @private
 */
arrays.CoreScatterplot.prototype._bubbleMouseOutEventHandler = function () {
    /*
     * Fade bubble.
     */
    this._seriesContainer.selectAll('circle')
        .style('opacity', 0.5);
    /*
     * Hide tooltip.
     */
    this.hideTooltip();
};


