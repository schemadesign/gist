describe('class CartesianChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            D3Visualization: jest.fn(),
            Tooltip: class {},
        };
        window.d3 = d3 = {};
        require('../cartesian-chart');
    });

    describe('when #getXAxis is called', () => {
        let cartesianChart, d3Axis;

        beforeEach(() => {
            cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _options: {
                    groupBy_isDate: true,
                },
                _dimensions: { innerHeight: 40 },
                renderOptions: { xAxisTicks: true },
                _dataDomain: [1, 2, 3, 4],
                getXAxisTicksAmount() {
                    this.tickAmount = 1;
                    return this;
                },
            });
            d3Axis = {
                scale(_scale) {
                    this._scale = _scale;
                    return this;
                },
                orient(_orient) {
                    this._orient = _orient;
                    return this;
                },
                tickFormat(_tickFormat) {
                    this._tickFormat = _tickFormat;
                    return this;
                },
                tickSize(..._tickSize) {
                    this._tickSize = _tickSize;
                    return this;
                },
                ticks(..._ticks) {
                    this._ticks = _ticks;
                    return _ticks;
                },
            };
            Object.assign(d3, {
                version: '4',
                axisBottom() {
                    return d3Axis;
                },
                svg: {
                    axis() {
                        return d3Axis;
                    },
                },
                timeFormat(_timeParse) {
                    return _timeParse.map(([format, fn]) => [format, fn(new Date(2018, 11, 24, 10, 33, 30, 0))]);
                },
                timeParse(_multi) {
                    return _multi.map(([format, fn]) => [format, fn(new Date(2018, 11, 24, 10, 33, 30, 0))]);
                },
                time: {
                    format: {
                        multi(_multi) {
                            return _multi.map(([format, fn]) => [format, fn(new Date(2018, 11, 24, 10, 33, 30, 0))]);
                        },
                    },
                },
            });
        });

        it('should scale axis for new d3', () => {
            cartesianChart._xScale = 'x scale';
            cartesianChart.getXAxis();
            expect(d3Axis).toEqual(expect.objectContaining({ _scale: 'x scale' }));
        });

        it('should scale axis for old d3', () => {
            d3.version = '3';
            cartesianChart._xScale = 'x scale';
            cartesianChart.getXAxis();
            expect(d3Axis).toMatchObject({ _scale: 'x scale', _orient: expect.any(String) });
        });

        it('should set ticks for new d3', () => {
            cartesianChart.getXAxis();
            expect(d3Axis).toMatchObject({
                _tickFormat: [
                    ['.%L', 0],
                    [':%S', 30],
                    ['%I:%M', 33],
                    ['%I %p', 10],
                    ['%a %d', true],
                    ['%b %d', true],
                    ['%B', 11],
                    ['%-Y', true],
                ],
            });
        });

        it('should set ticks for old d3', () => {
            d3.version = '3';
            cartesianChart.getXAxis();
            expect(d3Axis).toMatchObject({
                _tickFormat: [
                    ['.%L', 0],
                    [':%S', 30],
                    ['%I:%M', 33],
                    ['%I %p', 10],
                    ['%a %d', true],
                    ['%b %d', true],
                    ['%B', 11],
                    ['%-Y', true],
                ],
            });
        });

        it('should set tick size when x axis ticks are rendered', () => {
            cartesianChart.getXAxis();
            expect(d3Axis._tickSize).toEqual([-40, 0]);
        });

        it('should set tick size when x axis ticks are not rendered', () => {
            cartesianChart.renderOptions.xAxisTicks = false;
            cartesianChart.getXAxis();
            expect(d3Axis._tickSize).toEqual([expect.any(Number), 0]);
        });

        it('should return x axis object when group by is date', () => {
            expect(cartesianChart.getXAxis()).toEqual(d3Axis);
        });

        it('should set tick amount', () => {
            cartesianChart.getXAxis();
            expect(d3Axis._ticks[0]).toMatchObject({ tickAmount: 1 });
        });
    });

    describe('when #postProcessData is called', () => {
        it('should set properties', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                getDomain: jest.fn().mockReturnValue('data domain'),
            });
            cartesianChart.postProcessData();
            expect(cartesianChart._dataDomain).toBe('data domain');
        });
    });

    describe('when #getXAxisTicksAmount is called', () => {
        it('should return ticks amount', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _dataDomain: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                _options: {
                    groupBy_isDate: false,
                },
                _dimensions: {
                    innerWidth: 500,
                },
            });
            expect(cartesianChart.getXAxisTicksAmount()).toBe(10);
        });

        it('should return ticks amount for dates', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _dataDomain: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                _options: {
                    groupBy_isDate: true,
                },
                _dimensions: {
                    innerWidth: 500,
                },
            });
            expect(cartesianChart.getXAxisTicksAmount()).toBe(4);
        });
    });

    describe('when #getDomain is called', () => {
        it('should return sorted data', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _options: {},
                _data: [[{ x: 8 }, { x: 2 }], [{ x: 4 }]],
            });
            expect(cartesianChart.getDomain()).toEqual([2, 4, 8]);
        });

        it('should return sorted dates data', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _options: {
                    groupBy_isDate: true,
                },
                _data: [[{ x: new Date(3) }, { x: new Date(2) }], [{ x: new Date(1) }]],
            });
            expect(cartesianChart.getDomain()).toEqual([new Date(1), new Date(2), new Date(3)]);
        });

        it('should return sorted data from dataFrames', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _options: {},
                _data: [[{ x: 8 }, { x: 2 }], [{ x: 4 }]],
                _dataFrames: [{ data: { x: 3 } }, { data: { x: 2 } }, { data: { x: 1 } }],
            });
            expect(cartesianChart.getDomain()).toEqual([1, 2, 3]);
        });

        it('should return sorted dates when group by is date', () => {
            const cartesianChart = new arrays.CartesianChart();
            Object.assign(cartesianChart, {
                _options: { groupBy_isDate: true },
                _data: [
                    [{ x: new Date('2015-04-17T00:00:00.000Z') }, { x: new Date('2011-04-17T00:00:00.000Z') }],
                    [{ x: new Date('2003-04-17T00:00:00.000Z') }],
                ],
            });
            expect(cartesianChart.getDomain()).toEqual([
                new Date('2003-04-17T00:00:00.000Z'),
                new Date('2011-04-17T00:00:00.000Z'),
                new Date('2015-04-17T00:00:00.000Z'),
            ]);
        });
    });
});
