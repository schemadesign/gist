((arrays, d3, mapboxgl) => {
    /**
     * External namespace for arrays classes
     * @external arrays
     */

    /**
     * Creates a new Map
     * @constructor
     * @extends Visualization
     */
    arrays.Map = function() {
        // Call the parent constructor, making sure (using Function#call)
        // that "this" is set correctly during the call
        arrays.Visualization.call(this);

        /**
         * MapboxGL Map
         * @type {Object}
         */
        this._map = null;
    };

    // Create a Map.prototype object that inherits from Visualization.prototype.
    arrays.Map.prototype = Object.create(arrays.Visualization.prototype);

    // Set the "constructor" property to refer to Map
    arrays.Map.prototype.constructor = arrays.Map;

    /**
     * Initialize the Map
     * @public
     * @extends Visualization
     * @param {Object} options
     * @returns {Map}
     */
    arrays.Map.prototype.init = function(data, options) {
        this.data = data.data;

        // mapbox access token and styles must be passed in
        if (!(options.accessToken && options.mapLayout)) {
            throw new Error(
                'Missing required initialization options. Have you passed in an accessToken and a mapLayout?'
            );
        }

        // Augment / update default options
        this._options = {
            ...this._options,
            ...options,
            useWrapper: false,
            applyCoordRadius: true,
            useLogScale: false,
            metric: 'total',
            defaultRadius: 2,
            minRadius: 1,
            radiusMultiplier: 'auto',
        };

        // Call the "parent" method
        arrays.Visualization.prototype.init.call(this, data, options);

        if (this._options.radiusMultiplier === 'auto') {
            this._options.radiusMultiplier = 2;
        }

        if (this._options.applyCoordRadius) {
            this._options.applyCoordRadius = this.getApplyCoordRadius();
        }

        // set Mapbox Access Token
        mapboxgl.accessToken = this._options.accessToken;

        return this;
    };

    /**
     * Determine whether to create a dynamic circle radius for point data
     * True by default as long as there's variation in the data
     * Override by passing in applyCoordRadius: false to options on init
     * @return {Boolean}
     */
    arrays.Map.prototype.getApplyCoordRadius = function() {
        // create a dynamic radius as long as there's variation in the data
        return this.getDomain()[1] - this.getDomain()[0] !== 0;
    };

    /**
     * Post-process the Map's data (hook)
     * @public
     * @extends {Visualization}
     */
    arrays.Map.prototype.postProcessData = function() {
        const { applyCoordRadius, metric, useLogScale = true, mapStyle, mapScaleType, aggregateBy } = this._options;

        if (!applyCoordRadius) {
            return;
        }

        if (this._data.features.length === 1) {
            this._data.features[0].properties.normalizedMetric = 1;
            return;
        }

        const { BUBBLE } = arrays.constants.MAP_STYLES;
        const { SQRT } = arrays.constants.MAP_SCALE_TYPES;
        const { CUSTOM_COLUMN_DISABLED, CUSTOM_COLUMN_NUMBER_OF_ITEMS } = arrays.constants;

        const normalizedMetric = _.cond([
            [_.constant(useLogScale), metric => this.getLogScale()(metric + 1)],
            [() => mapStyle === BUBBLE && mapScaleType === SQRT, this.getSqrtScale()],
            [_.stubTrue, this.getLinearScale()],
        ]);

        const isDisabledOrDefaultColumn =
            aggregateBy === CUSTOM_COLUMN_DISABLED || aggregateBy === CUSTOM_COLUMN_NUMBER_OF_ITEMS;
        const setFunction = isDisabledOrDefaultColumn && mapStyle === BUBBLE ? () => 0 : normalizedMetric;

        this._data.features.forEach(feature =>
            _.set(feature, 'properties.normalizedMetric', setFunction(feature.properties[metric]))
        );
    };

    /**
     * Get domain as [min, max].
     * @public
     * @returns {Number[]}
     */
    arrays.Map.prototype.getDomain = function() {
        return [0, this._options.maxValue];
    };

    /**
     * Get range as [min, max].
     * @public
     * @returns {Number[]}
     */
    arrays.Map.prototype.getRange = function() {
        return [0, 1];
    };

    /**
     * Get linear scale
     * @public
     * @returns {d3.scale}
     */
    arrays.Map.prototype.getLinearScale = function() {
        return d3.scale
            .linear()
            .range(this.getRange())
            .domain(this.getDomain());
    };

    /**
     * Get log scale
     * @public
     * @returns {d3.scale}
     */
    arrays.Map.prototype.getLogScale = function() {
        const domain = this.getDomain().map(value => value + 1);

        return d3.scale
            .log()
            .range(this.getRange())
            .domain(domain);
    };

    arrays.Map.prototype.getSqrtScale = function() {
        return d3.scale
            .sqrt()
            .range(this.getRange())
            .domain(this.getDomain());
    };

    /**
     * Fully renders a Map into a DOM element specified by the selector
     * @param {string} selector
     * @param {Object} [options]
     * @public
     * @extends Visualization
     * @returns {Map}
     */
    arrays.Map.prototype.render = function(selector, options) {
        // Call the "parent" method
        arrays.Visualization.prototype.render.call(this, selector, options);

        // Select the wrapper
        this._wrapper = document.querySelector(this._selector);
        if (!this._wrapper) {
            throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
        }

        // Create the static elements
        this._createStaticElements();

        return this;
    };

    /**
     * Creates the static elements
     * @private
     */
    arrays.Map.prototype._createStaticElements = function() {
        let center;
        if (this._options.defaultLatitude && this._options.defaultLongitude) {
            center = [this._options.defaultLongitude, this._options.defaultLatitude];
        } else {
            center = [0, 35];
        }

        // create the map
        this._map = new mapboxgl.Map({
            container: this._wrapper,
            style: this._options.mapLayout,
            center: center,
            zoom: this._options.defaultZoom ? this._options.defaultZoom : 1.5, // starting zoom
        });

        // register event handlers
        const self = this;
        this._map.on('load', function() {
            self.onLoad();
        });
        this._map.on('render', function() {
            self.onRender();
        });
    };

    /**
     * Callback for successful load of the Mapbox map
     * https://www.mapbox.com/mapbox-gl-js/api/#map.event:load
     * Fired immediately after all necessary resources have been downloaded
     * and the first visually complete rendering of the map has occurred.
     * @public
     */
    arrays.Map.prototype.onLoad = function() {
        const self = this;

        // add the data source
        this._map.addSource('data', {
            type: 'geojson',
            data: this._data,
        });

        // Find the index of the first symbol layer in the map style
        const layers = this._map.getStyle().layers;
        let firstSymbolId;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol') {
                firstSymbolId = layers[i].id;
                break;
            }
        }

        // TODO: right now we only have maps that are either point/coordinate based or polygon based,
        //  but in the future we may have mixed data

        const loadCountry = () => {
            const isColumnDisabled = this._options.aggregateBy === arrays.constants.CUSTOM_COLUMN_DISABLED;

            this._map.addLayer(
                {
                    id: 'polygons',
                    type: 'fill',
                    source: 'data',
                    paint: {
                        'fill-color': this.getFillColorExpression(),
                        'fill-opacity': isColumnDisabled ? 1 : this.getFillOpacityExpression(),
                        'fill-outline-color': isColumnDisabled ? 'transparent' : '#222',
                    },
                    filter: ['==', '$type', 'Polygon'],
                },
                firstSymbolId
            );
        };

        const loadHeatmap = () => {
            this._map.addLayer(
                {
                    id: 'polygons',
                    type: 'fill',
                    source: 'data',
                    paint: {
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 1,
                        'fill-outline-color': '#222',
                    },
                    filter: ['==', '$type', 'Polygon'],
                },
                firstSymbolId
            );
        };

        const loadPin = () => {
            const pinPathPrefix = this._options.isExternalAccess ? '' : '/images';
            const pinPath = `${this._options.cdnAddress}${pinPathPrefix}/map/map-pin.png`;
            const brandColor = _.get(this._options, 'brandColor.accent', '#006ed8');

            this._map.loadImage(pinPath, (error, image) => {
                if (error) {
                    throw error;
                }

                arrays.changeImageColor(image, self.getFillColorExpression(), image => {
                    self._map.addImage('pin', image, { pixelRatio: 4 });

                    this._map.addSource('pins', {
                        type: 'geojson',
                        data: this._data,
                        cluster: true,
                        clusterMaxZoom: 14,
                        clusterRadius: 50,
                    });

                    this._map.addLayer({
                        id: 'clusters',
                        type: 'circle',
                        source: 'pins',
                        filter: ['has', 'point_count'],
                        paint: {
                            'circle-color': brandColor,
                            'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
                        },
                    });

                    this._map.addLayer({
                        id: 'cluster-count',
                        type: 'symbol',
                        source: 'pins',
                        filter: ['has', 'point_count'],
                        layout: {
                            'text-field': '{point_count_abbreviated}',
                            'text-size': 12,
                        },
                        paint: {
                            'text-color': this._options.brandWhiteText ? '#ffffff' : '#000000',
                        },
                    });

                    this._map.addLayer({
                        id: 'unclustered-point',
                        type: 'symbol',
                        source: 'pins',
                        filter: ['!', ['has', 'point_count']],
                        layout: {
                            'icon-image': 'pin',
                            'icon-size': 1,
                        },
                    });
                });
            });
        };

        const loadBubble = () => {
            // add the points layer (filter out points from the data source)
            this._map.addLayer(
                {
                    id: 'unclustered-point',
                    type: 'circle',
                    source: 'data',
                    paint: {
                        'circle-radius': this.getCircleRadiusExpression(),
                        'circle-color': this.getCircleColorExpression(),
                        'circle-opacity': this.getCircleOpacityExpression(),
                    },
                    filter: ['==', '$type', 'Point'],
                    // Insert the layer beneath the first symbol layer.
                },
                firstSymbolId
            );
        };

        const equals = a => b => _.isEqual(a, b);
        const { MAP_STYLES } = arrays.constants;
        const loadMap = _.cond([
            [equals(MAP_STYLES.HEATMAP), loadHeatmap],
            [equals(MAP_STYLES.COUNTRY), loadCountry],
            [equals(MAP_STYLES.PIN), loadPin],
            [equals(MAP_STYLES.BUBBLE), loadBubble],
        ]);

        loadMap(this._options.mapStyle);
    };

    /**
     * Callback for successful render of the Mapbox map
     * https://www.mapbox.com/mapbox-gl-js/api/#map.event:render
     * Fired whenever the map is drawn to the screen; will be fired multiple times
     * @param  {Object} e Event
     * @public
     */
    arrays.Map.prototype.onRender = function() {};

    /**
     * Get the Mapbox property expression for the circle radius
     * See https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
     * @return {Array} property expression
     * @public
     */
    arrays.Map.prototype.getCircleRadiusExpression = function() {
        if (this._options.applyCoordRadius) {
            const { minRadius, mapStyle, mapScaleType, radiusMultiplier } = this._options;
            const { BUBBLE } = arrays.constants.MAP_STYLES;
            const { SQRT } = arrays.constants.MAP_SCALE_TYPES;

            const baseExpression = ['get', 'normalizedMetric'];
            const sqrtRadiusExpression = ['sqrt', ['/', baseExpression, Math.PI]];
            const expression = mapStyle === BUBBLE && mapScaleType === SQRT ? sqrtRadiusExpression : baseExpression;

            const calculateRadius = scale => ['*', expression, radiusMultiplier * scale];

            return [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                ['max', minRadius, calculateRadius(10)],
                4,
                ['max', minRadius * 3, calculateRadius(30)],
                8,
                ['max', minRadius * 6, calculateRadius(60)],
                12,
                ['max', minRadius * 9, calculateRadius(90)],
                16,
                ['max', minRadius * 12, calculateRadius(120)],
                20,
                ['max', minRadius * 15, calculateRadius(150)],
            ];
        } else {
            const { defaultRadius, radiusMultiplier } = this._options;
            const calculateRadius = (scale = 1) => defaultRadius * radiusMultiplier * scale;

            return [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                calculateRadius(),
                4,
                calculateRadius(3),
                8,
                calculateRadius(6),
                12,
                calculateRadius(9),
                16,
                calculateRadius(12),
                20,
                calculateRadius(15),
            ];
        }
    };

    /**
     * Get the Mapbox property expression for the circle color
     * See https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
     * @return {String} property expression
     * @public
     */
    arrays.Map.prototype.getCircleColorExpression = function() {
        return this._options.brandColor.accent;
    };

    /**
     * Get the Mapbox property expression for the circle opacity
     * See https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
     * @return {Number} property expression
     * @public
     */
    arrays.Map.prototype.getCircleOpacityExpression = function() {
        return this._options.applyCoordRadius ? 0.5 : 0.8;
    };

    /**
     * Get the Mapbox property expression for the polygon fill color
     * See https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
     * @return {String} property expression
     * @public
     */
    arrays.Map.prototype.getFillColorExpression = function() {
        return this._options.brandColor.accent;
    };

    /**
     * Get the Mapbox property expression for the polygon fill opacity
     * See https://www.mapbox.com/mapbox-gl-js/style-spec#expressions
     * @return {Array} property expression
     * @public
     */
    arrays.Map.prototype.getFillOpacityExpression = function() {
        return ['get', 'normalizedMetric'];
    };
})(window.arrays, window.d3, window.mapboxgl);
