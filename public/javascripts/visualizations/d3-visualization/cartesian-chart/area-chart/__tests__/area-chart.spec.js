import { set, isFunction, min, max } from 'lodash';


describe('class AreaChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            CartesianChart: class {
                init() {}

                getXScale() {
                    return 'cartesian chart scale';
                }

                getXAxis() {
                    return 'line chart axis';
                }

                postProcessData() {}

                _createStaticElements() {}

                _seriesEnterHook() {}

                _seriesEnterUpdateHook() {}
            },
            constants: {
                CHART_DEFAULT_COLORS: ['#ff0000', '#00ff00', '#0000ff']
            }
        };
        window.d3 = d3 = {};
        require('../area-chart');
    });

    it('should set properties', () => {
        const areaChart = new arrays.AreaChart();
        expect(areaChart._margin).toEqual(expect.any(Object));
        expect(areaChart._titleText).toEqual(expect.any(String));
        expect(areaChart._areaGenerator).toBeDefined();
        expect(areaChart._stackLayout).toBeDefined();
    });

    describe('when #init is called', () => {
        it('should set options', () => {
            const areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                _options: {},
            });
            areaChart.init();
            expect(areaChart._options.yDomainPadding).toEqual(expect.any(Number));
        });
    });

    describe('when #setColors is called', () => {
        let areaChart;

        beforeEach(() => {
            areaChart = new arrays.AreaChart();
            areaChart.createPatterns = jest.fn();
        });

        it('should set colors', () => {
            areaChart.setColors();
            expect(areaChart._colors).toEqual(expect.any(Array));
        });

        it('should override colors', () => {
            areaChart.setColors(['red', 'blue']);
            expect(areaChart._colors).toEqual(['red', 'blue']);
        });

        it('should set patterns', () => {
            areaChart.createPatterns = jest.fn().mockReturnValue(['green', 'yellow']);
            areaChart.setColors();
            expect(areaChart._colors).toEqual(['green', 'yellow']);
        });
    });

    describe('when #getXScale is called', () => {
        let areaChart, d3Time;

        beforeEach(() => {
            areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                getXRange: () => 'x range',
                getXDomain: () => 'x domain',
                _options: { groupBy_isDate: true },
            });
            d3Time = {
                range(_range) {
                    this._range = _range;
                    return this;
                },
                domain(_domain) {
                    this._domain = _domain;
                    return this;
                },
            };
            d3.time = { scale: () => d3Time };
        });

        it('should set time scale for new d3', () => {
            expect(areaChart.getXScale()).toEqual(d3Time);
            expect(d3Time).toMatchObject({ _range: 'x range', _domain: 'x domain' });
        });

        it('should call for parent when group by is not date', () => {
            areaChart._options.groupBy_isDate = false;
            expect(areaChart.getXScale()).toBe('cartesian chart scale');
        });
    });

    describe('when #preProcessData is called', () => {
        it('should process dates when group by is date', () => {
            const areaChart = new arrays.AreaChart();
            set(areaChart, '_options.groupBy_isDate', true);
            const data = [[
                { x: '2015-04-17T00:00:00.000Z' },
                { x: '2011-04-17T00:00:00.000Z' },
                { x: '2003-04-17T00:00:00.000Z' },
            ]];
            expect(areaChart.preProcessData(data)).toEqual([[
                { x: new Date('2015-04-17T00:00:00.000Z') },
                { x: new Date('2011-04-17T00:00:00.000Z') },
                { x: new Date('2003-04-17T00:00:00.000Z') },
            ]]);
        });

        it('should return data when group by is not date', () => {
            const areaChart = new arrays.AreaChart();
            set(areaChart, '_options.groupBy_isDate', false);
            const data = [[
                { x: '5' },
                { x: '4.6' },
            ]];
            expect(areaChart.preProcessData(data)).toEqual([[
                { x: '5' },
                { x: '4.6' },
            ]]);
        });
    });

    describe('when #postProcessData is called', () => {
        it('should set properties', () => {
            Object.assign(d3, {
                layout: {
                    stack() {
                        return jest.fn().mockReturnValue('data');
                    },
                },
            });
            const areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                _stackLayout: jest.fn(data => `stack layout ${data}`),
                _data: [[{ x: 1, y: 2 }]],
            });
            areaChart.postProcessData();
            expect(areaChart._stackLayout).toEqual(expect.any(Function));
            expect(areaChart._data).toBe('data');
        });
    });

    describe('when #_createStaticElements is called', () => {
        let areaChart, d3Area;

        beforeEach(() => {
            areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                _xScale: value => `scaled x ${value}`,
                _yScale: value => `scaled y ${value}`,
            });
            const data = { x: 10, y: 8, y0: 9 };
            d3Area = {
                defined(_defined) {
                    this._defined = _defined(data);
                    return this;
                },
                x(_x) {
                    this._x = _x(data);
                    return this;
                },
                y0(_y0) {
                    this._y0 = _y0(data);
                    return this;
                },
                y1(_y1) {
                    this._y1 = _y1(data);
                    return this;
                },
            };
            d3.svg = { area: () => d3Area };
        });

        it('should set attributes on line generator', () => {
            areaChart._createStaticElements();
            expect(d3Area).toMatchObject({
                _defined: true, _x: 'scaled x 10', _y0: 'scaled y 9', _y1: 'scaled y 17',
            });
        });
    });

    describe('when #getXDomain is called', () => {
        it('should return min and max', () => {
            d3.extent = (arr) => [min(arr), max(arr)];
            const areaChart = new arrays.AreaChart();
            areaChart._data = [[{ x: 10 }, { x: 15 }, { x: 2 }], [{ x: 1 }]];
            expect(areaChart.getXDomain()).toEqual([1, 15]);
        });
    });

    describe('when #getYDomain is called', () => {
        let areaChart;

        beforeEach(() => {
            areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
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

        it('should get max value from last series', () => {
            areaChart._data = [[{ y: -3, y0: -5 }], [], [{ y: -2, y0: -1 }, { y: -5, y0: -6 }]];
            expect(areaChart.getYDomain()).toEqual([expect.any(Number), -3]);
        });

        it('should add padding to domain', () => {
            areaChart._data = [[{ y: 5, y0: 1 }, { y: 2, y0: 1 }]];
            areaChart._options.yDomainPadding = true;
            areaChart.getYDomain();
            expect(areaChart.getYDomain()).toEqual([5, 11]);
        });
    });

    describe('when #_padYDomain is called', () => {
        let areaChart;

        beforeEach(() => {
            areaChart = new arrays.AreaChart();
            set(areaChart, '_options.yDomainPadding', 0);
        });

        it('should return value for positive min', () => {
            expect(areaChart._padYDomain(5, 10)).toEqual([5, 10]);
        });

        it('should return value for negative min', () => {
            expect(areaChart._padYDomain(-5, 10)).toEqual([-5, 10]);
        });

        it('should return value with padding', () => {
            set(areaChart, '_options.yDomainPadding', 2);
            expect(areaChart._padYDomain(10, 11)).toEqual([8, 13]);
        });

        it('should return 0 as min in edge case', () => {
            set(areaChart, '_options.yDomainPadding', 2);
            expect(areaChart._padYDomain(1, 5)).toEqual([0, expect.any(Number)]);
        });
    });

    describe('when #_seriesEnterHook is called', () => {
        it('should set attributes on series', () => {
            const areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                _seriesEnter: {
                    _attr: {},
                    _style: {},
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = isFunction(value) ? value([{ y: 5 }, { y: 10 }], 1) : value;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = value({}, 1);
                        return this;
                    },
                },
                _colors: ['red', 'blue'],
                _labels: ['first', 'second'],
            });
            areaChart._seriesEnterHook();
            expect(areaChart._seriesEnter._attr).toEqual({
                class: expect.any(String), tabindex: expect.any(String), role: expect.any(String),
                'aria-label': 'Area second has a minimum value of 5 and a maximum value of 10',
            });
            expect(areaChart._seriesEnter._style).toEqual({ fill: 'blue' });
        });
    });

    describe('when #_seriesEnterUpdateHook is called', () => {
        it('should set attributes on series', () => {
            const areaChart = new arrays.AreaChart();
            Object.assign(areaChart, {
                _series: {
                    _attr: {},
                    select() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value(7);
                        return this;
                    },
                },
                _areaGenerator: data => `generator ${data}`,
            });
            areaChart._seriesEnterUpdateHook();
            expect(areaChart._series._attr).toEqual({ d: 'generator 7' });
        });
    });
});
