/* global arrays */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Abstract class representing a canvas based visualization
 * @constructor
 * @extends Visualization
 */
arrays.CanvasVisualization = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Visualization.call(this);

    /**
     * @member {Element}
     * @private
     */
    this._canvas = null;

    /**
     * @member {CanvasRenderingContext2D}
     * @private
     */
    this._context = null;

    /**
     * canvas dispatch for inter-visualization communication and receiving brush updates
     * @member {canvas.dispatch}
     * @private
     */
    this._dispatch = null;
};

// Create a CanvasVisualization.prototype object that inherits from Visualization.prototype.
arrays.CanvasVisualization.prototype = Object.create(arrays.Visualization.prototype);

// Set the "constructor" property to refer to CanvasVisualization
arrays.CanvasVisualization.prototype.constructor = arrays.CanvasVisualization;

/**
 * Initialize the CanvasVisualization
 * @public
 * @extends Visualization
 * @param {Object} options
 * @returns {CanvasVisualization}
 */
arrays.CanvasVisualization.prototype.init = function (data, options) {
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
 * @return {CanvasVisualization}
 */
arrays.CanvasVisualization.prototype.setDispatch = function (dispatch) {
    this._dispatch = dispatch;

    return this;
};

/**
 * Fully renders a CanvasVisualization into a DOM element specified by the selector
 * @param {string} selector
 * @param {Object} [options]
 * @public
 * @extends Visualization
 * @returns {CanvasVisualization}
 */
arrays.CanvasVisualization.prototype.render = function (selector, options) {
    // Call the "parent" method
    arrays.Visualization.prototype.render.call(this, selector, options);

    arrays.addResizeEventListener(this.resize);

    // Select the wrapper
    this._wrapper = document.querySelector(this._selector);
    if (!this._wrapper) {
        throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
    }

    // Create the container
    this._createCanvas();

    // Ensure proper sizing and update
    this.resize();

    return this;
};

/**
 * Create the canvas
 * @private
 */
arrays.CanvasVisualization.prototype._createCanvas = function() {
    this._canvas = document.createElement('canvas');
    this._wrapper.appendChild(this._canvas);
    this._context = this._canvas.getContext('2d');
};

/**
 * Resize callback triggered by window resize (typically)
 * @public
 */
arrays.CanvasVisualization.prototype.resize = function () {

    // Calculate margin
    this._margin = this._calculateMargin();

    // Get the dimensions
    this._dimensions = this._calculateDimensions();

    // Resize the canvas
    this._canvas.width = this._dimensions.x;
    this._canvas.height = this._dimensions.y;

    // Call the update method
    this.update();
};

/**
 * Calculate margin - optionally calculate the margin instead of setting it via options (hook)
 * @private
 * @returns {Object} margin (top, right, bottom, left)
 */
arrays.CanvasVisualization.prototype._calculateMargin = function () {
    return this._margin;
};

/**
 * Calculate dimensions
 * @private
 * @returns {Object} dimensions (innerWidth, innerHeight, outerWidth, outerHeight)
 */
arrays.CanvasVisualization.prototype._calculateDimensions = function () {
    return {
        x: this._wrapper.offsetWidth,
        y: this._wrapper.offsetHeight
    };
};

/**
 * Updates a Visualization
 * Idempotent: only include canvas rendering code that can be run over and over
 * @public
 */
arrays.CanvasVisualization.prototype.update = function () {

    // Call the "parent" method
    arrays.Visualization.prototype.update.call(this);

    this._renderVisualization();
};

/**
 * Renders a CanvasVisualization
 * Idempotent: only include canvas rendering code that can be run over and over
 * @private
 */
arrays.CanvasVisualization.prototype._renderVisualization = function () {
};
