((arrays, $, d3, _, moment) => {
    const TOOLTIP_WIDTH = 335;
    const KEY_LEFT = 37;
    const KEY_RIGHT = 39;

    class CoreLineChart extends arrays.LineChart {
        constructor() {
            super();

            /**
             * Hover group
             * @member {d3.selection}
             */
            this._hoverGroup = null;

            /**
             * Line pointer
             * @member {d3.selection}
             */
            this._linePointer = null;

            /**
             * Benchmarks
             * @private
             * @param {Benchmarks}
             */
            this._benchmarks = null;

            this._lineIndex = 0;

            this._previousIsMobileBreak = false;
        }

        /**
         * Initialize the CoreLineChart
         * @public
         * @extends LineChart
         * @param {Object[]} data
         * @param {Object} options
         * @returns {CoreLineChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                annotations: {},
            });

            super.init(data, options);

            this.toggleLegend();

            return this;
        }

        /**
         * Create a keyboard events
         * @private
         */
        _createKeyboardEvents() {
            $(document).keydown(e => {
                if (e.keyCode === KEY_LEFT) {
                    this.handleLeftArrowPress();
                    return;
                }
                if (e.keyCode === KEY_RIGHT) {
                    this.handleRightArrowPress();
                }
            });
        }

        /**
         * Creates the static elements
         * @private
         * @extends LineChart
         */
        _createStaticElements() {
            super._createStaticElements();
            this._createKeyboardEvents();
            this.renderLegend();

            // Create annotations
            this._renderCustomComponents();
            if (this.renderOptions.mouseEvents) {
                // Append group for hover pointer and circles.
                this._hoverGroup = this._canvas.append('g').attr('pointer-events', 'none');

                // Render line pointer.
                this._linePointer = this._hoverGroup
                    .append('line')
                    .attr('class', 'gist-pointer')
                    .attr('y1', 0);

                // Append x-axis highlight to the container
                this._xAxisHighlight
                    .setOn(this._container.node(), 'gist-xaxis-highlight')
                    .setOffset('top', -this._dimensions.innerHeight - 30);

                // Append tooltip to the document body.
                this._tooltip
                    .setOn(this._container.node(), 'gist-chart-tooltip')
                    .setWidth(TOOLTIP_WIDTH)
                    .setOffset('top', -10);

                this.updateNearest();

                this.updateHoverComponents();

                this.onMouseOut();
            }
        }

        /**
         * Hook for d3 code affecting the series enter selection (use this._seriesEnter)
         * @private
         * @extends CartesianChart
         */
        _seriesEnterHook() {
            this._seriesEnter
                .append('path')
                .attr('tabindex', '0')
                .attr('class', 'gist-line')
                .style('stroke', (datum, index) => this._colors[index])
                .style('stroke-dasharray', (datum, index) => (this._options.accessibility ? (index % 3) * 2.5 : 0))
                .style('stroke-width', () => (this._options.accessibility ? 5 : 2))
                .attr('aria-label', (datum, index) => {
                    const lineData = datum.map(({ y }) => y);
                    return `Line ${this._labels[index]} has a minimum value of ${_.min(
                        lineData
                    )} and a maximum value of ${_.max(lineData)}`;
                });
        }

        /**
         * Utility for creating custom static elements
         * @private
         */
        _renderCustomComponents() {
            // add annotations layer
            this._annotations = this._svg
                .append('g')
                .attr('class', 'gist-annotations')
                .attr('pointer-events', 'none')
                .attr('transform', `translate(${this._margin.left},${this._margin.top})`);

            // add benchmarks
            if (this._benchmarkData.length) {
                this._benchmarks = new arrays.Benchmarks(
                    this._annotations,
                    this._dimensions,
                    this._yScale,
                    this._benchmarkData
                );
            }

            // add text annotations
            if (this._options.annotations.overlayText) {
                new arrays.OverlayText(this._annotations, [this._options.annotations.overlayText]);
            }
        }

        /**
         * Get nearest index based on mouse position
         * @public
         * @return {Number} index suitable for use in this._dataDomain
         */
        getNearestIndex() {
            // Get mouse coordinate relative to parent element.
            const mouseX = d3.mouse(this._receiver.node())[0];

            // Get x value under mouse pointer.
            let invertedData = this._xScale.invert(mouseX);
            if (this._options.groupBy_isDate) {
                invertedData = invertedData.getTime();
            }

            // Get nearest to x index
            return arrays.bisect(this._dataDomain, invertedData);
        }

        /**
         * Update nearest data, x and y based on optionally supplied index
         * @public
         * @param  {Number} [index] index appropriate for looking up data from this._dataDomain.
         * Optional; if not supplied, defaults to last/rightmost element
         */
        updateNearest(index) {
            // Get rightmost index if not supplied. note index can be 0 so is not falsy
            if (_.isUndefined(index) || index === null) {
                index = this._dataDomain.length - 1;
            }
            this._nearestIndex = index;

            // Get nearest data
            this._nearestData = this._options.groupBy_isDate
                ? new Date(this._dataDomain[index])
                : this._dataDomain[index];

            // Get nearest x position
            this._nearestX = this._xScale(this._nearestData);

            // Get nearest y position
            this._nearestY = this._yScale(this._nearestData);

            // Create series current values list.
            let x; // stash for benchmark data

            const tooltipData = this._data.reduce((values, dataSet, index) => {
                // Push value into summary array, if any
                const dataPoint = _.find(dataSet, ['x', this._nearestData]);
                if (dataPoint && !_.isNil(dataPoint.y)) {
                    x = dataPoint.x;
                    values.push({
                        x: dataPoint.x,
                        y: dataPoint.y,
                        color: this._colors[index],
                        label: this._labels[index],
                        strokeDash: this._options.accessibility ? (index % 3) * 2.5 : null,
                    });
                }

                return values;
            }, []);

            const benchmarkValues = this._benchmarkData.reduce((values, { value, label }) => {
                if (label) {
                    values.push({
                        x,
                        y: value,
                        color: 'white',
                        label,
                        annotation: true,
                    });
                }

                return values;
            }, []);

            this._tooltipData = tooltipData.concat(benchmarkValues);
        }

        /**
         * Update line pointer
         * @public
         */
        updateLinePointer() {
            this._linePointer
                .attr('y2', this._dimensions.innerHeight)
                .attr('x1', this._nearestX)
                .attr('x2', this._nearestX);
        }

        /**
         * Update x axis highlight
         * @public
         */
        updateXAxisHighlight() {
            const [nearest] = this._tooltipData;
            if (nearest) {
                let text;

                if (this._options.groupBy_isDate) {
                    text = moment
                        .utc(nearest.x, moment.ISO_8601)
                        .format(this._options.outputDateFormat || this._options.outputInFormat);
                } else if (this._options.isGroupByPercent) {
                    text = this.getPercentFormatter(nearest.x);
                } else {
                    text = nearest.x;
                }
                const html = `<div class="gist-default-tooltip-content" id="gist-default-tooltip-content-date">${text}</div>`;

                this._xAxisHighlight
                    .setPosition('left')
                    .setOffset({
                        right: this._nearestX + this._margin.left + 30,
                        left: 0,
                    })
                    .setContent(html)
                    .show();
            }
        }

        /**
         * Update tooltip
         * @public
         */
        updateTooltip() {
            // Change tooltip position.
            if (this._nearestX < this._dimensions.innerWidth / 2) {
                this._tooltip.setPosition('right').setOffset({
                    left: TOOLTIP_WIDTH + this._margin.right + 10,
                    right: 0,
                });
            } else {
                this._tooltip.setPosition('left').setOffset({
                    right: TOOLTIP_WIDTH + this._margin.left + 10,
                    left: 0,
                });
            }

            // Update tooltip content.
            const units = (this._options.isAggregateByPercent && this._options.units) || '';

            let tooltipTemplate;
            if (this._options.accessibility) {
                tooltipTemplate = _.template(
                    `<li class="gist-legend-list-item">
                        <div class="gist-line-graph-item-container">
                            <svg height="20" width="25">
                                <path d="M 0 15 L 20 15" class="gist-item-marker" style="stroke-width: 5; stroke: <%= color %>; stroke-dasharray: <%= strokeDash %>;"/>
                            </svg>
                            <span><%= label %></span><span style="float: right"><%= y %></span>
                        </div>
                    </li>`
                );
            } else {
                tooltipTemplate = _.template(
                    `<li class="gist-legend-list-item">
                        <div class="gist-line-graph-item-container">
                            <span style="background-color: <%= color %>;" class="gist-item-marker <%= itemMarkerClass %>"></span>
                            <span><%= label %></span><span style="float: right"><%= y %></span>
                        </div>
                    </li>`
                );
            }

            const tooltipListItems = this._tooltipData.reduce((html, { color, strokeDash, label, y, annotation }) => {
                if (this._options.accessibility) {
                    html += tooltipTemplate({
                        color,
                        strokeDash,
                        label,
                        y: `${d3.format(',.1f')(y)}${units}`,
                    });
                } else {
                    html += tooltipTemplate({
                        color,
                        itemMarkerClass: annotation ? 'gist-annotation' : '',
                        label,
                        y: `${d3.format(',.1f')(y)}${units}`,
                    });
                }

                return html;
            }, '');

            const tooltipMobileOptions = { coordinateX: 15 };
            const tooltipOptions = arrays.isMobileDevice() ? tooltipMobileOptions : null;

            this._tooltip
                .setContent(
                    `<div class="gist-default-tooltip-content">
                        <ul class="gist-line-graph-list">
                            ${tooltipListItems}
                        </ul>
                    </div>`
                )
                .show(null, tooltipOptions);
        }

        /**
         * Update data point highlights (circles)
         * @public
         */
        updateDataPointHighlights() {
            const circles = this._hoverGroup.selectAll('circle.gist-data-point').data(this._tooltipData);

            circles
                .enter()
                .append('circle')
                .attr('r', 5);

            circles
                .attr('class', ({ annotation }) => (annotation ? 'gist-data-point gist-annotation' : 'gist-data-point'))
                .attr('cx', ({ x = 0 }) => this._xScale(x))
                .attr('cy', ({ y = 0 }) => this._yScale(y))
                .style('fill', ({ color }) => color);
        }

        /**
         * Callback for hover updates
         * @public
         * @extends CoreLineChart
         */
        updateHoverComponents() {
            this.updateLinePointer();
            this.updateXAxisHighlight();
            this.updateTooltip();
            this.updateDataPointHighlights();
        }

        /**
         * Callback for mouse enter events
         * @public
         * @extends LineChart
         */
        onMouseEnter() {
            this._hoverGroup.style('display', 'block');
        }

        /**
         * Callback for mouse out events
         * @public
         * @extends LineChart
         */
        onMouseOut() {
            this._tooltip.hide();
            this._xAxisHighlight.hide();
            this._hoverGroup.style('display', 'none');
        }

        /**
         * Callback for mouse move events
         * @public
         * @extends CartesianChart
         */
        onMouseMove() {
            const index = this.getNearestIndex();
            this._lineIndex = index;

            this.updateActionComponents(this._lineIndex);
        }

        /**
         * @private
         */
        handleLeftArrowPress() {
            if (this._lineIndex === 0) {
                return;
            }

            this._lineIndex = this._lineIndex - 1;
            this.onArrowPress();
        }

        /**
         * @private
         */
        handleRightArrowPress() {
            if (this._lineIndex === this._dataDomain.length - 1) {
                return;
            }

            this._lineIndex = this._lineIndex + 1;
            this.onArrowPress();
        }

        /**
         * @private
         */
        onArrowPress() {
            this._hoverGroup.style('display', 'block');

            this.updateActionComponents(this._lineIndex);
        }

        /**
         * Update action components
         * @public
         */
        updateActionComponents(index) {
            this.updateNearest(index);

            this.updateHoverComponents();
        }

        /**
         * Get y domain.
         * @public
         * @extends LineChart
         * @returns {Number[]}
         */
        getYDomain() {
            let domain = [];

            let max = this._data.reduce((maxValue, dataSet) => {
                return Math.max(maxValue, dataSet.length ? _.max(dataSet.map(({ y }) => y)) : 0);
            }, 0);

            // chart min
            let min = _.min(
                this._data.map(series => {
                    // series min
                    return _.min(series.map(({ y }) => y));
                })
            );

            /**
             * Check against annotations
             */
            this._benchmarkData = this._options.annotations.benchmarks || [];

            if (this._benchmarkData.length) {
                // 'value' is used because the benchmarks object uses 'value'
                const benchmarkExtent = d3.extent(this._benchmarkData, ({ value }) => value);

                min = Math.min(min, benchmarkExtent[0]);
                max = Math.max(max, benchmarkExtent[1]);
            }

            if (this._options.yDomainPadding) {
                domain = this._padYDomain(min, max);
            } else {
                domain = [min, max];
            }

            return domain;
        }

        /**
         * Gets the domain
         * @public
         * @returns {Array}
         */
        getDomain() {
            return _.uniq(
                this._data.reduce((dates, dataSet) => {
                    const dataChunk = dataSet.map(({ x }) => (this._options.groupBy_isDate ? x.getTime() : x));
                    return dates.concat(dataChunk);
                }, [])
            ).sort((a, b) => a - b);
        }

        /**
         * Handler for window resizing
         * @public
         * @extends LineChart
         */
        update() {
            super.update();

            // Remove custom elements
            this._svg.selectAll('.gist-annotations').remove();

            // Update the top offset for xAxisHighlight
            this._xAxisHighlight.setOffset('top', -this._dimensions.innerHeight - 30);

            // Add Custom elements back with the correct dimensions
            this._renderCustomComponents();

            this.toggleLegend();
        }

        /**
         * Renders the legend
         * @private
         */
        renderLegend() {
            /*
             * Legend Data
             */
            const viewSelector = _.get(this, '_options.viewSelector', '');

            d3.selectAll(`${viewSelector} .gist-legend-list-item`).remove();
            this._labels = this._labels.map(label => arrays.escape(label));

            const legendList = d3.select(`${viewSelector} .gist-legend-list`);
            const legendListItem = legendList
                .selectAll('.gist-legend-list-item')
                .data(this._labels)
                .enter()
                .append('li')
                .attr('class', 'gist-legend-list-copy');

            legendListItem
                .append('span')
                .attr('class', 'gist-legend-dot')
                .append('svg')
                .attr('width', 20)
                .attr('height', 20)
                .append('circle')
                .attr('r', 10)
                .attr('cx', 10)
                .attr('cy', 10)
                .style('fill', label => this._colors[_.indexOf(this._labels, label)]);

            legendListItem.append('span').html(label => label);
        }

        toggleLegend() {
            const isMobileBreak = arrays.isMobileBreakpoint();

            if (isMobileBreak === this._previousIsMobileBreak) {
                return;
            }

            const viewSelector = _.get(this, '_options.viewSelector', '');
            const legendElement = $(`${viewSelector} .gist-legend`);
            const bodyElement = $('body');
            const legendOpenClass = 'gist-legend-opened';

            if (isMobileBreak) {
                legendElement.show();
                bodyElement.addClass(legendOpenClass);
            } else {
                legendElement.hide();
                bodyElement.removeClass(legendOpenClass);
            }

            this._previousIsMobileBreak = isMobileBreak;
        }
    }

    arrays.CoreLineChart = CoreLineChart;
})(window.arrays, window.jQuery, window.d3, window._, window.moment);
