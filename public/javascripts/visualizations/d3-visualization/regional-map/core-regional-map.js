/* global arrays, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new CoreRegionalMap (adds in hover, tooltip, legend)
 * @constructor
 * @extends RegionalMap
 */
arrays.CoreRegionalMap = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.RegionalMap.call(this);

    /**
     * Chart tooltip.
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();

    this.rawData = [];
};

// Create a CoreRegionalMap.prototype object that inherits from RegionalMap.prototype.
arrays.CoreRegionalMap.prototype = Object.create(arrays.RegionalMap.prototype);

// Set the "constructor" property to refer to CoreRegionalMap
arrays.CoreRegionalMap.prototype.constructor = arrays.CoreRegionalMap;

/**
 * Initialize the CoreRegionalMap
 * @public
 * @extends RegionalMap
 * @param {Object} data
 * @param {Object} options
 * @returns {CoreRegionalMap}
 */
arrays.CoreRegionalMap.prototype.init = function (data, options) {

    // Augment / update default options
    $.extend(true, this._options, {
        showLegend: true,
    });

    const geometries = data.data.objects.subdivisions.geometries;
    const geometriesWithData = geometries.filter(({ properties: { objectId } }) => objectId);
    this.rawData = _.sortBy(geometriesWithData, ['properties.objectId']);

    // Call the "parent" method
    arrays.RegionalMap.prototype.init.call(this, data, options);

    return this;
};

/**
 * Creates the static elements
 * @private
 * @extends RegionalMap
 */
arrays.CoreRegionalMap.prototype._createStaticElements = function () {
    arrays.RegionalMap.prototype._createStaticElements.call(this);

    this._tooltip
        .setOn(this._container.node(), 'gist-chart-tooltip')
        .setOffset('top', -10);

    if (this._options.showLegend) {
        this.renderLegend();
    }
};

/**
 * Hook for d3 code affecting the subdivisions enter selection (use this._subdivisionsEnter)
 * @private
 * @extends RegionalMap
 */
arrays.CoreRegionalMap.prototype._subdivisionsEnterHook = function () {
    arrays.RegionalMap.prototype._subdivisionsEnterHook.call(this);

    const self = this;

    this._subdivisionsEnter.select('a')
        .attr('xlink:href', function (d) {
            if (!d.properties[self._options.metric]) {
                return 'javascript:void(0)';
            }
            return self._getSubdivisionLink(this, d);
        })
        .on('click', (d) => this.getSubdivisionClick(d));


    this._subdivisionsEnter
        .select('path')
        .on('focus', function (d) {
            self._subdivisionMouseOverEventHandler(this, d);
        })
        .on('focusout', function () {
            self._subdivisionMouseOutEventHandler(this);
        })
        .on('mouseover', function (d) {
            self._subdivisionMouseOverEventHandler(this, d);
        })
        .on('mouseout', function () {
            self._subdivisionMouseOutEventHandler(this);
        });
};

/**
 * Subdivision mouse over event handler.
 * @private
 * @param {d3.selection} subdivision
 * @param {Object} data
 */
arrays.CoreRegionalMap.prototype._subdivisionMouseOverEventHandler = function (subdivision, d) {
    this.showTooltip(subdivision, d);
};

/**
 * Subdivision mouse over event handler.
 * @private
 * @param {d3.selection} subdivision
 */
arrays.CoreRegionalMap.prototype._subdivisionMouseOutEventHandler = function () {
    this.hideTooltip();
};

/**
 * Legend mouse in event handler.
 * @param {d3.selection} - list item
 * @param {Object} d - data
 */
arrays.CoreRegionalMap.prototype._legendMouseOverEventHandler = function (listItem, d, i) {
    const subdivision = this._subdivisionsGroup.select('path.subdivision-path-' + i).node();
    this._subdivisionMouseOverEventHandler(subdivision, d);
};

/**
 * Legend mouse out event handler.
 * @param {d3.selection} - list item
 * @param {Object} d - data
 */
arrays.CoreRegionalMap.prototype._legendMouseOutEventHandler = function (listItem, d, i) {
    const subdivision = this._subdivisionsGroup.select('path.subdivision-path-' + i).node();
    this._subdivisionMouseOutEventHandler(subdivision);
};

/**
 * Show tooltip.
 * @public
 */
arrays.CoreRegionalMap.prototype.showTooltip = function (subdivision, d) {
    const templateOptions = {
        title: [this.getTitleText(d)],
        rows: [
            [this.getLabelText(), this.getMetricValue(d)],
        ],
    };

    /*
     * Set up and show tooltip.
     */
    this._tooltip.applyTemplate(templateOptions)
        .setPosition('top')
        .setOffset('top', 15)
        .show(subdivision);
};

