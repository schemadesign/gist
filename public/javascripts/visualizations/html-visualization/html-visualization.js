/* global _, arrays, $ */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Abstract class representing an HTML based visualization
 * @constructor
 * @extends Visualization
 */
arrays.HTMLVisualization = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Visualization.call(this);

    this._templateName = '';

    // nunjucks environment
    this._env = null;
};

// Create a HTMLVisualization.prototype object that inherits from Visualization.prototype.
arrays.HTMLVisualization.prototype = Object.create(arrays.Visualization.prototype);

// Set the "constructor" property to refer to HTMLVisualization
arrays.HTMLVisualization.prototype.constructor = arrays.HTMLVisualization;

/**
 * Initialize the HTMLVisualization
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends Visualization
 * @returns {HTMLVisualization}
 */
arrays.HTMLVisualization.prototype.init = function (data, options) {

    // Call the "parent" method first
    arrays.Visualization.prototype.init.call(this, data, options);

    return this;
};

/**
 * Fully renders a HTMLVisualization into a DOM element specified by the selector
 * @param {string} selector
 * @param {Object} [options]
 * @public
 * @extends Visualization
 * @returns {HTMLVisualization}
 */
arrays.HTMLVisualization.prototype.render = function (selector, options) {

    // Call the "parent" method
    arrays.Visualization.prototype.render.call(this, selector, options);

    // Select the wrapper
    this._wrapper = $(selector);
    if (this._wrapper.length === 0) {
        throw new Error('Cannot find HTML element by "' + selector + '" selector');
    }

    // Render the visualization
    this._render();

    return this;
};

/**
 * Renders a HTMLVisualization
 * @private
 */
arrays.HTMLVisualization.prototype._render = function () {

    var html = nunjucks.render(this._templateName, { docs: this._data });

    this._wrapper.append(html);

};

/**
 * Updates an HTMLVisualization
 * @extends Visualization
 * @public
 */
arrays.HTMLVisualization.prototype.update = function () {
    this._render();
};
