((arrays, $, d3) => {
    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Creates a new PieChart
     * @constructor
     * @extends D3Visualization
     */
    arrays.PieChart = function() {
        // Call the parent constructor, making sure (using Function#call)
        // that "this" is set correctly during the call
        arrays.D3Visualization.call(this);

        /**
         * Chart tooltip.
         * @private
         */
        this._tooltip = null;

        /**
         * d3 data bound selection for the pie chart slices
         * expressed as svg <g class="arc">
         * acts as an update selection, then an enter + update selection
         * @member {d3.selection}
         * @private
         */
        this._slices = null;

        /**
         * d3 data bound "enter" selection
         * @member {d3.selection}
         * @private
         */
        this._slicesEnter = null;

        /**
         * d3 data bound "exit" selection
         * @member {d3.selection}
         * @private
         */
        this._slicesExit = null;

        /**
         * d3 svg arc generator
         * @member {d3.svg.arc}
         */
        this._arc = null;

        /**
         * d3 pie layout
         * @member {d3.layout.pie}
         */
        this._pie = null;
    };

    // Create a PieChart.prototype object that inherits from D3Visualization.prototype.
    arrays.PieChart.prototype = Object.create(arrays.D3Visualization.prototype);

    // Set the "constructor" property to refer to PieChart
    arrays.PieChart.prototype.constructor = arrays.PieChart;

    /**
     * Initialize the PieChart
     * @public
     * @extends D3Visualization
     * @param {Object} options
     * @returns {PieChart}
     */
    arrays.PieChart.prototype.init = function(data, options) {
        $.extend(true, this._options, {
            tooltip: new arrays.StandardTooltip(),
        });

        arrays.D3Visualization.prototype.init.call(this, data, options);

        $.extend(true, this.renderOptions, {
            colorMap: null,
            innerRadius: 0.0,
            outerRadius: 1.0,
            tooltipPosition: 'edge',
            tooltipPositionScaleFactor: 1, // places tooltip at edge of circle
        });

        this._tooltip = this._options.tooltip;

        return this;
    };

    /**
     * Set colors
     * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
     * @public
     * @extends D3Visualization
     * @return {PieChart}
     */
    arrays.PieChart.prototype.setColors = function(colorOverrides) {
        this._colors = arrays.constants.CHART_DEFAULT_COLORS;

        if (colorOverrides) {
            for (let i = 0; i < colorOverrides.length; i++) {
                this._colors[i] = colorOverrides[i];
            }
        }

        const patterns = this.createPatterns();
        if (patterns && patterns.length) {
            this._colors = patterns;
        }

        return this;
    };

    /**
     * Create container (div)
     * Use options.useWrapper when initializing the visualization to specify
     * whether you want both a wrapper and a container, or just a container
     * @private
     * @extends D3Visualization
     */
    arrays.PieChart.prototype._createContainer = function() {
        arrays.D3Visualization.prototype._createContainer.call(this);
        this._container.classed('svg-container', true);
    };

    /**
     * Calculate dimensions
     * @private
     * @extends D3Visualization
     * @returns {Object} dimensions (innerWidth, innerHeight, outerWidth, outerHeight)
     */
    arrays.PieChart.prototype._calculateDimensions = function() {
        const { left, right, top, bottom } = this._margin;
        const dimensions = {
            outerWidth: this._wrapper.attr('width'),
            innerWidth: this._wrapper.attr('width') - left - right,
            outerHeight: this._wrapper.attr('height'),
            innerHeight: this._wrapper.attr('height') - top - bottom,
        };

        dimensions.radius = Math.min(dimensions.innerWidth, dimensions.innerHeight) / 2.2;
        dimensions.arcRadius = dimensions.radius - 10;

        return dimensions;
    };

    /**
     * Creates the svg root element
     * @private
     */
    arrays.PieChart.prototype._createRoot = function() {
        this._svg = this._container
            .append('svg')
            .classed('gist-visualization', true)
            .classed('svg-content-responsive', true)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('viewBox', '0 0 ' + this._dimensions.innerWidth + ' ' + this._dimensions.innerHeight);
    };

    /**
     * Updates the canvas svg g element
     * @private
     * @extends D3Visualization
     */
    arrays.PieChart.prototype._updateCanvas = function() {
        this._canvas.attr(
            'transform',
            'translate(' + this._dimensions.innerWidth / 2 + ',' + this._dimensions.innerHeight / 2 + ')'
        );
    };

    /**
     * Creates blur filter definition for drop shadow
     * @private
     */
    arrays.PieChart.prototype._createBlurs = function() {
        const defs = this._svg.append('defs');

        const filter = defs
            .append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '150%');

        filter
            .append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 4)
            .attr('result', 'blur');

        filter
            .append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 0)
            .attr('dy', 4);

        const feComponentTransfer = filter.append('feComponentTransfer');
        feComponentTransfer
            .append('feFuncA')
            .attr('type', 'linear')
            .attr('slope', '0.2');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    };

    /**
     * Creates the static elements
     * @private
     * @extends D3Visualization
     */
    arrays.PieChart.prototype._createStaticElements = function() {
        arrays.D3Visualization.prototype._createStaticElements.call(this);
        this._createBlurs();

        this._canvas
            .append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('class', 'gist-pie-background')
            .style('filter', 'url(#drop-shadow)');
    };

    /**
     * Get outer radius of arc, modified by renderOptions.outerRadius
     * @return {Number} outer radius
     */
    arrays.PieChart.prototype.getOuterRadius = function() {
        return this._dimensions.arcRadius * this.renderOptions.outerRadius;
    };

    /**
     * Get inner radius of arc, modified by renderOptions.outerRadius
     * @return {Number} inner radius
     */
    arrays.PieChart.prototype.getInnerRadius = function() {
        return this._dimensions.arcRadius * this.renderOptions.innerRadius;
    };

    /**
     * Renders a PieChart
     * Idempotent: only include d3 rendering code that can be run over and over
     * @private
     * @extends D3Visualization
     */
    arrays.PieChart.prototype._renderVisualization = function() {
        const self = this;

        this._canvas.select('.gist-pie-background').attr('r', this.getOuterRadius());

        this._arc = d3.svg
            .arc()
            .outerRadius(this.getOuterRadius())
            .innerRadius(this.getInnerRadius());

        this._pie = d3.layout
            .pie()
            .sort(null)
            .value(function(d) {
                return Math.abs(d.value);
            });

        this._slices = this._canvas.selectAll('.arc').data(this._pie(this._data));

        this._slicesEnter = this._slices
            .enter()
            .append('g')
            .attr('class', 'arc')
            .style('cursor', this._options.viewOptions.viewInteractivity ? 'pointer' : 'default')
            .on('mouseover', function(d, i) {
                self._sliceMouseEnterEventHandler(this, d, i);
            })
            .on('focus', function(d, i) {
                self._sliceMouseEnterEventHandler(this, d, i);
            })
            .on('mouseout', function(d, i) {
                self._sliceMouseOutEventHandler(this, d, i);
            })
            .on('focusout', function(d, i) {
                self._sliceMouseOutEventHandler(this, d, i);
            })
            .on('click', function(d, i) {
                self._sliceClickEventHandler(this, d, i);
            })
            .on('keypress', function(d, i) {
                if (d3.event.key === 'Enter') {
                    self._sliceClickEventHandler(this, d, i);
                }
            })
            .attr('aria-label', d => {
                const labelBy = this._options.isPieSet ? this._options.chartBy : this._options.groupBy;
                return `Pie Chart slice with ${labelBy} ${d.data.label} has a value of ${d.value}`;
            })
            .append('path');

        const arc = d3.svg
            .arc()
            .outerRadius(this._dimensions.arcRadius / 2)
            .innerRadius(0);
        const fontSize = this._options.isPieSet ? 60 : 30;
        const percentBreakPoint = this._options.isPieSet ? 12 : 5;

        if (this._options.showPercentage) {
            this._slices
                .append('text')
                .attr('transform', d => `translate(${arc.centroid(d).map(v => v * 2.2)})`)
                .attr('dy', '.50em')
                .style('text-anchor', 'middle')
                .style('fill', 'white')
                .style('font-size', `${fontSize}px`)
                .style('font-weight', 'bold')
                .text(d => {
                    const percent = (d.data.value / this._options.sum) * 100;
                    return percent < percentBreakPoint ? '' : `${percent.toFixed(1)}%`;
                });
        }

        this._slicesExit = this._slices.exit();
        this._slicesExit.remove();

        this._slices
            .select('path')
            .attr('d', this._arc)
            .style('fill', function(d, i) {
                if (self.renderOptions.colorMap) {
                    return self.renderOptions.colorMap[d.data.label];
                } else {
                    return self._colors[i % self._colors.length];
                }
            })
            .attr('id', function(d, i) {
                return 'slice-' + i;
            });
    };

    /**
     * Slice mouse in event handler.
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     * @param  {Integer} i - slice number within pie chart
     */
    arrays.PieChart.prototype._sliceMouseEnterEventHandler = function(element, d, i) {
        if (this.renderOptions.tooltipPosition === 'top') {
            this.updateTooltipPositionTop(element, d, i);
        } else if (this.renderOptions.tooltipPosition === 'edge') {
            this.updateTooltipPositionEdge(element, d, i);
        }

        this.highlightSlice(i);
    };

    /**
     * Get data to template tooltip.
     * @param  {Object} d - d3 data bound to this node
     */
    arrays.PieChart.prototype.getTooltipTemplateData = function({ data }) {
        const { label, value } = data;
        if (this._options.simpleChart) {
            const updatedValue = this._options.isPercentage ? this.getPercentFormatter(value) : value;

            return { title: [label, updatedValue] };
        }
        const rows = [
            [
                this._options.aggregateBy,
                this._options.isAggregateByPercent ? this.getPercentFormatter(value) : d3.format(',')(value),
            ],
        ];
        const title = this._options.isPieSet ? this._options.chartBy : this._options.groupBy;

        return {
            title: [title, arrays.escape(label)],
            rows: rows,
        };
    };

    /**
     * Update tooltip position radially (center of pie slice on the edge)
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     */
    arrays.PieChart.prototype.updateTooltipPositionEdge = function(element, d) {
        this._tooltip.setOffset({ top: 0, left: 0 });

        const CENTER_MULTIPLIER = 0.5;
        const $svg = $(this._svg.node());
        const center = {
            x: $svg.offset().left + $svg.width() * CENTER_MULTIPLIER,
            y: $svg.offset().top + $svg.height() * CENTER_MULTIPLIER,
        };

        const centroid = this._arc.centroid(d);
        const cx = centroid[0];
        const cy = centroid[1];

        const rad = Math.atan2(cy, cx);
        const r = this.getOuterRadius();

        const viewBoxScaleFactor = this._container.node().getBoundingClientRect().width / 1000;

        const x = r * Math.cos(rad) * this.renderOptions.tooltipPositionScaleFactor * viewBoxScaleFactor;
        const y = r * Math.sin(rad) * this.renderOptions.tooltipPositionScaleFactor * viewBoxScaleFactor;

        this._tooltip
            .applyTemplate(this.getTooltipTemplateData(d))
            .setPosition('manual')
            .show(element, {
                bounds: {
                    top: center.y + y,
                    left: center.x + x,
                    width: 0,
                    height: 0,
                },
            });
    };

    /**
     * Update tooltip position (top of chart)
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     * @param  {Integer} i - slice number within pie chart
     */
    arrays.PieChart.prototype.updateTooltipPositionTop = function(element, d) {
        this._tooltip.setOffset({ top: 10, left: 0 }).setPosition('top');

        this._tooltip.applyTemplate(this.getTooltipTemplateData(d)).show(element);
    };

    /**
     * Slice mouse out event handler.
     */
    arrays.PieChart.prototype._sliceMouseOutEventHandler = function() {
        this._tooltip.hide();
        this.resetHighlight();
    };

    /**
     * Slice click event handler.
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     * @param  {Integer} i - slice number within pie chart
     */
    arrays.PieChart.prototype._sliceClickEventHandler = function(element, d) {
        if (this._options.viewOptions.viewInteractivity && !this._options.isExternalAccess) {
            const filterObjForThisFilterColVal = arrays.constructedFilterObj(
                this._options.filterObj,
                this._options.groupBy,
                d.data.label,
                false
            );
            const clickThroughURL = arrays.changeRoutePath(
                this._options.array_source_key,
                this._options.clickThroughView,
                filterObjForThisFilterColVal
            );

            arrays.redirect(clickThroughURL);
        }
    };

    /**
     * Highlight slice by index
     * @param  {Number} i - index of slice
     * @public
     */
    arrays.PieChart.prototype.highlightSlice = function(i) {
        this._slices.select('path').style('opacity', 0.25);
        this._svg.select('#slice-' + i).style('opacity', 1);
    };

    /**
     * Reset slice highlights
     * @public
     */
    arrays.PieChart.prototype.resetHighlight = function() {
        this._slices.select('path').style('opacity', 1);
    };

    /**
     * Legend list link click event handler.
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     */
    arrays.PieChart.prototype.clickLegendItem = function(element, d) {
        /*
         * Filter legend on click
         */
        if (this._options.viewOptions.viewInteractivity && !this._options.isExternalAccess) {
            const filterObjForThisFilterColVal = arrays.constructedFilterObj(
                this._options.filterObj,
                this._options.groupBy,
                d.label,
                false
            );
            const clickThroughURL = arrays.changeRoutePath(
                this._options.array_source_key,
                this._options.clickThroughView,
                filterObjForThisFilterColVal
            );

            arrays.redirect(clickThroughURL);
        }
    };
})(window.arrays, window.jQuery, window.d3);
