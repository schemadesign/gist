((arrays, $, d3, _) => {
    const DEFAULT_FONT_SIZE = 16;

    /**
     * Abstract class representing a treemap
     * @constructor
     * @extends D3Visualization
     */
    class Treemap extends arrays.D3Visualization {
        constructor() {
            super();

            this.tooltip = new arrays.StandardTooltip();

            this.tooltip._fadeDelay = 0;

            this.tooltip.setPosition('top').setOffset('top', 12);

            this.root = null;

            this.treemap = null;

            this._data = null;

            this.nodes = null;

            this.currentTooltip = null;

            this.svgBackground = null;

            this.content = null;

            this.patterns = [];
        }

        /**
         * Initialize the Treemap
         * @public
         * @extends D3Visualization
         * @param {Object} data
         * @param {Object} options
         * @returns {Treemap}
         */
        init(data, options) {
            super.init(data, options);

            this.columns = data.columns || {};
            this.parents = data.parents || {};

            return this;
        }

        _createStaticElements() {}

        _updateCanvas() {}

        resize() {}

        formatValue(value, usePercent) {
            if (usePercent) {
                return this.getPercentFormatter(value);
            }

            return _.isNumber(value) ? d3.format(',d')(value) : `${value}`;
        }

        /**
         * Renders a Treemap
         * Idempotent: only include d3 rendering code that can be run over and over
         * @private
         * @extends CartesianChart
         */
        _renderVisualization() {
            this.createRoot();
            this.createTreemap();
            this.createParents();
            this.createNodes();
            this.createContent();
        }

        createTreemap() {
            const horizontalMargin = this._options.isExternalAccess ? -5 : 0;

            this.treemap = d3
                .treemap()
                .size([this._dimensions.innerWidth + horizontalMargin, this._dimensions.innerHeight])
                .padding(1)
                .paddingOuter(3)
                .round(true);

            this.treemap(this.root);
        }

        createRoot() {
            const stratify = d3.stratify();

            this.root = stratify(this._data)
                .sum(d => d.value)
                .sort((a, b) => b.height - a.height || b.value - a.value);
        }

        createParents() {
            this._container
                .selectAll()
                .data(this.root.children)
                .enter()
                .append('div')
                .classed('treemap-parent', true)
                .style('transform', ({ x0, y0 }) => `translate(${x0 + 2}px,${y0 + 2}px)`)
                .style('width', ({ x1, x0 }) => `${x1 - x0 - 4}px`)
                .style('height', ({ y0, y1 }) => `${y1 - y0 - 4}px`);
        }

        createNodes() {
            const numberOfParents = this._data.filter(({ parentId }) => parentId === '@treemap').length;
            const { isExternalAccess } = this._options;

            if (isExternalAccess) {
                this.nodes = this._container
                    .selectAll()
                    .data(this.root.leaves())
                    .enter()
                    .append('div')
                    .classed('treemap-node', true)
                    .style('left', ({ x0 }) => `${x0}px`)
                    .style('top', ({ y0 }) => `${y0}px`)
                    .style('width', ({ x1, x0 }) => `${x1 - x0}px`)
                    .style('height', ({ y0, y1 }) => `${y1 - y0}px`)
                    .style('color', d => d.parent.data.textColor)
                    .on('mouseover', (d, i) => this.onMouseOver(d, i, this.nodes[0]))
                    .on('mouseleave', (d, i) => this.onMouseLeave(d, i, this.nodes[0]));

                return;
            }

            this.nodes = this._container
                .selectAll()
                .data(this.root.leaves())
                .enter()
                .append('a')
                .classed('treemap-node', true)
                .attr(
                    'aria-label',
                    ({
                        id,
                        value,
                        parent: {
                            data: { label },
                        },
                    }) =>
                        `Treemap box of ${this._options.chartBy} ${id} group by ${
                            this._options.groupBy
                        } ${label} has a value of ${this.formatValue(value, this._options.isAggregateByPercent)}`
                )
                .attr('href', d => this.createLink(d, numberOfParents))
                .on('click', d => this.clickAction(d))
                .style('left', ({ x0 }) => `${x0}px`)
                .style('top', ({ y0 }) => `${y0}px`)
                .style('width', ({ x1, x0 }) => `${x1 - x0}px`)
                .style('height', ({ y0, y1 }) => `${y1 - y0}px`)
                .style('color', d => d.parent.data.textColor)
                .on('mouseover', (d, i) => this.onMouseOver(d, i, this.nodes[0]))
                .on('mouseleave', (d, i) => this.onMouseLeave(d, i, this.nodes[0]));
        }

        createContent() {
            this.content = this.nodes.append('div').classed('treemap-content', true);

            if (this._options.viewOptions.enableAccessibility) {
                this.svgBackground = this.nodes
                    .append('svg')
                    .classed('treemap-svg', true)
                    .attr('width', ({ x1, x0 }) => `${x1 - x0}px`)
                    .attr('height', ({ y0, y1 }) => `${y1 - y0}px`)
                    .append('rect')
                    .attr('width', '100%')
                    .attr('height', '100%');

                this.toggleBackgrounds(this._options.accessibility);
            } else {
                this.nodes.style('background-color', d => d.parent.data.color);
            }

            const label = this.content
                .append('div')
                .classed('treemap-label', true)
                .text(({ id }) => id)
                .style('font-size', `${DEFAULT_FONT_SIZE}px`);

            setTimeout(() => {
                label.style('font-size', (d, i) => {
                    const node = this.content[0][i];
                    const innerHeight = d.y1 - d.y0 - 5;
                    const innerWidth = d.x1 - d.x0 - 3;

                    // set font size according to width
                    let fontSize = (innerWidth / node.offsetWidth) * DEFAULT_FONT_SIZE;
                    const lines = Math.round(node.offsetHeight / DEFAULT_FONT_SIZE);

                    // set font size according to height
                    fontSize = Math.min(fontSize, innerHeight / lines);

                    return fontSize < 7 ? '7px' : `${fontSize}px`;
                });

                setTimeout(() => {
                    this.content.style('opacity', ({ x1, x0, y0, y1 }, i) => {
                        const { offsetHeight, offsetWidth } = this.content[0][i];

                        return offsetWidth <= x1 - x0 && offsetHeight <= y1 - y0 ? 1 : 0;
                    });
                });
            });
        }

        createPatternColors(patterns) {
            const colors = {};
            let i = 0;
            this.parents.forEach(({ id }) => {
                colors[id] = patterns[i];
                i++;

                if (patterns.length === i) {
                    i = 0;
                }
            });

            return colors;
        }

        toggleBackgrounds(accessibility) {
            if (accessibility) {
                if (!this._patternSVG) {
                    this._createPatternsContainer({ accessibility: true });
                }

                if (_.isEmpty(this.patterns)) {
                    const patterns = this.createPatterns(true);
                    this.patterns = this.createPatternColors(patterns);
                }

                this.svgBackground.attr('fill', d => this.patterns[d.parent.id]);
                this._container.classed('treemap-accessibility', true);
            } else {
                this.svgBackground.attr('fill', d => d.parent.data.color);
                this._container.classed('treemap-accessibility', false);
            }
        }

        onMouseOver(
            {
                x0,
                x1,
                y0,
                y1,
                id,
                value,
                parent: {
                    data: { label },
                },
            },
            i,
            nodes
        ) {
            const offset = 6;
            const width = x1 - x0;
            const height = y1 - y0;
            const scaleX = (width + offset) / width;
            const scaleY = (height + offset) / height;
            const element = nodes[i];

            element.style.transform = `scale(${scaleX},${scaleY})`;
            element.classList.add('treemap-hover');

            this.showTooltip(id, value, label, element);
        }

        onMouseLeave(d, i, nodes) {
            this.tooltip.hide();
            this.currentTooltip = null;
            nodes[i].style.transform = '';
            nodes[i].classList.remove('treemap-hover');
        }

        showTooltip(title, value, label, element) {
            if (this.currentTooltip === title) {
                return;
            }

            this.currentTooltip = title;

            const {
                chartBy,
                groupBy,
                aggregateBy,
                isChartByPercent,
                isAggregateByPercent,
                isGroupByPercent,
            } = this._options;

            const templateOptions = {
                title: [arrays.escape(chartBy), arrays.escape(this.formatValue(title, isChartByPercent))],
                rows: [
                    [arrays.escape(aggregateBy), arrays.escape(this.formatValue(value, isAggregateByPercent))],
                    [arrays.escape(groupBy), arrays.escape(this.formatValue(label, isGroupByPercent))],
                ],
                arrow: true,
            };

            this.tooltip.applyTemplate(templateOptions).show(element);
        }

        clickAction({ data: { originalId } }) {
            const { nonpagedCount } = this._options;

            if (nonpagedCount === 1) {
                arrays.showDetailViewModal(originalId, null, 'treemap', this._options);
            }
        }

        createLink({
            parent: {
                data: { label },
            },
            id,
        }) {
            const {
                routePath_base,
                filterObj,
                groupBy,
                chartBy,
                array_source_key,
                clickThroughView,
                nonpagedCount,
                isSegmentBy,
            } = this._options;

            if (nonpagedCount === 1) {
                return 'javascript:void(0)';
            }

            const filters = Object.assign({}, filterObj, {
                ...(isSegmentBy ? {} : { [chartBy]: id }),
                [groupBy]: label,
            });

            if (clickThroughView) {
                const toOmit = ['aggregateBy', 'chartBy', 'groupBy', 'limit'];
                return arrays.changeRoutePath(array_source_key, clickThroughView, filters, toOmit);
            }

            return arrays.constructedRoutePath(routePath_base, filters, this._options);
        }
    }

    arrays.Treemap = Treemap;
})(window.arrays, window.jQuery, window.d3, window._);
