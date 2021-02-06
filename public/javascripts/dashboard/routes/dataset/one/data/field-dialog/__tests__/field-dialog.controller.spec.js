import { noop } from 'lodash';

import '../field-dialog.controller';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('FieldDialog: Controller', () => {
    let $rootScope, $controller;
    let $scope;

    const $mdDialog = {
        hide: jest.fn(),
        cancel: jest.fn(),
    };
    const injectValues = {
        DATA_TYPES: [],
        Content: {},
        DatasetService: {},
        fieldName: 'Name',
        firstRecord: '',
        dataset: pokemon1,
        custom: '',
        customFieldIndex: undefined,
        filterOnly: true,
        columnIndex: 0,
        KNOWN_DATE_FORMATS: ['MM/DD/YYYY', 'DD.MM.YYYY'],
        $mdDialog,
        user: { role: 'superAdmin' },
    };

    beforeEach(() => {
        angular.mock.module('arraysApp');
        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;

            $scope = $rootScope.$new();
            $scope.dialog = {
                form: {
                    $dirty: true,
                    $setPristine: noop,
                    fieldName: {
                        $modelValue: 'customField',
                    },
                },
            };
        });
    });

    describe('save', () => {
        it('should call $mdDialog.hide with dataset object containing new filter override object', () => {
            $controller('FieldDialogCtrl', {
                ...injectValues,
                customFieldIndex: 0,
                $scope,
                filterOnly: true,
            });

            $scope.dataset.columns = [];
            $scope.dataset.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName.Name = [
                { value: 'val', override: 'over' },
            ];

            $scope.save();

            expect($mdDialog.hide).toHaveBeenCalledWith({
                dataset: expect.objectContaining({
                    fe_filters: expect.objectContaining({
                        oneToOneOverrideWithValuesByTitleByFieldName: {
                            Name: [{ value: 'val', override: 'over' }],
                        },
                    }),
                }),
            });
        });

        it('should add new custom field to excluded fields', () => {
            $controller('FieldDialogCtrl', {
                ...injectValues,
                customFieldIndex: 0,
                $scope,
                $mdDialog,
                filterOnly: false,
            });

            $scope.save();

            expect($mdDialog.hide).toHaveBeenCalledWith({
                dataset: expect.objectContaining({
                    fe_excludeFieldsObjDetail: expect.objectContaining({
                        customField: false,
                    }),
                    fe_excludeFields: expect.objectContaining({
                        customField: false,
                    }),
                }),
            });
        });
    });

    describe('KNOWN_DATE_VALUES', () => {
        it('should assign KNOWN_DATE_VALUES to controller', () => {
            const ctrl = $controller('FieldDialogCtrl', {
                ...injectValues,
                $scope,
            });

            expect(ctrl).toHaveProperty('KNOWN_DATE_FORMATS', ['MM/DD/YYYY', 'DD.MM.YYYY']);
        });
    });

    describe('delimited field button', () => {
        it('should call $mdDialog.cancel with the fieldName', () => {
            $controller('FieldDialogCtrl', {
                ...injectValues,
                $scope,
                $mdDialog,
            });

            $scope.newDelimitedField();

            expect($mdDialog.cancel).toHaveBeenCalledWith(injectValues.fieldName);
        });

        it('should set customField.fieldName and customField.fieldsToMergeIntoArray', () => {
            $controller('FieldDialogCtrl', {
                ...injectValues,
                customFieldIndex: 0,
                custom: {
                    userDelimitedField: 'Name',
                },
                $scope,
            });

            $scope.reset();

            expect($scope.customField.fieldName).toBe(injectValues.fieldName);
            expect($scope.customField.fieldsToMergeIntoArray[0]).toBe(injectValues.fieldName);
        });
    });

    describe('remove created field', () => {
        it('should call $mdDialog.hide with dataset', async () => {
            const response = { data: [] };
            injectValues.Content = {
                removeField: jest.fn().mockReturnValue({
                    $promise: Promise.resolve(response),
                }),
            };
            injectValues.DatasetService = {
                canExcludeField: jest.fn().mockResolvedValue({}),
            };

            $controller('FieldDialogCtrl', {
                ...injectValues,
                $scope,
                $mdDialog,
            });

            await $scope.removeCreatedField();

            expect($mdDialog.hide).toHaveBeenCalledWith({ dataset: response, instantSave: true });
        });

        it('should call $mdDialog.hide with error', async () => {
            const error = { data: { error: 'error while removing' } };
            injectValues.Content = {
                removeField: jest.fn().mockReturnValue({
                    $promise: Promise.reject(error),
                }),
            };
            injectValues.DatasetService = {
                canExcludeField: jest.fn().mockResolvedValue({}),
            };

            $controller('FieldDialogCtrl', {
                ...injectValues,
                $scope,
                $mdDialog,
            });

            await $scope.removeCreatedField();

            expect($mdDialog.hide).toHaveBeenCalledWith({ error: 'error while removing' });
        });

        it('should call $mdDialog.hide with field in use error', async () => {
            const error = { data: { error: 'field in use' } };
            injectValues.Content = {
                removeField: jest.fn().mockReturnValue({
                    $promise: Promise.reject(error),
                }),
            };
            injectValues.DatasetService = {
                canExcludeField: jest.fn().mockResolvedValue({}),
            };

            $controller('FieldDialogCtrl', {
                ...injectValues,
                $scope,
                $mdDialog,
            });

            await $scope.removeCreatedField();

            expect($mdDialog.hide).toHaveBeenCalledWith({ error: 'field in use' });
        });
    });
});
