((arrays, d3) => {
    /**
     * Create a d3 brush
     * @param {d3.scale} xScale
     * @param {d3.selection} canvas - Selection to append the brush to
     * @param {number} height - Height of the brush
     * @param {d3.dispatch} [dispatch] - d3 dispatch to use for sending events
     * @param {Visualization} [target] - Target of d3 dispatch events
     * @constructor
     */
    arrays.Brush = function (xScale, canvas, height, dispatch, target, extent) {

        /**
         * Scale used for the brush
         * @private
         * @member {d3.scale}
         */
        this._xScale = xScale;

        /**
         * Parent selection to append the brush to
         * @private
         * @member {d3.selection}
         */
        this._canvas = canvas;

        /**
         * Height of the brush
         * @private
         * @member {Number}
         */
        this._height = height;

        /**
         * Nav state
         * @private
         * @member {Array}
         */
        this._extent = extent;

        /**
         * d3.js brush.
         * @private
         * @member {d3.brush}
         */
        this._brush = d3.svg.brush()
            .x(this._xScale)
            .on('brush', function () {
                this._brushEventHandler();
            }.bind(this));

        /**
         * Brush handle radius.
         * @private
         * @member {number}
         */
        this._handleRadius = 7;

        /**
         * Outer brush container.
         * @private
         * @member {d3.selection}
         */
        this._wrapper = this._canvas.append('g');

        /**
         * Inner brush container
         * @private
         * @member {d3.selection}
         */
        this._container = this._wrapper.append('g')
            .attr('class', 'gist-x gist-brush')
            .call(this._brush);

        /**
         * Brush left side panel
         * @private
         * @member {d3.selection}
         */
        this._leftSide = this._wrapper.append('rect')
            .attr('class', 'gist-brush-background')
            .attr('y', 0);

        /**
         * Brush right side panel
         * @private
         * @member {d3.selection}
         */
        this._rightSide = this._wrapper.append('rect')
            .attr('class', 'gist-brush-background')
            .attr('y', 0);

        /**
         * d3 dispatch for sending events when the brush is manipulated
         * @member {d3.dispatch}
         * @private
         */
        this._dispatch = dispatch;

        /**
         * Dispatch event target
         * @member {Object}
         * @private
         */
        this._target = target;

        // Render brush handles.
        this._container.selectAll('.resize')
            .append('rect')
            .attr('class', 'gist-handle')
            .attr('x', -1)
            .attr('y', 0)
            .attr('width', 2);
        this._container.selectAll('.resize')
            .append('circle')
            .attr('class', 'gist-handle')
            .attr('r', this._handleRadius);

        if (this._extent) {
            // dispatch update action
            if (this._dispatch && this._target) {
                this._dispatch.updateBrush.call(this._target, this._extent[0], this._extent[1]);
            }
        }
    };

    /**
     * Get handle radius
     * @public
     * @returns {number}
     */
    arrays.Brush.prototype.getHandleRadius = function () {
        return this._handleRadius;
    };

    /**
     * Brush event handler.
     * @private
     */
    arrays.Brush.prototype._brushEventHandler = function () {

        // Restore viewport if brush empty.
        if (this._brush.empty()) {
            this._resetBrush();
        }

        // Get brush extent and dispatch update action
        this.dispatchUpdate();

        // Update brush side panels sizes.
        this._leftSide
            .attr('x', 1)
            .attr('width', this._xScale(this._extent[0]));

        if (this._xScale.range()[1] > this._xScale(this._extent[1]) + 1) {
            this._rightSide
                .attr('x', this._xScale(this._extent[1]))
                .attr('width', this._xScale.range()[1] - this._xScale(this._extent[1]) - 1);
        } else {
            this._rightSide
                .attr('x', this._xScale.range()[1])
                .attr('width', 0);
        }

    };

    /**
     * Update brush
     * @public
     */
    arrays.Brush.prototype.update = function (xScale, height, extent) {

        this._xScale = xScale;
        this._brush.x(this._xScale);

        this._height = height;

        // Get brush extent before we redraw charts.
        extent = this._extent || this._brush.extent();

        // Resize brush.
        this._container.call(this._brush);
        this._container.selectAll('rect')
            .attr('height', this._height);
        this._container.selectAll('rect.gist-handle')
            .attr('height', this._height);

        // Move handles.
        this._container.selectAll('circle.gist-handle')
            .attr('cy', this._height);

        // Change rectangled handle height.
        this._container.selectAll('.resize rect')
            .attr('height', this._height);

        // Move brush background.
        this._leftSide.attr('height', this._height - 1);
        this._rightSide.attr('height', this._height - 1);

        // Update brush using previously saved extent.
        this._container.call(this._brush.extent(extent));

        // Resize brush gate's leafs.
        if (!this._brush.empty()) {
            extent = this._extent || this._brush.extent();
            var min = extent[0];
            var max = extent[1];
            this._leftSide
                .attr('x', 1)
                .attr('width', this._xScale(min));
            if (this._xScale.range()[1] > this._xScale(max) + 1) {
                this._rightSide
                    .attr('x', this._xScale(max))
                    .attr('width', this._xScale.range()[1] - this._xScale(max) - 1);
            }
        }

        // Update x axis labels.
        if (this._brush.empty()) {
            this._resetBrush();

            if (this._target) {
                extent = this._target._extent = this._brush.extent();
            }
        }

        // dispatch update action
        if (this._dispatch && this._target) {
            this._dispatch.updateBrush.call(this._target, extent[0], extent[1]);
        }
    };

    /**
     * Reset brush.
     * @private
     */
    arrays.Brush.prototype._resetBrush = function () {

        // Reset brush gate leafs.
        this._leftSide.attr('width', 0);
        this._rightSide.attr('width', 0);

        // Set input domain as brush extent.
        this._brush.extent(this._xScale.domain());

        // Resize brush.
        this._container.call(this._brush);
    };

    /**
     * Manually dispatch brush update to update chart target
     * @public
     * @returns {Object} min & max extent variables
     */
    arrays.Brush.prototype.dispatchUpdate = function () {
        // Update extent state with current brush extent
        this._extent = this._brush.extent();

        // Apply the current brush extent to the target
        this._target._extent = this._extent;

        // dispatch update action
        if (this._dispatch && this._target) {
            this._dispatch.updateBrush.call(this._target, this._extent[0], this._extent[1]);
        }
    };
})(window.arrays, window.d3);
