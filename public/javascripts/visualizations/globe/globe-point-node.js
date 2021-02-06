/* global arrays, THREE, TWEEN */

/**
 * External namespace for arrays classes
 * @external arrays
 */

/**
 * Creates a new GlobePointNode
 * @constructor
 */
arrays.GlobePointNode = function (config) {
    this.id = config.id;
    this.lat = config.lat;
    this.lng = config.lng;
    this.color = config.color;
    this.altitude = config.altitude;
    this.size = config.size;
    this.globe = config.globe;
    this.nodeMaterial = config.nodeMaterial;
    this.glowMaterial = config.glowMaterial;
    this.geometry = config.geometry;
    this._lines = [];
    this._viewed = false;
    this._glowAttached = false;
    this.coordinateTitle = config.coordinateTitle;
    this.detailData = config.detailData;

    var vector = arrays.Globe.coordToVector(this.lat, this.lng, this.altitude);

    this.node = new THREE.Mesh(this.geometry, this.nodeMaterial);
    this.node.position.x = vector.x;
    this.node.position.y = vector.y;
    this.node.position.z = vector.z;

    this.globe.scene.add(this.node);

    this.glow = new THREE.Mesh(this.geometry, this.glowMaterial);
    this.glow.position.x = vector.x;
    this.glow.position.y = vector.y;
    this.glow.position.z = vector.z;
};

arrays.GlobePointNode.prototype.select = function() {
    // Highlight the node
    this._selected = true;
    this._update();
};

// ----------
arrays.GlobePointNode.prototype.deselect = function() {
    this._selected = false;
    this._update();
};

// ----------
arrays.GlobePointNode.prototype.viewed = function(value) {
    this._viewed = value;
    this._update();
};

// ----------
arrays.GlobePointNode.prototype._update = function() {
    this.node.material.color.setStyle(this._selected || !this._viewed ? '#f84' : '#10516D');

    this._setGlow(this._selected || !this._viewed);
};

// ----------
arrays.GlobePointNode.prototype._setGlow = function(value) {
    if (this._glowAttached === value) {
        return;
    }

    this._glowAttached = value;

    if (this._glowAttached) {
        this.globe.scene.add(this.glow);
    } else {
        this.globe.scene.remove(this.glow);
    }
};

// ----------
arrays.GlobePointNode.prototype.disabled = function(value) {
    var self = this;

    if (value === undefined) {
        return this._disabled;
    }

    this._disabled = value;

    new TWEEN.Tween({
        nodeOpacity: this.node.material.opacity,
        glowOpacity: this.glow.material.opacity
    })
        .to({
            nodeOpacity: this._disabled ? 0.2 : 1,
            glowOpacity: this._disabled ? 0 : 0.1
        }, arrays.Globe.fastTime)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function() {
            var tween = this;
            self.node.material.opacity = tween.nodeOpacity;
            self.glow.material.opacity = tween.glowOpacity;
        })
        .start();
};
