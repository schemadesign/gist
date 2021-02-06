/* global arrays, jQuery, nunjucks, d3 */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new Timeline
 * @constructor
 * @extends HTMLVisualization
 */
arrays.Timeline = function() {
    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.HTMLVisualization.call(this);

    this._templateName = 'views/timeline.njk';
    this._meta = {};
    this._included = {};
    this._tooltip = new arrays.StandardTooltip();
};

arrays.Timeline.prototype = Object.create(arrays.HTMLVisualization.prototype);
arrays.Timeline.prototype.constructor = arrays.Timeline;

/**
 * Initialize the Timeline
 * @param {Object} data - All data required to render this visualization
 * @param {Object} options
 * @public
 * @extends HTMLVisualization
 * @returns {Timeline}
 */
arrays.Timeline.prototype.init = function(data, options) {
    arrays.HTMLVisualization.prototype.init.call(this, data, options);
    this.setMeta(data.meta);
    this.setIncluded(data.included);

    return this;
};

/**
 * Creates the static elements
 * @private
 * @extends Timeline
 */
arrays.Timeline.prototype._createStaticElements = function() {
    arrays.HTMLVisualization.prototype._createStaticElements.call(this);
    this._tooltip.setPosition('top');
};

/**
 * Renders a Timeline
 * @private
 */
arrays.Timeline.prototype._render = function() {
    const html = nunjucks.render(this._templateName, {
        data: this._data,
        meta: this._meta,
        included: this._included,
        options: this._options,
    });

    this._wrapper.append(html);

    const self = this;
    this._wrapper
        .find('.gallery-item.has-tooltip')
        .hover(
            function() {
                self.showTooltip(this);
            },
            function() {
                self.hideTooltip(this);
            }
        )
        .mousemove(function() {
            const tooltipDimensions = self._tooltip.getDimensions();
            self.moveTooltip(event.pageX - tooltipDimensions.width * 0.5, event.pageY - tooltipDimensions.height - 15);
        });
    this._wrapper
        .find('.gallery-item.has-tooltip a')
        .on('focus', function() {
            self.showTooltip(this);
        })
        .on('focusout', function() {
            self.hideTooltip(this);
        });
};

/**
 * Show tooltip.
 * @public
 */
arrays.Timeline.prototype.showTooltip = function(element) {
    const selection = $(element);
    this._hoveredElement = element;

    const tooltipValue =
        selection.data('tooltip-value') || selection.closest('.gallery-item.has-tooltip').data('tooltip-value');
    const value = _.isNil(tooltipValue) ? selection.text() : tooltipValue;
    const title = selection.data('tooltip-key') || selection.closest('.gallery-item.has-tooltip').data('tooltip-key');
    const templateOptions = {
        title: [arrays.escape(title)],
        rows: [[arrays.escape(value)]],
        arrow: true,
    };

    this._tooltip.applyTemplate(templateOptions).show(selection.closest('.gallery-item.has-tooltip')[0]);

    const centerX = selection.offset().left + selection.width() * 0.5;
    const centerY = selection.offset().top + selection.height() * 0.5;
    const tooltipDimensions = this._tooltip.getDimensions();
    this.moveTooltip(centerX - tooltipDimensions.width * 0.5, centerY - tooltipDimensions.height - 9);
};

/**
 * Hide tooltip.
 * @public
 */
arrays.Timeline.prototype.hideTooltip = function(element) {
    // prevent hide events from other elements hiding the tooltop that is still being hovered over
    if (this._hoveredElement === element) {
        this._tooltip.hide();
    }
};

arrays.Timeline.prototype.moveTooltip = function(left, top) {
    this._tooltip._container.css({ top, left });
};

/**
 * Set meta
 * @param {Object} meta
 * @public
 */
arrays.Timeline.prototype.setMeta = function(meta) {
    this._meta = arrays.clone(meta);
};

/**
 * Set included
 * @param {Object} included
 * @public
 */
arrays.Timeline.prototype.setIncluded = function(included) {
    this._included = arrays.clone(included);
};
