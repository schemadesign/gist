/* global arrays, jQuery, nunjucks, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new Table
 * @param {Object} options
 * @constructor
 * @extends HTMLVisualization
 */
arrays.Table = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.HTMLVisualization.call(this);

    this._meta = {};

    this._included = {};

    this._initialRenderComplete = false;
};

// Create a Table.prototype object that inherits from HTMLVisualization.prototype.
arrays.Table.prototype = Object.create(arrays.HTMLVisualization.prototype);

// Set the "constructor" property to refer to Table
arrays.Table.prototype.constructor = arrays.Table;

/**
 * Initialize the Table
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends HTMLVisualization
 * @returns {Table}
 */
arrays.Table.prototype.init = function (data, options) {

    // Call the "parent" method
    arrays.HTMLVisualization.prototype.init.call(this, data, options);

    // set meta
    this.setMeta(data.meta);

    // set included
    this.setIncluded(data.included);

    return this;
};

/**
 * Replaces a Visualization's data
 * @param {Object[][]} data - New data
 * @extends {HTMLVisualization}
 * @public
 */
arrays.Table.prototype.replaceData = function (data) {

    if (!data) {
        return;
    }

    this.setData(data.data);
    this.setMeta(data.meta);
    this.setIncluded(data.included);

    this.update();
};

/**
 * Renders a Table
 * @private
 */
arrays.Table.prototype._render = function () {

    var html, $tbody, $thead, $theadings;

    if (!this._initialRenderComplete) {

        // initial render
        html = nunjucks.render('views/table.njk', {
            docs: this._data,
            meta: this._meta,
            included: this._included,
            options: this._options
        });
        this._wrapper.append(html);
        this._initialRenderComplete = true;

    } else {

        // subsequent renders with new data
        $tbody = this._wrapper.find('tbody');
        $theadings = this._wrapper.find('thead .table-headings');

        // clear body and re-render
        $tbody.html('');
        html = nunjucks.render('views/partials/table-body.njk', {
            docs: this._data,
            meta: this._meta,
            included: this._included,
            options: this._options
        });
        $tbody.append(html);

        // clear headings and re-render, if there are results
        if (this._data.length > 0) {
            $theadings.html('');
            html = nunjucks.render('views/partials/table-head.njk', {
                docs: this._data,
                meta: this._meta,
                included: this._included,
                options: this._options
            });
            $theadings.append(html);
        }
    }

    // link horizontal scroll of thead and tbody
    $tbody = this._wrapper.find('tbody');
    $thead = this._wrapper.find('thead');
    $tbody.on('scroll', function () {
        $thead.scrollLeft($(this).scrollLeft());
    });
    $thead.on('scroll', function () {
        $tbody.scrollLeft($(this).scrollLeft());
    });
};

/**
 * Set meta
 * @param {Object} meta
 * @public
 */
arrays.Table.prototype.setMeta = function (meta) {
    this._meta = arrays.clone(meta);
};

/**
 * Set included
 * @param {Object} included
 * @public
 */
arrays.Table.prototype.setIncluded = function (included) {
    this._included = arrays.clone(included);
};
