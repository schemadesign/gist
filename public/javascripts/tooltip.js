((arrays, $) => {
    Object.assign(arrays, {
        Tooltip,
        StandardTooltip,
    });

    /**
     * Tooltip component.
     */
    function Tooltip() {
        /**
         * Tooltip container.
         * Usually document's body.
         * @private
         * @member {Selection}
         */
        this._container = undefined;
        this._baseContainerClass = 'gist-tooltip';
        /**
         * Remove any existing containers
         */
        $('.' + this._baseContainerClass).remove();
        /**
         * Current content.
         * @private
         * @member {String}
         */
        this._content = '';
        /**
         * X offset.
         * @private
         * @param {Integer}
         */
        this._offset = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 5,
        };
        /**
         * Tooltip prefered position.
         * @private
         * @member {'top'|'right'|'bottom'|'left'}
         */
        this._position = 'left';

        this._element = undefined;

        this._width = undefined;

        this._fadeDuration = 600;
        this._fastFadeDuration = 150;
        this._fadeDelay = 1000;
        this._hideTimeout = undefined;
    }

    Tooltip.prototype.setWidth = function (width) {
        this._width = width;
        return this;
    };

    Tooltip.prototype.getWidth = function (defaultWidth) {
        if (this._width) {
            return this._width;
        } else {
            return defaultWidth;
        }
    };

    /**
     * Set tooltip position.
     * @public
     * @param {'top'|'right'|'bottom'|'left'} position
     * @returns {Tooltip}
     */
    Tooltip.prototype.setPosition = function (position) {

        this._position = position;
        return this;
    };

    /**
     * Slow hide of a tooltip.
     * @public
     * @returns {Tooltip}
     */
    Tooltip.prototype.hide = function () {
        var self = this;

        this._hideTimeout = setTimeout(function () {
            self._hideTooltip(self._fadeDuration);
        }, self._fadeDelay);

        return this;
    };

    /**
     * Quick hide of a tooltip
     * @public
     */
    Tooltip.prototype.hideQuick = function () {
        this._hideTooltip(this._fastFadeDuration);
        clearTimeout(this._hideTimeout);

        return this;
    };

    /**
     * Hide the tooltip with a passed in fadeDuration.
     * @private
     * @param {Number} fadeDuration
     */
    Tooltip.prototype._hideTooltip = _.throttle(function (fadeDuration) {
        const self = this;

        if (self._container && self._container.length > 0) {
            // Fade the container with the passed fade duration
            self._container
                .animate({
                    opacity: 0,
                }, fadeDuration, function () {
                    if (!self._container) {
                        return;
                    }
                    self._container.remove();
                    self._container = undefined;
                });
        }
    }, 100);

    /**
     * Unhide tooltip (cancel hide timeout and transition).
     * @public
     * @returns {Tooltip}
     */
    Tooltip.prototype.unhide = function () {
        // cancel transition
        this._container
            .finish()
            .css('opacity', 1);

        clearTimeout(this._hideTimeout);

        return this;
    };

    /**
     * Set offset.
     * @public
     * @param {Object|Integer} offset
     * @param {Integer} [value]
     * @returns {Tooltip}
     */
    Tooltip.prototype.setOffset = function (offset, value) {
        var i;

        if (offset instanceof Object) {
            for (i in offset) {
                this._offset[i] = offset[i];
            }
        } else {
            this._offset[offset] = value;
        }

        return this;
    };

    /**
     * Set content.
     * @public
     * @param {String} content
     * @returns {Tooltip}
     */
    Tooltip.prototype.setContent = function (content) {
        this._content = window.linkifyHtml ? window.linkifyHtml(content) : content;
        return this;
    };

    /**
     * Append hidden tooltip container to the document body.
     * @param element
     * @returns {Tooltip}
     */
    Tooltip.prototype.setOn = function (element, cls) {
        var self = this;
        /*
         * Stash current element.
         */
        this._element = element;
        if (!cls) {
            cls = '';
        } else {
            cls = ' ' + cls;
        }
        /*
         * Append tooltip container to the document body.
         */
        if (!this._container) {
            this._container = $('<div></div>').appendTo('body')
                .attr('class', this._baseContainerClass + cls)
                .css({
                    opacity: 1,
                    backgroundColor: '#fff',
                })
                .on('mouseenter', function () {
                    self.unhide();
                })
                .on('mousemove', function () {
                    self.unhide();
                })
                .on('mouseout', function () {
                    self.hide();
                });
        }

        return this;
    };

    /**
     * Show tooltip.
     * @param {HTMLElement|SVGElement} element
     * @returns {Tooltip}
     */
    Tooltip.prototype.show = function (element, options) {
        options = options || {};

        let elementDimensions, position;

        clearTimeout(this._hideTimeout);

        if (this._container) {
            this._container.finish();
        }

        /*
         * Use previously stashed element if not prvided.
         */
        element = element || this._element;
        /*
         * Stash current element.
         */
        this.setOn(element);

        if (options.bounds) {
            // We're expecting options.bounds to have top, left, width, height
            elementDimensions = options.bounds;

            const { top, left } = elementDimensions;

            position = {
                left,
                top,
            };
        } else {
            elementDimensions = element.getBoundingClientRect();

            const { x, y, top, left } = elementDimensions;

            position = {
                top: y || top,
                left: x || left,
            };
        }

        if (this._position !== 'manual') {
            position.top += window.pageYOffset;
        }

        this._container.html(this._content);

        const width = this.getWidth();

        if (width) {
            this._container.css('width', width);
        }
        const name = this._position.slice(0, 1).toUpperCase() + this._position.slice(1).toLowerCase();
        const coordinates = this[`_get${name}Position`](position, this.getDimensions(), elementDimensions);

        this._container.css({
            top: options.coordinateY || coordinates.y,
            left: options.coordinateX || coordinates.x,
            visibility: 'visible',
            opacity: 1,
        });

        if (coordinates.arrowX) {
            $('.gist-standard-tooltip__arrow').css('transform', `translateX(${coordinates.arrowX}px)`);
        }

        return this;
    };

    /**
     * Get tooltip dimensions
     * @return {Object} dimensions
     */
    Tooltip.prototype.getDimensions = function () {
        return this._container[0].getBoundingClientRect();
    };

    /**
     * Get tooltip left position coordinates.
     * @private
     * @param {Object} position
     * @param {Number} position.top
     * @param {Number} position.left
     * @param {DOMRect} tooltipDimension
     * @param {DOMRect} elementDimensions
     * @returns {Object}
     */
    Tooltip.prototype._getLeftPosition = function (position, tooltipDimension, elementDimensions) {
        /*
         * Evaluate tooltip x and y positions.
         */
        var x = position.left - tooltipDimension.width + this._offset.right - this._offset.left;
        var y = position.top - this._offset.top;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        /*
         * Fix document height bottom violence.
         */
        if ((y + tooltipDimension.height) > (scrollTop + document.body.clientHeight)) {
            y = (scrollTop + document.body.clientHeight) - tooltipDimension.height;
        }
        /*
         * Fix document height top violence.
         */
        if (y < scrollTop) {
            y = scrollTop;
        }
        /*
         * Fix document width left violence.
         */
        if (x < 0) {
            x = position.left + elementDimensions.width + this._offset.left;
        }

        return {
            x: x,
            y: y,
        };
    };

    /**
     * Get tooltip top position coordinates.
     * @private
     * @param {Object} position
     * @param {Number} position.top
     * @param {Number} position.left
     * @param {DOMRect} tooltipDimension
     * @param {DOMRect} elementDimensions
     * @returns {Object}
     */
    Tooltip.prototype._getTopPosition = function (position, tooltipDimension, elementDimensions) {
        /*
         * Evaluate tooltip x and y positions.
         */
        var x = position.left - tooltipDimension.width / 2 + elementDimensions.width / 2;
        var y = position.top - tooltipDimension.height - this._offset.top;
        var arrowX = 0;

        /*
         * Show tooltip at the bottom if y < 0 (beyond window top border).
         */
        if (y < 0) {
            y = position.top + elementDimensions.height + this._offset.top;
        }
        /*
         * Fix document width left violence.
         */
        if (x < 0) {
            arrowX = x;
            x = 0;
        }
        /*
         * Fix document width right violence.
         */
        if (x + tooltipDimension.width > document.body.clientWidth) {
            arrowX = x + tooltipDimension.width - document.body.clientWidth;
            x -= arrowX;
        }

        return {
            x: x,
            y: y,
            arrowX: arrowX,
        };
    };

    /**
     * Get tooltip right position coordinates.
     * @private
     * @param {Object} position
     * @param {Number} position.top
     * @param {Number} position.left
     * @param {DOMRect} tooltipDimension
     * @param {DOMRect} elementDimensions
     * @returns {Object}
     */
    Tooltip.prototype._getRightPosition = function (position, tooltipDimension, elementDimensions) {
        /*
         * Evaluate tooltip x and y positions.
         */
        var x = position.left + elementDimensions.width + this._offset.right - this._offset.left;
        var y = position.top - this._offset.top;

        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        /*
         * Fix document height bottom violence.
         */
        if ((y + tooltipDimension.height) > (scrollTop + document.body.clientHeight)) {
            y = (scrollTop + document.body.clientHeight) - tooltipDimension.height;
        }
        /*
         * Fix document height top violence.
         */
        if (y < scrollTop) {
            y = scrollTop;
        }
        /*
         * Fix document right left violence.
         */
        if (x + tooltipDimension.width > document.body.clientWidth) {
            x = document.body.clientWidth - tooltipDimension.width;
        }

        return {
            x: x,
            y: y,
        };

    };

    /**
     * Get tooltip bottom position coordinates.
     * @private
     * @param {Object} position
     * @param {Number} position.top
     * @param {Number} position.left
     * @param {DOMRect} tooltipDimension
     * @param {DOMRect} elementDimensions
     * @returns {Object}
     */
    Tooltip.prototype._getBottomPosition = function (position, tooltipDimension, elementDimensions) {

        throw new Error('Tooltip#_getBottomPosition not implemented');
    };

    /**
     * Get tooltip manual position coordinates.
     * @private
     * @param {Object} position
     * @param {Number} position.top
     * @param {Number} position.left
     * @param {DOMRect} tooltipDimension
     * @param {DOMRect} elementDimensions
     * @returns {Object}
     */
    Tooltip.prototype._getManualPosition = function (position, tooltipDimension, elementDimensions) {
        function clamp(val, min, max) {
            return Math.min(Math.max(val, min), max);
        }

        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        var x = (function () {
            var halfWidth = tooltipDimension.width * 0.5;
            return clamp(position.left - halfWidth, 10, document.body.clientWidth - tooltipDimension.width - 10);
        })();

        var y = (function () {
            var halfHeight = tooltipDimension.height * 0.5;
            return clamp(position.top - halfHeight, 10, (scrollTop + document.body.clientHeight) - tooltipDimension.height - 10);
        })();

        return {
            x: x,
            y: y,
        };
    };

    /**
     * Tooltip with header rows, ensuring no duplicates
     */
    function StandardTooltip() {
        Tooltip.call(this);
    }

    StandardTooltip.prototype = Object.create(Tooltip.prototype);

    /**
     * Apply template and set tooltip content
     * @param {Object} args
     * @param {Array} args.title [key, value]
     * @param {Array} args.rows array of [key, value] arrays
     * @param {String} args.img image url
     */
    StandardTooltip.prototype.applyTemplate = function (args) {
        var title = args.title || [];
        var rows = args.rows || [];
        var img = args.img;
        var maxStrLen = 250;

        function truncateEllip(str) {
            str = str.toString();
            return str.substr(0, maxStrLen - 1) + (str.length > maxStrLen ? '&hellip;' : '');
        }

        /**
         * Use to check for duplicates
         */
        var keys = [title[0]];

        /**
         * Open container
         */
        var templated = '<div>';

        /**
         * Add title
         */
        templated += '<div class="gist-standard-tooltip-title' + '">' + title[0];
        if (title.length > 1) {
            templated += (': ' + truncateEllip(title[1]));
        }
        templated += '</div>';

        /**
         * Add image if present
         */
        if (img) {
            templated += '<div class="gist-standard-tooltip-image-container"><img src="' + img + '" class="gist-standard-tooltip-image" alt="" /></div>';
            /**
             * Add rows if not duplicates
             */
        } else {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i],
                    rowKey = row[0];

                if (keys.indexOf(rowKey) === -1) {
                    templated += '<div class="gist-standard-tooltip-content-label">' + rowKey;
                    if (row.length > 1) {
                        templated += (': ' + truncateEllip(row[1]));
                    }
                    templated += '</div>';
                    keys.push(rowKey);
                }
            }
        }

        if (args.arrow) {
            templated += '<div class="gist-standard-tooltip__arrow"></div>';
        }

        /**
         * Close container
         */
        templated += '</div>';

        return this.setContent(templated);
    };
})(window.arrays, window.jQuery);
