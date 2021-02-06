((arrays, $, d3, mapboxgl) => {
    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Creates a new CoreMap (adds in popup)
     * @constructor
     * @extends Map
     */
    arrays.CoreMap = function() {
        // Call the parent constructor, making sure (using Function#call)
        // that "this" is set correctly during the call
        arrays.Map.call(this);

        /**
         * Map popup
         * @private
         * @member {mapboxgl.Popup}
         */
        this._popup = null;
    };

    // Create a CoreMap.prototype object that inherits from Map.prototype.
    arrays.CoreMap.prototype = Object.create(arrays.Map.prototype);

    // Set the "constructor" property to refer to CoreMap
    arrays.CoreMap.prototype.constructor = arrays.CoreMap;

    /**
     * Initialize the CoreMap
     * @public
     * @extends Map
     * @param {Object} data
     * @param {Object} options
     * @returns {CoreMap}
     */
    arrays.CoreMap.prototype.init = function(data, options) {
        // Call the "parent" method
        arrays.Map.prototype.init.call(this, data, options);

        this._fields = data.fields || {};

        return this;
    };

    /**
     * Creates the static elements
     * @private
     * @extends Map
     */
    arrays.CoreMap.prototype._createStaticElements = function() {
        // Call the "parent" method first
        arrays.Map.prototype._createStaticElements.call(this);

        /**
         * Create a popup, but don't add it to the map yet
         */
        this._popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
        });

        $(this._map._canvas)
            .attr('aria-label', 'global map view')
            .attr('role', 'img');
    };

    /**
     * Callback for successful render of the Mapbox map
     * https://www.mapbox.com/mapbox-gl-js/api/#map.event:render
     * Fired whenever the map is drawn to the screen; will be fired multiple times
     * @param  {Object} e Event
     * @public
     */
    arrays.CoreMap.prototype.onRender = function() {
        // Call the "parent" method first
        arrays.Map.prototype.onRender.call(this);

        // For story feature: wait until the map is loaded to trigger the webshot
        this.takeShot();
    };

    /**
     * Callback for successful render of the Mapbox map
     * https://www.mapbox.com/mapbox-gl-js/api/#map.event:render
     * Fired whenever the map is drawn to the screen; will be fired multiple times
     * @param  {Object} e Event
     * @public
     */
    arrays.CoreMap.prototype.onLoad = function() {
        // Call the "parent" method first
        arrays.Map.prototype.onLoad.call(this);

        this.addEvents();
    };

    arrays.CoreMap.prototype.addEvents = function() {
        this._map.on('mousemove', event => this.onMouseMove(event));

        if (this._options.viewOptions.viewInteractivity) {
            const sortedData = _.sortBy(this._data.features, ['properties.objectId']);

            this._map.on('click', event => this.onClick(event, sortedData));
        }
    };

    // since this will get triggered multiple times in quick succession,
    // we need to "debounce" it
    arrays.CoreMap.prototype.takeShot = _.debounce(function() {
        if (typeof window.callPhantom === 'function') {
            window.callPhantom('takeShot');
        }
    }, 250);

    arrays.CoreMap.prototype.adjustToolipPosition = _.debounce(
        function() {
            if (arrays.isMobileBreakpoint()) {
                const offset = $('.gist-controls').outerHeight();

                $(this._popup._container).css('top', offset);
            }
        },
        { leading: true, trailing: false }
    );

    /**
     * Callback for mouse move over the Mapbox map
     * @param  {Object} e Event
     * @public
     */
    arrays.CoreMap.prototype.onMouseMove = function(e) {
        const { MAP_STYLES, CUSTOM_COLUMN_DISABLED } = arrays.constants;

        // query for features under the mouse
        const layers = [this._options.coordMap ? 'unclustered-point' : 'polygons'];
        const features = this._map.queryRenderedFeatures(e.point, { layers });

        // no features? remove the popup
        if (!features.length) {
            if (this.lastPoint) {
                this._popup.remove();
                this._map.getCanvas().style.cursor = '';
                this.lastPoint = null;
            }
            return;
        }

        // Populate the popup and set its coordinates based on the mouse position
        const [feature] = features;

        // Only update position when still over the same country
        if (this.lastPoint === feature.properties.name) {
            this._popup.setLngLat(e.lngLat);
            return;
        }

        // Change cursor style
        this._map.getCanvas().style.cursor = this._options.viewOptions.viewInteractivity ? 'pointer' : 'default';

        let label = feature.properties.name;
        if (this._options.mapBy_isDate) {
            label = this.formatField(this._options.mapBy, label);
        }

        const detailsValue = this._options.isAggregateByPercent
            ? this.getPercentFormatter(feature.properties.total)
            : d3.format(',g')(feature.properties.total);
        const details = `<span class="popup-value">${this._options.aggregateBy}: ${detailsValue}</span>`;
        const title = this._options.mapStyle === MAP_STYLES.BUBBLE ? '' : `${this._options.mapBy}: `;

        const titleValue = this._options.isMapByPercent ? this.getPercentFormatter(label) : arrays.escape(label);
        const firstLine = `<span class="popup-key">${title}${titleValue}</span>`;
        const secondLine =
            this._options.aggregateBy === CUSTOM_COLUMN_DISABLED || this._options.mapStyle === MAP_STYLES.HEATMAP
                ? ''
                : details;

        this._popup
            .setLngLat(e.lngLat)
            .setHTML(`${firstLine}${secondLine}`)
            .addTo(this._map);

        this.adjustToolipPosition();

        this.lastPoint = feature.properties.name;
    };

    /**
     * Callback for a click on the Mapbox map
     * Redirects to the url specified in the feature's properties, if it exists
     * @param  {Object} e Event
     * @public
     */
    arrays.CoreMap.prototype.onClick = function(e, sortedData) {
        const layers = [this._options.coordMap ? 'unclustered-point' : 'polygons'];
        const features = this._map.queryRenderedFeatures(e.point, { layers });

        if (!features.length || this._options.isExternalAccess) {
            return;
        }

        const [feature] = features;

        if (feature.properties.objectId) {
            const index = _.findIndex(
                sortedData,
                ({ properties: { objectId } }) => objectId === feature.properties.objectId
            );
            arrays.showDetailViewModal(feature.properties.objectId, index, 'map', this._options);
        } else {
            // TODO find out why routePath is being appended with '?mapBy'
            // this._options.routePath_withoutFilter = this._options.routePath_withoutFilter.split('?mapBy')[0];

            const filterCol = this._options.mapBy;
            const filterObjForThisFilterColVal = arrays.constructedFilterObj(
                this._options.filterObj,
                filterCol,
                feature.properties.name,
                false
            );

            // const clickThroughURL = arrays.getClickThroughURL(this._options.routePath_withoutFilter,
            // filterObjForThisFilterColVal, this._options.clickThroughView);
            const clickThroughURL = arrays.changeRoutePath(
                this._options.array_source_key,
                this._options.clickThroughView,
                filterObjForThisFilterColVal,
                ['mapBy']
            );
            arrays.redirect(clickThroughURL);
        }
    };

    /**
     * Set dispatch
     * @param {Object} [dispatch]
     * @return {D3Visualization}
     */
    arrays.CoreMap.prototype.setDispatch = function(dispatch) {
        this._dispatch = dispatch;

        return this;
    };

    /**
     * Legend list link click event handler.
     * @param  {SVGElement} element - SVG node
     * @param  {Object} d - d3 data bound to this node
     * @param  {Integer} i - legend number within list
     */
    arrays.CoreMap.prototype.clickLegendItem = function(element, d) {
        const flattenArray = _.flattenDepth(d.coordinates, this.findDepth(d.coordinates));

        if (flattenArray.length === 2) {
            // Zoom to a single pair of coordinates
            this._map.flyTo({
                center: flattenArray,
                zoom: 8,
            });
        } else {
            // Zoom to fit region bounds
            const LatCoordinates = _.map(flattenArray, item => item[0]);
            const LongCoordiantes = _.map(flattenArray, item => item[1]);
            const bounds = [
                [_.min(LatCoordinates), _.min(LongCoordiantes)],
                [_.max(LatCoordinates), _.max(LongCoordiantes)],
            ];
            this._map.fitBounds(bounds);
        }
    };

    /**
     * Finds number of nests in array while will be value.
     * @param {*} coordinateArray most likely an Array, yet in an exit condition
     * @param {Integer} i - number representing nests
     * @private
     */
    arrays.CoreMap.prototype.findDepth = function(coordinateArray, i = 0) {
        if (Array.isArray(coordinateArray[0])) {
            return this.findDepth(coordinateArray[0], i + 1);
        } else {
            return i - 1;
        }
    };
})(window.arrays, window.jQuery, window.d3, window.mapboxgl);
