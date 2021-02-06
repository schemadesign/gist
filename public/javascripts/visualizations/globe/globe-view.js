/* global arrays, DAT, THREE, TWEEN */
'use strict';

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new GlobeView
 * @constructor
 */
arrays.GlobeView = function (config) {

    var self = this;

    this._onDrag = config.onDrag;
    this._onMouseUp = config.onMouseUp;

    this._pointNodes = [];
    this._lines = [];
    this._bottomAltitude = 200.5;
    this._topAltitude = 218;
    this._storyNodeScale = 2.15;
    this._storyGlowScale = 4.3;
    this._tooltip = new arrays.Tooltip();
    this.isRotating = false;
    this.options = config.options;

    this.shaders = {
        earthFront: {
            uniforms: {
                uLandColor: { type: 'c', value: new THREE.Color(config.landColor) },
                texture: {
                    type: 't',
                    value: null,
                },
            },
            vertexShader: $.trim($('#earth-front-vertex-shader').text()),
            fragmentShader: $.trim($('#earth-front-fragment-shader').text()),
        },
        earthBack: {
            uniforms: {
                uLandColor: { type: 'c', value: new THREE.Color(config.landColor) },
                texture: {
                    type: 't',
                    value: null,
                },
            },
            vertexShader: $.trim($('#earth-back-vertex-shader').text()),
            fragmentShader: $.trim($('#earth-back-fragment-shader').text()),
        },
        atmosphere: {
            uniforms: {
                amplitude: { type: 'f', value: 1.0 },
            },
            attributes: {
                displacement: {
                    type: 'f',
                    value: [],
                },
            },
            vertexShader: $.trim($('#atmosphere-vertex-shader').text()),
            fragmentShader: $.trim($('#atmosphere-fragment-shader').text()),
        },
    };

    var size = 3;
    var altitude = this._bottomAltitude;

    // shared materials and geometry for points (greatly reduces memory usage and draw time)
    // node
    var nodeMaterial = new THREE.MeshBasicMaterial({
        color: config.pointColor,
        transparent: true,
        opacity: 0.5,
    });
    // Selected node
    var selectedNodeMaterial = new THREE.MeshBasicMaterial({
        color: config.pointColor,
        transparent: true,
        opacity: 1,
    });
    // glow
    var glowMaterial = new THREE.MeshBasicMaterial({
        color: config.pointColor,
        transparent: true,
        opacity: 0.1,
    });
    var geometry = new THREE.SphereGeometry(size, 8, 6);

    this.$el = config.$el;
    this.container = this.$el[0];
    this.globe = new DAT.Globe(this.container, {
        imgDir: '/images/globe/',
        shaders: this.shaders,
        onBeforeRender: function (time) {
            TWEEN.update(time);
        },
        onMouseDown: function (event) {
            // Only drag with left mouse click
            if (event.which !== 1) {
                return;
            }

            self._tooltip.hide();

            self._drag = {
                lastX: event.clientX,
                lastY: event.clientY,
                distance: 0,
                startTime: Date.now(),
            };

            return self._onMouseDown ? self._onMouseDown(event) : false;
        },
        onDrag: function (event) {
            if (self._drag) {
                var diffX = Math.abs(event.clientX - self._drag.lastX);
                var diffY = Math.abs(event.clientY - self._drag.lastY);
                self._drag.distance += diffX + diffY;
                self._drag.lastX = event.clientX;
                self._drag.lastY = event.clientY;
            }

            if (self._onDrag) {
                self._onDrag(event);
            }
        },
        onMouseUp: function (event, target, isDragging) {
            // If dragged more than a little bit, don't continue with click event
            if (self._drag && self._drag.distance > 5) {
                self._drag = null;
                return;
            }

            self._drag = null;

            if (self._onMouseUp) {
                self._onMouseUp(event, target, isDragging);
            }
        },
        onHover: _.throttle(function (event) {
            if (self.isRotating) {
                return;
            }

            var pointNode = self._hitTest(event);

            if (pointNode !== self._hoverPointNode) {
                if (pointNode) {
                    self.container.style.cursor = 'pointer';
                    var detailHtml = '';

                    // Set hovered point to a different material for opacity change
                    pointNode.node.material = selectedNodeMaterial;

                    const detailData = pointNode.detailData;

                    _.forEach(detailData, (value, field) => {
                        detailHtml += `<div class="gist-standard-tooltip-content-label">${arrays.escape(field)}: ${arrays.escape(value)}</div>`;
                    });

                    var pos = self._toScreenXY(pointNode.node.position, self.globe.camera, self.$el);
                    self._tooltip.setContent(
                        `<div><div class="gist-standard-tooltip-title">${arrays.escape(pointNode.coordinateTitle)}</div>${detailHtml}</div>`,
                    )
                        .setPosition('top')
                        .show(self.$el[0], {
                            bounds: {
                                left: pos.x,
                                top: pos.y - 10,
                                width: 1,
                                height: 1,
                            },
                        });
                } else {
                    self.container.style.cursor = 'default';
                    self._tooltip.hide();
                }

                // Reset point opacity
                if (self._hoverPointNode) {
                    self._hoverPointNode.node.material = nodeMaterial;
                }

                self._hoverPointNode = pointNode;
            }
        }, 100), // gain some performance by not raytracing for the hover at 60fps
        onRotatingStart: function () {
            self.isRotating = true;
        },
        onRotatingStop: function () {
            self.isRotating = false;
        },
    });

    _.each(config.points, function (point) {
        self._pointNodes.push(new arrays.GlobePointNode({
            id: point.id,
            globeView: self,
            globe: self.globe,
            nodeMaterial: nodeMaterial,
            glowMaterial: glowMaterial,
            geometry: geometry,
            lat: point.lat,
            lng: point.lng,
            size: size,
            altitude: altitude,
            color: config.pointColor,
            opacity: 1,
            coordinateTitle: point.coordinateTitle,
            detailData: point.detailData,
        }));
    });

    self._pointNodes = _.sortBy(self._pointNodes, ['id']);

    var lineConfig = {
        globe: this.globe,
        arcAltitude: 30,
        opacity: 0.5,
        width: 1,
        start: {
            altitude: this._bottomAltitude,
            color: config.lineColor,
        },
        end: {
            altitude: this._bottomAltitude,
            color: config.lineColor,
        },
    };

    _.each(config.lines, function (v) {
        lineConfig.start.point = v.start;
        lineConfig.end.point = v.end;
        self._addLine(lineConfig);
    });

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    // Add the quick tooltip hide when anything is cliked on the page body
    $('body').on('click', function (e) {
        // We don't want to dismiss the tooltip if we're clicking the tooltip
        var noTriggerClasses = ['gist-standard-tooltip-content-label', 'gist-standard-tooltip-title'];
        if (noTriggerClasses.indexOf(e.target.className) === -1) {
            self._tooltip.hideQuick();
        }
    });

    this.globe.rawRender();
};

