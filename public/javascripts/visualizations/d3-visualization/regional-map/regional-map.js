/* global arrays, d3, topojson */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new RegionalMap
 * @constructor
 * @extends D3Visualization
 */
arrays.RegionalMap = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.D3Visualization.call(this);

    /**
    * Chart color scale function.
    * @private
    * @member {d3.scale}
    */
    this._colorScale = null;

    /**
     * d3 data bound selection for the subdivisions
     * expressed as svg <g class="subdivision">
     * acts as an update selection, then an enter + update selection
     * @member {d3.selection}
     * @private
     */
    this._subdivisions = null;

    /**
     * d3 data bound "enter" selection
     * @member {d3.selection}
     * @private
     */
    this._subdivisionsEnter = null;

    /**
     * d3 data bound "exit" selection
     * @member {d3.selection}
     * @private
     */
    this._subdivisionsExit = null;


};

// Create a RegionalMap.prototype object that inherits from D3Visualization.prototype.
arrays.RegionalMap.prototype = Object.create(arrays.D3Visualization.prototype);

// Set the "constructor" property to refer to RegionalMap
arrays.RegionalMap.prototype.constructor = arrays.RegionalMap;

/**
 * Initialize the RegionalMap
 * @public
 * @extends D3Visualization
 * @param {Object} options
 * @returns {RegionalMap}
 */
arrays.RegionalMap.prototype.init = function (data, options) {
    $.extend(true, this._options, {
        useLogScale: true,
        metric: 'total'
    });

    arrays.D3Visualization.prototype.init.call(this, data, options);

    return this;
};

/**
 * Resize callback triggered by window resize (typically)
 * @public
 */
arrays.RegionalMap.prototype.resize = function () {
    arrays.D3Visualization.prototype.resize.call(this);

    // TODO: for responsive SVG we don't want to use width and height on the svg node.
    // this should be opt-in instead of default of D3Visualization.
    // then we can get rid of setting width and height to null here
    this._svg
        .attr('width', null)
        .attr('height', null);

};

/**
 * Pre-process a Visualization's data before saving it (hook)
 * @public
 * @param {Object[][]} data - incoming data
 * @returns {Object[][]} processed data
 * @extends {Visualization}
 */
arrays.RegionalMap.prototype.preProcessData = function (data) {
    const topojsonData = arrays.clone(data);
    const metric = this._options.metric;
    let parsedData = topojson.feature(topojsonData, topojsonData.objects.subdivisions).features;

    parsedData = parsedData
        .sort(function(a, b) {
            const metricA = a.properties[metric] ? a.properties[metric] : -1;
            const metricB = b.properties[metric] ? b.properties[metric] : -1;

            if (metricA < metricB) {
                return 1;
            } else if (metricA > metricB) {
                return -1;
            }

            if (a.properties.name.split('|')[0] > b.properties.name.split('|')[0]) {
                return 1;
            } else if (a.properties.name.split('|')[0] < b.properties.name.split('|')[0]) {
                return -1;
            }

            return 0;
        });

    return parsedData;
};

/**
 * Post-process a Visualization's data (hook)
 * @public
 * @extends {Visualization}
 */
arrays.RegionalMap.prototype.postProcessData = function () {

    // Optional hook for inheriting classes to do something to the data after it has been saved to this._data

};

/**
 * Get domain as [min, max].
 * @public
 * @returns {Number[]}
 */
arrays.RegionalMap.prototype.getDomain = function () {
    const metric = this._options.metric;
    const extent = d3.extent(this._data.map(function(d) {
        return d.properties[metric];
    }));

    // force 0 if the domain min === max (ie there's no variation)
    // this should make the color for that value the "max" color
    if (extent[0] === extent[1]) {
        extent[0] = 0;
    }

    return extent;
};

/**
 * Get range as [min, max].
 * @public
 * @returns {Number[]}
 */
arrays.RegionalMap.prototype.getRange = function () {
    return [0, 1];
};

