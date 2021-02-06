/* global arrays, _, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

const LEGEND_STYLE_DOT = 'dot';
const LEGEND_STYLE_ICON = 'icon';

/**
 * Creates a new LegendList
 * @constructor
 * @extends Visualization
 */
arrays.LegendList = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Visualization.call(this);

    /**
     * d3 dispatch for sending events when the brush is manipulated
     * @member {d3.dispatch}
     * @private
     */
    this._dispatch = null;

    /**
     * d3 data bound selection for the list items
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

    this.legendStyle = LEGEND_STYLE_DOT;
};

// Create a LegendList.prototype object that inherits from Visualization.prototype.
arrays.LegendList.prototype = Object.create(arrays.Visualization.prototype);

// Set the "constructor" property to refer to LegendList
arrays.LegendList.prototype.constructor = arrays.LegendList;

arrays.LegendList.prototype.LEGEND_STYLE_DOT = LEGEND_STYLE_DOT;
arrays.LegendList.prototype.LEGEND_STYLE_ICON = LEGEND_STYLE_ICON;

/**
 * Set dispatch
 * @param {Object} [dispatch]
 * @return {LegendList}
 */
arrays.LegendList.prototype.setDispatch = function (dispatch) {
    this._dispatch = dispatch;

    return this;
};

/**
 * Fully renders a LegendList into a DOM element specified by the selector
 * @param {string} selector
 * @param {Object} [options]
 * @public
 * @extends Visualization
 * @returns {LegendList}
 */
arrays.LegendList.prototype.render = function (selector, options) {
    arrays.Visualization.prototype.render.call(this, selector, options);

    this._wrapper = d3.select(this._selector);
    if (this._wrapper.empty()) {
        throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
    }

    this._createStaticElements();
    this.update();

    return this;
};

/**
 * Updates a LegendList
 * Idempotent: only include d3 rendering code that can be run over and over
 * @public
 * @extends Visualization
 */
arrays.LegendList.prototype.update = function () {

    // Call the "parent" method
    arrays.Visualization.prototype.update.call(this);

    this._renderVisualization();
};

/**
 * Creates the static elements
 * @private
 */
arrays.LegendList.prototype._createStaticElements = function () {

    var self = this;

    this._wrapper
        .on('mouseleave', function (d, i) {
            self._legendListMouseOutEventHandler(this, d, i);
        });
};

/**
 * Renders a LegendList
 * Idempotent: only include d3 rendering code that can be run over and over
 * @private
 * @extends Visualization
 */
arrays.LegendList.prototype._renderVisualization = function () {
    const self = this;

    this._items = this._wrapper
        .selectAll('.gist-legend-list-item')
        .data(this._data);

    this._itemsEnter = this._items.enter()
        .append('li')
        .attr('class', 'gist-legend-list-item')
        .style('border-color', (datum, index) => self._colors[index % self._colors.length])
        .append('a')
        .attr('class', 'gist-legend-list-link')
        .on('mouseenter', (d, i) => {
            self._legendListLinkMouseEnterEventHandler(this, d, i);
        })
        .on('focus', (d, i) => {
            self._legendListLinkMouseEnterEventHandler(this, d, i); // need to modify this to add the border left
        })
        .on('click', (d, i) => {
            self._legendListLinkClickEventHandler(this, d, i);
        }).attr('tabindex', '0')
        .on('mouseleave', (d, i) => {
            self._legendListMouseOutEventHandler(this, d, i);
        })
        .on('keypress', (d, i) => {
            if (d3.event.key === 'Enter') {
                self._legendListLinkClickEventHandler(this, d, i);
            }
        })
        .attr('role', 'link')
        .attr('aria-label', function (d) {
            return d.label;
        });

    const renderLegend = _.cond([
        [arrays.equals(LEGEND_STYLE_DOT), this.renderLegendDot.bind(this)],
        [arrays.equals(LEGEND_STYLE_ICON), this.renderLegendIcon.bind(this)],
    ]);

    renderLegend(this.legendStyle);

    this._itemsEnter.append('span')
        .attr('class', 'gist-legend-label');

    this._itemsExit = this._items.exit();
    this._itemsExit.remove();

    if (this._opacities && this._opacities.length > 0) {
        this._items.select('span.gist-legend-dot')
            .style('opacity', function (d, i) {
                var opacityIndex = i % self._opacities.length;
                return self._opacities[opacityIndex] || 1;
            })
            .style('fill', function (d, i) {
                var opacityIndex = i % self._opacities.length;
                var colorIndex = i % self._colors.length;
                return self._opacities[opacityIndex] ? self._colors[colorIndex] : 'white';
            });

        this._items.select('span.gist-legend-dot circle')
            .style('stroke', function (d, i) {
                var opacityIndex = i % self._opacities.length;
                return self._opacities[opacityIndex] ? null : '#BDBDBD';
            });
    } else {
        this._items.select('span.gist-legend-dot')
            .style('fill', function (d, i) {
                var colorIndex = i % self._colors.length;
                return self._colors[colorIndex];
            });
    }

    this._items.select('span.gist-legend-label')
        .html(function (d) {
            return arrays.escape(d.textLabel || d.label);
        });
};

arrays.LegendList.prototype.setLegendStyle = function (style, options = {}) {
    this.legendStyle = style;
    Object.assign(this._options, options);

    return this;
};

arrays.LegendList.prototype.renderLegendDot = function () {
    this._itemsEnter.append('span')
        .attr('class', 'gist-legend-dot gist-legend-dot--circle')
        .append('svg')
        .attr('width', 20)
        .attr('height', 20)
        .append('circle')
        .attr('r', 10)
        .attr('cx', 10)
        .attr('cy', 10);
};

arrays.LegendList.prototype.renderLegendIcon = function () {
    const { width, height, src } = this._options.legendIcon;

    this._itemsEnter.append('span')
        .attr('class', 'gist-legend-dot gist-legend-dot--icon')
        .append('img')
        .attr('width', width)
        .attr('height', height)
        .attr('src', src);
};

/**
 * Legend list link mouse in event handler.
 * @param  {SVGElement} element - SVG node
 * @param  {Object} d - d3 data bound to this node
 * @param  {Integer} i - legend number within list
 */
arrays.LegendList.prototype._legendListLinkMouseEnterEventHandler = function (element, d, i) {
    if (this._dispatch) {
        this._dispatch.legendListItem_mouseenter.apply(this, arguments);
    }
};


/**
 * Legend list mouse out event handler.
 */
arrays.LegendList.prototype._legendListMouseOutEventHandler = function (element, d, i) {
    if (this._dispatch) {
        this._dispatch.legendList_mouseout();
    }
};

/**
 * Legend list link click event handler.
 */
arrays.LegendList.prototype._legendListLinkClickEventHandler = function (element, d, i) {
    if (this._dispatch.legendListItem_click) {
        this._dispatch.legendListItem_click.apply(this, arguments);
    }
};

/**
 * Show elements in legend depends on label
 */
arrays.LegendList.prototype.showElements = function (data) {
    this._itemsEnter.style('display', ({ label }) => data[label] ? 'block' : 'none');
};
