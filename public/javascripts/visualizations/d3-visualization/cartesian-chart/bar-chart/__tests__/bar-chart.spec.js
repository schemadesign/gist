import { identity, isFunction, pad, set } from 'lodash';


describe('class BarChart', () => {
    let arrays, d3;

    beforeAll(() => {
        window.arrays = arrays = {
            CartesianChart: class {
                init() {}

                setColors() {}

                _createStaticElements() {}

                _createRoot() {}

                _renderVisualization() {}

                update() {}
            },
            StandardTooltip: class {
            },
            escape: val => val,
            unescape: val => val,
            constructedFilterObj: identity,
            changeRoutePath: jest.fn(),
            redirect: jest.fn(),
            orderOfMagnitude: jest.fn(value => `formatted ${value}`),
            isPreviewAndMobile: () => false,
        };
        window.d3 = d3 = {};
        window.jQuery = jest.fn().mockReturnValue({ css: () => null });
        require('../bar-chart');
    });

    it('should set parameters', () => {
        const barChart = new arrays.BarChart();
        expect(barChart._margin).toEqual(expect.any(Object));
        expect(barChart._tooltip).toEqual(expect.any(Object));
        expect(barChart._titleText).toEqual(expect.any(String));
        expect(barChart._dataCategories).toBeDefined();
        expect(barChart._categoriesAndData).toBeDefined();
        expect(barChart._bars).toBeDefined();
        expect(barChart._minLabelWidth).toEqual(expect.any(Number));
        expect(barChart._maxLabelWidth).toEqual(expect.any(Number));
        expect(barChart._minVerticalLabelWidth).toEqual(expect.any(Number));
    });

    describe('when #init is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: {}, renderOptions: {},
                _tooltip: { setOffset: jest.fn() },
            });
        });

        it('should set parameters', () => {
            barChart.init({ data: [[1, 2], [1, 2, 3], [1]], type: 'type', fields: { param: 'value' } });
            expect(Object.keys(barChart._options)).toHaveLength(4);
            expect(barChart._type).toBe('type');
            expect(barChart._fields).toEqual({ param: 'value' });
            expect(barChart.maxGroups).toBe(3);
        });

        it('should set tooltip offset', () => {
            barChart.init({ data: [[]], type: 'type' });
            expect(barChart._tooltip.setOffset).toHaveBeenCalled();
        });
    });

    describe('when #preProcessData is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: {},
            });
        });

        it('should return simple data', () => {
            const data = [[{ param: 'value' }]];
            expect(barChart.preProcessData(data)).toEqual([[{ param: 'value' }]]);
        });

        it('should return normalized data', () => {
            const data = [[{ param: 'value' }]];
            Object.assign(barChart, {
                _options: { normalize: true },
                normalize: ([data]) => data[0],
            });
            expect(barChart.preProcessData(data)).toEqual({ param: 'value' });
        });

        it('should return processed data', () => {
            const data = [[{ category: '12/17/1995' }]];
            set(barChart, '_options.groupBy_isDate', true);
            expect(barChart.preProcessData(data)).toEqual([[{
                category: '12/17/1995',
            }]]);
        });
    });

    describe('when #normalize is called', () => {
        it('should return data', () => {
            const barChart = new arrays.BarChart();
            const data = [[{ value: -1 }, { value: 9 }]];
            expect(barChart.normalize(data)).toEqual([[
                { denormalizedValue: -1, value: 0.1 },
                { denormalizedValue: 9, value: 0.9 },
            ]]);
        });
    });

    describe('when #postProcessData is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                getDataCategories: () => 'categories',
                getAlphaSortedData: () => 'alpha data',
                getStackSortedData: () => 'stack data',
                _options: { chronological: false },
                sortDataByXAxis: jest.fn(),
                sortData: jest.fn(),
            });
        });

        it('should set parameters', () => {
            barChart.postProcessData();
            expect(barChart).toMatchObject({
                _dataCategories: 'categories', _alphaSortedData: 'alpha data', _stackSortedData: 'stack data',
            });
        });

        it('should sort chronological data by axis', () => {
            set(barChart, '_options.chronological', true);
            barChart.postProcessData();
            expect(barChart.sortDataByXAxis).toHaveBeenCalled();
        });

        it('should sort default data', () => {
            set(barChart, '_options.chronological', false);
            barChart.postProcessData();
            expect(barChart.sortData).toHaveBeenCalled();
        });
    });

    describe('when #getDataCategories is called', () => {
        it('should return categories for simple chart and non-date group by', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { simpleChart: true },
                _data: [[{ label: 'cat 1', value: 1, color: 'red' }]],
            });
            expect(barChart.getDataCategories()).toEqual([{ label: 'cat 1', value: 1, color: 'red' }]);
        });

        it('should return categories for simple chart and date group by', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { simpleChart: true, groupBy_isDate: true },
                _data: [[{ label: 'cat 1', value: 1, color: 'red' }]],
                formatField: jest.fn((field, name) => `formatted ${name}`),
            });
            expect(barChart.getDataCategories()).toEqual([{ label: 'cat 1', value: 1, color: 'red' }]);
        });

        it('should return categories for normal chart', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { simpleChart: false },
                _data: [[{ label: 'label 2', value: 2, color: 'blue' }]],
            });
            expect(barChart.getDataCategories()).toEqual([{ label: 'label 2', value: 2, color: 'blue' }]);
        });

        it('should skip duplicated categories', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { simpleChart: false },
                _data: [[{ label: 'label', value: 2, color: 'red' }, { label: 'label', value: 1, color: 'blue' }]],
            });
            expect(barChart.getDataCategories()).toEqual([{ label: 'label', value: 2, color: 'red' }]);
        });

        it('should override duplicated categories', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { simpleChart: false },
                _data: [[{ label: 'label', value: 2, color: 'red' }, { label: 'label', value: 3, color: 'blue' }]],
            });
            expect(barChart.getDataCategories()).toEqual([{ label: 'label', value: 3, color: 'blue' }]);
        });
    });

    describe('when #getAlphaSortedData is called', () => {
        it('should sort categories alphabetically', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _dataCategories: [
                    { label: 'c', color: 'red', param: 'value' },
                    { label: 'a', color: 'blue' },
                    { label: 'b', color: 'green' },
                ],
            });
            expect(barChart.getAlphaSortedData()).toEqual([
                { label: 'a', color: 'blue' },
                { label: 'b', color: 'green' },
                { label: 'c', color: 'red' },
            ]);
        });
    });

    describe('when #getStackSortedData is called', () => {
        it('should sort categories by value and label', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _dataCategories: [
                    { label: 'c', value: 2, param: 'value' },
                    { label: 'a', value: 2 },
                    { label: 'b', value: 1 },
                ],
            });
            expect(barChart.getStackSortedData()).toEqual([
                { label: 'a' },
                { label: 'c' },
                { label: 'b' },
            ]);
        });
    });

    describe('when #sortData is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                toggleYAxisSort: () => [1, 2, 3],
                populateCategoriesAndData: jest.fn(),
            });
        });

        it('should set categories and data', () => {
            barChart.sortData();
            expect(barChart._categoriesAndData).toEqual([1, 2, 3]);
        });

        it('should call function to populate data', () => {
            barChart.sortData();
            expect(barChart.populateCategoriesAndData).toHaveBeenCalled();
        });
    });

    describe('when #sortDataByXAxis is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                toggleXAxisSort: () => [1, 2, 3],
                populateCategoriesAndData: jest.fn(),
            });
        });

        it('should set categories and data', () => {
            barChart.sortDataByXAxis();
            expect(barChart._categoriesAndData).toEqual([1, 2, 3]);
        });

        it('should call function to populate data', () => {
            barChart.sortDataByXAxis();
            expect(barChart.populateCategoriesAndData).toHaveBeenCalled();
        });
    });

    describe('when #toggleXAxisSort is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            _.set(barChart, '_options.groupBy_isDate', false);
        });

        it('should return transformed date categories', () => {
            _.set(barChart, '_options.groupBy_isDate', true);
            Object.assign(barChart, {
                _categories: ['Jan 2018', 'March 2018'],
                _data: ['data 1', 'data 2'],
            });
            expect(barChart.toggleXAxisSort()).toEqual([['Jan 2018', 'data 1'], ['March 2018', 'data 2']]);
        });

        it('should return transformed numeric categories', () => {
            Object.assign(barChart, {
                _categories: ['1', '2'],
                _data: ['data 1', 'data 2'],
            });
            expect(barChart.toggleXAxisSort()).toEqual([[1, 'data 1'], [2, 'data 2']]);
        });

        it('should return transformed string categories', () => {
            Object.assign(barChart, {
                _categories: ['cat 1', 'cat 2'],
                _data: ['data 1', 'data 2'],
            });
            expect(barChart.toggleXAxisSort()).toEqual([['cat 1', 'data 1'], ['cat 2', 'data 2']]);
        });
    });

    describe('when #toggleYAxisSort is called', () => {
        it('should return transformed and sorted categories', () => {
            const barChart = new arrays.BarChart();
            set(barChart, '_options.normalize', false);
            Object.assign(barChart, {
                _categories: [[{ value: 3 }], [{ value: 4 }], [{ value: 2 }]],
                _data: [[{ value: 3 }], [{ value: 1 }], [{ value: 2 }]],
            });
            expect(barChart.toggleYAxisSort()).toEqual([[[{ value: 4 }], [{ value: 1 }]], [[{ value: 2 }], [{ value: 2 }]], [[{ value: 3 }], [{ value: 3 }]]]);
        });

        it('should return transformed and sorted categories for normalized data', () => {
            const barChart = new arrays.BarChart();
            set(barChart, '_options.normalize', true);
            Object.assign(barChart, {
                _categories: [[{ value: 3 }], [{ value: 4 }], [{ value: 2 }]],
                _data: [[{ denormalizedValue: 3 }], [{ denormalizedValue: 1 }], [{ denormalizedValue: 2 }]],
            });
            expect(barChart.toggleYAxisSort()).toEqual([[[{ value: 4 }], [{ denormalizedValue: 1 }]], [[{ value: 2 }], [{ denormalizedValue: 2 }]], [[{ value: 3 }], [{ denormalizedValue: 3 }]]]);
        });
    });

    describe('when #populateCategoriesAndData is called', () => {
        it('should split categories and data into separate parameters', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _categoriesAndData: [['cat 1', 'data 1'], ['cat 2', 'data 2']],
                sortStack: data => `sorted ${data}`,
            });
            barChart.populateCategoriesAndData();
            expect(barChart._categories).toEqual(['cat 1', 'cat 2']);
            expect(barChart._data).toEqual(['sorted data 1', 'sorted data 2']);
        });
    });

    describe('when #sortStack is called', () => {
        let barChart, data;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _type: 'grouped',
                _stackSortedData: [{ label: 'c', param: 'value' }, { label: 'a' }, { label: 'b' }],
            });
            data = [{ label: 'b' }, { label: 'c', value: 1 }, { label: 'c', value: 2 }, { label: 'a' }];
        });

        it('should return sorted data', () => {
            expect(barChart.sortStack(data)).toEqual([
                { label: 'c', value: 1 },
                { label: 'c', value: 2 },
                { label: 'a' }, { label: 'b' },
            ]);
        });

        it('should return sorted data of reversed input', () => {
            barChart._type = 'different';
            expect(barChart.sortStack(data)).toEqual([
                { label: 'c', value: 2 },
                { label: 'c', value: 1 },
                { label: 'a' }, { label: 'b' },
            ]);
        });
    });

    describe('when #setColors is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _colors: [],
                createPatterns: () => null,
                _alphaSortedData: [
                    { label: 'Blue', color: 'blue' },
                    { label: 'Green', color: 'green' },
                    { label: 'Red', color: 'red' },
                ],
            });
        });

        it('should set colors from alpha sorted data', () => {
            barChart.setColors([]);
            expect(barChart._colors).toEqual({ Blue: 'blue', Green: 'green', Red: 'red' });
        });

        it('should set random colors', () => {
            Object.assign(barChart, {
                _colors: ['white', 'black'],
                _alphaSortedData: [
                    { label: 'Blue' },
                    { label: 'Green' },
                    { label: 'Red' },
                    { label: 'Yellow', color: 'yellow' },
                ],
            });
            barChart.setColors([]);
            expect(barChart._colors).toEqual({ Blue: 'white', Green: 'black', Red: 'white', Yellow: 'yellow' });
        });

        it('should set colors from patterns', () => {
            Object.assign(barChart, {
                createPatterns: () => ['yellow', 'grey'],
            });
            barChart.setColors([]);
            expect(barChart._colors).toEqual({ Blue: 'yellow', Green: 'grey', Red: 'yellow' });
        });
    });

    describe('when #_createStaticElements is called', () => {
        it('should call methods', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                setAxesVisibility: jest.fn(),
                styleTickLabels: jest.fn(),
                renderLegend: jest.fn(),
                resizeChart: jest.fn(),
                _canvas: {
                    node: () => ({
                        getBBox: () => ({ height: 0 }),
                    }),
                },
                _options: {
                    margin: {
                        top: 0,
                        bottom: 0,
                    },
                },
                _svg: {
                    _attr: {},
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
                _wrapper: {
                    _attr: {},
                    style(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
                _renderCustomComponents: jest.fn(),
            });
            barChart._createStaticElements();
            expect(barChart.setAxesVisibility).toHaveBeenCalled();
            expect(barChart.styleTickLabels).toHaveBeenCalled();
            expect(barChart.renderLegend).toHaveBeenCalled();
            expect(barChart._renderCustomComponents).toHaveBeenCalled();
            expect(barChart.resizeChart).toHaveBeenCalled();
        });
    });

    describe('when #_renderCustomComponents is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _margin: { left: 1, top: 2 },
                _svg: {
                    _attr: {},
                    append(append) {
                        this._append = append;
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
            });
            set(barChart, '_options.annotations.overlayText', false);
        });

        it('should set parameters on svg', () => {
            barChart._renderCustomComponents();
            expect(barChart._svg).toMatchObject({
                _append: expect.any(String), _attr: {
                    class: expect.any(String),
                    'pointer-events': expect.any(String),
                    transform: 'translate(1,2)',
                },
            });
        });

        it('should create overlay text', () => {
            let overlayText;
            arrays.OverlayText = class {
                constructor(annotations, text) {
                    overlayText = { annotations, text };
                }
            };
            set(barChart, '_options.annotations.overlayText', 'example');
            barChart._renderCustomComponents();
            expect(overlayText).toEqual({
                annotations: expect.objectContaining({ _attr: expect.any(Object) }),
                text: ['example'],
            });
        });
    });

    describe('when #_createRoot is called', () => {
        it('should set parameters on svg', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: {
                    isExternalAccess: true
                },
                _dimensions: { outerWidth: 1, outerHeight: 2 },
                _svg: {
                    _attr: {},
                    attr(property, value) {
                        this._attr[property] = value;
                        return this;
                    },
                },
            });
            barChart._createRoot();
            expect(barChart._svg).toMatchObject({
                _attr: {
                    viewBox: '0 0 1 2',
                    preserveAspectRatio: expect.any(String),
                },
            });
        });
    });

    describe('when #getMinValue is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { normalize: true },
            });
        });

        it('should return normalized value', () => {
            expect(barChart.getMinValue()).toBe(0);
        });

        it('should return minimum value', () => {
            set(barChart, '_options.normalize', false);
            barChart._data = [[{ value: -5 }, { value: -2 }], [{ value: 0 }, { value: 6 }]];
            expect(barChart.getMinValue()).toBe(-7);
        });
    });

    describe('when #getMaxValue is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { normalize: true },
                _type: 'grouped',
            });
        });

        it('should return normalized value', () => {
            expect(barChart.getMaxValue()).toBe(1);
        });

        it('should return maximum value for grouped type', () => {
            set(barChart, '_options.normalize', false);
            barChart._data = [[{ value: -5 }, { value: 4 }], [{ value: 0 }, { value: 6 }]];
            expect(barChart.getMaxValue()).toBe(6);
        });

        it('should return maximum value for other type', () => {
            set(barChart, '_options.normalize', false);
            set(barChart, '_type', 'normal');
            barChart._data = [[{ value: -5 }, { value: 4 }], [{ value: 2 }, { value: 6 }]];
            expect(barChart.getMaxValue()).toBe(8);
        });
    });

    describe('when #getValueFormatter is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _options: { normalize: true, precise: 2 },
            });
        });

        it('should create percentage formatter', () => {
            const formatter = barChart.getValueFormatter();
            expect(formatter(10.00987)).toBe('1000.99%');
        });

        it('should call for external formatter', () => {
            set(barChart, '_options.normalize', false);
            const formatter = barChart.getValueFormatter();
            expect(formatter(5.555)).toBe('formatted 5.56');
            expect(arrays.orderOfMagnitude).toHaveBeenCalledWith(5.56, 2);
        });
    });

    describe('when #styleTickLabels is called', () => {
        it('should call methods', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                styleXTickLabels: jest.fn(),
                styleYTickLabels: jest.fn(),
            });
            barChart.styleTickLabels();
            expect(barChart.styleXTickLabels).toHaveBeenCalled();
            expect(barChart.styleYTickLabels).toHaveBeenCalled();
        });
    });

    describe('when #truncateLabelByWidth is called', () => {
        let barChart, selection;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            let _width = 10;
            selection = {
                _text: [],
                node: () => {
                    return {
                        getBBox: () => {
                            return { width: _width-- };
                        },
                    };
                },
                text(text) {
                    if (text) {
                        this._text.push(text());
                        return this;
                    }
                    return this._text[this._text.length - 1] || 'example';
                },
            };
        });

        it('should not shorten the text', () => {
            barChart.truncateLabelByWidth(selection, 10);
            expect(selection._text).toEqual([]);
        });

        it('should shorten the text', () => {
            barChart.truncateLabelByWidth(selection, 9);
            expect(selection._text).toEqual(['examp\u2026']);
        });
    });

    describe('when #setVerticalLabelByWidth is called', () => {
        let barChart, selection;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            let _width = 10;
            selection = {
                _text: [],
                _attr: {},
                node: () => {
                    return {
                        getBBox: () => {
                            return { width: _width-- };
                        },
                    };
                },
                text(text) {
                    if (text) {
                        this._text.push(isFunction(text) ? text() : text);
                        return this;
                    }
                    return this._text[this._text.length - 1] || 'example';
                },
                attr(property, value) {
                    this._attr[property] = value;
                    return this;
                },
                style() {
                    return this;
                },
            };
        });

        it('should not shorten the text', () => {
            barChart.truncateLabel(selection, 10);
            expect(selection._text).toEqual([]);
        });

        it('should set vertical axis parameter', () => {
            barChart.isLabelOrientationVertical(selection, 9);
            expect(barChart._xAxisVert).toBe(true);
        });

        it('should set attributes', () => {
            barChart._xAxisVert = true;
            barChart.setVerticalLabel(selection);
            expect(selection).toMatchObject({
                _attr: { transform: expect.any(String) },
            });
        });

        it('should shorten long text', () => {
            barChart._xAxisVert = true;
            selection.text(() => pad('', 31, 'x'));
            barChart.truncateLabel(selection, 10);
            expect(selection._text).toContainEqual(`${pad('', 30, 'x')}\u2026`);
        });
    });

    describe('when #renderLegend is called', () => {
        let barChart, d3Select;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _colors: { red: '#F00' },
                _legendMouseEnterEventHandler: jest.fn(),
                _alphaSortedData: [
                    { label: 'Blue', color: 'blue' },
                    { label: 'Green', color: 'green' },
                    { label: 'Red', color: 'red' },
                ],
            });
            set(barChart, '_options.viewOptions.viewInteractivity', false);
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
                attr(property, value) {
                    this._attr[property] = value;
                    return this;
                },
                style(property, value) {
                    this._style[property] = isFunction(value) ? value({ label: 'red' }) : value;
                    return this;
                },
                on(property, value) {
                    this._on[property] = value({ label: 'example' }, 0, []);
                    return this;
                },
                html(value) {
                    this._html = value({ rawLabel: 'www' });
                    return this;
                },
            };
            d3.selectAll = () => d3Select;
            d3.select = () => d3Select;
        });

        it('should set parameters', () => {
            const _alphaSortedData = [
                { label: 'Blue', color: 'blue' },
                { label: 'Green', color: 'green' },
                { label: 'Red', color: 'red' },
            ];

            barChart.renderLegend();
            expect(d3Select).toMatchObject({
                _attr: expect.any(Object), _data: _alphaSortedData, _html: 'www',
                _on: { mouseover: undefined, mouseout: undefined, focus: undefined },
                _style: expect.objectContaining({ fill: '#F00', "border-color": "#F00", "opacity": 1 }),
            });
        });

        it('should redirect when interactivity is set', () => {
            set(barChart, '_options.viewOptions.viewInteractivity', true);
            set(barChart, '_options.routePath_withoutFilter', 'example.com?param=value');
            set(barChart, '_options.filterObjWithColFilter', 'filter');
            set(barChart, '_options.stackBy', 'stack');
            set(window, '$.param', data => Object.keys(data).map(key => `${key}=${data[key]}`).join('&'));
            barChart.renderLegend();
            expect(arrays.redirect).toHaveBeenCalled();
        });
    });

    describe('when #_legendMouseEnterEventHandler is called', () => {
        let barChart, bar, listItem;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            bar = { category: 'category', label: 'label' };
            Object.assign(barChart, {
                _canvas: {
                    _style: {},
                    selectAll() {
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = isFunction(value) ? value(bar) : value;
                        return this;
                    },
                },
                _options: { simpleChart: true },
                _colors: ['#FFF'],
            });
            listItem = {
                _classed: {},
                classed(property, value) {
                    this._classed[property] = value;
                },
                style: jest.fn(),
            };
        });

        it('should set opacity for complex chart', () => {
            barChart._legendMouseEnterEventHandler(listItem, { label: 'label' });
            expect(barChart._canvas._style).toEqual({ opacity: 1 });
        });

        it('should set opacity for other bars', () => {
            barChart._legendMouseEnterEventHandler(listItem, { label: 'other' });
            expect(barChart._canvas._style).toEqual({ opacity: 0.25 });
        });
    });

    describe('when #_renderVisualization is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _series: {
                    _attr: {},
                    _style: {},
                    _on: {},
                    selectAll() {
                        return this;
                    },
                    data(_data) {
                        this._data = _data;
                        return this;
                    },
                    select() {
                        return this;
                    },
                    transition() {
                        return this;
                    },
                    duration(duration) {
                        this._duration = duration;
                        return this;
                    },
                    delay(delay) {
                        this._delay = delay({}, 0, 4);
                        return this;
                    },
                    call(fn) {
                        fn();
                        return this;
                    },
                    enter() {
                        return this;
                    },
                    append() {
                        return this;
                    },
                    attr(property, value) {
                        this._attr[property] = isFunction(value) ? value({
                            label: 'label', value: 'value',
                        }, 0, 0) : value;
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = isFunction(value) ? value({
                            label: 'label',
                        }) : value;
                        return this;
                    },
                    on(property, value) {
                        this._on[property] = value({}, 0, 0);
                        return this;
                    },
                    exit() {
                        return this;
                    },
                    remove() {
                        return this;
                    },
                },
                _finalBarTransform: jest.fn(),
                _categoriesAndData: [[]],
                _barMouseEnterEventHandler: jest.fn(),
                _barMouseOutEventHandler: jest.fn(),
                _barClickEventHandler: jest.fn(),
                _colors: { label: 'red' },
            });
            set(barChart, '_options.viewOptions.viewInteractivity', false);
            d3.event = { key: null };
        });

        it('should set bars', () => {
            barChart._renderVisualization();
            expect(barChart._bars).toBeDefined();
        });

        it('should map categories for simple chart and non-date group by', () => {
            barChart._options.simpleChart = true;
            barChart._renderVisualization();
            expect(barChart._series._data([{ label: 'label' }])).toEqual([{
                label: 'label',
            }]);
        });

        it('should map categories for simple chart and date group by', () => {
            barChart._options.simpleChart = true;
            barChart._options.groupBy_isDate = true;
            barChart.formatField = jest.fn((field, name) => `formatted ${name}`);
            barChart._renderVisualization();
            expect(barChart._series._data([{ label: 'label' }])).toEqual([{
                label: 'label',
            }]);
        });

        it('should map categories for normal chart', () => {
            barChart._renderVisualization();
            expect(barChart._series._data([{ label: 'label' }])).toEqual([{ label: 'label' }]);
        });

        it('should call for transformation', () => {
            barChart._renderVisualization();
            expect(barChart._finalBarTransform).toHaveBeenCalledTimes(2);
        });

        it('should set cursor for interactive view', () => {
            set(barChart, '_options.viewOptions.viewInteractivity', true);
            barChart._renderVisualization();
            expect(barChart._bars._style).toMatchObject({ cursor: 'pointer' });
        });

        it('should set aria label attribute', () => {
            barChart._categoriesAndData = [['category']];
            Object.assign(barChart._options, {
                groupBy: 'group',
                stackBy: 'stack',
                aggregateBy: 'aggregate',
            });
            barChart._renderVisualization();
            expect(barChart._bars._attr).toMatchObject({ 'aria-label': 'Bar Chart slice with group category and stack label has a value of value aggregate' });
        });

        it('should set fill style for complex chart', () => {
            barChart._renderVisualization();
            expect(barChart._bars._style).toMatchObject({ fill: 'red' });
        });
    });

    describe('when #_finalBarTransform is called', () => {
        it('should set attributes', () => {
            const barChart = new arrays.BarChart();
            const selection = {
                _attr: {},
                attr(property, value) {
                    this._attr[property] = value();
                    return this;
                },
            };
            const boundThis = {
                getBarX: () => 10,
                getBarY: () => 20,
                getBarWidth: () => 30,
                getBarHeight: () => 40,
            };
            barChart._finalBarTransform(selection, boundThis);
            expect(selection._attr).toEqual({ x: 10, y: 20, width: 30, height: 40 });
        });
    });

    describe('when #updateSortDirection is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                update: jest.fn(),
                _options: {},
            });
        });

        it('should update the chart', () => {
            barChart.updateSortDirection();
            expect(barChart.update).toHaveBeenCalled();
        });

        it('should set sort direction', () => {
            barChart.updateSortDirection('direction');
            expect(barChart._options.sortDirection).toBe('direction');
        });
    });

    describe('when #update is called', () => {
        it('should call methods', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                styleTickLabels: jest.fn(),
                _svg: {
                    selectAll(selectAll) {
                        this._selectAll = selectAll;
                        return this;
                    },
                    remove() {
                        return this;
                    },
                },
                _renderCustomComponents: jest.fn(),
            });
            barChart.update();
            expect(barChart.styleTickLabels).toHaveBeenCalled();
            expect(barChart._renderCustomComponents).toHaveBeenCalled();
        });
    });

    describe('when #_barMouseEnterEventHandler is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _canvas: {
                    selectAll() {
                        return this;
                    },
                    filter() {
                        return this;
                    },
                    style() {
                        return this;
                    },
                },
                getValueFormatter: () => data => `formatted ${data}`,
                _options: { simpleChart: true, stackBy: 'stack', aggregateBy: 'aggregate', groupBy: 'group' },
                _tooltip: {
                    applyTemplate(template) {
                        this._template = template;
                        return this;
                    },
                    setPosition() {
                        return this;
                    },
                    show() {
                        return this;
                    },
                },
            });
        });

        it('should set template for simple chart', () => {
            barChart._barMouseEnterEventHandler({}, { label: 'label', value: 'value', category: 'category' });
            expect(barChart._tooltip._template).toEqual({
                title: ['group', 'category'], rows: [['label', 'formatted value']],
            });
        });

        it('should set template for complex chart', () => {
            barChart._options.simpleChart = false;
            barChart._barMouseEnterEventHandler({}, { label: 'label', value: 'value', category: 'category' });
            expect(barChart._tooltip._template).toEqual({
                title: ['group', 'category'], rows: [['stack', 'label'], ['aggregate', 'formatted value']],
            });
        });

        it('should set template for date group by', () => {
            barChart._options.groupBy_isDate = true;
            barChart.formatField = jest.fn((field, name) => `formatted ${name}`);
            barChart._barMouseEnterEventHandler({}, { label: 'label', value: 'value', category: 'category' });
            expect(barChart._tooltip._template).toEqual({
                title: ['group', 'category'], rows: [['label', 'formatted value']],
            });
        });
    });

    describe('when #_barMouseOutEventHandler is called', () => {
        it('should call methods', () => {
            const barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _canvas: {
                    _style: {},
                    selectAll(selectAll) {
                        this._selectAll = selectAll;
                        return this;
                    },
                    filter() {
                        return this;
                    },
                    style(property, value) {
                        this._style[property] = value;
                        return this;
                    },
                },
                _tooltip: {
                    hide: jest.fn(),
                },
            });
            barChart._barMouseOutEventHandler({});
            expect(barChart._canvas._style).toEqual({ opacity: expect.any(Number) });
            expect(barChart._tooltip.hide).toHaveBeenCalled();
        });
    });

    describe('when #_barClickEventHandler is called', () => {
        let barChart;

        beforeEach(() => {
            barChart = new arrays.BarChart();
            Object.assign(barChart, {
                _colors: { red: '#F00' },
                _legendMouseEnterEventHandler: jest.fn(),
                _alphaSortedData: 'alpha sorted',
            });
            set(barChart, '_options.viewOptions.viewInteractivity', false);
        });

        it('should not redirect when interactivity is not set', () => {
            barChart._barClickEventHandler();
            expect(arrays.redirect).not.toHaveBeenCalled();
        });

        it('should redirect when interactivity is set', () => {
            set(barChart, '_options.viewOptions.viewInteractivity', true);
            set(barChart, '_options.routePath_withoutFilter', 'example.com?param=value');
            set(barChart, '_options.groupBy', 'group');
            set(barChart, '_options.stackBy', 'stack');
            set(barChart, '_options.filterObj', 'filter');
            set(window, '$.param', data => Object.keys(data).map(key => `${key}=${data[key]}`).join('&'));
            barChart._barClickEventHandler([['first', [{ label: 'second' }]]], 0, 0);
            expect(arrays.redirect).toHaveBeenCalled();
        });
    });
});