/**
 * Get linear scale
 * @public
 * @returns {d3.scale}
 */
arrays.RegionalMap.prototype.getLinearScale = function () {
    return d3.scaleLinear()
        .range(this.getRange())
        .domain(this.getDomain());
};

/**
 * Get log scale
 * @public
 * @returns {d3.scale}
 */
arrays.RegionalMap.prototype.getLogScale = function () {

    var domain = this.getDomain();

    // offset by 1 for log scale
    if (this._options.useLogScale) {
        domain[0] += 1;
        domain[1] += 1;
    }

    return d3.scaleLog()
        .range(this.getRange())
        .domain(domain);
};

/**
 * Set colors
 * @public
 * @extends {D3Visualization}
 * @return {RegionalMap}
 */
arrays.RegionalMap.prototype.setColors = function (colorOverrides) {
    arrays.D3Visualization.prototype.setColors.call(this, colorOverrides);

    if (this._options.accessibility) {
        // Use pattern palette if enabled
        var patterns = this.createPatterns();
        if (patterns && patterns.length > 0) {
            this._colors = patterns;
        }
    } else {
        //RegionalMap uses brand accent color only (if specified)
        try {
            if (this._options.brandColor.accent) {
                this._colors = [this._options.brandColor.accent];
            } else {
                // don't do anything... will use d3 default color scheme
            }
        } catch (err) {
            // don't do anything... will use d3 default color scheme
            return this;
        }
    }

    return this;
};

/**
 * Get color scale
 * @public
 * @returns {d3.interpolateRgb}
 */
arrays.RegionalMap.prototype.getColorScale = function () {
    if (this._options.colorScheme && this._options.colorScheme !== 'default') {
        return d3[this._options.colorScheme];
    } else {
        return d3.interpolateRgb('#ffffff', this._colors[0]);
    }
};

/**
 * Creates the static elements
 * @private
 * @extends D3Visualization
 */
arrays.RegionalMap.prototype._createStaticElements = function () {
    arrays.D3Visualization.prototype._createStaticElements.call(this);

    // Set container padding-bottom for responsive SVG
    this._container
        .style('padding-bottom', this._dimensions.outerWidth / this._dimensions.outerHeight + '%');

    // TODO: for responsive SVG we don't want to use width and height on the svg node.
    // this should be opt-in instead of default of D3Visualization.
    // then we can get rid of setting width and height to null here
    this._svg
        .attr('width', null)
        .attr('height', null)
        .attr('viewBox', '0 0 ' + this._options.viewBoxWidth + ' ' + this._options.viewBoxHeight)
        .attr('preserveAspectRatio', 'xMidYMin meet');

    this._subdivisionsGroup = this._canvas.append('g')
        .attr('class', 'subdivisions');

    // create scales
    this._scale = this._options.useLogScale ? this.getLogScale() : this.getLinearScale();
    this._colorScale = this.getColorScale();

};

/**
 * Renders a RegionalMap
 * Idempotent: only include d3 rendering code that can be run over and over
 * @private
 * @extends D3Visualization
 */
arrays.RegionalMap.prototype._renderVisualization = function () {
    arrays.D3Visualization.prototype._renderVisualization.call(this);

    this._createSubdivisionsUpdateSelection();
    this._subdivisionsUpdateHook();

    this._createSubdivisionsEnterSelection();
    this._subdivisionsEnterHook();

    this._createSubdivisionsExitSelection();

    this._subdivisionsEnterUpdateHook();
    this._subdivisionsExitHook();
};

/**
 * Create the series update selection
 * @private
 */
arrays.RegionalMap.prototype._createSubdivisionsUpdateSelection = function() {
    this._subdivisions = this._subdivisionsGroup.selectAll('g')
        .data(this._data, function (d) {
            return d.properties.name.split('|')[0];
        });
};

/**
 * Create the series enter selection
 * @private
 */
