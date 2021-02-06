import { set, isFunction, max, min } from 'lodash';


describe('class VerticalBarChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            BarChart: class {
                init() {}

                _renderCustomComponents() {}
            },
        };
        window.d3 = d3 = {};
        require('../vertical');
    });

    it('should set empty benchmarks', () => {
        const verticalBarChart = new arrays.VerticalBarChart();
        expect(verticalBarChart._benchmarks).toBeDefined();
    });

    describe('when #init is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _options: {
                    isAggregateByPercent: false,
                    isGroupByPercent: false,
                },
            });
        });

        it('should set options', () => {
            verticalBarChart.init();
            expect(verticalBarChart._options.yDomainPadding).toEqual(expect.any(Number));
        });
    });

    describe('when #_renderCustomComponents is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _svg: {
                    _attr: {},
                    append() {
                        return this;
                    },
                    attr(parameter, value) {
                        this._attr[parameter] = value;
                        return this;
                    },
                },
                _benchmarkData: [],
                _margin: {},
            });
        });

        it('should set parameters on annotations', () => {
            verticalBarChart._margin = { left: 5, top: 2 };
            verticalBarChart._renderCustomComponents();
            expect(verticalBarChart._annotations).toMatchObject({
                _attr: {
                    class: expect.any(String),
                    'pointer-events': expect.any(String),
                    transform: 'translate(5,2)',
                },
            });
        });

        it('should call benchmarks', () => {
            let benchmarks = {};
            arrays.Benchmarks = class {
                constructor(annotations, dimensions, yScale, benchmarkData) {
                    benchmarks = { annotations, dimensions, yScale, benchmarkData };
                }
            };
            Object.assign(verticalBarChart, {
                _dimensions: 'x',
                _benchmarkData: [1, 2],
                _yScale: 2,
                _options: { normalize: false },
            });
            verticalBarChart._renderCustomComponents();
            expect(benchmarks).toEqual({
                annotations: expect.any(Object), dimensions: 'x', yScale: 2, benchmarkData: [1, 2],
            });
            expect(verticalBarChart._benchmarks).toEqual(expect.any(Object));
        });
    });

    describe('when #getXScale is called', () => {
        it('should return scale band for new d3', () => {
            Object.assign(d3, {
                version: '4',
                scaleBand(xRange, padding) {
                    this._scaleBand = [xRange, padding];
                    return this;
                },
                domain(domain) {
                    this._domain = domain;
                    return this;
                },
            });
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                getXRange: () => 10,
                getXDomain: () => [2, 3],
                _options: { padding: 5 },
            });
            expect(verticalBarChart.getXScale()).toMatchObject({
                _scaleBand: [10, 5], _domain: [2, 3],
            });
        });

        it('should return scale ordinal for old d3', () => {
            Object.assign(d3, {
                version: '3',
                scale: {
                    ordinal() {
                        return this;
                    },
                    rangeBands(xRange, padding) {
                        this._rangeBands = [xRange, padding];
                        return this;
                    },
                    domain(domain) {
                        this._domain = domain;
                        return this;
                    },
                },
            });
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                getXRange: () => 10,
                getXDomain: () => [2, 3],
                _options: { padding: 5 },
            });
            expect(verticalBarChart.getXScale()).toMatchObject({
                _rangeBands: [10, 5], _domain: [2, 3],
            });
        });
    });

    describe('when #getXRange is called', () => {
        it('should return range when sort direction is true', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            set(verticalBarChart, '_options.sortDirection', true);
            set(verticalBarChart, '_dimensions.innerWidth', 10);
            expect(verticalBarChart.getXRange()).toEqual([10, 0]);
        });

        it('should return range when sort direction is false', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            set(verticalBarChart, '_options.sortDirection', false);
            set(verticalBarChart, '_dimensions.innerWidth', 10);
            expect(verticalBarChart.getXRange()).toEqual([0, 10]);
        });
    });

    describe('when #getXDomain is called', () => {
        it('should return categories', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            verticalBarChart._categories = [1, 2, 3];
            expect(verticalBarChart.getXDomain()).toEqual([1, 2, 3]);
        });
    });

    describe('when #getYDomain is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            set(verticalBarChart, '_options.annotations.benchmarks', []);
            set(verticalBarChart, '_options.yDomainPadding', false);
            Object.assign(verticalBarChart, {
                getMinValue: () => 5,
                getMaxValue: () => 10,
                _padYDomain: (min, max) => [min + 1, max - 1],
            });
            d3.extent = (arr, fn) => [min(arr.map(fn)), max(arr.map(fn))];
        });

        it('should return min and max with paddings', () => {
            set(verticalBarChart, '_options.yDomainPadding', true);
            expect(verticalBarChart.getYDomain()).toEqual([6, 9]);
        });

        it('should return min and max without paddings', () => {
            expect(verticalBarChart.getYDomain()).toEqual([5, 10]);
        });

        it('should return min and max from benchmark data', () => {
            set(verticalBarChart, '_options.annotations.benchmarks', [{ value: 1 }, { value: 20 }]);
            expect(verticalBarChart.getYDomain()).toEqual([-3, 30]);
        });
    });

    describe('when #_padYDomain is called', () => {
        it('should return min and max for positive min', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            set(verticalBarChart, '_options.yDomainPadding', 2);
            expect(verticalBarChart._padYDomain(1, 5)).toEqual([0, 13]);
        });

        it('should return min and max for negative min', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            set(verticalBarChart, '_options.yDomainPadding', 2);
            expect(verticalBarChart._padYDomain(-5, 10)).toEqual([-35, 40]);
        });
    });

    describe('when #updateXAxisContainer is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                getXAxisTransform: jest.fn().mockReturnValue('10px'),
                _xAxisContainer: {
                    _attr: {},
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                    transition() {
                        return this;
                    },
                    duration(duration) {
                        this._duration = duration;
                        return this;
                    },
                    call(call) {
                        this._call = call;
                        return this;
                    },
                    selectAll(selectAll) {
                        this._selectAll = selectAll;
                        return this;
                    },
                    delay(delay) {
                        this._delay = delay({}, 0, 4);
                        return this;
                    },
                },
                _options: {
                    puppeteerScreenshot: false,
                },
            });
            set(verticalBarChart, 'renderOptions.xAxis', false);
        });

        it('should set transformation on container', () => {
            verticalBarChart.updateXAxisContainer();
            expect(verticalBarChart._xAxisContainer).toMatchObject({
                _attr: { transform: '10px' },
            });
        });

        it('should set parameters on container', () => {
            Object.assign(verticalBarChart, {
                getXAxis: jest.fn().mockReturnValue(5),
            });
            set(verticalBarChart, 'renderOptions.xAxis', true);
            verticalBarChart.updateXAxisContainer();
            expect(verticalBarChart._xAxisContainer).toMatchObject({
                _duration: expect.any(Number), _call: 5, _selectAll: expect.any(String), _delay: 16,
            });
        });
    });

    describe('when #getXAxis is called', () => {
        let verticalBarChart;
        beforeEach(() => {
            d3.svg = {
                axis() {
                    return this;
                },
                scale(scale) {
                    this._scale = scale;
                    return this;
                },
                orient(orient) {
                    this._orient = orient;
                    return this;
                },
            };
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _xScale: 'scale',
                _options: {
                    isAggregateByPercent: false,
                    isGroupByPercent: false,
                }
            });
        });

        it('should return axis', () => {
            expect(verticalBarChart.getXAxis()).toMatchObject({
                _scale: 'scale', _orient: expect.any(String),
            });
        });
    });

    describe('when #getYAxis is called', () => {
        let verticalBarChart;
        beforeEach(() => {
            d3.svg = {
                axis() {
                    return this;
                },
                scale(scale) {
                    this._scale = scale;
                    return this;
                },
                orient(orient) {
                    this._orient = orient;
                    return this;
                },
                tickFormat(tickFormat) {
                    this._tickFormat = tickFormat();
                    return this;
                },
                tickValues(tickValues) {
                    this._tickValues = tickValues;
                    return this;
                },
            };
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale: 'scale',
                getValueFormatter: jest.fn().mockReturnValue(() => 'formatter'),
            });
        });

        it('should return axis without y axis ticks', () => {
            set(verticalBarChart, 'renderOptions.yAxisTicks', false);
            set(verticalBarChart, '_options.normalize', false);
            expect(verticalBarChart.getYAxis()).toMatchObject({
                _scale: 'scale', _orient: expect.any(String),
            });
        });

        it('should return axis with y axis ticks', () => {
            set(verticalBarChart, 'renderOptions.yAxisTicks', true);
            set(verticalBarChart, '_options.normalize', false);
            expect(verticalBarChart.getYAxis()).toMatchObject({
                _tickFormat: 'formatter',
            });
        });

        it('should return axis with normalized ticks', () => {
            set(verticalBarChart, 'renderOptions.yAxisTicks', false);
            set(verticalBarChart, '_options.normalize', true);
            expect(verticalBarChart.getYAxis()).toMatchObject({
                _tickValues: expect.any(Array),
            });
        });
    });

    describe('when #styleXTickLabels is called', () => {
        let verticalBarChart, d3Select;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                setVerticalLabelByWidth: jest.fn(),
                isLabelOrientationVertical: jest.fn(),
                setVerticalLabel: jest.fn(),
                truncateLabel: jest.fn(),
                _xAxisContainer: {
                    _style: {},
                    selectAll(selectAll) {
                        this._selectAll = selectAll;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = value;
                        return this;
                    },
                    each(fn) {
                        fn({}, 0, []);
                        return this;
                    },
                },
                _maxLabelWidth: 150,
                _options: {},
            });
            d3.select = jest.fn().mockReturnValue('element');
        });

        it('should set parameters on container when y axis is rendered', () => {
            d3Select = {
                text() {
                    return '';
                },
            };
            d3.select = () => d3Select;

            set(verticalBarChart, 'renderOptions.xAxis', true);
            verticalBarChart.styleXTickLabels();
            expect(verticalBarChart._xAxisContainer).toMatchObject({
                _selectAll: expect.any(String),
            });
        });

        it('should truncate labels when y axis is rendered', () => {
            d3Select = {
                text() {
                    return '';
                },
            };
            d3.select = () => d3Select;

            set(verticalBarChart, 'renderOptions.xAxis', true);
            verticalBarChart.styleXTickLabels();
            expect(verticalBarChart.isLabelOrientationVertical).toHaveBeenCalledWith(d3Select, 150);
        });

        it('should resize svg container to fit long vertical labels', () => {
            d3Select = {
                _attr: {},
                _style: {},
                node() {
                    return this;
                },
                getBoundingClientRect() {
                    return { height: 5 };
                },
                attr(property, value) {
                    this._attr[property] = value;
                },
                style(property, value) {
                    this._style[property] = value;
                },
                text() {
                    return '';
                },
                select() {
                    return this;
                },
            };
            d3.select = () => d3Select;

            set(verticalBarChart, 'renderOptions.xAxis', true);
            set(verticalBarChart, '_xAxisVert', true);
            verticalBarChart.styleXTickLabels();
            expect(d3Select._attr).toMatchObject({ height: 5 });
        });

        it('should resize svg container to fit long vertical labels with height', () => {
            d3Select = {
                _attr: {},
                _style: {},
                node() {
                    return this;
                },
                getBoundingClientRect() {
                    return { height: 5 };
                },
                attr(property, value) {
                    this._attr[property] = value;
                },
                style(property, value) {
                    this._style[property] = value;
                },
                text() {
                    return '12345';
                },
                select() {
                    return this;
                },
            };
            d3.select = () => d3Select;

            set(verticalBarChart, 'renderOptions.xAxis', true);
            set(verticalBarChart, '_xAxisVert', true);
            verticalBarChart.styleXTickLabels();
            expect(d3Select._attr).toMatchObject({ height: 10 });
        });

        it('should set parameters on container without y axis', () => {
            set(verticalBarChart, 'renderOptions.xAxis', false);
            verticalBarChart.styleXTickLabels();
            expect(verticalBarChart._xAxisContainer).toMatchObject({
                _selectAll: expect.any(String), _style: { visibility: expect.any(String) },
            });
        });
    });

    describe('when #styleYTickLabels is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yAxisContainer: {
                    _style: {},
                    selectAll(selectAll) {
                        this._selectAll = selectAll;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = value;
                        return this;
                    },
                },
            });
        });

        it('should set parameters on container', () => {
            set(verticalBarChart, 'renderOptions.yAxis', true);
            verticalBarChart.styleYTickLabels();
            expect(verticalBarChart._yAxisContainer).toMatchObject({
                _selectAll: expect.any(String), _style: { visibility: expect.any(String) },
            });
        });

        it('should not set parameters on container', () => {
            set(verticalBarChart, 'renderOptions.yAxis', false);
            verticalBarChart.styleYTickLabels();
            expect(verticalBarChart._yAxisContainer).toMatchObject({
                _style: {},
            });
        });
    });

    describe('when #setAxesVisibility is called', () => {
        let verticalBarChart;

        beforeEach(() => {
            verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                renderOptions: {},
                _xScale: { rangeBand: () => 2 },
                _options: { padding: 10 },
            });
        });

        it('should set max label width', () => {
            verticalBarChart.setAxesVisibility();
            expect(verticalBarChart._maxLabelWidth).toBe(22);
        });

        it('should disable x axis rendering for min vertical label width', () => {
            verticalBarChart._minVerticalLabelWidth = 50;
            verticalBarChart.setAxesVisibility();
            expect(verticalBarChart.renderOptions.xAxis).toBe(false);
        });

        it('should set x axis rendering for min label width', () => {
            verticalBarChart._minVerticalLabelWidth = 1;
            verticalBarChart._minLabelWidth = 50;
            verticalBarChart.setAxesVisibility();
            expect(verticalBarChart.renderOptions.xAxis).toBe(true);
        });

        it('should set x axis rendering in other cases', () => {
            verticalBarChart._minVerticalLabelWidth = 1;
            verticalBarChart._minLabelWidth = 1;
            verticalBarChart.setAxesVisibility();
            expect(verticalBarChart.renderOptions.xAxis).toBe(true);
        });
    });

    describe('when #_initialBarTransform is called', () => {
        it('should set attributes on selection', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            const selection = {
                _attr: {},
                attr(property, value) {
                    this._attr[property] = isFunction(value) ? value({}, Object.keys(this._attr).length) : value;
                    return this;
                },
            };
            const boundThis = {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                getBarWidth(datum, index) {
                    return index;
                },
                getBarX(datum, index) {
                    return index;
                },
            };
            verticalBarChart._initialBarTransform(selection, boundThis);
            expect(selection).toMatchObject({
                _attr: { width: 0, x: 1, height: 0, y: 0 },
            });
        });
    });

    describe('when #getBarWidth is called', () => {
        it('should return width', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _xScale: {
                    rangeBand: () => 10,
                },
            });
            expect(verticalBarChart.getBarWidth()).toBe(10);
        });

        it('should return half width for grouped type', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _xScale: {
                    rangeBand: () => 10,
                },
                _type: 'grouped',
                maxGroups: 2,
            });
            expect(verticalBarChart.getBarWidth()).toBe(5);
        });
    });

    describe('when #getBarHeight is called', () => {
        it('should return height', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
            });
            expect(verticalBarChart.getBarHeight({ value: 5 })).toBe(10);
        });
    });

    describe('when #getBarX is called', () => {
        it('should return x for grouped type', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _type: 'grouped',
                _categories: [7],
                getBarWidth() {
                    return 4;
                },
            });
            expect(verticalBarChart.getBarX({}, 1, 0)).toBe(18);
        });

        it('should return x for normal type', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _categories: [7],
                getBarWidth() {
                    return 4;
                },
            });
            expect(verticalBarChart.getBarX({}, 1, 0)).toBe(14);
        });
    });

    describe('when #getBarY is called', () => {
        it('should return scale for grouped type in positive data set', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(verticalBarChart.getBarY({ value: -10 }, 1, 0)).toBe(6);
        });

        it('should return scale for grouped type in negative data set', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(verticalBarChart.getBarY({ value: -10 }, 1, 0)).toBe(0);
        });

        it('should return scale for other type in positive data set', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(verticalBarChart.getBarY({ value: -10 }, 1, 0)).toBe(10);
        });

        it('should return scale for other type in negative data set', () => {
            const verticalBarChart = new arrays.VerticalBarChart();
            Object.assign(verticalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(verticalBarChart.getBarY({ value: -10 }, 1, 0)).toBe(-4);
        });
    });
});
