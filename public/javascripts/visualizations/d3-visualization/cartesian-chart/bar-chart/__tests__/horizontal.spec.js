import { set, isFunction } from 'lodash';


describe('class HorizontalBarChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            BarChart: class {
            },
        };
        window.d3 = d3 = {};
        require('../horizontal');
    });

    it('should set max label width', () => {
        const horizontalBarChart = new arrays.HorizontalBarChart();
        expect(horizontalBarChart._maxLabelWidth).toEqual(expect.any(Number));
    });

    describe('when #getXDomain is called', () => {
        it('should return min and max values', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                getMinValue: jest.fn().mockReturnValue('min'),
                getMaxValue: jest.fn().mockReturnValue('max'),
            });
            expect(horizontalBarChart.getXDomain()).toEqual(['min', 'max']);
        });
    });

    describe('when #getYScale is called', () => {
        it('should return d3 scale', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                getYRange: jest.fn().mockReturnValue([5, 10]),
                getYDomain: jest.fn().mockReturnValue([1, 2, 3]),
            });
            set(horizontalBarChart, '_options.padding', 10);
            d3.scale = {
                ordinal() {
                    return this;
                },
                rangeBands([min, max], padding) {
                    this._min = min;
                    this._max = max;
                    this._padding = padding;
                    return this;
                },
                domain(domain) {
                    this._domain = domain;
                    return this;
                },
            };
            expect(horizontalBarChart.getYScale()).toMatchObject({
                _min: 5, _max: 10, _padding: 10, _domain: [1, 2, 3],
            });
        });
    });

    describe('when #getYRange is called', () => {
        it('should return range when sort direction is true', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            set(horizontalBarChart, '_options.sortDirection', true);
            set(horizontalBarChart, '_dimensions.innerHeight', 10);
            expect(horizontalBarChart.getYRange()).toEqual([0, 10]);
        });

        it('should return range when sort direction is false', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            set(horizontalBarChart, '_options.sortDirection', false);
            set(horizontalBarChart, '_dimensions.innerHeight', 10);
            expect(horizontalBarChart.getYRange()).toEqual([10, 0]);
        });
    });

    describe('when #getYDomain is called', () => {
        it('should return range when sort direction is true', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            horizontalBarChart._categories = [1, 2, 3];
            expect(horizontalBarChart.getYDomain()).toEqual([1, 2, 3]);
        });
    });

    describe('when #getXAxis is called', () => {
        let horizontalBarChart;
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
                ticks(ticks) {
                    this._ticks = ticks;
                    return this;
                },
                tickValues(tickValues) {
                    this._tickValues = tickValues;
                    return this;
                },
            };
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale: 'scale',
                getValueFormatter: jest.fn().mockReturnValue(() => 'formatter'),
            });
        });

        it('should return axis with x axis ticks', () => {
            set(horizontalBarChart, 'renderOptions.xAxisTicks', true);
            set(horizontalBarChart, '_options.normalize', false);
            expect(horizontalBarChart.getXAxis()).toMatchObject({
                _scale: 'scale', _orient: expect.any(String), _tickFormat: 'formatter',
            });
        });

        it('should return axis without x axis ticks', () => {
            set(horizontalBarChart, 'renderOptions.xAxisTicks', false);
            set(horizontalBarChart, '_options.normalize', false);
            expect(horizontalBarChart.getXAxis()).toMatchObject({
                _ticks: 0,
            });
        });

        it('should return axis with normalized ticks', () => {
            set(horizontalBarChart, 'renderOptions.xAxisTicks', false);
            set(horizontalBarChart, '_options.normalize', true);
            expect(horizontalBarChart.getXAxis()).toMatchObject({
                _tickValues: expect.any(Array),
            });
        });
    });

    describe('when #updateYAxisContainer is called', () => {
        let horizontalBarChart;

        beforeEach(() => {
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                getYAxisTransform: jest.fn().mockReturnValue('10px'),
                _yAxisContainer: {
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
            set(horizontalBarChart, 'renderOptions.xAxis', false);
        });

        it('should set transformation on container', () => {
            horizontalBarChart.updateYAxisContainer();
            expect(horizontalBarChart._yAxisContainer).toMatchObject({
                _attr: { transform: '10px' },
            });
        });

        it('should set parameters on container', () => {
            Object.assign(horizontalBarChart, {
                getYAxis: jest.fn().mockReturnValue(5),
            });
            set(horizontalBarChart, 'renderOptions.xAxis', true);
            horizontalBarChart.updateYAxisContainer();
            expect(horizontalBarChart._yAxisContainer).toMatchObject({
                _duration: expect.any(Number), _call: 5, _selectAll: expect.any(String), _delay: 16,
            });
        });
    });

    describe('when #getYAxis is called', () => {
        let horizontalBarChart;
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
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _yScale: 'scale',
                _options: {
                    isAggregateByPercent: false,
                    isGroupByPercent: false,
                }
            });
        });

        it('should return axis', () => {
            expect(horizontalBarChart.getYAxis()).toMatchObject({
                _scale: 'scale', _orient: expect.any(String),
            });
        });
    });

    describe('when #styleXTickLabels is called', () => {
        let horizontalBarChart;

        beforeEach(() => {
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
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
                    each() {
                        return this;
                    },
                },
                _dimensions: { innerWidth: 800 },
            });
        });

        it('should set parameters on container', () => {
            set(horizontalBarChart, 'renderOptions.xAxis', true);
            horizontalBarChart.styleXTickLabels();
            expect(horizontalBarChart._xAxisContainer).toMatchObject({
                _selectAll: expect.any(String), _style: { visibility: expect.any(String) },
            });
        });

        it('should not set parameters on container', () => {
            set(horizontalBarChart, 'renderOptions.xAxis', false);
            horizontalBarChart.styleXTickLabels();
            expect(horizontalBarChart._xAxisContainer).toMatchObject({
                _style: {},
            });
        });
    });

    describe('when #styleYTickLabels is called', () => {
        let horizontalBarChart;

        beforeEach(() => {
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                truncateLabelByWidth: jest.fn(),
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
                    each(fn) {
                        fn({}, 0, []);
                        return this;
                    },
                },
                _maxLabelWidth: 150,
            });
            d3.select = jest.fn().mockReturnValue('element');
        });

        it('should set parameters on container when x axis is rendered', () => {
            set(horizontalBarChart, 'renderOptions.yAxis', true);
            horizontalBarChart.styleYTickLabels();
            expect(horizontalBarChart._yAxisContainer).toMatchObject({
                _selectAll: expect.any(String),
            });
        });

        it('should truncate labels when x axis is rendered', () => {
            set(horizontalBarChart, 'renderOptions.yAxis', true);
            horizontalBarChart.styleYTickLabels();
            expect(horizontalBarChart.truncateLabelByWidth).toHaveBeenCalledWith('element', 150);
        });

        it('should set parameters on container without x axis', () => {
            set(horizontalBarChart, 'renderOptions.yAxis', false);
            horizontalBarChart.styleYTickLabels();
            expect(horizontalBarChart._yAxisContainer).toMatchObject({
                _selectAll: expect.any(String), _style: { visibility: expect.any(String) },
            });
        });
    });

    describe('when #setAxesVisibility is called', () => {
        let horizontalBarChart;

        beforeEach(() => {
            horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                renderOptions: {},
                _margin: { left: 1, right: 1 },
                _categories: [{}],
                _dimensions: { outerHeight: 35, outerWidth: 50 },
            });
        });

        it('should set x axis rendering', () => {
            horizontalBarChart.setAxesVisibility();
            expect(horizontalBarChart.renderOptions.xAxis).toBe(true);
        });

        it('should set options when there is no space', () => {
            horizontalBarChart.setAxesVisibility();
            expect(horizontalBarChart.renderOptions.yAxis).toBe(false);
            expect(horizontalBarChart._margin.left).toBe(54);
            expect(horizontalBarChart._dimensions.innerWidth).toBe(50 - 54 - 1);
        });

        it('should set y axis rendering when there is space', () => {
            set(horizontalBarChart, '_dimensions.outerHeight', 36);
            horizontalBarChart.setAxesVisibility();
            expect(horizontalBarChart.renderOptions.yAxis).toBe(true);
        });
    });

    describe('when #_initialBarTransform is called', () => {
        it('should set attributes on selection', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            const selection = {
                _attr: {},
                attr(property, value) {
                    this._attr[property] = isFunction(value) ? value({}, Object.keys(this._attr).length) : value;
                    return this;
                },
            };
            const boundThis = {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                getBarHeight(datum, index) {
                    return index;
                },
                getBarY(datum, index) {
                    return index;
                },
            };
            horizontalBarChart._initialBarTransform(selection, boundThis);
            expect(selection).toMatchObject({
                _attr: { width: 0, height: 1, x: 0, y: 3 },
            });
        });
    });

    describe('when #getBarWidth is called', () => {
        it('should return width', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
            });
            expect(horizontalBarChart.getBarWidth({ value: 5 })).toBe(10);
        });
    });

    describe('when #getBarHeight is called', () => {
        it('should return height', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _yScale: {
                    rangeBand: () => 10,
                },
            });
            expect(horizontalBarChart.getBarHeight()).toBe(10);
        });

        it('should return half height for grouped type', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _yScale: {
                    rangeBand: () => 10,
                },
                _type: 'grouped',
                maxGroups: 2,
            });
            expect(horizontalBarChart.getBarHeight()).toBe(5);
        });
    });

    describe('when #getBarX is called', () => {
        it('should return positive scale for grouped type in positive data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: -10 }, 1, 0)).toBe(-14);
        });

        it('should return positive scale for grouped type in negative data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: -10 }, 1, 0)).toBe(-20);
        });

        it('should return negative scale for grouped type in positive data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: 10 }, 1, 0)).toBe(-14);
        });

        it('should return negative scale for grouped type in negative data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _type: 'grouped',
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: 10 }, 1, 0)).toBe(-20);
        });

        it('should return positive scale for other type in positive data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: -10 }, 1, 0)).toBe(-10);
        });

        it('should return positive scale for other type in negative data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: -10 }, 1, 0)).toBe(-24);
        });

        it('should return negative scale for other type in positive data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _data: [
                    [{ value: 2 }, { value: 3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: 10 }, 1, 0)).toBe(-10);
        });

        it('should return negative scale for other type in negative data set', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _xScale(_xScale) {
                    return _xScale * 2;
                },
                _data: [
                    [{ value: -2 }, { value: -3 }],
                ],
            });
            expect(horizontalBarChart.getBarX({ value: 10 }, 1, 0)).toBe(-24);
        });
    });

    describe('when #getBarY is called', () => {
        it('should return y for grouped type', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _type: 'grouped',
                _categories: [7],
                getBarHeight() {
                    return 4;
                },
            });
            expect(horizontalBarChart.getBarY({}, 1, 0)).toBe(18);
        });

        it('should return y for normal type', () => {
            const horizontalBarChart = new arrays.HorizontalBarChart();
            Object.assign(horizontalBarChart, {
                _yScale(_yScale) {
                    return _yScale * 2;
                },
                _categories: [7],
                getBarHeight() {
                    return 4;
                },
            });
            expect(horizontalBarChart.getBarY({}, 1, 0)).toBe(14);
        });
    });
});
