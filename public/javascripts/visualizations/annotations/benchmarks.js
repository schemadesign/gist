((arrays, d3) => {
    arrays.Benchmarks = function (canvas, dimensions, yScale, data) {

        /**
         * Parent selection to append the benchmarks to
         * @private
         * @member {d3.selection}
         */
        this._canvas = canvas;

        /**
         * Chart dimensions
         * @private
         * @member {Object}
         */
        this._chartDimensions = dimensions;

        /**
         * Chart yScale
         * @private
         * @member {Object}
         */
        this._yScale = yScale;

        /**
         * Benchmark data
         * @private
         * @member {Array}
         */
        this._data = data;

        this._render();
    };

    /**
     * Render the benchmarks
     * @private
     */
    arrays.Benchmarks.prototype._render = function () {

        var self = this;

        // add a group for all benchmarks
        var g = this._canvas.append('g');

        // for each in _data, create a group containing a text label and line
        g.selectAll('g')
            .data(this._data)
            .enter()
            .append('g')
            .attr('class', 'gist-benchmark')
            .each(function (d) {

                var selection = d3.select(this);
                var y = self._yScale(d.value);
                var color = d.color || '#9B9B9B';

                // translate group
                selection.attr('transform', 'translate(0,' + y + ')');

                // add label
                selection.append('text')
                    .attr('fill', color)
                    .attr('dy', y < 20 ? '1.25em' : '-0.5em')
                    .text(d.label);

                // add line
                selection.append('line')
                    .attr('stroke', color)
                    .attr('x1', 0)
                    .attr('x2', self._chartDimensions.innerWidth);
            });
    };
})(window.arrays, window.d3);
