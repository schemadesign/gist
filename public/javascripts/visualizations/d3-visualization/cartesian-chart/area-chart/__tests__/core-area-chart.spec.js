import { isFunction, min, max } from 'lodash';
import moment from 'moment';


describe('class CoreAreaChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            AreaChart: class {
                init() {}

                postProcessData() {}

                getXAxis() {
                    return 'line chart axis';
                }

                _createStaticElements() {}

                update() {}
            },
            escape: val => val,
            isMobileDevice: () => true,
        };
        window.d3 = d3 = {};
        window.moment = moment;
        require('../core-area-chart');
    });

    it('should set properties', () => {
        const coreAreaChart = new arrays.CoreAreaChart();
        expect(coreAreaChart._hoverGroup).toBeDefined();
        expect(coreAreaChart._linePointer).toBeDefined();
        expect(coreAreaChart._benchmarks).toBeDefined();
    });

    describe('when #init is called', () => {
        it('should set options', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _options: {},
            });
            coreAreaChart.init();
            expect(coreAreaChart._options.annotations).toEqual(expect.any(Object));
        });
    });

    describe('when #updateExtents is called', () => {
        it('should not replace data when empty', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                replaceData: jest.fn(),
                _unfilteredData: [],
            });
            coreAreaChart.updateExtents(0, 10);
            expect(coreAreaChart.replaceData).not.toHaveBeenCalled();
        });

        it('should replace data when greater than 0', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                replaceData: jest.fn(),
                _unfilteredData: [[{ x: 1 }], [{ x: 10 }, { x: 5 }]],
            });
            coreAreaChart.updateExtents(0, 7);
            expect(coreAreaChart.replaceData).toHaveBeenCalledWith([[{ x: 1 }], [{ x: 5 }]], false);
        });

        it('should not replace data when equal 0', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                replaceData: jest.fn(),
                _unfilteredData: [[{ x: 1 }], [{ x: 10 }, { x: 5 }]],
            });
            coreAreaChart.updateExtents(2, 4);
            expect(coreAreaChart.replaceData).not.toHaveBeenCalled();
        });
    });

    describe('when #_createStaticElements is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _renderCustomComponents: jest.fn(),
                updateNearest: jest.fn(),
                updateHoverComponents: jest.fn(),
                onMouseOut: jest.fn(),
                renderOptions: {},
                _dimensions: { innerHeight: 80 },
                _canvas: {
                    _attr: {},
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
                _xAxisHighlight: {
                    _setOn: {},
                    _setOffset: {},
                    setOn(property, value) {
                        this._setOn[property] = value;
                        return this;
                    },
                    setOffset(property, value) {
                        this._setOffset[property] = value;
                        return this;
                    },
                },
                _container: {
                    node() {
                        return 'example node';
                    },
                },
                _tooltip: {
                    _setOn: {},
                    _setOffset: {},
                    setOn(property, value) {
                        this._setOn[property] = value;
                        return this;
                    },
                    setWidth(_width) {
                        this._width = _width;
                        return this;
                    },
                    setOffset(property, value) {
                        this._setOffset[property] = value;
                        return this;
                    },
                },
            });
        });

        it('should render custom components', () => {
            coreAreaChart._createStaticElements();
            expect(coreAreaChart._renderCustomComponents).toHaveBeenCalled();
        });

        it('should set properties for mouse events', () => {
            coreAreaChart.renderOptions.mouseEvents = true;
            coreAreaChart._createStaticElements();
            expect(coreAreaChart._canvas._attr).toEqual({
                class: expect.any(String), 'pointer-events': expect.any(String), y1: expect.any(Number),
            });
            expect(coreAreaChart._hoverGroup).toEqual(coreAreaChart._canvas);
            expect(coreAreaChart._hoverGroup._attr).toEqual({
                class: expect.any(String), 'pointer-events': expect.any(String), y1: expect.any(Number),
            });
            expect(coreAreaChart._linePointer).toEqual(coreAreaChart._hoverGroup);
            expect(coreAreaChart._xAxisHighlight).toMatchObject({
                _setOn: { 'example node': expect.any(String) }, _setOffset: { top: -110 },
            });
            expect(coreAreaChart._tooltip).toMatchObject({
                _setOn: { 'example node': expect.any(String) }, _width: expect.any(Number), _setOffset: { top: -10 },
            });
        });

        it('should call methods for mouse events', () => {
            coreAreaChart.renderOptions.mouseEvents = true;
            coreAreaChart._createStaticElements();
            expect(coreAreaChart.updateNearest).toHaveBeenCalled();
            expect(coreAreaChart.updateHoverComponents).toHaveBeenCalled();
            expect(coreAreaChart.onMouseOut).toHaveBeenCalled();
        });
    });

    describe('when #_renderCustomComponents is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _margin: { left: 5, top: 10 },
                _benchmarkData: [],
                _options: {
                    annotations: {},
                },
                _svg: {
                    _attr: {},
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
            });
        });

        it('should set attributes on annotations', () => {
            coreAreaChart._renderCustomComponents();
            expect(coreAreaChart._annotations._attr).toEqual({
                class: expect.any(String), 'pointer-events': expect.any(String),
                transform: 'translate(5,10)',
            });
        });

        it('should set benchmarks', () => {
            let benchmarks = {};
            arrays.Benchmarks = class {
                constructor(annotations, dimensions, yScale, benchmarkData) {
                    benchmarks = { annotations, dimensions, yScale, benchmarkData };
                }
            };
            Object.assign(coreAreaChart, {
                _benchmarkData: [1, 2],
                _dimensions: 'xy',
                _yScale: 'scale',
            });
            coreAreaChart._renderCustomComponents();
            expect(benchmarks).toEqual({
                annotations: coreAreaChart._annotations, dimensions: 'xy', yScale: 'scale', benchmarkData: [1, 2],
            });
        });

        it('should set overlay text', () => {
            let overlayText = {};
            arrays.OverlayText = class {
                constructor(annotations, options) {
                    overlayText = { annotations, options };
                }
            };
            coreAreaChart._options.annotations.overlayText = 'example text';
            coreAreaChart._renderCustomComponents();
            expect(overlayText).toEqual({ annotations: coreAreaChart._annotations, options: ['example text'] });
        });
    });

    describe('when #getNearestIndex is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _receiver: {
                    node() {
                        return 'node';
                    },
                },
                _xScale: {
                    invert(_invert) {
                        return {
                            value: `inverted ${_invert}`,
                            getTime() {
                                this.value = `time ${this.value}`;
                                return this;
                            },
                        };
                    },
                },
                _options: {},
                _dataDomain: 'domain',
            });
            Object.assign(d3, {
                mouse(_mouse) {
                    return [`mouse ${_mouse}`];
                },
            });
            arrays.bisect = jest.fn((domain, data) => ({ domain, data: data.value }));
        });

        it('should set attributes on annotations', () => {
            expect(coreAreaChart.getNearestIndex()).toEqual({
                domain: 'domain',
                data: 'inverted mouse node',
            });
        });

        it('should set attributes on annotations when group by is date', () => {
            coreAreaChart._options.groupBy_isDate = true;
            expect(coreAreaChart.getNearestIndex()).toEqual({
                domain: 'domain',
                data: 'time inverted mouse node',
            });
        });
    });

    describe('when #updateNearest is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _dataDomain: [1, 2, 3],
                _options: {},
                _xScale: jest.fn(data => `scaled x ${data}`),
                _yScale: jest.fn(data => `scaled y ${data}`),
                _data: [],
                _benchmarkData: [],
                _colors: ['red', 'blue', 'green'],
                _labels: ['first', 'second', 'third'],
            });
        });

        it('should use last index when none was provided', () => {
            coreAreaChart.updateNearest();
            expect(coreAreaChart._nearestIndex).toBe(2);
        });

        it('should set properties', () => {
            coreAreaChart.updateNearest(1);
            expect(coreAreaChart._nearestIndex).toBe(1);
            expect(coreAreaChart._nearestData).toBe(2);
            expect(coreAreaChart._nearestX).toBe('scaled x 2');
            expect(coreAreaChart._nearestY).toBe('scaled y 2');
        });

        it('should set data when group by is date', () => {
            coreAreaChart._options.groupBy_isDate = true;
            coreAreaChart._dataDomain = ['2012-06-25T18:40:00.000Z', '2014-10-05T12:20:00.000Z', '2018-06-25T18:40:00.000Z'];
            coreAreaChart.updateNearest(1);
            expect(coreAreaChart._nearestData.valueOf()).toBe(1412511600000);
        });

        it('should set tooltip data', () => {
            coreAreaChart._data = [[{ x: 1, y: 4, y0: 1 }], [{ x: 2, y: 5, y0: 4 }, { x: 3, y: 6, y0: 10 }]];
            coreAreaChart.updateNearest(1);
            expect(coreAreaChart._tooltipData).toEqual([{ color: 'blue', x: 2, label: 'second', y: 5, y0: 4 }]);
        });

        it('should add benchmark data', () => {
            coreAreaChart._benchmarkData = [{ y: 1 }, { value: 2, label: 'two' }];
            coreAreaChart.updateNearest(1);
            expect(coreAreaChart._tooltipData).toEqual([{
                x: void 0, y: 2, color: 'white', label: 'two', annotation: true,
            }]);
        });

        it('should combine data', () => {
            coreAreaChart._data = [[{ x: 1, y: 4, y0: 1 }], [{ x: 2, y: 5, y0: 4 }, { x: 3, y: 6, y0: 10 }]];
            coreAreaChart._benchmarkData = [{ y: 1 }, { value: 2, label: 'two' }];
            coreAreaChart.updateNearest(1);
            expect(coreAreaChart._tooltipData).toEqual([
                { color: 'blue', x: 2, label: 'second', y: 5, y0: 4 },
                { x: 2, y: 2, color: 'white', label: 'two', annotation: true },
            ]);
        });
    });

    describe('when #updateLinePointer is called', () => {
        it('should set attributes', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _dimensions: { innerHeight: 15 },
                _linePointer: {
                    _attr: {},
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
                _nearestX: 'nearest x',
            });
            coreAreaChart.updateLinePointer();
            expect(coreAreaChart._linePointer._attr).toEqual({ y2: 15, x1: 'nearest x', x2: 'nearest x' });
        });
    });

    describe('when #updateXAxisHighlight is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _tooltipData: [],
                _nearestX: 10,
                _margin: { left: 2 },
                _options: {},
                _xAxisHighlight: {
                    setPosition(_position) {
                        this._position = _position;
                        return this;
                    },
                    setOffset(_offset) {
                        this._offset = _offset;
                        return this;
                    },
                    setContent(_content) {
                        this._content = _content;
                        return this;
                    },
                    show() {
                        return this;
                    },
                },
            });
        });

        it('should set properties for quarter', () => {
            coreAreaChart._tooltipData.push({ quarter: 'quarter text' });
            coreAreaChart.updateXAxisHighlight();
            expect(coreAreaChart._xAxisHighlight).toMatchObject({
                _position: expect.any(String),
                _offset: { right: 42, left: expect.any(Number) },
                _content: expect.stringContaining('>quarter text<'),
            });
        });

        it('should set properties when group by is date', () => {
            coreAreaChart._tooltipData.push({ x: '1989-05-02T11:04:20.000Z' });
            coreAreaChart._options.groupBy_isDate = true;
            coreAreaChart._options.outputInFormat = 'YYYY-MM-DD';
            coreAreaChart.updateXAxisHighlight();
            expect(coreAreaChart._xAxisHighlight).toMatchObject({
                _position: expect.any(String),
                _offset: { right: 42, left: expect.any(Number) },
                _content: expect.stringContaining('>1989-05-02<'),
            });
        });

        it('should set properties fpr x', () => {
            coreAreaChart._tooltipData.push({ x: '1989-05-02T11:04:20.000Z' });
            coreAreaChart.updateXAxisHighlight();
            expect(coreAreaChart._xAxisHighlight).toMatchObject({
                _position: expect.any(String),
                _offset: { right: 42, left: expect.any(Number) },
                _content: expect.stringContaining('>1989-05-02T11:04:20.000Z<'),
            });
        });

        it('should set content when group by is date', () => {
            coreAreaChart._tooltipData.push({ x: '1989-05-02T11:04:20.000Z' });
            coreAreaChart._options.groupBy_isDate = true;
            coreAreaChart._options.outputInFormat = 'YYYY';
            coreAreaChart.updateXAxisHighlight();
            expect(coreAreaChart._xAxisHighlight._content).toContain('>1989<');
        });
    });

    describe('when #updateTooltip is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _nearestX: 10,
                _dimensions: { innerWidth: 5 },
                _margin: { left: 4, right: 7 },
                _options: {},
                _tooltip: {
                    setPosition(_position) {
                        this._position = _position;
                        return this;
                    },
                    setOffset(_offset) {
                        this._offset = _offset;
                        return this;
                    },
                    setContent(_content) {
                        this._content = _content;
                        return this;
                    },
                    show() {
                        return this;
                    },
                },
                _tooltipData: [],
            });
            Object.assign(d3, {
                format() {
                    return value => `formatted ${value}`;
                },
            });
        });

        it('should set tooltip on left', () => {
            coreAreaChart.updateTooltip();
            expect(coreAreaChart._tooltip).toMatchObject({
                _position: 'left', _offset: { left: 0, right: 349 },
            });
        });

        it('should set tooltip on right', () => {
            coreAreaChart._dimensions.innerWidth = 21;
            coreAreaChart.updateTooltip();
            expect(coreAreaChart._tooltip).toMatchObject({
                _position: 'right', _offset: { left: 352, right: 0 },
            });
        });

        it('should set tooltip with accessibility', () => {
            coreAreaChart._tooltipData = [{
                color: 'red', label: 'first', y: 5,
            }];
            coreAreaChart.updateTooltip();
            expect(coreAreaChart._tooltip._content).toContain('fill="red"');
            expect(coreAreaChart._tooltip._content).toContain('>first<');
            expect(coreAreaChart._tooltip._content).toContain('>formatted 5<');
        });
    });

    describe('when #updateDataPointHighlights is called', () => {
        it('should set default properties', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _tooltipData: 'tooltip data',
                _hoverGroup: {
                    _attr: {},
                    _style: {},
                    selectAll() {
                        return this;
                    },
                    data(_data) {
                        this._data = _data;
                        return this;
                    },
                    exit() {
                        return this;
                    },
                    remove() {
                        return this;
                    },
                    enter() {
                        return this;
                    },
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = isFunction(value) ? value({}) : value;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = isFunction(value) ? value({}) : value;
                        return this;
                    },
                },
                _xScale(scale) {
                    return `scaled x ${scale}`;
                },
                _yScale(scale) {
                    return `scaled y ${scale || 'default'}`;
                },
            });
            coreAreaChart.updateDataPointHighlights();
            expect(coreAreaChart._hoverGroup._data).toBe('tooltip data');
            expect(coreAreaChart._hoverGroup._attr).toEqual({
                class: expect.any(String), r: expect.any(Number), cx: expect.any(Number), cy: 'scaled y default',
            });
            expect(coreAreaChart._hoverGroup._style).toEqual({ fill: void 0 });
        });

        it('should set properties from datum', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            const datum = { x: 'x', y0: 1, y: 2, color: 'color' };
            Object.assign(coreAreaChart, {
                _tooltipData: 'tooltip data',
                _hoverGroup: {
                    _attr: {},
                    _style: {},
                    selectAll() {
                        return this;
                    },
                    data(_data) {
                        this._data = _data;
                        return this;
                    },
                    exit() {
                        return this;
                    },
                    remove() {
                        return this;
                    },
                    enter() {
                        return this;
                    },
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = isFunction(value) ? value(datum) : value;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = isFunction(value) ? value(datum) : value;
                        return this;
                    },
                },
                _xScale(scale) {
                    return `scaled x ${scale}`;
                },
                _yScale(scale) {
                    return `scaled y ${scale}`;
                },
            });
            coreAreaChart.updateDataPointHighlights();
            expect(coreAreaChart._hoverGroup._attr).toEqual({
                class: expect.any(String), r: expect.any(Number), cx: 'scaled x x', cy: 'scaled y 3',
            });
            expect(coreAreaChart._hoverGroup._style).toEqual({ fill: 'color' });
        });
    });

    describe('when #updateHoverComponents is called', () => {
        it('should call methods to update components', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                updateLinePointer: jest.fn(),
                updateXAxisHighlight: jest.fn(),
                updateTooltip: jest.fn(),
                updateDataPointHighlights: jest.fn(),
            });
            coreAreaChart.updateHoverComponents();
            expect(coreAreaChart.updateLinePointer).toHaveBeenCalled();
            expect(coreAreaChart.updateXAxisHighlight).toHaveBeenCalled();
            expect(coreAreaChart.updateTooltip).toHaveBeenCalled();
            expect(coreAreaChart.updateDataPointHighlights).toHaveBeenCalled();
        });
    });

    describe('when #onMouseEnter is called', () => {
        it('should set style on hover group', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _hoverGroup: {
                    _style: {},
                    style(property, value) {
                        this._style[property] = value;
                        return this;
                    },
                },
            });
            coreAreaChart.onMouseEnter();
            expect(coreAreaChart._hoverGroup._style).toEqual({ display: 'block' });
        });
    });

    describe('when #onMouseOut is called', () => {
        it('should set properties to hide tooltips', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _hoverGroup: {
                    _style: {},
                    style(property, value) {
                        this._style[property] = value;
                        return this;
                    },
                },
                _tooltip: {
                    hide: jest.fn(),
                },
                _xAxisHighlight: {
                    hide: jest.fn(),
                },
            });
            coreAreaChart.onMouseOut();
            expect(coreAreaChart._tooltip.hide).toHaveBeenCalled();
            expect(coreAreaChart._xAxisHighlight.hide).toHaveBeenCalled();
            expect(coreAreaChart._hoverGroup._style).toEqual({ display: 'none' });
        });
    });

    describe('when #onMouseMove is called', () => {
        it('should set properties to hide tooltips', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                getNearestIndex: jest.fn().mockReturnValue('nearest index'),
                updateNearest: jest.fn(),
                updateHoverComponents: jest.fn(),
            });
            coreAreaChart.onMouseMove();
            expect(coreAreaChart.updateNearest).toHaveBeenCalledWith('nearest index');
            expect(coreAreaChart.updateHoverComponents).toHaveBeenCalled();
        });
    });

    describe('when #getYDomain is called', () => {
        let coreAreaChart;

        beforeEach(() => {
            coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _options: {
                    annotations: {},
                },
                _data: [],
                _padYDomain(min, max) {
                    return [min + 5, max + 5];
                },
            });
            Object.assign(d3, {
                extent(arr, fn) {
                    return [min(arr.map(fn)), max(arr.map(fn))];
                },
                max,
            });
        });

        it('should get max value from series', () => {
            coreAreaChart._data = [[{ y: -3, y0: -5 }], [], [{ y: -2, y0: -1 }, { y: -5, y0: -6 }]];
            expect(coreAreaChart.getYDomain()).toEqual([expect.any(Number), -3]);
        });

        it('should set benchmark data', () => {
            coreAreaChart._options.annotations.benchmarks = [{ value: 1, benchamrk: true }];
            coreAreaChart.getYDomain();
            expect(coreAreaChart._benchmarkData).toEqual([{ value: 1, benchamrk: true }]);
        });

        it('should use max from benchmark data', () => {
            coreAreaChart._data = [[{ y: 5, y0: 1 }]];
            coreAreaChart._options.annotations.benchmarks = [{ value: 8 }, { value: 1 }, { value: 4 }];
            coreAreaChart.getYDomain();
            expect(coreAreaChart.getYDomain()).toEqual([expect.any(Number), 8]);
        });

        it('should add padding to domain', () => {
            coreAreaChart._data = [[{ y: 5, y0: 1 }, { y: 2, y0: 1 }]];
            coreAreaChart._options.yDomainPadding = true;
            coreAreaChart.getYDomain();
            expect(coreAreaChart.getYDomain()).toEqual([5, 11]);
        });
    });

    describe('when #update is called', () => {
        it('should call methods', () => {
            const coreAreaChart = new arrays.CoreAreaChart();
            Object.assign(coreAreaChart, {
                _svg: {
                    selectAll() {
                        return this;
                    },
                    remove() {
                        return this;
                    },
                },
                _renderCustomComponents: jest.fn(),
            });
            coreAreaChart.update();
            expect(coreAreaChart._renderCustomComponents).toHaveBeenCalled();
        });
    });
});
