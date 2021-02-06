import { cloneDeep, set } from 'lodash';

import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';
import '../view.controller';


describe('View: Controller', () => {
    let $rootScope,
        $controller;
    let injectValues,
        $scope,
        jQuery;

    beforeEach(() => {
        angular.mock.module('arraysApp');
        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();

        $scope.datasetViewsCtrl = {
            colsAvailable: [],
            scaffoldView: jest.fn(),
        };
        $scope.datasetOneCtrl = {
            dataset: cloneDeep(pokemon1),
            form: {
                $setDirty: jest.fn(),
            },
        };
        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
        };
        $scope.team = {};

        injectValues = {
            view: {
                name: 'gallery',
                displayAs: 'Gallery',
                tabs: ['Tab 1', 'Tab 2'],
                lookup: { regions: true },
                settings: [],
            },
            viewDisplayName: '',
            subdomain: '',
            AssetService: {},
            DatasetService: {
                draft: jest.fn().mockResolvedValue({}),
            },
            viewUrlService: {
                getViewUrl: jest.fn((...args) => args),
            },
            modalService: {
                openConfirmModal: jest.fn(),
            },
            $mdDialog: {
                show: jest.fn().mockResolvedValue({}),
            },
            $scope,
            user: {},
            $state: {
                go: jest.fn(),
            },
        };

        jQuery = {
            on: jest.fn(),
            one: jest.fn(),
            attr: jest.fn(),
            addClass: jest.fn(),
            removeClass: jest.fn(),
        };
        set(window, '$', jest.fn().mockReturnValue(jQuery));
    });

    it('should instantiate parameters', () => {
        const ctrl = $controller('ViewCtrl', injectValues);

        expect(ctrl.dataset).toEqual(pokemon1);
        expect(ctrl.viewName).toBe(injectValues.view.name);
        expect(ctrl.viewDisplayName).toBe(injectValues.view.displayAs);
        expect(ctrl.data).toEqual(pokemon1.fe_views.views.gallery);
        expect(ctrl.viewTabs).toEqual(injectValues.view.tabs);
        expect(ctrl.viewLookup).toEqual({ regions: true });
        expect(ctrl.availableForUnit).toEqual(expect.any(Array));
        expect(ctrl.availableForDefaultAxis).toEqual(expect.any(Array));
        expect(ctrl.defaultAxisLabels).toEqual(expect.any(Object));
        expect(injectValues.$scope.datasetViewsCtrl.previewLoaded).toBe(false);
        expect(injectValues.$scope.datasetViewsCtrl.scaffoldView).toHaveBeenCalledWith(pokemon1.fe_views.views.gallery, injectValues.view, expect.any(Boolean));
    });

    it('should update preview', () => {
        const ctrl = $controller('ViewCtrl', injectValues);

        expect(injectValues.DatasetService.draft).toHaveBeenCalledWith(ctrl.dataset);
    });

    it('should set settings', () => {
        injectValues.view.settings = [
            {
                type: 'simple',
            },
            {
                type: 'stacked',
            },
            {
                name: 'first',
                inputType: 'menu',
                tab: 'Controls',
                displayAs: 'First',
                selectFrom: 'column',
            },
            {
                name: 'second',
                inputType: 'menu',
                tab: 'Controls',
                restrictColumnDataType: 'ToString',
                displayAs: 'Second',
                selectFrom: 'column',
            },
            {
                name: 'third',
                inputType: 'menu',
                tab: 'Controls',
                selectFrom: 'duration',
                durations: ['Year', 'Month', 'Day'],
            },
            {
                name: 'fourth',
                inputType: 'menu',
                tab: 'Controls',
                selectFrom: 'defaultAxis',
            },
            {
                name: 'fifth',
                inputType: 'menu',
                tab: 'Controls',
                selectFrom: 'unit',
            },
            {
                name: 'sixth',
                inputType: 'menu',
                tab: 'Controls',
                displayAs: 'Sixth',
                selectFrom: 'column',
            },
        ];
        injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Max HP', 'Name'];
        const ctrl = $controller('ViewCtrl as viewCtrl', injectValues);
        injectValues.$scope.$digest();

        expect(ctrl.viewSettings).toEqual(expect.any(Array));
        expect(ctrl.viewSettings).not.toContainEqual(injectValues.view.settings[0]);
        expect(ctrl.menuViewSettings).toEqual(injectValues.view.settings.slice(2));
        expect(ctrl.orientationDisplayAsOverrides).toEqual({});
        expect(ctrl.availableFields).toEqual({
            first: ['Max HP', 'Name'],
            second: ['Name'],
            third: ['Year', 'Month', 'Day'],
            fourth: ['X Axis', 'Y Axis'],
            fifth: ['%'],
            sixth: ['Max HP', 'Name'],
        });

        ctrl.data.simpleChart = true;
        injectValues.$scope.$digest();

        expect(ctrl.viewSettings).not.toContainEqual(injectValues.view.settings[1]);
    });

    it('should set conditional settings', () => {
        injectValues.view.settings = [
            {
                name: 'first',
                inputType: 'toggle',
                displayAs: 'First',
                condition: {
                    type: 'setting',
                    name: 'defaultSortByColumnName',
                    value: 'Image URL',
                },
            },
            {
                name: 'second',
                inputType: 'toggle',
                displayAs: 'Second',
                condition: {
                    type: 'setting',
                    name: 'defaultSortByColumnName',
                    value: 'Name',
                },
            },
        ];
        const ctrl = $controller('ViewCtrl as viewCtrl', injectValues);
        injectValues.$scope.$digest();

        expect(ctrl.viewSettings).toEqual([injectValues.view.settings[0]]);
    });

    it('should set settings for horizontal orientation', () => {
        injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.orientation = 'horizontal';
        injectValues.view.settings = [
            {
                name: 'orientation',
                options: [{
                    value: 'horizontal',
                    displayAsOverrides: 'horizontal overrides',
                }],
            },
        ];
        const ctrl = $controller('ViewCtrl as viewCtrl', injectValues);
        injectValues.$scope.$digest();

        expect(ctrl.orientationDisplayAsOverrides).toEqual('horizontal overrides');
        expect(ctrl.availableForDefaultAxis).toEqual(['Y Axis', 'X Axis']);
        expect(ctrl.defaultAxisLabels).toEqual({ 'X Axis': 'Y Axis', 'Y Axis': 'X Axis' });
    });

    it('should set settings for vertical orientation', () => {
        injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.orientation = 'vertical';
        injectValues.view.settings = [
            {
                name: 'orientation',
                options: [{
                    value: 'vertical',
                    displayAsOverrides: 'vertical overrides',
                }],
            },
        ];
        const ctrl = $controller('ViewCtrl as viewCtrl', injectValues);
        injectValues.$scope.$digest();

        expect(ctrl.orientationDisplayAsOverrides).toEqual('vertical overrides');
        expect(ctrl.availableForDefaultAxis).toEqual(['X Axis', 'Y Axis']);
        expect(ctrl.defaultAxisLabels).toEqual({ 'X Axis': 'X Axis', 'Y Axis': 'Y Axis' });
    });

    it('should set excluded fields', () => {
        injectValues.view.settings = [
            {
                restrictColumnDataType: 'integer',
                selectExcludeBy: 'firstSetting',
            },
        ];
        injectValues.$scope.datasetViewsCtrl.colsAll = ['Max HP', 'Max CP', 'Name', 'Image URL'];
        injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Max HP', 'Max CP', 'Name'];
        const ctrl = $controller('ViewCtrl', injectValues);

        expect(ctrl.data).toMatchObject({
            firstSetting: ['Name', 'Image URL'],
        });
    });

    describe('when #updatePreview is called', () => {
        beforeEach(() => {
            set(window, '_.debounce', fn => fn);
        });

        it('should update view data', () => {
            const ctrl = $controller('ViewCtrl', injectValues);
            ctrl.data = { param: 'value' };
            ctrl.updatePreview();

            expect(ctrl.dataset.fe_views.views.gallery).toEqual({ param: 'value' });
        });

        it('should update iframe', async () => {
            injectValues.$scope.subdomain = 'subdomain';
            const ctrl = $controller('ViewCtrl', injectValues);

            await ctrl.updatePreview();

            expect(jQuery.attr).toHaveBeenCalledWith('src', [
                'subdomain',
                pokemon1,
                'gallery',
                expect.any(Boolean),
            ]);
        });

        it('should redirect to views on error', async () => {
            injectValues.DatasetService.draft.mockRejectedValue({ data: { error: 'example error' } });
            const ctrl = $controller('ViewCtrl', injectValues);

            await ctrl.updatePreview();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.views');
            expect(injectValues.$scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('example error');
        });
    });

    describe('when #checkDependency is called', () => {
        it('should return null for column and duration', () => {
            const ctrl = $controller('ViewCtrl', injectValues);

            expect(ctrl.checkDependency('column')).toBe(null);
            expect(ctrl.checkDependency('duration')).toBe(null);
        });

        it('should return null for inexistent column', () => {
            const ctrl = $controller('ViewCtrl', injectValues);

            expect(ctrl.checkDependency('example column')).toBe(null);
        });

        it('should return column', () => {
            injectValues.view.settings = [
                {
                    name: 'first',
                    displayAs: 'example',
                },
            ];
            const ctrl = $controller('ViewCtrl', injectValues);

            expect(ctrl.checkDependency('first')).toEqual({
                name: 'first',
                display: 'example',
            });
        });
    });

    describe('when #dataTypeMatch is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should return a function', () => {
            expect(ctrl.dataTypeMatch()).toEqual(expect.any(Function));
        });

        it('should check whether a column is of the proper type (single)', () => {
            const fn = ctrl.dataTypeMatch('integer');

            expect(fn('Image URL')).toBe(false);
            expect(fn('Max HP')).toBe(true);
            expect(fn('inexistent')).toBe(false);
        });

        it('should check whether a column is of the proper type (array)', () => {
            const fn = ctrl.dataTypeMatch(['integer', 'string']);

            expect(fn('Image URL')).toBe(true);
            expect(fn('Max HP')).toBe(true);
            expect(fn('inexistent')).toBe(false);
        });
    });

    describe('when #appendNumberOfItems is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should return untouched list of columns', () => {
            expect(ctrl.appendNumberOfItems('other', ['column'])).toEqual(['column']);
        });

        it('should add number of items', () => {
            expect(ctrl.appendNumberOfItems('Aggregate By', ['column'])).toEqual(['column', 'Number of Items']);
            expect(ctrl.appendNumberOfItems('Y Axis', ['column'])).toEqual(['column', 'Number of Items']);
            expect(ctrl.appendNumberOfItems('Bars', ['column'])).toEqual(['column', 'Number of Items']);
            expect(ctrl.appendNumberOfItems('Bubble Size', ['column'])).toEqual(['column', 'Number of Items']);
        });
    });

    describe('when #allFieldsIncluded is called', () => {
        let ctrl;

        beforeEach(() => {
            injectValues.view.settings = [
                {
                    name: 'first',
                    inputType: 'menu',
                    tab: 'Controls',
                },
                {
                    name: 'second',
                    inputType: 'menu',
                    tab: 'Controls',
                    selectFrom: 'duration',
                    durations: ['Year', 'Month', 'Day'],
                },
            ];
        });

        it('should return true for special select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.includedCustomFields = ['Year', 'Month', 'Day'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.allFieldsIncluded('includedCustomFields', 'second', 'duration')).toBe(true);
        });

        it('should return false for special select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.includedCustomFields = ['Year'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.allFieldsIncluded('includedCustomFields', 'second', 'duration')).toBe(false);
        });

        it('should return true for other select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.excludedCustomFields = [];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.allFieldsIncluded('excludedCustomFields', 'second', null)).toBe(true);
        });

        it('should return false for other select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.excludedCustomFields = ['Name'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.allFieldsIncluded('excludedCustomFields', 'second', null)).toBe(false);
        });
    });

    describe('when #isFieldIncluded is called', () => {
        let ctrl;

        beforeEach(() => {
            injectValues.view.settings = [
                {
                    name: 'first',
                    inputType: 'menu',
                    tab: 'Controls',
                },
                {
                    name: 'second',
                    inputType: 'menu',
                    tab: 'Controls',
                    selectFrom: 'duration',
                },
            ];
        });

        it('should return true for special select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.includedCustomFields = ['Year', 'Month', 'Day'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.isFieldIncluded('includedCustomFields', 'Year', 'duration')).toBe(true);
        });

        it('should return false for special select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.includedCustomFields = ['Year'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.isFieldIncluded('includedCustomFields', 'Day', 'duration')).toBe(false);
        });

        it('should return true for other select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.excludedCustomFields = [];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.isFieldIncluded('excludedCustomFields', 'Name', null)).toBe(true);
        });

        it('should return false for other select from', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery.excludedCustomFields = ['Name'];
            ctrl = $controller('ViewCtrl', injectValues);
            expect(ctrl.isFieldIncluded('excludedCustomFields', 'Name', null)).toBe(false);
        });
    });

    describe('when #includeExcludeAllFields is called', () => {
        let ctrl;

        beforeEach(() => {
            injectValues.view.settings = [
                {
                    name: 'first',
                    inputType: 'menu',
                    tab: 'Controls',
                    restrictColumnDataType: 'ToString',
                    displayAs: 'First',
                    selectFrom: 'column',
                },
            ];
            injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Type 1', 'Name'];
            ctrl = $controller('ViewCtrl', injectValues);
            ctrl.data.excludeFields = ['Name', 'Invalid field'];
        });

        it('should toggle excluded columns', () => {
            ctrl.includeExcludeAllFields('excludeFields', 'first');
            expect(ctrl.data.excludeFields).toEqual([]);
            ctrl.includeExcludeAllFields('excludeFields', 'first');
            expect(ctrl.data.excludeFields).toEqual(['Type 1', 'Name']);
        });
    });

    describe('when #includeExcludeField is called', () => {
        it('should add column to excluded', () => {
            injectValues.view.settings = [
                {
                    inputType: 'menu',
                    tab: 'Controls',
                    restrictColumnDataType: 'ToString',
                    displayAs: 'First',
                },
            ];
            injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Max HP', 'Name'];
            const ctrl = $controller('ViewCtrl', injectValues);
            ctrl.data.excludeFields = ['Max HP'];

            ctrl.includeExcludeField('Name', 'excludeFields', null, false);

            expect(ctrl.data.excludeFields).toEqual(['Max HP', 'Name']);
        });

        it('should remove column from excluded', () => {
            injectValues.view.settings = [
                {
                    inputType: 'menu',
                    tab: 'Controls',
                    restrictColumnDataType: 'ToString',
                    displayAs: 'First',
                },
            ];
            injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Max HP', 'Name'];
            const ctrl = $controller('ViewCtrl', injectValues);
            ctrl.data.excludeFields = ['Max HP'];

            ctrl.includeExcludeField('Max HP', 'excludeFields', null, false);

            expect(ctrl.data.excludeFields).toEqual([]);
        });

        it('should skip selected column', () => {
            injectValues.view.settings = [
                {
                    inputType: 'menu',
                    tab: 'Controls',
                    restrictColumnDataType: 'ToString',
                    displayAs: 'First',
                },
            ];
            injectValues.$scope.datasetViewsCtrl.colsAvailable = ['Max HP', 'Name'];
            const ctrl = $controller('ViewCtrl', injectValues);
            ctrl.data.excludeFields = ['Max HP'];

            ctrl.includeExcludeField('Max HP', 'excludeFields', null, true);

            expect(ctrl.data.excludeFields).toEqual(['Max HP']);
        });
    });

    describe('when #setDefaultSetting is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should set setting when it is included for special select from', () => {
            ctrl.data.defaultSortByColumnName = ['Year', 'Month', 'Day'];
            ctrl.setDefaultSetting('defaultSortByColumnName', 'exampleSetting', 'duration', 'Year');

            expect(ctrl.data.exampleSetting).toBe('Year');
        });

        it('should set setting when it is not included for special select from', () => {
            ctrl.data.defaultSortByColumnName = ['Year', 'Month', 'Day'];
            ctrl.setDefaultSetting('defaultSortByColumnName', 'exampleSetting', 'duration', 'Hour');

            expect(ctrl.data.exampleSetting).toBe('Hour');
            expect(ctrl.data.defaultSortByColumnName).toEqual(['Year', 'Month', 'Day', 'Hour']);
        });

        it('should set setting when it is not included for other select from', () => {
            ctrl.data.defaultSortByColumnName = [];
            ctrl.setDefaultSetting('defaultSortByColumnName', 'exampleSetting', null, 'Image URL');

            expect(ctrl.data.exampleSetting).toBe('Image URL');
        });

        it('should set setting when it is included for other select from', () => {
            ctrl.data.defaultSortByColumnName = ['Image URL'];
            ctrl.setDefaultSetting('defaultSortByColumnName', 'exampleSetting', null, 'Image URL');

            expect(ctrl.data.exampleSetting).toBe('Image URL');
            expect(ctrl.data.defaultSortByColumnName).toEqual([]);
        });
    });

    describe('when #excludeBy is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should return a function', () => {
            expect(ctrl.excludeBy()).toEqual(expect.any(Function));
        });

        it('should check whether an input is excluded', () => {
            ctrl.data.excludeFields = ['Max HP'];
            const fn = ctrl.excludeBy('excludeFields');

            expect(fn('Image URL')).toBe(true);
            expect(fn('Max HP')).toBe(false);
        });

        it('should exclude all fields', () => {
            const fn = ctrl.excludeBy();

            expect(fn('example')).toBe(true);
        });
    });

    describe('when #hide is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should save changes', () => {
            ctrl.data = { param: 'value' };
            ctrl.hide();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_views.views.gallery).toEqual({ param: 'value' });
            expect(injectValues.$scope.datasetOneCtrl.form.$setDirty).toHaveBeenCalled();
        });

        it('should redirect to views', () => {
            ctrl.hide();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.views');
        });
    });

    describe('when #cancel is called', () => {
        let ctrl;

        beforeEach(() => {
            ctrl = $controller('ViewCtrl', injectValues);
        });

        it('should show confirmation dialog', () => {
            injectValues.view = {
                displayAs: 'Gallery',
            };
            ctrl.data = { param: 'value' };
            ctrl.cancel();

            expect(injectValues.modalService.openConfirmModal).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching('Gallery'),
                expect.any(String),
                expect.any(String),
            );
        });

        it('should redirect to views after confirmation', async () => {
            ctrl.data = { param: 'value' };

            await ctrl.cancel();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.views');
        });

        it('should redirect to views when nothing changed', () => {
            ctrl.cancel();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.views');
        });
    });
});
