import { isFunction, min, max, set } from 'lodash';
import moment from 'moment';


describe('class CoreLineChart', () => {
    let arrays, d3;

    beforeAll(() => {
        const CUSTOM_SM_BREAKPOINT = 768;

        window.arrays = arrays = {
            LineChart: class {
                init() {}

                _createStaticElements() {}

                update() {}
            },
            escape: val => val,
            constants: {
                CUSTOM_SM_BREAKPOINT
            },
            isMobileDevice: () => true,
            isMobileBreakpoint: () => window.innerWidth < CUSTOM_SM_BREAKPOINT,
        };
        window.d3 = d3 = {};
        window.moment = moment;
        window.jQuery = jest.fn().mockReturnValue({
            show: () => null,
            hide: () => null,
            addClass: () => null,
            removeClass: () => null,
        });
        require('../core-line-chart');
    });

    it('should set properties', () => {
        const coreLineChart = new arrays.CoreLineChart();
        expect(coreLineChart._hoverGroup).toBeDefined();
        expect(coreLineChart._linePointer).toBeDefined();
        expect(coreLineChart._benchmarks).toBeDefined();
    });

    describe('when #init is called', () => {
        it('should set options', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _options: {},
            });
            coreLineChart.init();
            expect(coreLineChart._options.annotations).toEqual(expect.any(Object));
        });
    });

    describe('when #_createStaticElements is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _renderCustomComponents: jest.fn(),
                _createKeyboardEvents: jest.fn(),
                updateNearest: jest.fn(),
                updateHoverComponents: jest.fn(),
                onMouseOut: jest.fn(),
                renderLegend: jest.fn(),
                renderOptions: {},
                _dimensions: { innerHeight: 80 },
                _canvas: {
                    _attr: {},
                    append() {
                        return this;
                    },
                    attr(property, y) {
                        this._attr[property] = y;
                        return this;
                    },
                },
                _xAxisHighlight: {
                    _setOn: {},
                    _setOffset: {},
                    setOn(property, y) {
                        this._setOn[property] = y;
                        return this;
                    },
                    setOffset(property, y) {
                        this._setOffset[property] = y;
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
                    setOn(property, y) {
                        this._setOn[property] = y;
                        return this;
                    },
                    setWidth(_width) {
                        this._width = _width;
                        return this;
                    },
                    setOffset(property, y) {
                        this._setOffset[property] = y;
                        return this;
                    },
                },
            });
        });

        it('should render custom components', () => {
            coreLineChart._createStaticElements();
            expect(coreLineChart.renderLegend).toHaveBeenCalled();
            expect(coreLineChart._renderCustomComponents).toHaveBeenCalled();
        });

        it('should set properties for mouse events', () => {
            coreLineChart.renderOptions.mouseEvents = true;
            coreLineChart._createStaticElements();
            expect(coreLineChart._canvas._attr).toEqual({
                class: expect.any(String), 'pointer-events': expect.any(String), y1: expect.any(Number),
            });
            expect(coreLineChart._hoverGroup).toEqual(coreLineChart._canvas);
            expect(coreLineChart._hoverGroup._attr).toEqual({
                class: expect.any(String), 'pointer-events': expect.any(String), y1: expect.any(Number),
            });
            expect(coreLineChart._linePointer).toEqual(coreLineChart._hoverGroup);
            expect(coreLineChart._xAxisHighlight).toMatchObject({
                _setOn: { 'example node': expect.any(String) }, _setOffset: { top: -110 },
            });
            expect(coreLineChart._tooltip).toMatchObject({
                _setOn: { 'example node': expect.any(String) }, _width: expect.any(Number), _setOffset: { top: -10 },
            });
        });

        it('should call methods for mouse events', () => {
            coreLineChart.renderOptions.mouseEvents = true;
            coreLineChart._createStaticElements();
            expect(coreLineChart.updateNearest).toHaveBeenCalled();
            expect(coreLineChart.updateHoverComponents).toHaveBeenCalled();
            expect(coreLineChart.onMouseOut).toHaveBeenCalled();
        });
    });

    describe('when #_seriesEnterHook is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _colors: ['yellow', 'red'],
                _options: {},
                _labels: ['first', 'second'],
                _seriesEnter: {
                    _attr: {},
                    _style: {},
                    append() {
                        return this;
                    },
                    attr(property, y) {
                        const datum = [{ y: 5 }, { y: 10 }];
                        this._attr[property] = isFunction(y) ? y(datum, 1) : y;
                        return this;
                    },
                    style(property, y) {
                        this._style[property] = y({}, 1);
                        return this;
                    },
                },
            });
        });

        it('should set properties on series without accessibility', () => {
            coreLineChart._seriesEnterHook();
            expect(coreLineChart._seriesEnter._attr).toEqual({
                tabindex: expect.any(String), class: expect.any(String),
                'aria-label': 'Line second has a minimum value of 5 and a maximum value of 10',
            });
            expect(coreLineChart._seriesEnter._style).toEqual({
                stroke: 'red', 'stroke-dasharray': 0, 'stroke-width': 2,
            });
        });

        it('should set styles on series with accessibility', () => {
            coreLineChart._options.accessibility = true;
            coreLineChart._seriesEnterHook();
            expect(coreLineChart._seriesEnter._style).toEqual({
                stroke: 'red', 'stroke-dasharray': 2.5, 'stroke-width': 5,
            });
        });
    });

    describe('when #_renderCustomComponents is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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
                    attr(property, y) {
                        this._attr[property] = y;
                        return this;
                    },
                },
            });
        });

        it('should set attributes on annotations', () => {
            coreLineChart._renderCustomComponents();
            expect(coreLineChart._annotations._attr).toEqual({
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
            Object.assign(coreLineChart, {
                _benchmarkData: [1, 2],
                _dimensions: 'xy',
                _yScale: 'scale',
            });
            coreLineChart._renderCustomComponents();
            expect(benchmarks).toEqual({
                annotations: coreLineChart._annotations, dimensions: 'xy', yScale: 'scale', benchmarkData: [1, 2],
            });
        });

        it('should set overlay text', () => {
            let overlayText = {};
            arrays.OverlayText = class {
                constructor(annotations, options) {
                    overlayText = { annotations, options };
                }
            };
            coreLineChart._options.annotations.overlayText = 'example text';
            coreLineChart._renderCustomComponents();
            expect(overlayText).toEqual({ annotations: coreLineChart._annotations, options: ['example text'] });
        });
    });

    describe('when #getNearestIndex is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _receiver: {
                    node() {
                        return 'node';
                    },
                },
                _xScale: {
                    invert(_invert) {
                        return {
                            y: `inverted ${_invert}`,
                            getTime() {
                                this.y = `time ${this.y}`;
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
            arrays.bisect = jest.fn((domain, data) => ({ domain, data: data.y }));
        });

        it('should set attributes on annotations', () => {
            expect(coreLineChart.getNearestIndex()).toEqual({
                domain: 'domain',
                data: 'inverted mouse node',
            });
        });

        it('should set attributes on annotations when group by is date', () => {
            coreLineChart._options.groupBy_isDate = true;
            expect(coreLineChart.getNearestIndex()).toEqual({
                domain: 'domain',
                data: 'time inverted mouse node',
            });
        });
    });

    describe('when #updateNearest is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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
            coreLineChart.updateNearest();
            expect(coreLineChart._nearestIndex).toBe(2);
        });

        it('should set properties', () => {
            coreLineChart.updateNearest(1);
            expect(coreLineChart._nearestIndex).toBe(1);
            expect(coreLineChart._nearestData).toBe(2);
            expect(coreLineChart._nearestX).toBe('scaled x 2');
            expect(coreLineChart._nearestY).toBe('scaled y 2');
        });

        it('should set data when group by is date', () => {
            coreLineChart._options.groupBy_isDate = true;
            coreLineChart._dataDomain = ['2012-06-25T18:40:00.000Z', '2014-10-05T12:20:00.000Z', '2018-06-25T18:40:00.000Z'];
            coreLineChart.updateNearest(1);
            expect(coreLineChart._nearestData.valueOf()).toBe(1412511600000);
        });

        it('should set tooltip data', () => {
            coreLineChart._data = [[{ x: 1, y: 4 }], [{ x: 2, y: 5 }, { x: 3, y: 6 }]];
            coreLineChart._options.accessibility = true;
            coreLineChart.updateNearest(1);
            expect(coreLineChart._tooltipData).toEqual([{
                color: 'blue', x: 2, label: 'second', strokeDash: 2.5, y: 5,
            }]);
        });

        it('should add benchmark data', () => {
            coreLineChart._benchmarkData = [{ y: 1 }, { value: 2, label: 'two' }];
            coreLineChart.updateNearest(1);
            expect(coreLineChart._tooltipData).toEqual([{
                x: void 0, y: 2, color: 'white', label: 'two', annotation: true,
            }]);
        });

        it('should combine data', () => {
            coreLineChart._data = [[{ x: 1, y: 4 }], [{ x: 2, y: 5 }, { x: 3, y: 6 }]];
            coreLineChart._benchmarkData = [{ y: 1 }, { value: 2, label: 'two' }];
            coreLineChart.updateNearest(1);
            expect(coreLineChart._tooltipData).toEqual([
                { color: 'blue', x: 2, label: 'second', strokeDash: null, y: 5 },
                { x: 2, y: 2, color: 'white', label: 'two', annotation: true },
            ]);
        });
    });

    describe('when #updateLinePointer is called', () => {
        it('should set attributes', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _dimensions: { innerHeight: 15 },
                _linePointer: {
                    _attr: {},
                    attr(property, y) {
                        this._attr[property] = y;
                        return this;
                    },
                },
                _nearestX: 'nearest x',
            });
            coreLineChart.updateLinePointer();
            expect(coreLineChart._linePointer._attr).toEqual({ y2: 15, x1: 'nearest x', x2: 'nearest x' });
        });
    });

    describe('when #updateXAxisHighlight is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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

        it('should not set properties for empty data', () => {
            coreLineChart.updateXAxisHighlight();
            expect(coreLineChart._xAxisHighlight._content).not.toBeDefined();
        });

        it('should set properties', () => {
            coreLineChart._tooltipData.push({ x: '1989-05-02T11:04:20.000Z' });
            coreLineChart.updateXAxisHighlight();
            expect(coreLineChart._xAxisHighlight).toMatchObject({
                _position: expect.any(String),
                _offset: { right: 42, left: expect.any(Number) },
                _content: expect.stringContaining('>1989-05-02T11:04:20.000Z<'),
            });
        });

        it('should set content when group by is date', () => {
            coreLineChart._tooltipData.push({ x: '1989-05-02T11:04:20.000Z' });
            coreLineChart._options.groupBy_isDate = true;
            coreLineChart._options.outputInFormat = 'YYYY';
            coreLineChart.updateXAxisHighlight();
            expect(coreLineChart._xAxisHighlight._content).toContain('>1989<');
        });
    });

    describe('when #updateTooltip is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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
                    return y => `formatted ${y}`;
                },
            });
        });

        it('should set tooltip on left', () => {
            coreLineChart.updateTooltip();
            expect(coreLineChart._tooltip).toMatchObject({
                _position: 'left', _offset: { left: 0, right: 349 },
            });
        });

        it('should set tooltip on right', () => {
            coreLineChart._dimensions.innerWidth = 21;
            coreLineChart.updateTooltip();
            expect(coreLineChart._tooltip).toMatchObject({
                _position: 'right', _offset: { left: 352, right: 0 },
            });
        });

        it('should set tooltip with accessibility', () => {
            coreLineChart._options.accessibility = true;
            coreLineChart._tooltipData = [{
                color: 'red', strokeDash: 'blue', label: 'first', y: 5,
            }];
            coreLineChart.updateTooltip();
            expect(coreLineChart._tooltip._content).toContain('stroke: red;');
            expect(coreLineChart._tooltip._content).toContain('stroke-dasharray: blue;');
            expect(coreLineChart._tooltip._content).toContain('>first<');
            expect(coreLineChart._tooltip._content).toContain('>formatted 5<');
        });

        it('should set tooltip without accessibility', () => {
            coreLineChart._options.units = '%';
            coreLineChart._options.isAggregateByPercent = true;
            coreLineChart._tooltipData = [{
                color: 'yellow', annotation: true, label: 'second', y: 2,
            }];
            coreLineChart.updateTooltip();
            expect(coreLineChart._tooltip._content).toContain('background-color: yellow;');
            expect(coreLineChart._tooltip._content).toContain('annotation');
            expect(coreLineChart._tooltip._content).toContain('>second<');
            expect(coreLineChart._tooltip._content).toContain('>formatted 2%<');
        });
    });

    describe('when #updateDataPointHighlights is called', () => {
        it('should set default properties', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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
                    attr(property, y) {
                        this._attr[property] = isFunction(y) ? y({}) : y;
                        return this;
                    },
                    style(property, y) {
                        this._style[property] = isFunction(y) ? y({}) : y;
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
            coreLineChart.updateDataPointHighlights();
            expect(coreLineChart._hoverGroup._data).toBe('tooltip data');
            expect(coreLineChart._hoverGroup._attr).toEqual({
                class: expect.any(String), r: expect.any(Number), cx: 'scaled x 0', cy: 'scaled y 0',
            });
            expect(coreLineChart._hoverGroup._style).toEqual({ fill: void 0 });
        });

        it('should set properties from datum', () => {
            const coreLineChart = new arrays.CoreLineChart();
            const datum = { x: 'date', y: 'y', color: 'color' };
            Object.assign(coreLineChart, {
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
                    attr(property, y) {
                        this._attr[property] = isFunction(y) ? y(datum) : y;
                        return this;
                    },
                    style(property, y) {
                        this._style[property] = isFunction(y) ? y(datum) : y;
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
            coreLineChart.updateDataPointHighlights();
            expect(coreLineChart._hoverGroup._attr).toEqual({
                class: expect.any(String), r: expect.any(Number), cx: 'scaled x date', cy: 'scaled y y',
            });
            expect(coreLineChart._hoverGroup._style).toEqual({ fill: 'color' });
        });
    });

    describe('when #updateHoverComponents is called', () => {
        it('should call methods to update components', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                updateLinePointer: jest.fn(),
                updateXAxisHighlight: jest.fn(),
                updateTooltip: jest.fn(),
                updateDataPointHighlights: jest.fn(),
            });
            coreLineChart.updateHoverComponents();
            expect(coreLineChart.updateLinePointer).toHaveBeenCalled();
            expect(coreLineChart.updateXAxisHighlight).toHaveBeenCalled();
            expect(coreLineChart.updateTooltip).toHaveBeenCalled();
            expect(coreLineChart.updateDataPointHighlights).toHaveBeenCalled();
        });
    });

    describe('when #onMouseEnter is called', () => {
        it('should set style on hover group', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.onMouseEnter();
            expect(coreLineChart._hoverGroup._style).toEqual({ display: 'block' });
        });
    });

    describe('when #onMouseOut is called', () => {
        it('should set properties to hide tooltips', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
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
            coreLineChart.onMouseOut();
            expect(coreLineChart._tooltip.hide).toHaveBeenCalled();
            expect(coreLineChart._xAxisHighlight.hide).toHaveBeenCalled();
            expect(coreLineChart._hoverGroup._style).toEqual({ display: 'none' });
        });
    });

    describe('when #onMouseMove is called', () => {
        it('should set properties to hide tooltips', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                getNearestIndex: jest.fn().mockReturnValue('nearest index'),
                updateNearest: jest.fn(),
                updateHoverComponents: jest.fn(),
            });
            coreLineChart.onMouseMove();
            expect(coreLineChart.updateNearest).toHaveBeenCalledWith('nearest index');
            expect(coreLineChart.updateHoverComponents).toHaveBeenCalled();
        });
    });

    describe('when #handleLeftArrowPress is called', () => {
        it('should decrease line index', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _lineIndex: 1,
                onArrowPress: jest.fn(),
                _dataDomain: [1, 2, 3, 4],
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.handleLeftArrowPress();
            expect(coreLineChart._lineIndex).toEqual(0);
        });

        it('should not decrease line index', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _lineIndex: 0,
                onArrowPress: jest.fn(),
                _dataDomain: [1, 2, 3, 4],
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.handleLeftArrowPress();
            expect(coreLineChart._lineIndex).toEqual(0);
        });
    });

    describe('when #handleRightArrowPress is called', () => {
        it('should increase line index', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _lineIndex: 1,
                onArrowPress: jest.fn(),
                _dataDomain: [1, 2, 3, 4],
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.handleRightArrowPress();
            expect(coreLineChart._lineIndex).toEqual(2);
        });

        it('should increase line index', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _lineIndex: 3,
                onArrowPress: jest.fn(),
                _dataDomain: [1, 2, 3, 4],
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.handleRightArrowPress();
            expect(coreLineChart._lineIndex).toEqual(3);
        });
    });

    describe('when #onArrowPress is called', () => {
        it('should update hover components', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _lineIndex: 1,
                updateNearest: jest.fn(),
                updateHoverComponents: jest.fn(),
                _dataDomain: [1, 2, 3, 4],
                _hoverGroup: {
                    _style: {},
                    style(property, y) {
                        this._style[property] = y;
                        return this;
                    },
                },
            });
            coreLineChart.onArrowPress();
            expect(coreLineChart.updateNearest).toHaveBeenCalledWith(1);
            expect(coreLineChart.updateHoverComponents).toHaveBeenCalled();
        });
    });

    describe('when #getYDomain is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
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
            });
        });

        it('should get min y from data', () => {
            coreLineChart._data = [[{ y: 3 }], [{ y: 2 }, { y: 5 }], []];
            expect(coreLineChart.getYDomain()).toEqual([2, expect.any(Number)]);
        });

        it('should get max y from data', () => {
            coreLineChart._data = [[{ y: -3 }], [{ y: -2 }, { y: -5 }], []];
            expect(coreLineChart.getYDomain()).toEqual([expect.any(Number), 0]);
        });

        it('should set benchmark data', () => {
            coreLineChart._options.annotations.benchmarks = [{ value: 25, label: 'Average Value' }];
            coreLineChart.getYDomain();
            expect(coreLineChart._benchmarkData).toEqual([{ value: 25, label: 'Average Value' }]);

        });

        it('should use min and max from benchmark data', () => {
            coreLineChart._data = [[{ y: 5 }]];
            coreLineChart._options.annotations.benchmarks = [{ value: 8, label: 'max' }, {
                value: 1, label: 'min',
            }, { value: 4, label: 'mid' }];
            coreLineChart.getYDomain();
            expect(coreLineChart.getYDomain()).toEqual([1, 8]);
        });

        it('should add padding to domain', () => {
            coreLineChart._data = [[{ y: 5 }, { y: 2 }]];
            coreLineChart._options.yDomainPadding = true;
            coreLineChart.getYDomain();
            expect(coreLineChart.getYDomain()).toEqual([7, 10]);
        });
    });

    describe('when #update is called', () => {
        it('should call methods', () => {
            const coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, {
                _svg: {
                    selectAll() {
                        return this;
                    },
                    remove() {
                        return this;
                    },
                },
                _renderCustomComponents: jest.fn(),
                _xAxisHighlight: {
                    setOffset: jest.fn(),
                },
                _dimensions: {
                    innerHeight: 50,
                },
            });
            coreLineChart.update();
            expect(coreLineChart._renderCustomComponents).toHaveBeenCalled();
            expect(coreLineChart._xAxisHighlight.setOffset).toHaveBeenCalledWith('top', -80);
        });
    });

    describe('when #renderLegend is called', () => {
        let coreLineChart, d3Select;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, { _colors: ['#F00'] });
            Object.assign(coreLineChart, { _labels: ['label 1'] });
            set(coreLineChart, '_options.viewOptions.viewInteractivity', false);
            d3Select = {
                _attr: {},
                _style: {},
                _on: {},
                remove() {
                    return this;
                },
                selectAll() {
                    return this;
                },
                data(data) {
                    this._data = data;
                    return this;
                },
                enter() {
                    return this;
                },
                append() {
                    return this;
                },
                attr(property, y) {
                    this._attr[property] = y;
                    return this;
                },
                style(property, y) {
                    this._style[property] = isFunction(y) ? y('label 1') : y;
                    return this;
                },
                html(y) {
                    this._html = y('www');
                    return this;
                },
            };
            d3.selectAll = () => d3Select;
            d3.select = () => d3Select;
        });

        it('should set parameters', () => {
            coreLineChart.renderLegend();
            expect(d3Select).toMatchObject({
                _attr: expect.any(Object), _data: ['label 1'], _html: 'www',
                _on: {},
                _style: expect.objectContaining({ fill: '#F00' }),
            });
        });
    });

    describe('when #toggleLegend is called', () => {
        let coreLineChart;

        beforeEach(() => {
            coreLineChart = new arrays.CoreLineChart();
            Object.assign(coreLineChart, { _previousIsMobileBreak: false });
        });

        it('should not change _previousIsMobileBreak', () => {
            window.innerWidth = 768;
            coreLineChart.toggleLegend();
            expect(coreLineChart._previousIsMobileBreak).toEqual(false);
        });

        it('should change _previousIsMobileBreak if breakpoint change', () => {
            window.innerWidth = 767;
            coreLineChart.toggleLegend();
            expect(coreLineChart._previousIsMobileBreak).toEqual(true);
        });
    });
});
