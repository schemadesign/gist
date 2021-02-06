((arrays, d3) => {
    arrays.OverlayText = function (canvas, data) {

        /**
         * Parent selection to append the annotations to
         * @private
         * @member {d3.selection}
         */
        this._canvas = canvas;

        /**
         * Annotations data
         * @private
         * @member {Array}
         */
        this._data = data;

        this._render();
    };

    /**
     * Render the annotations
     * @private
     */
    arrays.OverlayText.prototype._render = function () {

        // add a group
        var g = this._canvas.append('g');

        // for each in _data, create a group containing text
        g.selectAll('g')
            .data(this._data)
            .enter()
            .append('g')
            .each(function (d) {
                var text = d3.select(this).append('text')
                    .attr('class', 'gist-overlay-text')
                    .attr('pointer-events', 'none');

                var lines = d.text.split('\n');

                text.selectAll('tspan')
                    .data(lines)
                    .enter()
                    .append('tspan')
                    .attr('text-anchor', 'start')
                    .attr('x', 0)
                    .attr('dx', '0.75em')
                    .attr('dy', '1.5em')
                    .text(function (d2) {
                        return d2;
                    });
            });
    };
})(window.arrays, window.d3);
