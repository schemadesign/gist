/* global arrays, jQuery */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new PaginationComponent
 * @param {Object} options
 * @constructor
 * @extends HTMLVisualization
 */
arrays.PaginationComponent = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.HTMLVisualization.call(this);

    this._meta = {};
};

// Create a PaginationComponent.prototype object that inherits from HTMLVisualization.prototype.
arrays.PaginationComponent.prototype = Object.create(arrays.HTMLVisualization.prototype);

// Set the "constructor" property to refer to PaginationComponent
arrays.PaginationComponent.prototype.constructor = arrays.PaginationComponent;

/**
 * Initialize the PaginationComponent
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends HTMLVisualization
 * @returns {PaginationComponent}
 */
arrays.PaginationComponent.prototype.init = function (data, options) {

    // Call the "parent" method
    arrays.HTMLVisualization.prototype.init.call(this, data, options);

    // set meta
    this.setMeta(data.meta);

    return this;
};

/**
 * Set meta
 * @param {Object} meta
 * @public
 */
arrays.PaginationComponent.prototype.setMeta = function (meta) {
    this._meta = arrays.clone(meta);
};

/**
 * Replaces a PaginationComponent's data
 * @param {Object} data - New data (including meta)
 * @public
 */
arrays.PaginationComponent.prototype.replaceData = function (data) {
    this.setData(data.data);
    this.setMeta(data.meta);
    this.update();
};
