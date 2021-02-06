/* global arrays */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new CoreWordCloud (adds in tooltip)
 * @constructor
 * @extends WordCloud
 */
arrays.CoreWordCloud = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.WordCloud.call(this);

    /**
     * Chart tooltip.
     * @private
     */
    this._tooltip = new arrays.StandardTooltip();
};

// Create a CoreWordCloud.prototype object that inherits from WordCloud.prototype.
arrays.CoreWordCloud.prototype = Object.create(arrays.WordCloud.prototype);

// Set the "constructor" property to refer to CoreWordCloud
arrays.CoreWordCloud.prototype.constructor = arrays.CoreWordCloud;

/**
 * Creates the static elements
 * @private
 * @extends WordCloud
 */
arrays.CoreWordCloud.prototype._createStaticElements = function () {

    // Call the "parent" method first
    arrays.WordCloud.prototype._createStaticElements.call(this);

    // Set the tooltip position
    this._tooltip.setPosition('top');
};

/**
 * Renders a CoreWordCloud
 * @private
 */
arrays.CoreWordCloud.prototype._render = function () {

    // Call the "parent" method first
    arrays.WordCloud.prototype._render.call(this);

    // hook up events
    var self = this;
    this._wrapper.find('.word-cloud-item.has-tooltip')
        .hover(function () {
            self.showTooltip(this);
        }, function () {
            self.hideTooltip(this);
        })
        .mousemove(function () {
            var tooltipDimensions = self._tooltip.getDimensions();
            self.moveTooltip(event.pageX - tooltipDimensions.width * 0.5, event.pageY - tooltipDimensions.height - 15);
        });
    this._wrapper.find('.word-cloud-item.has-tooltip a')
        .on('focus', function () {
            self.showTooltip(this);
        })
        .on('focusout', function () {
            self.hideTooltip(this);
        });
};

/**
 * Show tooltip.
 * @public
 */
arrays.CoreWordCloud.prototype.showTooltip = function (element) {

    var selection = $(element);

    this._hoveredElement = element;

    // Use custom tooltip text if available, otherwise use content
    var value = selection.data('tooltip-value') ||
        selection.closest('.word-cloud-item.has-tooltip').data('tooltip-value') ||
        selection.text();

    var templateOptions = {
        title: [selection.data('tooltip-key') || selection.closest('.word-cloud-item.has-tooltip').data('tooltip-key')]
    };

    templateOptions.rows = [
        [value]
    ];

    this._tooltip
        .applyTemplate(templateOptions)
        // current element or parent element
        .show(selection.closest('.word-cloud-item.has-tooltip')[0]);

    // reposition to top center of selection
    // extra 15px to match margin-right on li.word-cloud-item for proper centering
    var centerX = selection.offset().left + selection.width() * 0.5 + 15;
    var centerY = selection.offset().top + selection.height() * 0.5;
    var tooltipDimensions = this._tooltip.getDimensions();
    this.moveTooltip(centerX - tooltipDimensions.width * 0.5, centerY - tooltipDimensions.height - 15);
};

/**
 * Hide tooltip.
 * @public
 */
arrays.CoreWordCloud.prototype.hideTooltip = function (element) {
    // prevent hide events from other elements hiding the tooltop that is still being hovered over
    if (this._hoveredElement === element) {
        this._tooltip.hide();
    }
};

arrays.CoreWordCloud.prototype.moveTooltip = function (x, y) {
    this._tooltip._container
        .css({
            top: y,
            left: x,
        });

    // var tooltipDimension = this._tooltip._container.node().getBoundingClientRect();
    // this._tooltip._getManualPosition({ left: x, top: y }, tooltipDimension);
};
