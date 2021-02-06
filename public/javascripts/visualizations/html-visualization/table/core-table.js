/* global arrays, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new CoreTable (adds in hover, tooltip, legend)
 * @constructor
 * @extends Table
 */
arrays.CoreTable = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Table.call(this);

    /**
     * Chart tooltip.
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();

};

// Create a CoreTable.prototype object that inherits from Table.prototype.
arrays.CoreTable.prototype = Object.create(arrays.Table.prototype);

// Set the "constructor" property to refer to CoreTable
arrays.CoreTable.prototype.constructor = arrays.CoreTable;

/**
 * Creates the static elements
 * @private
 * @extends Table
 */
arrays.CoreTable.prototype._createStaticElements = function () {

    // Call the "parent" method first
    arrays.Table.prototype._createStaticElements.call(this);

    // Set the tooltip position
    this._tooltip.setPosition('top');
};

/**
 * Renders a CoreTable
 * @private
 */
arrays.CoreTable.prototype._render = function () {

    // Call the "parent" method first
    arrays.Table.prototype._render.call(this);

    // hook up events
    var self = this;

    this._wrapper.find('.table-data')
        .hover(function() {
            self.showDataTooltip(this);
        }, function() {
            self.hideTooltip(this);
        });
    this._wrapper.find('.table-data-link')
        .focus(function() {
            self.showDataTooltip(this);
        })
        .focusout(function() {
            self.hideTooltip(this);
        });

    this._wrapper.find('.table-head')
        .hover(function() {
            self.showHeaderTooltip(this);
        }, function() {
            self.hideTooltip(this);
        });
    this._wrapper.find('.table-head-link')
        .focus(function() {
            self.showHeaderTooltip(this);
        })
        .focusout(function() {
            self.hideTooltip(this);
        });
};

/**
 * Show tooltip for table data.
 * @public
 */
arrays.CoreTable.prototype.showDataTooltip = function (element) {

    var selection = $(element);

    // Only show tooltip if the text overflows
    if (selection.closest('.table-data')[0].scrollWidth <= selection.closest('.table-data')[0].clientWidth) {
        return;
    }

    this._hoveredElement = element;

    // Use custom tooltip text if available, otherwise use content
    var value = selection.data('tooltip-value') || selection.text();

    var templateOptions = {
        title: [arrays.escape(selection.data('tooltip-key'))]
    };

    if (selection.data('tooltip-scraped')) {
        templateOptions.img = value;
    } else {
        templateOptions.rows = [
            [arrays.escape(value)]
        ];
    }

    this._tooltip
        .applyTemplate(templateOptions)
        // current element or parent element
        .show(selection.closest('.table-data')[0]);

};

/**
 * Show tooltip for table header.
 * @public
 */
arrays.CoreTable.prototype.showHeaderTooltip = function (element) {

    var selection = $(element);

    // Only show tooltip if the text overflows
    if (selection.closest('.table-head')[0].scrollWidth <= selection.closest('.table-head')[0].clientWidth) {
        return;
    }

    this._hoveredElement = element;

    // Use custom tooltip text if available, otherwise use content
    var value = selection.data('tooltip-value') || selection.text();

    var templateOptions = {
        title: [arrays.escape(value)]
    };

    this._tooltip
        .applyTemplate(templateOptions)
        // current element or parent element
        .show(selection.closest('.table-head')[0]);
};

/**
 * Hide tooltip.
 * @public
 */
arrays.CoreTable.prototype.hideTooltip = function (element) {
    // prevent hide events from other elements hiding the tooltop that is still being hovered over
    if (this._hoveredElement === element) {
        this._tooltip.hide();
    }
};