/**
 * Hide tooltip.
 * @public
 */
arrays.CoreRegionalMap.prototype.hideTooltip = function () {
    this._tooltip.hide();
};

/**
 * Get title text
 * @param {Object} d - data
 * @return {String} - label text
 * @public
 */
arrays.CoreRegionalMap.prototype.getTitleText = function (d) {
    let title = d.properties.name.split('|')[0];
    if (d.properties.name_parent) {
        title += ', ' + d.properties.name_parent.split('|')[0];
    }
    if (d.properties.name_grandparent) {
        title += ', ' + d.properties.name_grandparent.split('|')[0];
    }

    return title;
};

/**
 * Get label text
 * @return {String} - label text
 * @public
 */
arrays.CoreRegionalMap.prototype.getLabelText = function () {
    return this._options.metric.charAt(0).toUpperCase() + this._options.metric.substr(1, this._options.metric.length - 1);
};

arrays.CoreRegionalMap.prototype.getMetricValue = function (d) {
    const noData = !d.properties[this._options.metric];

    if (noData) {
        return 'No data';
    }

    const value = d.properties[this._options.metric];

    return this._options.isAggreagtedByPercent ? this.getPercentFormatter(value) : this.getValueFormatter()(value);
};

/**
 * Renders the legend
 * @private
 */
arrays.CoreRegionalMap.prototype.renderLegend = function () {
    const self = this;

    const legendList = d3.select('.gist-legend-list');
    const legendListItems = legendList.selectAll('.gist-legend-list-item')
        .data(this._data);
    const legendListItemsEnter = legendListItems.enter().append('li');

    legendListItemsEnter
        .attr('class', 'gist-legend-list-item')
        .style('border-color', function (d, i) {
            return self.getFillColor(d, i);
        });

    const legendListLink = legendListItemsEnter.append('a');

    legendListLink.append('span')
        .attr('class', 'gist-legend-dot')
        .append('svg')
        .attr('width', 20)
        .attr('height', 20)
        .append('circle')
        .attr('r', 10)
        .attr('cx', 10)
        .attr('cy', 10)
        .style('fill', function (d, i) {
            return self.getFillColor(d, i);
        });

    legendListLink.attr('class', 'gist-legend-list-link')
        .on('focus', function (d, i) {
            self._legendMouseOverEventHandler(this, d, i);
        })
        .on('focusout', function (d, i) {
            self._legendMouseOutEventHandler(this, d, i);
        })
        .on('mouseover', function (d, i) {
            self._legendMouseOverEventHandler(this, d, i);
        })
        .on('mouseout', function (d, i) {
            self._legendMouseOutEventHandler(this, d, i);
        })
        .append('span')
        .attr('class', 'gist-legend-list-item-label')
        .html(function (d) {
            return self.getTitleText(d);
        })
        .append('span')
        .attr('class', 'gist-legend-list-item-metric gist-pull-right')
        .html(function (d) {
            return self.getMetricValue(d);
        });

    if (this._options.viewOptions.viewInteractivity) {
        legendListLink
            .attr('href', function (d) {
                if (!d.properties[self._options.metric]) {
                    return null;
                }
                return self._getSubdivisionLink(this, d);
            })
            .on('click', (d) => this.getSubdivisionClick(d))
            .attr('aria-label', function (d) {
                return self.getTitleText(d) + ' ' + self.getMetricValue(d);
            });
    } else {
        legendListLink.style('cursor', 'default');
    }

    const legendListItemsExit = legendListItems.exit();

    legendListItemsExit.remove();
};


arrays.CoreRegionalMap.prototype.getSubdivisionClick = function (d) {
    if (d.properties.isSingleResult) {
        const index = _.findIndex(this.rawData, ({ properties: { objectId } }) => objectId === d.properties.objectId);

        arrays.showDetailViewModal(d.properties.objectId, index, 'regional-map', this._options);
    }
};

arrays.CoreRegionalMap.prototype._getSubdivisionLink = function (subdivision, d) {
    if (!this._options.viewOptions.viewInteractivity || d.properties.isSingleResult || !this._options.clickThroughView) {
        return 'javascript:void(0)';
    }

    const filters = {
        [this._options.regionField]: d.properties.region,
    };

    if (!_.isEmpty(d.properties.parentRegion)) {
        filters[this._options.parentRegionField] = d.properties.parentRegion;
    }

    if (!_.isEmpty(d.properties.grandparentRegion)) {
        filters[this._options.grandparentRegionField] = d.properties.grandparentRegion;
    }

    return arrays.changeRoutePath(this._options.array_source_key, this._options.clickThroughView, filters, ['region']);
};
