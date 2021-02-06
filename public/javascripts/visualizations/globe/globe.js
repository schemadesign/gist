/* global THREE */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new Globe
 * @constructor
 * @extends Visualization
 */
arrays.Globe = function () {

    // Call the parent constructor, making sure (using Function#call)
    // that "this" is set correctly during the call
    arrays.Visualization.call(this);

    /**
     * Globe View
     * @type {Object}
     */
    this._globeView = null;
};

// Create a Globe.prototype object that inherits from Visualization.prototype.
arrays.Globe.prototype = Object.create(arrays.Visualization.prototype);

// Set the "constructor" property to refer to Globe
arrays.Globe.prototype.constructor = arrays.Globe;

/**
 * Initialize the Globe
 * @public
 * @extends Visualization
 * @param {Object} options
 * @returns {Globe}
 */
arrays.Globe.prototype.init = function (data, options) {

    // Augment / update default options
    $.extend(true, this._options, {
        blue: '#1fafcd',
        darkBlue: '#105a69',
        yellow: '#ffd953',
        slowTime: 1000,
        slowerTime: 2000,
    });

    // Call the "parent" method
    arrays.Visualization.prototype.init.call(this, data, options);

    arrays.addResizeEventListener(this.resize);

    return this;
};

/**
 * Fully renders a Globe into a DOM element specified by the selector
 * @param {string} selector
 * @param {Object} [options]
 * @public
 * @extends Visualization
 * @returns {Globe}
 */
arrays.Globe.prototype.render = function (selector, options) {

    // Call the "parent" method
    arrays.Visualization.prototype.render.call(this, selector, options);

    // Select the wrapper
    this._wrapper = $(this._selector);
    if (!this._wrapper) {
        throw new Error('Cannot find HTML element by "' + this._selector + '" selector');
    }

    var c = new THREE.Color(this._options.brandColor);
    c.r = 1 - c.r;
    c.g = 1 - c.g;
    c.b = 1 - c.b;
    var pointColor = c.getStyle();
    var lineColor = '#888';

    this._globeView = new arrays.GlobeView({
        $el: this._wrapper,
        points: this._data.points,
        lines: this._data.lines,
        landColor: this._options.brandColor,
        pointColor: pointColor,
        lineColor: lineColor,
        options: this._options,
        onMouseUp: this.onMouseUp,
    });

    this._globeView.start();

    var self = this;

    this._wrapper.on('wheel', function (event) {
        event.preventDefault();

        var delta = event.originalEvent.deltaY;
        if (!delta) {
            delta = -event.originalEvent.wheelDelta;
        }

        if (delta < 0) {
            self._globeView.zoomIn();
        } else if (delta > 0) {
            self._globeView.zoomOut();
        }
    });

    return this;
};

arrays.Globe.prototype.resize = function () {
    this._globeView.resize();
};

arrays.Globe.prototype.onMouseUp = function (event, target, isDragging) {
    if (isDragging) {
        return;
    }

    var pointNode = this._hitTest(event, target);

    if (pointNode) {
        const index = _.findIndex(this._pointNodes, ({ id }) => id === pointNode.id);

        arrays.showDetailViewModal(pointNode.id, index, 'globe', this._options);
    }
};

arrays.Globe.fastTime = 400;

arrays.Globe.coordToVector = function (lat, lng, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    return new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta));
};

arrays.Globe.on = function (eventName, $el, handler, name) {
    // TODO: Support touch
    $el.on(eventName, handler);
};

arrays.Globe.off = function (eventName, $el, handler, name) {
    // TODO: Support touch
    $el.off(eventName, handler);
};
