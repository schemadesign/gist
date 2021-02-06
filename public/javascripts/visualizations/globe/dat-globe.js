/* global arrays, THREE */
'use strict';

/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
const DAT = window.DAT || {};

DAT.Globe = function (container, opts) {
    const self = this;

    opts = opts || {};

    const imgDir = opts.imgDir || '/globe/';

    const Shaders = opts.shaders;

    this.onBeforeRender = opts.onBeforeRender;

    let camera, scene, renderer, w, h, mesh;

    const mouse = { x: 0, y: 0 },
        mouseOnDown = { x: 0, y: 0 };

    const target = { x: Math.PI * 1.9 / 2, y: Math.PI / 6.0 },
        targetOnDown = { x: 0, y: 0 };

    const rotation = _.clone(target);
    let distance = window.innerWidth < arrays.constants.CUSTOM_SM_BREAKPOINT ? 1900 : 1000;
    let distanceTarget = distance;
    let distanceTargetFactor = 0.05;
    const secondaryDistanceTargetFactor = 0.5;
    let rotationTargetFactor = 0.02;
    const secondaryRotationTargetFactor = 0.1;
    const minRotationDelta = 0.0001;
    const PI_HALF = Math.PI / 2;
    let earth;
    let disableRotate;
    let initialAnimation = true;
    let isDragging = false;
    let isRotating = false;

    function init() {

        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        let shader, uniforms, material;

        scene = new THREE.Scene();

        const geometry = new THREE.SphereGeometry(200, 60, 60);
        const texture = THREE.ImageUtils.loadTexture(imgDir + 'world-mask.jpg', {}, function () {
            if (typeof window.callPhantom === 'function') {
                window.callPhantom('takeShot');
            }
        });

        // back
        shader = Shaders.earthBack;
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms.texture.value = texture;
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            side: THREE.BackSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        // Front
        shader = Shaders.earthFront;
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms.texture.value = texture;
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: true,
            side: THREE.FrontSide,
        });

        earth = mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(new THREE.Color(0xfafafa), 1);
        renderer.setSize(w, h);

        resize();

        renderer.domElement.style.position = 'absolute';

        container.appendChild(renderer.domElement);

        $(renderer.domElement)
            .attr('aria-label', 'globe view')
            .attr('role', 'img');

        arrays.Globe.on('touchstart', $(container), onMouseDown, 'Globe');
        arrays.Globe.on('mousedown', $(container), onMouseDown, 'Globe');
        arrays.Globe.on('mousemove', $(container), onMouseHover, 'Globe');

    }

    function resize() {
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    function onMouseDown(event) {
        event.preventDefault();

        arrays.Globe.on('mouseup', $(container), onMouseUp, 'Globe');
        arrays.Globe.on('touchend', $(container), onMouseUp, 'Globe');
        arrays.Globe.on('mousemove', $(container), onMouseMove, 'Globe');
        arrays.Globe.on('touchmove', $(container), onMouseMove, 'Globe');
        arrays.Globe.off('mousemove', $(container), onMouseHover);
        container.addEventListener('mouseout', onMouseOut, false);
        container.addEventListener('touchend', onMouseOut, false);
        opts.onRotatingStart();

        mouseOnDown.x = -event.clientX || -event.touches[0].clientX;
        mouseOnDown.y = event.clientY || event.touches[0].clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';

        disableRotate = opts.onMouseDown(event);
    }

    function onMouseMove(event) {
        isDragging = true;
        isRotating = true;
        if (!disableRotate) {
            if (initialAnimation) {
                targetOnDown.x = rotation.x;
                targetOnDown.y = rotation.y;
                rotationTargetFactor = secondaryRotationTargetFactor;
                initialAnimation = false;
            }

            mouse.x = -event.clientX || -event.touches[0].clientX;
            mouse.y = event.clientY || event.touches[0].clientY;

            const zoomDamp = distance / 1000;

            target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
            target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

            target.y = target.y > PI_HALF ? PI_HALF : target.y;
            target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
        }

        opts.onDrag(event);
    }

    function onMouseHover(event) {
        opts.onHover(event);
    }

    function onMouseUp(event) {
        arrays.Globe.off('mouseup', $(container), onMouseUp);
        arrays.Globe.off('touchend', $(container), onMouseUp);
        container.removeEventListener('mouseout', onMouseOut, false);
        container.removeEventListener('touchend', onMouseOut, false);
        arrays.Globe.off('mousemove', $(container), onMouseMove);
        arrays.Globe.off('touchmove', $(container), onMouseMove);
        arrays.Globe.on('mousemove', $(container), onMouseHover, 'Globe');

        container.style.cursor = 'auto';
        opts.onMouseUp(event, mouseOnDown, isDragging);
        isDragging = false;
    }

    function onMouseOut(event) {
        onMouseUp(event);
    }

    function animate(time) {
        requestAnimationFrame(animate);
        render(time || 0);
    }

    function render(time) {
        if (isRotating) {
            const rotationDeltaX = (target.x - rotation.x) * rotationTargetFactor;
            const rotationDeltaY = (target.y - rotation.y) * rotationTargetFactor;
            if (isDragging || Math.abs(rotationDeltaX) > minRotationDelta || Math.abs(rotationDeltaY) > minRotationDelta) {
                rotation.x += rotationDeltaX;
                rotation.y += rotationDeltaY;
            } else {
                isRotating = false;
                rotation.x = target.x;
                rotation.y = target.y;
                opts.onRotatingStop();
            }
        }

        distance += (distanceTarget - distance) * distanceTargetFactor;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(mesh.position);

        self.onBeforeRender(time);

        rawRender();
    }

    function rawRender() {
        renderer.render(scene, camera);
    }

    init();

    this.animate = animate;
    this.renderer = renderer;
    this.rawRender = rawRender;
    this.scene = scene;
    this.camera = camera;
    this.earth = earth;
    this.rotation = rotation;
    this.resize = resize;

    this.distance = function (value) {
        if (value === undefined) {
            return distanceTarget;
        }

        distanceTarget = value;
        distanceTargetFactor = secondaryDistanceTargetFactor;
    };

    this.rotationTarget = function (x, y) {
        if (x === undefined && y === undefined) {
            return target;
        }

        initialAnimation = false;
        rotationTargetFactor = secondaryRotationTargetFactor;
        target.x = x;
        target.y = y;
    };

    return this;

};
