/* global arrays, jQuery, nunjucks */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new PaginationNav
 * @param {Object} options
 * @constructor
 * @extends PaginationComponent
 */
arrays.PaginationNav = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.PaginationComponent.call(this);
};

// Create a PaginationNav.prototype object that inherits from PaginationComponent.prototype.
arrays.PaginationNav.prototype = Object.create(arrays.PaginationComponent.prototype);

// Set the "constructor" property to refer to PaginationNav
arrays.PaginationNav.prototype.constructor = arrays.PaginationNav;

/**
 * Renders a PaginationNav
 * @private
 */
arrays.PaginationNav.prototype._render = function () {

    this._wrapper.html('');

    var meta = this._meta;
    var options = this._options;

    if (meta.numPages <= 1) {
        return;
    }

    var basePath = arrays.constructedRoutePath(meta.routePath_base, meta.filterObj, options);
    var numPages = meta.numPages;
    var onPageNum = meta.onPageNum;
    var html = nunjucks.render('views/partials/pagination-nav.njk', {
        basePath: basePath,
        lastPage: numPages,
        currentPage: onPageNum
    });

    this._wrapper.append(html);
};
