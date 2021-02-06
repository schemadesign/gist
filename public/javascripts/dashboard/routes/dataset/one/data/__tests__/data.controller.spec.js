import { cloneDeep, merge, noop } from 'lodash';

import '../data.controller';
import { pokemon1 } from '../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetData: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues;
    let DatasetService = {
        save: jest.fn(),
        canExcludeField: jest.fn().mockResolvedValue(true),
    };

    const showSimpleToast = jest.fn().mockReturnValue();

    const event = {
        preventDefault: noop,
        stopPropagation: noop,
    };

    beforeEach(() => {
        angular.mock.module('arraysApp');


        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        DatasetService.canExcludeField.mockClear();

        $scope = $rootScope.$new().$new();
        const dataset = merge({}, pokemon1, {
            columns: [
                { name: 'Pokemon No' },
                { name: 'Name' },
            ],
            fe_filters: {
                valuesToExcludeByOriginalKey: {
                    'Some Field': ['Some Value'],
                },
                excludeFields: [],
            },
        });

        $scope.datasetOneCtrl = {
            dataset,
            originalDataset: cloneDeep(dataset),
            additionalDatasources: [],
            getSortedColumns: jest.fn().mockReturnValue([]),
            verifyDatasetValidity: jest.fn(),
            isDirty: jest.fn(),
            form: {
                $setPristine: jest.fn(),
            },
        };

        $scope.datasetCtrl = {
            showSimpleToast,
        };

        injectValues = {
            $scope,
            DATA_TYPES: [],
            Content: {
                createField: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
            },
            DatasetService,
            modalService: {
                openDialog: jest.fn().mockResolvedValue([]),
            },
            AclService: {
                can: jest.fn().mockReturnValue(true),
            },
        };
    });

    it('should instantiate maxSampleDataLength correctly', () => {
        const ctrl = $controller('DatasetDataCtrl', injectValues);

        expect(ctrl.maxSampleDataLength).toEqual(expect.any(Number));
    });

    it('should instantiate canEditFields correctly', () => {
        let ctrl = $controller('DatasetDataCtrl', injectValues);

        expect(ctrl.canEditFields).toBe(true);

        injectValues.AclService.can.mockReturnValue(false);
        ctrl = $controller('DatasetDataCtrl', injectValues);

        expect(ctrl.canEditFields).toBe(false);
    });

    it('should instantiate fieldSortableOptions correctly', () => {
        let ctrl = $controller('DatasetDataCtrl', injectValues);

        expect(ctrl.fieldSortableOptions).toEqual(expect.any(Object));
        expect(ctrl.fieldSortableOptions).toHaveProperty('stop', expect.any(Function));
        expect(ctrl.fieldSortableOptions).toHaveProperty('disabled', false);

        ctrl.filteredFields = [{ name: 'one' }, { name: 'two' }];
        ctrl.fieldSortableOptions.stop();

        expect($scope.datasetOneCtrl.dataset.fe_fieldDisplayOrder).toEqual(['one', 'two']);
    });

    it('should instantiate excludeAll correctly', () => {
        $scope.datasetOneCtrl.dataset.fe_excludeFields = [false, true, false];
        const ctrl = $controller('DatasetDataCtrl', injectValues);

        expect(ctrl.excludeAll).toBeFalsy();
    });

    describe('when #openFieldDialog is called', () => {
        it('should open dialog', () => {
            $scope.user = 'example user';
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.openFieldDialog('field name', 'first record', 'custom', 'custom field index');

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('field', {
                fieldName: 'field name',
                firstRecord: 'first record',
                custom: 'custom',
                dataset: $scope.datasetOneCtrl.dataset,
                customFieldIndex: 'custom field index',
                user: 'example user',
            });
        });

        it('should open dialog with additional datasource', () => {
            $scope.user = 'example user';
            $scope.datasetOneCtrl.additionalDatasources = [{ additional: 'example' }];
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.fieldFilter.sourceName = 'additional source';
            ctrl.openFieldDialog('field name', 'first record', 'custom', 'custom field index');

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('field', expect.objectContaining({
                dataset: { additional: 'example' },
            }));
        });

        it('should append dataset', async () => {
            injectValues.modalService.openDialog.mockResolvedValue({ dataset: { data: 'new' } });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.openFieldDialog();

            expect($scope.datasetOneCtrl.dataset).toEqual({ data: 'new', fe_fieldDisplayOrder: [] });
        });

        it('should append additional datasource', async () => {
            injectValues.modalService.openDialog.mockResolvedValue({ dataset: { datasource: 'new' } });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.fieldFilter.sourceName = 'additional source';
            await ctrl.openFieldDialog();

            expect($scope.datasetOneCtrl.additionalDatasources).toEqual([{ datasource: 'new' }]);
        });
    });

    describe('when #openNestedDialog is called', () => {
        it('should open dialog', () => {
            $scope.user = 'example user';
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.openNestedDialog();

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('nested', {
                dataset: $scope.datasetOneCtrl.dataset,
                additionalDatasources: $scope.datasetOneCtrl.additionalDatasources,
            });
        });

        it('should append dataset', async () => {
            injectValues.modalService.openDialog.mockResolvedValue({
                dataset: 'new dataset', additionalDatasources: 'new additional',
            });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.openNestedDialog();

            expect($scope.datasetOneCtrl.dataset).toEqual('new dataset');
            expect($scope.datasetOneCtrl.additionalDatasources).toEqual('new additional');
        });

        it('should reset fields', async () => {
            $scope.datasetOneCtrl.getSortedColumns.mockReturnValue([{
                sourceName: pokemon1.fileName, sourceType: 'spreadsheet',
            }, {
                sourceName: 'other-file.csv', sourceType: 'spreadsheet',
            }]);
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.openNestedDialog();

            expect(ctrl.fields).toEqual([{
                sourceName: pokemon1.fileName, sourceType: 'spreadsheet',
            }, {
                sourceName: 'other-file.csv', sourceType: 'spreadsheet',
            }]);
            expect(ctrl.filteredFields).toEqual([{
                sourceName: pokemon1.fileName, sourceType: 'spreadsheet',
            }]);
        });
    });

    describe('when #changeSourceNameFilter is called', () => {
        it('should set spreadsheet', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.changeSourceNameFilter({ fileName: 'spreadsheet name' });

            expect(ctrl.fieldFilter).toEqual({
                sourceName: 'spreadsheet name',
                sourceType: 'spreadsheet',
                sourceDisplay: 'spreadsheet name',
            });
        });

        it('should set database', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.changeSourceNameFilter({ connection: { url: 'connection url', tableName: 'connection table' } });

            expect(ctrl.fieldFilter).toEqual({
                sourceName: 'connection url',
                sourceType: 'database',
                sourceDisplay: 'connection table',
            });
        });

        it('should set api end point', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.changeSourceNameFilter({ apiEndPoint: 'http://endpoint.com' });

            expect(ctrl.fieldFilter).toEqual({
                sourceName: 'http://endpoint.com',
                sourceType: 'spreadsheet',
                sourceDisplay: 'http://endpoint.com',
            });
        });
    });

    describe('when #openJoinDialog is called', () => {
        it('should open dialog', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.openJoinDialog();

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('join', {
                dataset: $scope.datasetOneCtrl.dataset,
            });
        });

        it('should append dataset', async () => {
            injectValues.modalService.openDialog.mockResolvedValue({ dataset: 'new' });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.openJoinDialog();

            expect($scope.datasetOneCtrl.dataset).toEqual({ dataset: 'new', fe_fieldDisplayOrder: [] });
        });
    });

    describe('when #addField is called', () => {
        it('should open dialog', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            ctrl.addField();

            expect(injectValues.modalService.openDialog).toHaveBeenCalledWith('newField', {
                name: '',
                dataType: 'Text',
                dataTypes: [],
            });
        });

        it('should call show simple toast', async () => {
            const data = { name: 'name', dataType: 'dataType' };
            injectValues.modalService.openDialog.mockResolvedValue(data);
            injectValues.Content.createField = jest.fn().mockReturnValue({
                $promise: Promise.resolve({ newData: 'newData' }),
            });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.addField();

            expect($scope.datasetOneCtrl.dataset.newData).toEqual('newData');
            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Added field');
        });

        it('should call show simple toast with error', async () => {
            const data = { name: 'name', dataType: 'dataType' };
            injectValues.modalService.openDialog.mockResolvedValue(data);
            injectValues.Content.createField = jest.fn().mockReturnValue({
                $promise: Promise.reject({ data: { error: 'error' } }),
            });
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.addField();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('error');
        });
    });

    describe('when #toggleExclude is called', () => {
        it('should set excluded fields', () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            $scope.datasetOneCtrl.dataset.fe_excludeFields = {};
            ctrl.excludeAll = true;
            ctrl.fields = [{ name: 'first' }, { name: 'second' }];
            ctrl.toggleExclude();

            expect($scope.datasetOneCtrl.dataset.fe_excludeFields).toEqual({ first: true, second: true });
            expect(ctrl.excludeAll).toBe(false);
        });
    });

    describe('when validateExclusion is called', () => {
        it('should call DatasetService.canExcludeField', async () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.validateExclusion(event, 'FieldName');

            expect(DatasetService.canExcludeField).toHaveBeenCalledWith($scope.datasetOneCtrl.dataset._id, 'FieldName');
        });

        it('should leave field in exclude fields if it resolves', async () => {
            $scope.datasetOneCtrl.dataset = merge($scope.datasetOneCtrl.dataset, {
                fe_excludeFields: [
                    'FieldName',
                ],
            });

            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.validateExclusion(event, 'FieldName');

            expect($scope.datasetOneCtrl.dataset.fe_excludeFields['FieldName']).toBe(true);
        });

        it('should call $scope.datasetCtrl.showSimpleToast when it fails', async () => {
            const ctrl = $controller('DatasetDataCtrl', injectValues);

            const error = {
                data: {
                    error: 'An error',
                },
            };

            injectValues.DatasetService.canExcludeField = jest.fn().mockRejectedValue(error);

            await ctrl.validateExclusion(event, 'FieldName');

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalled();
        });

        it('should remove field name from exclusion when it fails', async () => {
            $scope.datasetOneCtrl.dataset = merge($scope.datasetOneCtrl.dataset, {
                fe_excludeFields: [
                    'FieldName',
                ],
            });

            const error = {
                data: {
                    error: 'An error',
                },
            };

            injectValues.DatasetService.canExcludeField = jest.fn().mockRejectedValue(error);

            const ctrl = $controller('DatasetDataCtrl', injectValues);

            await ctrl.validateExclusion(event, 'FieldName');

            expect($scope.datasetOneCtrl.dataset.fe_excludeFields['FieldName']).toBe(false);
        });
    });
});
