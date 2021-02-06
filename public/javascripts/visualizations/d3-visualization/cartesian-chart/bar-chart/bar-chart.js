((arrays, d3, _) => {
    const TYPE_GROUPED = 'grouped';

    class BarChart extends arrays.CartesianChart {
        constructor() {
            super();

            // Override margin
            this._margin = {
                top: 25,
                right: 15,
                bottom: 50,
                left: 120,
            };

            // Override tooltip (different class)
            this._tooltip = new arrays.StandardTooltip();

            // Override title text
            this._titleText = 'interactive bar chart';

            /**
             * Data categories - array of { label: <string>, value: <number> } based on stackBy
             * @private
             * @member {Object[]}
             */
            this._dataCategories = null;

            /**
             * Categories and data - array of arrays, each with a label in the first position and the stacked data in
             * the second
             * @private
             * @member {Array[][String,Object[]]}
             */
            this._categoriesAndData = null;

            /**
             * Bars - hierarchical, data bound d3 selection
             * @member {d3.selection}
             */
            this._bars = null;

            /**
             * Minimum axis label width (in pixels)
             * @member {Number}
             */
            this._minLabelWidth = 44;

            /**
             * Maximum axis label width (in pixels)
             * @member {Number}
             */
            this._maxLabelWidth = 70;

            /**
             * Minimum vertical axis label (in pixels)
             * @member {Number}
             */
            this._minVerticalLabelWidth = 14;
        }

        /**
         * Initialize the BarChart
         * @public
         * @extends CartesianChart
         * @param {Object} data
         * @param {Object} options
         * @returns {BarChart}
         */
        init(data, options) {
            Object.assign(this._options, {
                padding: 0.2,
                precise: 2,
                useWrapper: false,
                annotations: {},
            });

            // Get the type (normal, stacked, grouped)
            // NOTE set before calling parent method so _type is set
            this._type = data.type;

            this._fields = data.fields || {};

            super.init(data, options);

            this.maxGroups = _.max(data.data.map(arr => arr.length));

            Object.assign(this.renderOptions, {
                xAxisTicks: true,
                yAxisTicks: true,
                mouseEvents: false,
                xAxisLabel: false,
                yAxisLabel: false,
            });

            this._tooltip.setOffset('top', 10);

            this.isPreviewAndMobile = arrays.isPreviewAndMobile();

            return this;
        }

        /**
         * Pre-process a Bar Chart's data before saving it (hook)
         * @public
         * @param {Object[][]} data - incoming data
         * @returns {Object[][]} processed data
         * @extends CartesianChart
         */
        preProcessData(data) {
            return this._options.normalize ? this.normalize(data) : data;
        }

        /**
         * Normalize input data.
         * @public
         * @param {Object[][]} data - incoming data
         * @returns {Object[][]} processed data
         */
        normalize(data) {
            return data.map(series => {
                // Get column max value.
                const columnMax = series.reduce((accumulator, { value }) => accumulator + Math.abs(value), 0);

                // Divide every column's value to the max value.
                return series.map(params => {
                    return Object.assign({}, params, {
                        value: columnMax ? (Math.abs(params.value) / columnMax) : 0,
                        denormalizedValue: params.value,
                    });
                });
            });
        }

        /**
         * Post-process the BarChart's data (hook)
         * @public
         * @extends CartesianChart
         */
        postProcessData() {
            this._dataCategories = this.getDataCategories();
            this._alphaSortedData = this.getAlphaSortedData();
            this._stackSortedData = this.getStackSortedData();

            if (this._options.chronological) {
                this.sortDataByXAxis();
            } else {
                this.sortData();
            }
        }

        /**
         * Get categories in data for legend labels and stack sorting
         * @public
         * @returns {Object[]}
         */
        getDataCategories() {
            const categories = [];

            this._data.forEach(col => {
                col.forEach(row => {
                    const currentObj = categories.filter(({ label }) => label === row.label);

                    if (currentObj.length === 0) {
                        const label = row.label;

                        if (!this._options.simpleChart || !categories.some(cat => cat.label === label)) {
                            categories.push({
                                label,
                                value: row.value,
                                color: row.color,
                            });
                        }
                    } else if (currentObj.some(({ value }) => value < row.value)) {
                        currentObj[0].value = row.value;
                        currentObj[0].color = row.color;
                    }
                });
            });

            return categories;
        }

        /**
         * Get legend data sorted by Alpha
         * @public
         * @returns {Object[]}
         */
        getAlphaSortedData() {
            const categories = _.sortBy(this._dataCategories, 'label');

            return categories.map(({ label, color }) => ({ label, color }));
        }

        /**
         * Get bar stack order data.
         * @public
         * @returns {Object[]}
         */
        getStackSortedData() {
            const categories = _.orderBy(this._dataCategories, ['value', 'label'], ['desc', 'asc']);

            return categories.map(({ label }) => ({ label }));
        }

        /**
         * Sort By Y-Axis
         * @public
         */
        sortData() {
            this._categoriesAndData = this.toggleYAxisSort().slice();
            this.populateCategoriesAndData();
        }

        /**
         * Sort by X-Axis
         * @public
         */
        sortDataByXAxis() {
            this._categoriesAndData = this.toggleXAxisSort();
            this.populateCategoriesAndData();
        }

        reduceCategories(useRawValue = false) {
            return this._categories.reduce((accumulator, currentValue, currentIndex) => {
                const parseCurrentValueToNumber = _.toNumber(currentValue);
                const isNaN = useRawValue || _.isNaN(parseCurrentValueToNumber);
                const value = isNaN ? currentValue : parseCurrentValueToNumber;
                accumulator.push([value, this._data[currentIndex]]);
                return accumulator;
            }, []);
        }

        /**
         * Toggle XAxis Sort
         * @public
         * @returns {Object[][]}
         */
        toggleXAxisSort() {
            return this.reduceCategories(this._options.groupBy_isDate);
        }

        /**
         * Toggle YAxis Sort
         * @public
         * @returns {Object[][]}
         */
        toggleYAxisSort() {
            const processedCategories = this.reduceCategories();

            if (this._options.normalize) {
                return processedCategories.sort((a, b) => a[1].reduce((sum, { denormalizedValue }) => sum + denormalizedValue, 0) - b[1].reduce((sum, { denormalizedValue }) => sum + denormalizedValue, 0));
            }

            return processedCategories.sort((a, b) => a[1].reduce((sum, { value }) => sum + value, 0) - b[1].reduce((sum, { value }) => sum + value, 0));
        }

        /**
         * Populate this._categories and this._data
         * @public
         */
        populateCategoriesAndData() {
            this._categories = [];
            this._data = [];
            this._categoriesAndData.forEach(([category, data]) => {
                this._categories.push(_.get(data, [0, 'originalCategory']) ? data[0].category : category);
                this._data.push(this.sortStack(data));
            });
        }

        /**
         * Sort stacked data by legend order
         * @public
         */
        sortStack(stackData) {
            // flip if stacked
            if (this._type !== TYPE_GROUPED) {
                stackData.reverse();
            }

            const stackOrderKeys = this._stackSortedData.map(({ label }) => label);

            return stackData.sort((a, b) => stackOrderKeys.indexOf(a.label) - stackOrderKeys.indexOf(b.label));
        }

        /**
         * Override colors with patterns  if accessibility mode
         * and change format of colors data for easier use
         * @public
         * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
         * @extends CartesianChart
         */
        setColors(colorOverrides) {
            // Call the "parent" method first to set this._colors
            super.setColors(colorOverrides);

            let colors = this._colors;

            // Use pattern palette if enabled
            const patterns = this.createPatterns();
            if (patterns && patterns.length > 0) {
                colors = patterns;
            }

            this._colors = {};

            let i = 0;

            this._alphaSortedData.forEach(({ color, label }) => {
                if (color && (!patterns || patterns.length === 0)) {
                    this._colors[label] = color;
                } else {
                    if (!this._colors[label]) {
                        this._colors[label] = colors[i];
                    }
                    i = (i + 1) % colors.length;
                }
            });
        }

        /**
         * Creates the static elements
         * @private
         * @extends CartesianChart
         */
        _createStaticElements() {
            super._createStaticElements();

            this.setAxesVisibility();
            this.styleTickLabels();

            this.renderLegend();
            this._renderCustomComponents();

            this.resizeChart();
        }

        /**
         * Utility for creating custom static elements
         * @private
         */
        _renderCustomComponents() {
            this._annotations = this._svg.append('g').attr('class', 'gist-annotations').attr('pointer-events', 'none').attr('transform', `translate(${this._margin.left},${this._margin.top})`);

            if (this._options.annotations.overlayText) {
                new arrays.OverlayText(this._annotations, [this._options.annotations.overlayText]);
            }
        }

        /**
         * Creates the svg root element
         * @private
         * @extends CartesianChart
         */
        _createRoot() {
            super._createRoot();

            if (this._options.isExternalAccess) {
                const { outerWidth, outerHeight } = this._dimensions;

                this._svg.attr('viewBox', `0 0 ${outerWidth} ${outerHeight}`).attr('preserveAspectRatio', 'xMidYMid meet');
            }
        }

        /**
         * Get numeric domain min value.
         * @returns {Number}
         */
        getMinValue() {
            if (this._options.normalize) {
                return 0;
            }

            return _.min(this._data.map(series => {
                return series.reduce((accumulator, { value }) => accumulator + Math.min(0, value), 0);
            }));
        }

        /**
         * Get numeric domain max value.
         * @returns {Number}
         */
        getMaxValue() {
            if (this._options.normalize) {
                return 1;
            }

            if (this._type === TYPE_GROUPED) {
                return _.max(this._data.map(series => {
                    return _.max(series.map(({ value }) => Math.max(0, value)));
                }));
            } else {
                return _.max(this._data.map(series => {
                    return series.reduce((accumulator, { value }) => accumulator + Math.max(0, value), 0);
                }));
            }
        }

        /**
         * Get value formatter for ticks
         * @returns {Function}
         */
        getValueFormatter() {
            if (this._options.normalize) {
                return data => `${_.round(data * 100, this._options.precise)}%`;
            }

            return data => {
                const number = _.round(data, this._options.precise);

                return arrays.orderOfMagnitude(number, this._options.precise);
            };
        }

        /**
         * Set axis visibility (customized in horizontal and vertical bar charts)
         * @public
         */
        setAxesVisibility() {}

        /**
         * Style tick labels
         * @public
         */
        styleTickLabels() {
            this.styleXTickLabels();
            this.styleYTickLabels();
        }

        /**
         * Style x tick labels (customized in horizontal and vertical bar charts)
         * @public
         */
        styleXTickLabels() {}

        /**
         * Style y tick labels (customized in horizontal and vertical bar charts)
         * @public
         */
        styleYTickLabels() {}

        /**
         * Recursively truncate labels to fit rendered width (not by character length)
         * @param {D3Selection} selection - label to truncate
         * @param {Number} maxWidth - max width of labels in pixels
         */
        truncateLabelByWidth(selection, maxWidth) {
            const bbox = selection.node().getBBox();
            const text = selection.text();
            if (bbox.width > maxWidth) {
                selection.text(() => `${text.substr(0, text.length - 2)}\u2026`);
                this.truncateLabelByWidth(selection, maxWidth);
            }
        }

        /**
         * Check if x axis labels exceed available width, if so set flag on barchart object
         * @param {D3Selection} selection - label to check
         * @param {Number} maxWidth - max width of labels in pixels
         */
        isLabelOrientationVertical(selection, maxWidth) {
            const bbox = selection.node().getBBox();

            if (bbox.width > maxWidth) {
                this._xAxisVert = true;
            }
        }

        /**
         * Transform d3 node; make vertical
         * @param {D3Selection} label - label
         */
        setVerticalLabel(label) {
            label.style('text-anchor', 'end').attr('transform', 'rotate(-90) translate(-12, -14)');
        }

        /**
         * Truncate text of d3 node
         * @param {D3Selection} label - label
         */
        truncateLabel(label) {
            const text = label.text();
            // Make sure the text isn't over 30 characters, we don't want a crazy long barchart
            if (text.length > 30) {
                label.text(`${text.substr(0, 30)}\u2026`);
            }
        }

        /**
         * Renders the legend
         * @private
         */
        renderLegend() {
            /*
             * Legend Data
             */
            d3.selectAll(`.gist-legend-list-${this._options.viewInstanceId} .gist-legend-list-item`).remove();
            const legendList = d3.select(`.gist-legend-list-${this._options.viewInstanceId}`);

            const alphaSortedData = this._alphaSortedData.map(data => ({
                rawLabel: data.label,
                label: arrays.escape(data.label),
                color: arrays.escape(data.color),
            }));

            const labelFormatter = this._options.isStackByPercent ? this.getPercentFormatter : arrays.escape;
            const renderLabel = ({rawLabel}) => `${labelFormatter(rawLabel)}`;

            const legendListItem = legendList.selectAll('.gist-legend-list-item').data(alphaSortedData).enter().append('li').attr('class', 'gist-legend-list-item').style('border-color', ({ label }) => this._colors[arrays.unescape(label)]);

            const legendListLink = legendListItem.append('a');

            legendListLink.append('span').attr('class', 'gist-legend-dot').append('svg').attr('width', 20).attr('height', 20).append('circle').attr('r', 10).attr('cx', 10).attr('cy', 10).style('fill', ({ label }) => this._colors[arrays.unescape(label)]);

            const self = this;

            legendListLink.attr('class', 'gist-legend-list-link').on('mouseover', function (datum) {
                self._legendMouseEnterEventHandler(d3.select(this), datum);
            }).on('focus', function (datum) {
                self._legendMouseEnterEventHandler(d3.select(this), datum);
            }).on('mouseout', () => {
                d3.select(this._selector).selectAll('svg').selectAll('rect.gist-bar').style('opacity', 1);
            }).append('span').html(renderLabel);

            if (this._options.viewOptions.viewInteractivity) {
                legendListLink.attr('tabindex', '0').attr('role', 'link').attr('aria-label', ({ label }) => `${this._options.stackBy} ${label}`).on('click', ({ label }) => {
                    if (this._options.isExternalAccess) {
                        return;
                    }

                    const filterObjForThisFilterColVal = arrays.constructedFilterObj(this._options.filterObjWithColFilter, this._options.simpleChart ? 'colFilter' : this._options.stackBy, arrays.unescape(label), false);
                    const clickThroughURL = arrays.changeRoutePath(this._options.array_source_key, this._options.clickThroughView, filterObjForThisFilterColVal);

                    arrays.redirect(clickThroughURL);
                });
            }
        }

        /**
         * Legend on mouse in event handler.
         * @param {HTMLElement} listItem - legend list item
         * @param {String} label
         */
        _legendMouseEnterEventHandler(listItem, { label: seriesLabel }) {
            this._canvas.selectAll('svg rect.gist-bar').style('opacity', ({ label }) => arrays.escape(label) === seriesLabel ? 1 : 0.25);
        }

        /**
         * Renders a BarChart
         * Idempotent: only include d3 rendering code that can be run over and over
         * @private
         * @extends CartesianChart
         */
        _renderVisualization() {
            // Call the "parent" method first
            super._renderVisualization();

            // update
            this._bars = this._series.selectAll('a').data(data => data.map(item => {
                return Object.assign(item, { label: item.label });
            }));

            const delay = (datum, i, j) => j * 4;

            // update transition
            this._bars.select('rect').transition().duration(750).delay(delay).call(this._finalBarTransform, this);

            // enter
            const self = this;
            const barsEnter = this._bars.enter().append('a').attr('tabindex', '0').style('cursor', this._options.viewOptions.viewInteractivity ? 'pointer' : 'default').on('mouseenter', function (datum) {
                self._barMouseEnterEventHandler(this, datum);
            }).on('focus', function (datum) {
                self._barMouseEnterEventHandler(this, datum);
            }).on('mouseout', function () {
                self._barMouseOutEventHandler(this);
            }).on('focusout', function () {
                self._barMouseOutEventHandler(this);
            }).on('click', (datum, index, j) => this._barClickEventHandler(this._categoriesAndData, index, j)).on('keypress', (datum, index, j) => {
                if (d3.event.key === 'Enter') {
                    this._barClickEventHandler(this._categoriesAndData, index, j);
                }
            }).attr('aria-label', (datum, index, j) => {
                const category = this._categoriesAndData[j][0];
                return `Bar Chart slice with ${this._options.groupBy} ${category} and ${this._options.stackBy} ${datum.label} has a value of ${datum.value} ${this._options.aggregateBy}`;
            }).append('rect').attr('class', 'gist-bar').style('fill', ({ label }) => this._colors[label]).call(this._initialBarTransform, this);

            // exit
            const barsExit = this._bars.exit();

            // enter transition
            barsEnter.call(this._finalBarTransform, this);

            // exit
            barsExit.remove();
        }

        /**
         * Transform bar to initial position - reusable d3 set of attr assignments
         * Use via d3.selection.call(this._transformBar, this)
         * @param  {d3.selection} selection
         * @param  {BarChart} boundThis
         * @private
         */
        _initialBarTransform(selection, boundThis) {}

        /**
         * Transform bar to final position - reusable d3 set of attr assignments
         * Use via d3.selection.call(this._transformBar, this)
         * @param  {d3.selection} selection
         * @param  {BarChart} boundThis
         * @private
         */
        _finalBarTransform(selection, boundThis) {
            selection.attr('x', (d, i, j) => boundThis.getBarX(d, i, j)).attr('y', (d, i, j) => {
                const y = boundThis.getBarY(d, i, j);
                return Number.isNaN(y) ? 0 : y;
            }).attr('width', (d, i, j) => boundThis.getBarWidth(d, i, j)).attr('height', (d, i, j) => {
                const h = boundThis.getBarHeight(d, i, j);
                return Number.isNaN(h) ? 0 : h;
            });
        }

        /**
         * Update sort direction option
         * @param  {Boolean} sortDirection
         * @public
         */
        updateSortDirection(sortDirection) {
            if (!_.isUndefined(sortDirection)) {
                this._options.sortDirection = sortDirection;
            }

            // update the chart
            this.update();
        }

        /**
         * Updates a BarChart
         * @public
         * @extends CartesianChart
         */
        update() {
            // Call the "parent" method
            super.update();

            this.styleTickLabels();

            // Remove custom elements
            this._svg.selectAll('.gist-annotations').remove();

            // Add Custom elements back with the correct dimensions
            this._renderCustomComponents();
        }

        /**
         * Bar mouse in event handler.
         * @param {SVGElement} barElement - bar SVG node
         * @param {Object} barData - bar data
         */
        _barMouseEnterEventHandler(barElement, { label, value, category }) {
            this._canvas.selectAll('a').filter(function () {
                return this !== barElement;
            }).style('opacity', 0.2);

            const rows = [];

            // Standard tooltip label and value
            if (this._options.simpleChart) {
                rows.push([label, arrays.escape(this.getValueFormatter()(value))]);
            } else {
                rows.push([this._options.stackBy, arrays.escape(
                    this._options.isStackByPercent ? this.getPercentFormatter(label) : label
                )]);
                rows.push([this._options.aggregateBy, arrays.escape(
                    this._options.isAggregateByPercent ? this.getPercentFormatter(value) : this.getValueFormatter()(value)
                )]);
            }

            this._tooltip.applyTemplate({
                title: [this._options.groupBy, arrays.escape(
                    this._options.isGroupByPercent ? this.getPercentFormatter(category) : category
                )],
                rows,
            }).setPosition('top').show(barElement);
        }

        /**
         * Bar mouse out event handler.
         * @param {SVGElement} barElement - bar SVG node
         */
        _barMouseOutEventHandler(barElement) {
            this._canvas.selectAll('a').filter(function () {
                return this !== barElement;
            }).style('opacity', 1);

            this._tooltip.hide();
        }

        /**
         * Bar click event handler.
         *
         */
        _barClickEventHandler(categoriesAndData, index, j) {
            if (this._options.viewOptions.viewInteractivity && !this._options.isExternalAccess) {
                const filterCols = this._options.simpleChart ? 'colFilter' : [this._options.groupBy, this._options.stackBy];
                const filterVals = this._options.simpleChart ? categoriesAndData[j][1][index].label : [categoriesAndData[j][0], categoriesAndData[j][1][index].label];
                const filterObjForThisFilterColVal = arrays.constructedFilterObj(this._options.filterObj, filterCols, filterVals, false);
                const clickThroughURL = arrays.changeRoutePath(this._options.array_source_key, this._options.clickThroughView, filterObjForThisFilterColVal);

                arrays.redirect(clickThroughURL);
            }
        }

        resizeChart() {
            if (this._options.isExternalAccess) {
                return;
            }

            setTimeout(() => {
                const { top, bottom } = this._margin;
                const { height: canvasHeight } = this._canvas.node().getBBox();
                let height = Math.max(canvasHeight, arrays.constants.MIN_CHART_HEIGHT_EXTENDED) + top + bottom;

                if (this.isPreviewAndMobile) {
                    height = Math.min(height, arrays.getIframeHeight());
                }

                this._svg.attr('height', height);
                this._wrapper.style('height', `${height}px`);
            });
        }
    }

    arrays.BarChart = BarChart;
})(window.arrays, window.d3, window._);