// ----------
arrays.GlobeView.prototype.start = function () {
    this.globe.animate();
};

// ----------
arrays.GlobeView.prototype.zoomIn = function () {
    var distance = this.globe.distance() * 0.95;
    this.globe.distance(Math.max(distance, 400));
};

// ----------
arrays.GlobeView.prototype.zoomOut = function () {
    var distance = this.globe.distance() * 1.05;
    this.globe.distance(Math.min(distance, 5000));
};

// ----------
arrays.GlobeView.prototype._hitTest = function (event, target = {}) {
    var self = this;
    var offset = this.$el.offset();
    var x = -target.x || event.clientX;
    var y = target.y || event.clientY;
    var width = this.$el.width();
    var height = this.$el.height();
    this._mouse.x = ((x - offset.left) / width) * 2 - 1;
    this._mouse.y = -((y - offset.top) / height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.globe.camera);

    var earthDistance = Infinity;
    var intersects = this._raycaster.intersectObject(this.globe.earth);
    if (intersects.length) {
        earthDistance = intersects[0].distance;
    }

    this._mouse.x = x;
    this._mouse.y = y;
    var best;

    _.each(this._pointNodes, function (v) {
        if (v.disabled()) {
            return;
        }

        var pos = self._toScreenXY(v.node.position, self.globe.camera, self.$el);
        var screenDistance = self._mouse.distanceTo(pos);
        var worldDistance = v.node.position.distanceTo(self.globe.camera.position);

        if (screenDistance < 30 && worldDistance < earthDistance && (!best || best.screenDistance > screenDistance)) {
            best = {
                screenDistance: screenDistance,
                pointNode: v,
                worldDistance: worldDistance,
            };
        }
    });

    if (best) {
        return best.pointNode;
    }

    return null;
};

// ----------
arrays.GlobeView.prototype._toScreenXY = function (position, camera, jqdiv) {
    var pos = position.clone();
    var projScreenMat = new THREE.Matrix4();
    projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    pos.applyProjection(projScreenMat);

    return new THREE.Vector2((pos.x + 1) * jqdiv.width() / 2 + jqdiv.offset().left,
        (-pos.y + 1) * jqdiv.height() / 2 + jqdiv.offset().top);
};

// ----------
arrays.GlobeView.prototype._addLine = function (config) {
    this._lines.push(new arrays.GlobeLine(config));
};

arrays.GlobeView.prototype.resize = function () {
    this.globe.resize();
};
