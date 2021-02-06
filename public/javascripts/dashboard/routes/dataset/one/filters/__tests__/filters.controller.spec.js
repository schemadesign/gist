import { merge, cloneDeep, set } from 'lodash';

import '../filters.controller';
import { pokemon1 } from '../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetFilters: Controller', () => {
    let $rootScope, $controller;
    let injectValues;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1, {
            columns: [
                { name: 'Pokemon No' },
                { name: 'Name' },
            ],
            fe_filters: {
                valuesToExcludeByOriginalKey: {
                    'Some Field': ['Some Value'],
                },
            },
        });

        const $scope = $rootScope.$new().$new();

        $scope.datasetOneCtrl = {
            dataset,
            originalDataset: cloneDeep(dataset),
            additionalDatasources: [],
            verifyDatasetValidity: jest.fn(),
            getVisibleColumnNames: jest.fn().mockReturnValue([]),
            getSortedColumns: jest.fn().mockReturnValue([]),
        };

        injectValues = {
            $scope,
            modalService: {
                openDialog: jest.fn().mockResolvedValue(dataset),
            },
        };
    });

    it('should set available columns', () => {
        injectValues.$scope.datasetOneCtrl.getVisibleColumnNames.mockReturnValue(['columns']);

        const ctrl = $controller('DatasetFiltersCtrl', injectValues);

        expect(ctrl.colsAvailable).toEqual(['columns']);
    });

    it('should preserve current filter values to exclude', () => {
        $controller('DatasetFiltersCtrl', injectValues);

        expect(injectValues.$scope.datasetOneCtrl.dataset)
            .toHaveProperty('fe_filters.valuesToExcludeByOriginalKey', {
                'Some Field': ['Some Value'],
                _all: [],
            });
    });

    /**
     * When DatasetFiltersCtrl is instantiated
     * if dataset.fe_filters.fieldsNotAvailable is empty then excludeAll should be false
     */
    it('should instantiate excludeAll correctly', () => {
        const ctrl = $controller('DatasetFiltersCtrl', injectValues);

        expect(ctrl.excludeAll).toBeFalsy();
    });

    it('should set fabricated filters', () => {
        injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
            { title: 'first', choices: [{ title: 'first', match: { field: 'rowParams.first' } }] },
        ];
        const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

        expect(ctrl.fabricatedFilters).toEqual([
            { title: 'first', choices: [{ title: 'first', match: { field: 'first' } }] },
        ]);
    });

    it('should set default filters', () => {
        injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
            { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
            { title: 'second', choices: [{ title: 2, match: { field: '' } }] },
        ];
        injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = { first: 1, second: 2 };
        const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

        expect(ctrl.defaultFilters).toEqual([
            { name: 'first', value: 1 },
            { name: 'second', value: 2 },
        ]);
    });

    it('should not set basic filters to default filters', () => {
        injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
            { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
        ];
        injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = {
            first: 1,
            'Has Title': 'Has Title',
            'Has Image': 'Has Image',
        };
        const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

        expect(ctrl.defaultFilters).toEqual([
            { name: 'first', value: 1 },
        ]);
    });

    describe('when #toggleFilter is called', () => {
        it('should add column to fields not available', () => {
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);

            ctrl.toggleFilter('second');

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable).toContainEqual('second');
        });

        it('should remove column from fields not available', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable = ['second'];
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);

            ctrl.toggleFilter('second');

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable).not.toContainEqual('second');
        });

        it('should verify if dataset is valid', () => {
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);

            ctrl.toggleFilter('sample');

            expect(injectValues.$scope.datasetOneCtrl.verifyDatasetValidity).toHaveBeenCalled();
        });
    });

    describe('when #editFilter is called', () => {
        it('should open dialog', () => {
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);

            ctrl.editFilter({
                name: 'sample name',
                sample: 'filter sample',
                custom: 'custom value',
                customFieldIndex: 'field index',
            });

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('field', {
                fieldName: 'sample name',
                firstRecord: 'filter sample',
                custom: 'custom value',
                dataset: injectValues.$scope.datasetOneCtrl.dataset,
                customFieldIndex: 'field index',
                filterOnly: true,
            });
        });

        it('should update dataset from dialog', async () => {
            injectValues.modalService.openDialog.mockResolvedValue({ dataset: 'new dataset' });
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);

            await ctrl.editFilter({});

            expect(injectValues.$scope.datasetOneCtrl.dataset).toBe('new dataset');
        });
    });

    describe('when #addDefaultFilter is called', () => {
        it('should add empty filter', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
            ];
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = { first: 1 };
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            injectValues.$scope.$digest();
            ctrl.addDefaultFilter();
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default).toEqual({ first: 1, '': '' });
        });
    });

    describe('when #removeDefaultFilter is called', () => {
        it('should remove filter', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
                { title: 'second', choices: [{ title: 2, match: { field: '' } }] },
                { title: 'third', choices: [{ title: 3, match: { field: '' } }] },
            ];
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = { first: 1, second: 2, third: 3 };
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            ctrl.removeDefaultFilter(ctrl.defaultFilters[1]);
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default).toEqual({ first: 1, third: 3 });
        });

        it('should not remove basic filters from default filters', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
            ];
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = {
                first: 1,
                'Has Title': 'Has Title',
                'Has Image': 'Has Image',
            };
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            ctrl.removeDefaultFilter(ctrl.defaultFilters[0]);
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default).toEqual({
                'Has Title': 'Has Title',
                'Has Image': 'Has Image',
            });
        });
    });

    describe('when #verifyUniqueDefaultFilter is called', () => {
        it('should set field valid', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
                { title: 'second', choices: [{ title: 2, match: { field: '' } }] },
            ];
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = { first: 1, second: 2 };
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.defaultValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueDefaultFilter({ name: 'third', value: 3 }, 0);

            expect(ctrl.form.defaultValue_0.$setValidity).toHaveBeenCalledWith('unique', true);
        });

        it('should set field invalid', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 1, match: { field: '' } }] },
                { title: 'second', choices: [{ title: 2, match: { field: '' } }] },
            ];
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.default = { first: 1, second: 2 };
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.defaultValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueDefaultFilter({ name: 'second', value: 2 }, 0);

            expect(ctrl.form.defaultValue_0.$setValidity).toHaveBeenCalledWith('unique', false);
        });
    });

    describe('when #addFabricated is called', () => {
        it('should not add fabricated filter when an empty one exists', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: '', choices: [{ match: { field: '' } }] },
            ];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            ctrl.addFabricated();
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated).toEqual([
                { title: '', choices: [{ match: { field: 'rowParams.' } }] },
            ]);
        });

        it('should add fabricated filter', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            ctrl.addFabricated();
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated).toContainEqual({
                title: '',
                choices: [{
                    title: '',
                    match: {
                        field: 'rowParams.',
                        exist: true,
                        nin: [],
                    },
                }],
            });
        });
    });

    describe('when #removeFabricated is called', () => {
        it('should remove fabricated filter', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ match: { field: 'first' } }] },
                { title: 'second', choices: [{ match: { field: 'second' } }] },
            ];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            ctrl.removeFabricated(ctrl.fabricatedFilters[0]);
            injectValues.$scope.$digest();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated).toEqual([{
                title: 'second', choices: [{ match: { field: 'rowParams.second' } }],
            }]);
        });
    });

    describe('when #getFabricatedChoices is called', () => {
        it('should return choices from fabricated filter', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [
                { title: 'first', choices: [{ title: 'choice', match: { field: 'first' } }] },
            ];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);

            expect(ctrl.getFabricatedChoices('first')).toEqual([{ title: 'choice', match: { field: 'first' } }]);
        });
    });

    describe('when #verifyUniqueFabricated is called', () => {
        it('should set fields valid', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [{
                title: 'first', choices: [{ title: 'first', match: { field: '' } }],
            }, {
                title: 'second', choices: [{ title: 'second', match: { field: '' } }],
            }];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.fabricatedTitle_0.$setValidity', jest.fn());
            set(ctrl, 'form.fabricatedValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueFabricated({ title: 'third', choices: [{ title: 'third' }] }, 0);

            expect(ctrl.form.fabricatedTitle_0.$setValidity).toHaveBeenCalledWith('unique', true);
            expect(ctrl.form.fabricatedValue_0.$setValidity).toHaveBeenCalledWith('unique', true);
        });

        it('should set title invalid', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [{
                title: 'first', choices: [{ title: 'first', match: { field: '' } }],
            }, {
                title: 'second', choices: [{ title: 'second', match: { field: '' } }],
            }];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.fabricatedTitle_0.$setValidity', jest.fn());
            set(ctrl, 'form.fabricatedValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueFabricated({ title: 'second', choices: [{ title: 'third' }] }, 0);

            expect(ctrl.form.fabricatedTitle_0.$setValidity).toHaveBeenCalledWith('unique', false);
            expect(ctrl.form.fabricatedValue_0.$setValidity).toHaveBeenCalledWith('unique', true);
        });

        it('should set value invalid', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [{
                title: 'first', choices: [{ title: 'first', match: { field: '' } }],
            }, {
                title: 'second', choices: [{ title: 'second', match: { field: '' } }],
            }];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.fabricatedTitle_0.$setValidity', jest.fn());
            set(ctrl, 'form.fabricatedValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueFabricated({ title: 'third', choices: [{ title: 'second' }] }, 0);

            expect(ctrl.form.fabricatedTitle_0.$setValidity).toHaveBeenCalledWith('unique', true);
            expect(ctrl.form.fabricatedValue_0.$setValidity).toHaveBeenCalledWith('unique', false);
        });

        it('should set value invalid for has title name', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.fabricatedTitle_0.$setValidity', jest.fn());
            set(ctrl, 'form.fabricatedValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueFabricated({ title: 'Has Title', choices: [{ title: 'Has Title' }] }, 0);

            expect(ctrl.form.fabricatedTitle_0.$setValidity).toHaveBeenCalledWith('unique', false);
            expect(ctrl.form.fabricatedValue_0.$setValidity).toHaveBeenCalledWith('unique', false);
        });

        it('should set value invalid for has image name', () => {
            injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fabricated = [];
            const ctrl = $controller('DatasetFiltersCtrl as datasetFiltersCtrl', injectValues);
            set(ctrl, 'form.fabricatedTitle_0.$setValidity', jest.fn());
            set(ctrl, 'form.fabricatedValue_0.$setValidity', jest.fn());

            ctrl.verifyUniqueFabricated({ title: 'Has Image', choices: [{ title: 'Has Image' }] }, 0);

            expect(ctrl.form.fabricatedTitle_0.$setValidity).toHaveBeenCalledWith('unique', false);
            expect(ctrl.form.fabricatedValue_0.$setValidity).toHaveBeenCalledWith('unique', false);
        });
    });

    describe('when #toggleExcludeAll is called', () => {
        it('should exclude all fields', () => {
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);
            ctrl.excludeAll = true;

            ctrl.toggleExcludeAll();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable).toEqual([]);
            expect(ctrl.excludeAll).toBe(false);
        });

        it('should include all fields', () => {
            const ctrl = $controller('DatasetFiltersCtrl', injectValues);
            ctrl.fields = [{ name: 'first' }, { name: 'second' }];
            ctrl.excludeAll = false;

            ctrl.toggleExcludeAll();

            expect(injectValues.$scope.datasetOneCtrl.dataset.fe_filters.fieldsNotAvailable).toEqual(['first', 'second']);
            expect(ctrl.excludeAll).toBe(true);
        });
    });
});
