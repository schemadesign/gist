/* global arrays, $, d3, linkifyHtml */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new PieSet
 * @constructor
 * @extends Visualization
 */
arrays.PieSet = function() {
    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Visualization.call(this);

    /**
     * Chart tooltip (shared among all pie charts in set)
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();

    /**
     * PieCharts in this PieSet
     * @member {Array[PieChart]}
     * @private
     */
    this._charts = [];

    /**
     * d3 data bound selection for the pie charts
     * acts as an update selection, then an enter + update selection
     * @member {d3.selection}
     * @private
     */
    this._items = null;

    /**
     * d3 data bound "enter" selection
     * @member {d3.selection}
     * @private
     */
    this._itemsEnter = null;

    /**
     * d3 data bound "exit" selection
     * @member {d3.selection}
     * @private
     */
    this._itemsExit = null;

    /**
     * d3 dispatch for inter-visualization communication and receiving brush updates
     * @member {d3.dispatch}
     * @private
     */
    this._dispatch = null;

    /**
     * Legend data to construct consistent color scheme across multiple pie charts
     * @member {Object[][]}
     * @private
     */
    this._legendData = null;
};

// Create a PieSet.prototype object that inherits from Visualization.prototype.
arrays.PieSet.prototype = Object.create(arrays.Visualization.prototype);

// Set the "constructor" property to refer to PieSet
arrays.PieSet.prototype.constructor = arrays.PieSet;

/**
 * Set dispatch
 * @param {Object} [dispatch]
 * @return {PieSet}
 */
arrays.PieSet.prototype.setDispatch = function(dispatch) {
    this._dispatch = dispatch;

    return this;
};

/**
 * Initialize the PieSet
 * @public
 * @extends Visualization
 * @param {Object} options
 * @returns {PieSet}
 */
arrays.PieSet.prototype.init = function(data, options) {
    // Save legend data to construct colors
    this._legendData = data.legendData;

    // Call the "parent" method first
    arrays.Visualization.prototype.init.call(this, data, options);

    // Augment render options (passed through to individual pie charts)
    $.extend(true, this.renderOptions, {
        colorMap: this._colorMap,
        innerRadius: 0.0,
        outerRadius: 1.0,
        tooltipPosition: 'top', // or 'edge'
        tooltipPositionScaleFactor: 1.0, // places tooltip at edge of circle ('edge' only)
        useWindowResizeEvent: false, // Don't re-render SVG on window resize
    });

    // Use our shared tooltip among all charts
    this._options.tooltip = this._tooltip;

    return this;
};

/**
 * Fully renders a PieSet into a DOM element specified by the selector
 * @param {string} selector
 * @param {Object} [options]
 * @public
 * @extends Visualization
 * @returns {PieSet}
 */
arrays.PieSet.prototype.render = function(selector, options) {
    // Call the "parent" method
    arrays.Visualization.prototype.render.call(this, selector, options);

    // Select the wrapper
    this._wrapper = d3.select(this._selector);
    if (this._wrapper.empty()) {
        throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
    }

    // Create the static elements
    this._createStaticElements();

    // Call the update method
    this.update();

    return this;
};

/**
 * Updates a PieSet
 * Idempotent: only include d3 rendering code that can be run over and over
 * @public
 * @extends Visualization
 */
arrays.PieSet.prototype.update = function() {
    // Call the "parent" method
    arrays.Visualization.prototype.update.call(this);

    this._renderVisualization();
};

/**
 * Creates the static elements
 * @private
 */
arrays.PieSet.prototype._createStaticElements = function() {};

/**
 * Renders a PieSet
 * Idempotent: only include d3 rendering code that can be run over and over
 * @private
 * @extends Visualization
 */
