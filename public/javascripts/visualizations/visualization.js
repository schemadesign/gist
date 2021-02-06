((arrays, $, moment) => {
    /**
     * Abstract class representing a visualization
     * @constructor
     */
    arrays.Visualization = function () {

        /**
         * The data
         * @private
         * @member {Object[][]}
         */
        this._data = [];

        /**
         * A copy of the original data, unfiltered
         * @private
         * @member {Object[][]}
         */
        this._unfilteredData = [];

        /**
         * Labels for different groups in the data (e.g. categories, series, etc)
         * @private
         * @member {string[]}
         */
        this._labels = [];

        /**
         * Categories
         * @private
         * @member {string[]}
         */
        this._categories = [];

        /**
         * Color overrides
         * @private
         * @member {string[]}
         */
        this._colorOverrides = [];

        /**
         * Color palette
         * @private
         * @member {string[]}
         */
        this._colors = [];

        /**
         * Optional opacities for colors
         * @private
         * @member {string[]}
         */
        this._opacities = [];

        /**
         * Options
         * @private
         * @member {Object}
         */
        this._options = {
            quickHideTooltip: true,
        };

        /**
         * Render options
         * @public
         * @member {Object}
         */
        this.renderOptions = {};

        /**
         * DOM node that contains the Visualization
         * @member {Object}
         */
        this._wrapper = null;

        /**
         * Visualization margins
         * @private
         * @member {Object}
         */
        this._margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        };

        /**
         * CSS Selector that the Visualization is rendered into
         * @private
         * @member {String}
         */
        this._selector = 'body';

        this._tooltip = new arrays.Tooltip();

        this._xAxisHighlight = new arrays.Tooltip();
    };

    /**
     * Getters
     */

    /**
     * Get colors
     * @public
     * @returns {Array} - Array of hex colors as strings (e.g. #ff0000)
     */
    arrays.Visualization.prototype.getColors = function () {
        return this._colors;
    };

    /**
     * Setters. Note that we're using arrays.clone (from utils.js) to ensure a deep clone of passed in complex types
     */

    /**
     * Set data
     * @param {Object[][]} data
     * @public
     */
    arrays.Visualization.prototype.setData = function (data) {
        if (!data) {
            return;
        }
        this._data = arrays.clone(data);
    };

    /**
     * Set unfiltered data
     * @param {Object[][]} data
     * @public
     */
    arrays.Visualization.prototype.setUnfilteredData = function (data) {
        if (!data) {
            return;
        }
        this._unfilteredData = arrays.clone(data);
    };

    /**
     * Set labels
     * @param {string[]} labels
     * @public
     */
    arrays.Visualization.prototype.setLabels = function (labels) {
        if (!labels) {
            return;
        }
        this._labels = arrays.clone(labels);
    };

    /**
     * Set categories
     * @param {string[]} categories
     * @public
     */
    arrays.Visualization.prototype.setCategories = function (categories) {
        if (!categories) {
            return;
        }
        this._categories = arrays.clone(categories);
    };

    /**
     * Set color overrides
     * @param {string[]} colorOverrides
     * @public
     */
    arrays.Visualization.prototype.setColorOverrides = function (colorOverrides) {
        if (!colorOverrides) {
            return;
        }
        this._colorOverrides = arrays.clone(colorOverrides);
    };

    /**
     * Sets opacities if there are any passed
     * @param {string[]} opacityOverrides
     * @public
     */
    arrays.Visualization.prototype.setOpacities = function (opacityOverrides) {
        if (!opacityOverrides) {
            return;
        }
        this._opacities = arrays.clone(opacityOverrides);
    };

    /**
     * Set options
     * @param {string[]} options
     * @public
     */
    arrays.Visualization.prototype.setOptions = function (options) {
        if (!options) {
            return;
        }

        // merge in (override) options with incoming options, piecewise
        $.extend(true, this._options, options);
    };

    /**
     * Set colors
     * @param {Array} [colorOverrides] - Array of hex colors as strings (e.g. #ff0000)
     * @public
     * @return {Visualization}
     */
    arrays.Visualization.prototype.setColors = function (colorOverrides) {
        if (!colorOverrides) {
            return this;
        }
        this._colors = arrays.clone(colorOverrides);

        return this;
    };

    /**
     * Set margin
     * @param {Object} [options] - visualization options (may have margin)
     * @public
     */
    arrays.Visualization.prototype.setMargin = function (options) {
        if (!options) {
            return;
        }

        if ('margin' in options) {
            for (var side in options.margin) {
                this._margin[side] = options.margin[side];
            }
        }
    };

    /**
     * Initializes the Visualization
     * @param {Object} data - All data required to render this visualization
     * @param {Object} options
     * @public
     * @returns {Visualization}
     */
    arrays.Visualization.prototype.init = function (data, options) {

        if (!data) {
            throw new Error('Cannot initialize Visualization without data!');
        }

        if (!options.isExternalAccess) {
            const configure = options.nunjucksEnv || nunjucks.configure('/fe-templates', { autoescape: true });

            arrays.addFilters(configure);
        }

        this.setOptions(options);

        var processedData = this.preProcessData(data.data);
        this.setData(processedData);
        this.setUnfilteredData(processedData);
        this.setCategories(data.categories);
        this.postProcessData();

        this.setLabels(data.labels);
        this.setColorOverrides(data.colors);
        this.setOpacities(data.opacities);
        this.setColors(this._colorOverrides);
        this.setMargin(options);

        return this;
    };

    /**
     * Renders a Visualization into the DOM element specified by the W3C selector string
     * @param  {string} selector
     * @param {Object} [options]
     * @returns {Visualization}
     */
    arrays.Visualization.prototype.render = function (selector, options) {
        const self = this;

        // Save selector
        this._selector = selector;

        // merge in (override) options with incoming options, piecewise
        $.extend(true, this.renderOptions, options);

        if (this._options.quickHideTooltip) {
            // Add the quick tooltip hide when anything is clicked on the page body
            $('body').on('click', function (e) {
                // We don't want to dismiss the tooltip if we're clicking the tooltip
                const noTriggerClasses = ['gist-standard-tooltip-content-label', 'gist-standard-tooltip-title'];

                if (noTriggerClasses.indexOf(e.target.className) === -1 && !arrays.isMobileDevice()) {
                    self._tooltip.hideQuick();
                    self._xAxisHighlight.hideQuick();
                }
            });
        }

        return this;
    };

    /**
     * Updates a Visualization
     * @public
     */
    arrays.Visualization.prototype.update = function () {
    };

    /**
     * Replaces a Visualization's data
     * @param {Object[][]} data - New data
     * @param {boolean} [all=true] - Replace all data, or only the data points
     * @public
     */
    arrays.Visualization.prototype.replaceData = function (data, all) {

        if (!data) {
            return;
        }

        // default to true
        all = typeof all !== 'undefined' ? all : true;

        if (all) {
            this.init(data);
        } else {
            // if not replacing all data, assume we're only replacing the data points, eg from a brush event
            this.setData(data);
        }

        this.update();
    };

    /**
     * Pre-process a Visualization's data before saving it (hook)
     * @public
     * @param {Object[][]} data - incoming data
     * @returns {Object[][]} processed data
     */
    arrays.Visualization.prototype.preProcessData = function (data) {

        // Optional hook for inheriting classes to do something to the data (e.g. change date strings to actual date
        // objects)

        return data;
    };

    /**
     * Post-process a Visualization's data (hook)
     * @public
     */
    arrays.Visualization.prototype.postProcessData = function () {

        // Optional hook for inheriting classes to do something to the data after it has been saved to this._data

    };

    /**
     * @param {String} fieldName
     * @param {String} value
     * @returns {String}
     */
    arrays.Visualization.prototype.formatField = function (fieldName, value) {
        const fieldData = this._fields[fieldName] || {};
        switch (fieldData.operation) {
            case 'ToDate':
                return moment(value, moment.ISO_8601).utc().format(fieldData.outputFormat);
        }
        return value;
    };

    arrays.Visualization.prototype.getPercentFormatter = (value) => {
        if (!value) {
            return '';
        }

        return _.isNumber(value) ? `${Math.round(value * 10000) / 100}%` : `${value}`;
    };
})(window.arrays, window.jQuery, window.moment);
