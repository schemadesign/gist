/* global arrays, nunjucks */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new WordCloud
 * @param {Object} options
 * @constructor
 * @extends HTMLVisualization
 */
arrays.WordCloud = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.HTMLVisualization.call(this);

    this._meta = {};

    this._included = {};
};

// Create a WordCloud.prototype object that inherits from HTMLVisualization.prototype.
arrays.WordCloud.prototype = Object.create(arrays.HTMLVisualization.prototype);

// Set the "constructor" property to refer to WordCloud
arrays.WordCloud.prototype.constructor = arrays.WordCloud;

/**
 * Initialize the WordCloud
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends HTMLVisualization
 * @returns {WordCloud}
 */
arrays.WordCloud.prototype.init = function (data, options) {

    // Call the "parent" method
    arrays.HTMLVisualization.prototype.init.call(this, data, options);

    // set meta
    this.setMeta(data.meta);

    // set included
    this.setIncluded(data.included);

    return this;
};

/**
 * Renders a WordCloud
 * @private
 */
arrays.WordCloud.prototype._render = function () {

    var html;

    html = nunjucks.render('views/word-cloud.njk', {
        docs: this._data,
        meta: this._meta,
        included: this._included,
        options: this._options
    });
    this._wrapper.append(html);
};

/**
 * Set meta
 * @param {Object} meta
 * @public
 */
arrays.WordCloud.prototype.setMeta = function (meta) {
    this._meta = arrays.clone(meta);
};

/**
 * Set included
 * @param {Object} included
 * @public
 */
arrays.WordCloud.prototype.setIncluded = function (included) {
    this._included = arrays.clone(included);
};