arrays.RegionalMap.prototype._mapRegionFocusHandler = function (element, d, i) {
    const subdivision = this._subdivisionsGroup.select(`.subdivision-${i}`);
    const subdivisionPath = this._subdivisionsGroup.select(`path.subdivision-path-${i}`).node();
    subdivision.style('opacity', 0.5);
    subdivision.style('outline', 'none');
    this.showTooltip(subdivisionPath, d);
};

/**
 * Create the series enter selection
 * @private
 */
arrays.RegionalMap.prototype._mapRegionFocusOutHandler = function (element, d, i) {
    this._subdivisionsGroup.select(`.subdivision-${i}`).style('opacity', 1);
};

/**
 * Create the series enter selection
 * @private
 */
arrays.RegionalMap.prototype._createSubdivisionsEnterSelection = function() {
    this._subdivisionsEnter = this._subdivisions
        .enter()
        .append('g')
        .on('focus', (d, i) => this._mapRegionFocusHandler(this, d, i))
        .on('focusout', (d, i) => this._mapRegionFocusOutHandler(this, d, i));
};

/**
 * Create the series exit selection
 * @private
 */
arrays.RegionalMap.prototype._createSubdivisionsExitSelection = function() {
    this._subdivisionsExit = this._subdivisions.exit();
};

/**
 * Hook for d3 code affecting the series update selection (use this._subdivisions)
 * @private
 */
arrays.RegionalMap.prototype._subdivisionsUpdateHook = function () {
};

/**
 * Hook for d3 code affecting the series enter selection (use this._subdivisionsEnter)
 * @private
 */
arrays.RegionalMap.prototype._subdivisionsEnterHook = function () {
    this._subdivisionsEnter
        .attr('class', function(d, i) {
            return 'subdivision subdivision-' + i;
        })
        .append('a')
        .attr('xlink:href', function() {
            return 'javascript:void(0)';
        })
        .attr('aria-label', function(d) {
            return d.properties.name + ' has a value of ' + d.properties.total;
        })
        .style('cursor', this._options.viewOptions.viewInteractivity ? 'pointer' : 'default')
        .append('path')
        .attr('class', function(d, i) {
            return 'subdivision-path subdivision-path-' + i;
        })
        .attr('tabindex', '-1');
};

/**
 * Hook for d3 code affecting the series enter + update selection (use this._subdivisions)
 * @private
 */
arrays.RegionalMap.prototype._subdivisionsEnterUpdateHook = function () {
    const self = this;
    const path = d3.geoPath(null);
    let counter = 0;

    this._subdivisionsEnter
        .merge(this._subdivisions)
        .selectAll('path')
        .attr('d', path)
        .attr('fill', function (d) {
            const fill = self.getFillColor(d, counter);
            counter += 1; // no indexer present so faking it with counter
            return fill;
        })
        .attr('stroke', function () {
            return '#eeeeee';
        })
        .on('focus', (d, i) => self._mapRegionFocusHandler(this, d, i));
};

/**
 * Hook for d3 code affecting the series exit selection (use this._subdivisionsExit)
 * @private
 */
arrays.RegionalMap.prototype._subdivisionsExitHook = function () {
    this._subdivisionsExit.remove();
};

arrays.RegionalMap.prototype.getFillColor = function(d, i) {
    if (this._options.accessibility) {
        return this._colors[i % this._colors.length];
    } else {
        // no data color
        if (!d.properties[this._options.metric]) {
            return '#dddddd';
        }

        // offset by 1 to match offset domain for log scale
        var metric = this._options.useLogScale ? d.properties[this._options.metric] + 1 : d.properties[this._options.metric];
        var scaledMetric = this._scale(metric);
        return this._colorScale(scaledMetric);
    }
};

/**
 * Get value formatter
 * @returns {d3.format}
 */
arrays.RegionalMap.prototype.getValueFormatter = function () {
    return d3.format(',');
};
