/* global arrays, jQuery, nunjucks */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new Gallery
 * @param {Object} options
 * @constructor
 * @extends HTMLVisualization
 */
arrays.Gallery = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.HTMLVisualization.call(this);

    this._templateName = 'views/gallery.njk';
    this._meta = {};
    this._included = {};
};

// Create a Gallery.prototype object that inherits from HTMLVisualization.prototype.
arrays.Gallery.prototype = Object.create(arrays.HTMLVisualization.prototype);

// Set the "constructor" property to refer to Gallery
arrays.Gallery.prototype.constructor = arrays.Gallery;

/**
 * Initialize the Gallery
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends HTMLVisualization
 * @returns {Gallery}
 */
arrays.Gallery.prototype.init = function (data, options) {
    arrays.HTMLVisualization.prototype.init.call(this, data, options);

    this.setMeta(data.meta);
    this.setIncluded(data.included);

    return this;
};

/**
 * Renders a Gallery
 * @private
 */
arrays.Gallery.prototype._render = function () {
    const isMobile = arrays.isMobileDevice();
    const html = nunjucks.render(this._templateName, {
        data: this._data,
        meta: this._meta,
        included: this._included,
        options: this._options,
    });

    const titleMaxLines = 3;
    const subtitleMaxLines = isMobile ? 2 : 1;

    this._wrapper.append(html);

    const galleryTitleElement = $('.gallery-title');
    const gallerySecondaryTitleElement = $('.gallery-secondary-title');
    const titleLineHeight = parseInt(galleryTitleElement.css('line-height').replace('px', ''), 10);

    if (gallerySecondaryTitleElement.length !== 0) {
        const secondaryTitleLineHeight = parseInt(gallerySecondaryTitleElement.css('line-height').replace('px', ''), 10);
        gallerySecondaryTitleElement.shave(subtitleMaxLines * secondaryTitleLineHeight);
    }

    galleryTitleElement.shave(titleMaxLines * titleLineHeight);
};

/**
 * Set meta
 * @param {Object} meta
 * @public
 */
arrays.Gallery.prototype.setMeta = function (meta) {
    this._meta = arrays.clone(meta);
};

/**
 * Set included
 * @param {Object} included
 * @public
 */
arrays.Gallery.prototype.setIncluded = function (included) {
    this._included = arrays.clone(included);
};
