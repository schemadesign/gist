import { set } from 'lodash';


describe('class LineChart', () => {
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

                _createStaticElements() {}

                _seriesEnterHook() {}

                _seriesEnterUpdateHook() {}
            },
        };
        window.d3 = d3 = {};
        require('../line-chart');
    });

    it('should set properties', () => {
        const lineChart = new arrays.LineChart();
        expect(lineChart._margin).toEqual(expect.any(Object));
        expect(lineChart._titleText).toEqual(expect.any(String));
        expect(lineChart._lineGenerator).toBeDefined();
    });

    describe('when #init is called', () => {
        it('should set options', () => {
            const lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
                _options: {},
            });
            lineChart.init();
            expect(lineChart._options.yDomainPadding).toEqual(expect.any(Number));
        });
    });

    describe('when #getXScale is called', () => {
        let lineChart, d3Time;

        beforeEach(() => {
            lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
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
            Object.assign(d3, {
                version: '4',
                scaleTime() {
                    return d3Time;
                },
                time: {
                    scale() {
                        return d3Time;
                    },
                },
            });
        });

        it('should set time scale for new d3', () => {
            expect(lineChart.getXScale()).toEqual(d3Time);
            expect(d3Time).toMatchObject({ _range: 'x range', _domain: 'x domain' });
        });

        it('should set time scale for old d3', () => {
            d3.version = '3';
            expect(lineChart.getXScale()).toEqual(d3Time);
            expect(d3Time).toMatchObject({ _range: 'x range', _domain: 'x domain' });
        });

        it('should call for parent when group by is not date', () => {
            lineChart._options.groupBy_isDate = false;
            expect(lineChart.getXScale()).toBe('cartesian chart scale');
        });
    });

    describe('when #preProcessData is called', () => {
        it('should return x axis object when group by is date', () => {
            const lineChart = new arrays.LineChart();
            set(lineChart, '_options.groupBy_isDate', true);
            const data = [[
                { x: '2015-04-17T00:00:00.000Z' },
                { x: '2011-04-17T00:00:00.000Z' },
                { x: '2003-04-17T00:00:00.000Z' },
            ]];
            expect(lineChart.preProcessData(data)).toEqual([[
                { x: new Date('2003-04-17T00:00:00.000Z') },
                { x: new Date('2011-04-17T00:00:00.000Z') },
                { x: new Date('2015-04-17T00:00:00.000Z') },
            ]]);
        });

        it('should call for parent when group by is not date', () => {
            const lineChart = new arrays.LineChart();
            set(lineChart, '_options.groupBy_isDate', false);
            const data = [[
                { x: '5' },
                { x: '4.6' },
            ]];
            expect(lineChart.preProcessData(data)).toEqual([[
                { x: 4.6 },
                { x: 5 },
            ]]);
        });
    });

    describe('when #_createStaticElements is called', () => {
        let lineChart, d3Line;

        beforeEach(() => {
            lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
                _xScale: value => `scaled x ${value}`,
                _yScale: value => `scaled y ${value}`,
                _lineGenerator: {},
            });
            const data = { x: 10, y: 8 };
            d3Line = {
                defined(_defined) {
                    this._defined = _defined(data);
                    return this;
                },
                x(_x) {
                    this._x = _x(data);
                    return this;
                },
                y(_y) {
                    this._y = _y(data);
                    return this;
                },
            };
            Object.assign(d3, {
                version: '4',
                line() {
                    return d3Line;
                },
                svg: {
                    line() {
                        return d3Line;
                    },
                },
            });
        });

        it('should set attributes on line generator for new d3', () => {
            lineChart._createStaticElements();
            expect(d3Line).toMatchObject({
                _defined: true, _x: 'scaled x 10', _y: 'scaled y 8',
            });
        });

        it('should set attributes on line generator for old d3', () => {
            d3.version = '3';
            lineChart._createStaticElements();
            expect(d3Line).toMatchObject({
                _defined: true, _x: 'scaled x 10', _y: 'scaled y 8',
            });
        });
    });

    describe('when #_seriesEnterHook is called', () => {
        it('should set attributes on series', () => {
            const lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
                _seriesEnter: {
                    _attr: {},
                    _style: {},
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = value({}, 1);
                        return this;
                    },
                },
                _colors: ['red', 'blue'],
            });
            lineChart._seriesEnterHook();
            expect(lineChart._seriesEnter._attr).toEqual({ class: expect.any(String) });
            expect(lineChart._seriesEnter._style).toEqual({ stroke: 'blue' });
        });
    });

    describe('when #_seriesEnterUpdateHook is called', () => {
        it('should set attributes on series', () => {
            const lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
                _series: {
                    _attr: {},
                    select() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
                _lineGenerator: 'generator',
            });
            lineChart._seriesEnterUpdateHook();
            expect(lineChart._series._attr).toEqual({ d: 'generator' });
        });
    });

    describe('when #getYDomain is called', () => {
        let lineChart;

        beforeEach(() => {
            lineChart = new arrays.LineChart();
            Object.assign(lineChart, {
                _data: [],
                _options: {},
                _padYDomain(min, max) {
                    return [min + 5, max + 5];
                },
            });
        });

        it('should get min value from data', () => {
            lineChart._data = [[{ y: 3 }], [{ y: 2 }, { y: 5 }], []];
            expect(lineChart.getYDomain()).toEqual([2, expect.any(Number)]);
        });

        it('should get max value from data', () => {
            lineChart._data = [[{ y: -3 }], [{ y: -2 }, { y: -5 }], []];
            expect(lineChart.getYDomain()).toEqual([expect.any(Number), 0]);
        });

        it('should add padding to domain', () => {
            lineChart._data = [[{ y: 5 }, { y: 2 }]];
            lineChart._options.yDomainPadding = true;
            lineChart.getYDomain();
            expect(lineChart.getYDomain()).toEqual([7, 10]);
        });
    });

    describe('when #_padYDomain is called', () => {
        let lineChart;

        beforeEach(() => {
            lineChart = new arrays.LineChart();
            set(lineChart, '_options.yDomainPadding', 0);
        });

        it('should return value for positive min', () => {
            expect(lineChart._padYDomain(5, 10)).toEqual([5, 10]);
        });

        it('should return value for negative min', () => {
            expect(lineChart._padYDomain(-5, 10)).toEqual([-5, 10]);
        });

        it('should return value with padding', () => {
            set(lineChart, '_options.yDomainPadding', 2);
            expect(lineChart._padYDomain(10, 11)).toEqual([8, 13]);
        });

        it('should return 0 as min in edge case', () => {
            set(lineChart, '_options.yDomainPadding', 2);
            expect(lineChart._padYDomain(1, 5)).toEqual([0, expect.any(Number)]);
        });
    });
});
