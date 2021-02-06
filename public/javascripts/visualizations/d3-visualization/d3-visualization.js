((arrays, $, d3, textures) => {
    /**
     * Abstract class representing a d3 based visualization
     * @constructor
     * @extends Visualization
     */
    arrays.D3Visualization = function () {

        // Call the parent constructor, making sure (using Function#call)
        // that "this" is set correctly during the call
        arrays.Visualization.call(this);

        /**
         * Container (div)
         * @member {d3.selection}
         * @private
         */
        this._container = null;

        /**
         * SVG root node
         * @member {d3.selection}
         * @private
         */
        this._svg = null;

        /**
         * SVG title node
         * @member {d3.selection}
         * @private
         */
        this._title = null;

        /**
         * Title text for this._title
         * @member {string}
         * @private
         */
        this._titleText = 'interactive visualization';

        /**
         * SVG g element, child of _svg, containing the d3 visualization
         * @member {d3.selection}
         * @private
         */
        this._canvas = null;

        /**
         * Chart tooltip.
         * @private
         */
        this._tooltip = new arrays.Tooltip();

        /**
         * d3 dispatch for inter-visualization communication and receiving brush updates
         * @member {d3.dispatch}
         * @private
         */
        this._dispatch = null;
    };

    // Create a D3Visualization.prototype object that inherits from Visualization.prototype.
    arrays.D3Visualization.prototype = Object.create(arrays.Visualization.prototype);

    // Set the "constructor" property to refer to D3Visualization
    arrays.D3Visualization.prototype.constructor = arrays.D3Visualization;

    /**
     * Initialize the D3Visualization
     * @public
     * @extends Visualization
     * @param {Object} options
     * @returns {D3Visualization}
     */
    arrays.D3Visualization.prototype.init = function (data, options) {

        // SVG patterns must be created and appended to an existing
        // SVG element in order to use as fill textures
        this._createPatternsContainer(options);

        // Augment options
        $.extend(true, this._options, {
            accessibility: false,
            useWrapper: true
        });

        // Call the "parent" method
        arrays.Visualization.prototype.init.call(this, data, options);

        return this;
    };

    /**
     * Setters
     */

    /**
     * Set dispatch
     * @param {Object} [dispatch]
     * @return {D3Visualization}
     */
    arrays.D3Visualization.prototype.setDispatch = function (dispatch) {
        this._dispatch = dispatch;

        return this;
    };

    /**
     * Fully renders a D3Visualization into a DOM element specified by the selector
     * @param {string} selector
     * @param {Object} [options]
     * @public
     * @extends Visualization
     * @returns {D3Visualization}
     */
    arrays.D3Visualization.prototype.render = function (selector, options) {

        // Call the "parent" method
        arrays.Visualization.prototype.render.call(this, selector, options);

        // Set up window resize event handler.
        if (options === undefined || options.useWindowResizeEvent === undefined || options.useWindowResizeEvent === true) {
            d3.select(window).on('resize.gist-visualization.' + selector, function () {
                this.resize();
            }.bind(this));
        }

        // Select the wrapper
        this._wrapper = d3.select(this._selector);
        if (this._wrapper.empty()) {
            throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
        }

        // Create the container
        this._createContainer();

        // Calculate margin
        this._margin = this._calculateMargin();

        // Get the dimensions
        this._dimensions = this._calculateDimensions();

        // Create the static elements
        this._createStaticElements();

        // Call the update method
        this.update();

        return this;
    };

    /**
     * Create container (div)
     * Use options.useWrapper when initializing the visualization to specify
     * whether you want both a wrapper and a container, or just a container
     * @private
     */
    arrays.D3Visualization.prototype._createContainer = function () {
        if (this._options.useWrapper) {
            this._wrapper.classed('gist-visualization-wrapper', true);
            this._container = this._wrapper.append('div')
                .style('height', '100%');
        } else {
            this._container = this._wrapper;
        }
        this._container.classed('gist-visualization-container', true);
    };

    /**
     * Create SVG element to assign svg pattern definitions to
     * @private
     */
    arrays.D3Visualization.prototype._createPatternsContainer = function (options) {
        if (options && options.accessibility) {
            this._patternSVG = d3.select('body').append('svg')
                .style('height', 0)
                .style('width', 0);
        }
    };

    /**
     * Resize callback triggered by window resize (typically)
     * @public
     */
    arrays.D3Visualization.prototype.resize = function () {

        // Calculate margin
        this._margin = this._calculateMargin();

        // Get the dimensions
        this._dimensions = this._calculateDimensions();

        // Resize the svg container
        this._svg
            .attr('height', this._dimensions.outerHeight)
            .attr('width', this._dimensions.outerWidth);

        // Call the update method
        this.update();
    };

    /**
     * Calculate margin - optionally calculate the margin instead of setting it via options (hook)
     * @private
     * @returns {Object} margin (top, right, bottom, left)
     */
    arrays.D3Visualization.prototype._calculateMargin = function () {
        return this._margin;
    };

    /**
     * Calculate dimensions
     * @private
     * @returns {Object} dimensions (innerWidth, innerHeight, outerWidth, outerHeight)
     */
    arrays.D3Visualization.prototype._calculateDimensions = function () {
        // Get container dimensions
        var dimensions = this._container.node().getBoundingClientRect();

        dimensions = {
            outerWidth: dimensions.width,
            outerHeight: dimensions.height,
            innerWidth: dimensions.width - this._margin.left - this._margin.right,
            innerHeight: dimensions.height - this._margin.top - this._margin.bottom
        };

        return dimensions;
    };

    /**
     * Creates the static elements
     * @private
     */
    arrays.D3Visualization.prototype._createStaticElements = function () {
        this._createRoot();
        this._createCanvas();
    };

    /**
     * Creates the svg root element
     * @private
     */
    arrays.D3Visualization.prototype._createRoot = function () {
        this._svg = this._container.append('svg')
            .classed('gist-visualization', true)
            .attr('height', this._dimensions.outerHeight)
            .attr('width', this._dimensions.outerWidth)
            .attr('aria-labelledby', 'chart-title');
    };

    /**
     * Creates the canvas svg g element
     * @private
     */
    arrays.D3Visualization.prototype._createCanvas = function () {
        this._canvas = this._svg.append('g')
            .classed('gist-visualization-canvas', true);
    };

    /**
     * Updates the canvas svg g element
     * @private
     */
    arrays.D3Visualization.prototype._updateCanvas = function () {
        this._canvas.attr('transform', 'translate(' + this._margin.left + ', ' + this._margin.top + ')');
    };

    /**
     * Updates a Visualization
     * Idempotent: only include d3 rendering code that can be run over and over
     * @public
     */
    arrays.D3Visualization.prototype.update = function () {

        this._updateCanvas();

        // Call the "parent" method
        arrays.Visualization.prototype.update.call(this);

        this._renderVisualization();
    };

    /**
     * Renders a D3Visualization
     * Idempotent: only include d3 rendering code that can be run over and over
     * @private
     */
    arrays.D3Visualization.prototype._renderVisualization = function () {
    };

    /**
     * Set colors
     * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
     * @public
     * @return {D3Visualization}
     */
    arrays.D3Visualization.prototype.setColors = function (colorOverrides) {
        // Set a default color palette with d3
        if (d3.version > '3.x') {
            this._colors = d3.scaleOrdinal().range(d3.schemeCategory20);
        } else {
            this._colors = d3.scale.category20().range();
        }

        // Use larger color pallete if more than 20 categories
        if (this._labels.length > 20) {
            this._colors = arrays.constants.LARGE_COLOR_PALETTE;
        }

        // if colors have been specified
        if (colorOverrides) {
            // piecewise replace colors
            for (var i = 0; i < colorOverrides.length; i++) {
                this._colors[i] = colorOverrides[i];
            }
        }

        return this;
    };

    /**
     * Create accessibility patterns
     * @public
     * @returns {Array}
     */
    arrays.D3Visualization.prototype.createPatterns = function (forceToCreate) {
        var patterns = [];

        if (this._options.accessibility || forceToCreate) {
            var patternTextures = [
                textures.paths()
                    .d('woven')
                    .lighter()
                    .thicker(),
                textures.circles()
                    .size(5),
                textures.paths()
                    .d('hexagons')
                    .size(8)
                    .strokeWidth(2),
                textures.lines()
                    .orientation('vertical')
                    .size(8)
                    .strokeWidth(1),
                textures.lines()
                    .orientation('3/8', '7/8'),
                textures.paths()
                    .d('waves')
                    .thicker(),
                textures.lines()
                    .orientation('5/8'),
                textures.circles()
                    .size(6)
                    .fill('transparent')
                    .strokeWidth(2),
                textures.lines()
                    .orientation('vertical', 'horizontal')
                    .size(4)
                    .strokeWidth(1)
                    .shapeRendering('crispEdges'),
                textures.lines(),
                textures.paths()
                    .d('nylon')
                    .lighter()
                    .shapeRendering('crispEdges'),
                textures.paths()
                    .d('crosses')
                    .lighter()
                    .thicker(),
                textures.lines()
                    .size(4)
                    .strokeWidth(1)
            ];

            var relativePath = window.location.pathname + window.location.search;

            for (var i = 0; i < patternTextures.length; i += 1) {
                // For the textures to be available as fills, they need to be attached/called to an svg on the page
                this._patternSVG.call(patternTextures[i]);

                // For the pattern urls to work in Safari (as well as Chrome & Firefox), use relative url paths
                var patternUrl = patternTextures[i].url();
                var index = patternUrl.indexOf('#');
                var relativePatternUrl = patternUrl.slice(0, index) + relativePath + patternUrl.slice(index);
                patterns.push(relativePatternUrl);
            }
        }

        return patterns;
    };
})(window.arrays, window.jQuery, window.d3, window.textures);