arrays.PieSet.prototype._renderVisualization = function() {
    var self = this;

    // update
    this._items = this._wrapper.selectAll('li').data(this._data);

    // enter
    this._itemsEnter = this._items
        .enter()
        .append('li')
        .attr('class', 'pie-set-item')
        .append('div')
        .attr('id', function(d, i) {
            return 'pie-chart-' + i;
        })
        .attr('width', 1000)
        .attr('height', 1000);

    this._itemsEnter.each(function(d, i) {
        //set the title in the data object so it gets passed with the filter
        for (var dataObjectIndex = 0; dataObjectIndex < d.data.length; dataObjectIndex++) {
            d.data[dataObjectIndex].title = d.title;
        }

        var data = {
            data: d.data,
        };

        self._options.sum = d.sum;
        self._options.isPercentage = d.isPercentage;

        var pieChart = new arrays.PieChart()
            // .setDispatch(dispatch)
            .init(data, self._options)
            .render('#pie-chart-' + i, self.renderOptions);

        // add to the array of PieCharts in the PieSet
        self._charts.push(pieChart);

        // add to the bound data
        d.pieChart = pieChart;
    });

    this._itemsEnter.append('div').attr('class', 'title');

    // exit
    this._itemsExit = this._items.exit();
    this._itemsExit.remove();

    // enter and update
    // this._items
    // .each(function (d, i) {
    // d.pieChart.replaceData(d.data, true); // not sure if this will work
    // });
    this._items.select('.title').html(function(d) {
        return linkifyHtml(d.title);
    });
};

/**
 * Set colors
 * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
 * @public
 * @return {PieSet}
 */
arrays.PieSet.prototype.setColors = function(colorOverrides) {
    if (!colorOverrides) {
        return;
    }

    // default palette
    this._colors = arrays.constants.CHART_DEFAULT_COLORS;

    // if colors have been specified
    if (colorOverrides) {
        // piecewise replace colors
        for (var i = 0; i < colorOverrides.length; i++) {
            this._colors[i] = colorOverrides[i];
        }
    }

    if (this._options.accessibility) {
        this._createPatternsContainer(this._options);

        var patterns = this.createPatterns();
        if (patterns && patterns.length > 0) {
            this._colors = patterns;
        }
    }

    // also save to a color map so we can look up color by label
    this._colorMap = {};
    var self = this;
    this._legendData.forEach(function(d, i) {
        self._colorMap[d.label] = d.color ? d.color : self._colors[i % self._colors.length];
    });
    if (this._options.accessibility) {
        this._legendData.forEach(function(d, i) {
            self._colorMap[d.label] = self._colors[i % self._colors.length];
        });
    }
};

/**
 * Highlight slices by label
 * @param  {String} label - label of slice
 * @public
 */
arrays.PieSet.prototype.highlightSlice = function(label) {
    this._items.each(function(d) {
        d.pieChart._slices.select('path').style('opacity', function(e) {
            return e.data.label === label ? 1.0 : 0.25;
        });
    });
};

/**
 * Reset slice highlights
 * @public
 */
arrays.PieSet.prototype.resetHighlight = function() {
    this._items.each(function(d) {
        d.pieChart._slices.select('path').style('opacity', 1);
    });
};

/**
 * Create SVG element to assign svg pattern definitions to
 * @private
 */
arrays.PieSet.prototype._createPatternsContainer = function(options) {
    arrays.D3Visualization.prototype._createPatternsContainer.call(this, options);
};

/**
 * Create accessibility patterns
 * @public
 * @returns {Array}
 */
arrays.PieSet.prototype.createPatterns = function() {
    return arrays.D3Visualization.prototype.createPatterns.call(this);
};

const throughRedirect = ({ title, label }, that) => {
    if (that._options.viewOptions.viewInteractivity) {
        const { filterObj, chartBy, groupBy, array_source_key, clickThroughView, simpleChart } = that._options;
        const chartByFilter = simpleChart ? {} : arrays.constructedFilterObj(filterObj, chartBy, label, false);
        const groupByFilter = arrays.constructedFilterObj(filterObj, groupBy, simpleChart ? label : title, false);
        const filterObjForThisFilterColVal = Object.assign({}, chartByFilter, groupByFilter);
        const clickThroughURL = arrays.changeRoutePath(
            array_source_key,
            clickThroughView,
            filterObjForThisFilterColVal
        );

        arrays.redirect(clickThroughURL);
    }
};

/**
 * Slice click event handler.
 * @param  {SVGElement} element - SVG node
 * @param  {Object} d - d3 data bound to this node
 * @param  {Integer} i - slice number within pie chart
 */
arrays.PieChart.prototype._sliceClickEventHandler = function(element, d) {
    throughRedirect(d.data, this);
};

/**
 * Legend list link click event handler.
 * @param  {SVGElement} element - SVG node
 * @param  {Object} d - d3 data bound to this node
 * @param  {Integer} i - legend number within list
 */
arrays.PieSet.prototype.clickLegendItem = function(element, d) {
    throughRedirect(d, this);
};
