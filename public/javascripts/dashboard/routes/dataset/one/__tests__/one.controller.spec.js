import { merge } from 'lodash';

import '../one.controller';
import '../one.constants';
import { pokemon1 } from '../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetOne: Controller', () => {
    let $rootScope, $controller, $scope, $state;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $state = {
            current: {
                name: 'dashboard.dataset.one.upload',
                params: {},
            },
            includes: function (query) {
                return this.current.name.includes(query);
            },
            is: function (query) {
                return this.current.name === query;
            },
            go: jest.fn(),
            href: jest.fn((name, params) => name.replace(/:([a-z]+)/g, (name, param) => params[param])),
        };

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
            replaced_id: 'some-replaced-id',
        });

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };
        $scope.dashboardCtrl = {
            can: jest.fn().mockReturnValue(true),
        };
        $scope.subdomain = 'glitter';
        $scope.setRemindUserUnsavedChanges = jest.fn();

        injectValues = {
            $scope,
            $state,
            DatasetService: {
                save: jest.fn(),
            },
            dataset,
            additionalDatasources: [],
            viewUrlService: {
                openViewUrl: jest.fn(),
            },
            Loader: {},
            $mdDialog: {
                show: jest.fn(),
            },
            AclService: {
                can: jest.fn().mockReturnValue(true),
            },
            Permissions: {
                isEditRole: true,
            },
            AuthService: {
                currentUser: jest.fn().mockReturnValue({ _editors: ['5a42c26e303770207ce8f83b'] }),
                updateUser: jest.fn(),
            },
        };

        ctrl = $controller('DatasetOneCtrl as datasetOneCtrl', injectValues);
    });

    it('should redirect to list when user is not a editor', () => {
        injectValues.AuthService.currentUser = jest.fn().mockReturnValue({ _editors: [] });
        injectValues.Permissions.isEditRole = false;
        $controller('DatasetOneCtrl as datasetOneCtrl', injectValues);

        expect($state.go).toHaveBeenCalledWith('dashboard.restricted');
    });

    it('should not redirect to list when user is a super admin', () => {
        injectValues.AuthService.currentUser = jest.fn().mockReturnValue({ _editors: [] });
        injectValues.Permissions.isEditRole = true;
        $controller('DatasetOneCtrl as datasetOneCtrl', injectValues);

        expect($state.go).not.toHaveBeenCalledWith('dashboard.dataset.list');
    });

    it('should set this.dataset and this.originalDataset', () => {
        expect(ctrl.dataset).toBe(injectValues.dataset);
        expect(ctrl.originalDataset).not.toBe(injectValues.dataset);
        expect(ctrl.originalDataset).toEqual(injectValues.dataset);
    });

    it('should watch dirty state and call $scope.setRemindUserUnsavedChanges when it changes', () => {
        ctrl.form = {
            $dirty: true,
        };

        $scope.$digest();
        $scope.$digest();

        expect($scope.setRemindUserUnsavedChanges).toHaveBeenCalledTimes(1);
        expect($scope.setRemindUserUnsavedChanges).toHaveBeenCalledWith(true);

        ctrl.form.$dirty = false;

        $scope.$digest();

        expect($scope.setRemindUserUnsavedChanges).toHaveBeenCalledWith(false);
    });

    describe('isProcessing', () => {
        it('should return true when state is dashboard.dataset.one.process', () => {
            $state.current.name = 'dashboard.dataset.one.process';

            expect(ctrl.isProcessing()).toBe(true);
        });

        it('should return false when state is dashboard.dataset.one.process', () => {
            $state.current.name = 'dashboard.dataset.one.data';

            expect(ctrl.isProcessing()).toBe(false);
        });
    });

    describe('getCurrentStepIndex', () => {
        it('should return proper index', () => {
            $state.current.name = 'dashboard.dataset.one.data';

            expect(ctrl.getCurrentStepIndex()).toBe(1);
        });
    });

    describe('getTargetStepIndex', () => {
        it('should return proper index when dataset.firstImport is 0', () => {
            ctrl.dataset.firstImport = 0;

            expect(ctrl.getTargetStepIndex()).toBeUndefined();
        });

        it('should return proper index when dataset.firstImport is not 0', () => {
            ctrl.dataset.firstImport = 1;

            expect(ctrl.getTargetStepIndex()).toBe(0);
        });
    });

    describe('hasNothingToUpdate', () => {
        it('should return true when form is pristine and current tab is not target tab', () => {
            ctrl.dataset.firstImport = 0;
            ctrl.form = { $dirty: false };
            $state.current.name = 'dashboard.dataset.one.upload';

            expect(ctrl.hasNothingToUpdate()).toBeTruthy();
        });

        it('should return false when form is not pristine', () => {
            ctrl.dataset.firstImport = 0;
            ctrl.form = { $dirty: true };
            $state.current.name = 'dashboard.dataset.one.upload';

            expect(ctrl.hasNothingToUpdate()).toBeFalsy();
        });

        it('should return false when form is pristine and current tab matches firstImport tab', () => {
            ctrl.dataset.firstImport = 1;
            ctrl.form = { $dirty: false };
            $state.current.name = 'dashboard.dataset.one.upload';

            expect(ctrl.hasNothingToUpdate()).toBeFalsy();
        });
    });

    describe('clearErrorLog', () => {
        it('should set dataset.lastImportErrorLog to null', () => {
            ctrl.dataset.lastImportErrorLog = 'Some error';
            ctrl.clearErrorLog();

            expect(ctrl.dataset.lastImportErrorLog).toBe(null);
        });

        it('should set save dataset', () => {
            ctrl.dataset.lastImportErrorLog = 'Some error';
            ctrl.clearErrorLog();

            expect(injectValues.DatasetService.save)
                .toHaveBeenCalledWith(expect.objectContaining({
                    lastImportErrorLog: null,
                }));
        });
    });

    describe('discardReimportedChanges', () => {
        let $mdDialog, DatasetService;

        beforeEach(() => {
            $mdDialog = {
                show: jest.fn().mockResolvedValue(),
            };
            DatasetService = {
                replaceReimportedDataset: jest.fn().mockResolvedValue({
                    status: 200,
                    data: { user: 'user' },
                }),
                remove: jest.fn().mockResolvedValue(),
            };
            ctrl = $controller('DatasetOneCtrl', {
                ...injectValues,
                $mdDialog,
                DatasetService,
                $state,
            });
        });

        it('should open dialog, replace dataset and got to upload page', async () => {
            await ctrl.discardReimportedChanges();

            expect($mdDialog.show).toHaveBeenCalled();
            expect(DatasetService.replaceReimportedDataset)
                .toHaveBeenCalledWith(injectValues.dataset._id,
                    injectValues.dataset.replaced_id,
                    injectValues.dataset.child_replacement);
            expect(DatasetService.remove)
                .toHaveBeenCalledWith(injectValues.dataset._id);
            expect($state.go)
                .toHaveBeenCalledWith('dashboard.dataset.one.upload', { id: 'some-replaced-id' });
            expect(injectValues.$scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('Reimport Changes Discarded.');
        });

        it('should not call any endpoint if dialog canceled', async () => {
            $mdDialog.show = jest.fn().mockRejectedValue();

            await ctrl.discardReimportedChanges();

            expect($mdDialog.show).toHaveBeenCalled();
            expect(DatasetService.replaceReimportedDataset).not.toHaveBeenCalled();
            expect(DatasetService.remove).not.toHaveBeenCalled();
            expect($state.go).not.toHaveBeenCalled();
            expect(injectValues.$scope.datasetCtrl.showSimpleToast).not.toHaveBeenCalled();
        });

        it('should show error toast when server responded with error', async () => {
            DatasetService.replaceReimportedDataset = jest.fn().mockRejectedValue();

            await ctrl.discardReimportedChanges();

            expect(injectValues.$scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('publish', () => {
        let DatasetService, ctrl;

        beforeEach(() => {
            DatasetService = {
                publishNewDescription: jest.fn().mockResolvedValue({
                    status: 200,
                    data: injectValues.dataset._id,
                }),
            };
            ctrl = $controller('DatasetOneCtrl', {
                ...injectValues,
                DatasetService,
                $state,
            });
        });

        it('should call API', async () => {
            await ctrl.publish();

            expect(DatasetService.publishNewDescription)
                .toHaveBeenCalledWith(injectValues.dataset._id, injectValues.dataset.replaced_id);
            expect(injectValues.$scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('Visualization Published!');
        });

        it('should show error toast if backend threw an error', async () => {
            DatasetService.publishNewDescription.mockRejectedValue();

            await ctrl.publish();

            expect(injectValues.$scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('view', () => {
        it('should call viewUrlService.openViewUrl', () => {
            ctrl.view();

            expect(injectValues.viewUrlService.openViewUrl).toHaveBeenCalledWith('glitter',
                injectValues.dataset, injectValues.dataset.fe_views.default_view);
        });
    });

    describe('revert', () => {
        it('should reset dataset object', async () => {
            ctrl.form = { $setPristine: jest.fn() };
            ctrl.dataset.title = 'Lorem';

            await ctrl.revert();

            expect(ctrl.dataset.title).toBe('Pokemon');
            expect(ctrl.form.$setPristine).toHaveBeenCalled();
        });

        it('should reset additional datasource object', async () => {
            ctrl.form = { $setPristine: jest.fn() };
            ctrl.additionalDatasources.push({ title: 'additional' });

            await ctrl.revert();

            expect(ctrl.additionalDatasources).toEqual([]);
            expect(ctrl.form.$setPristine).toHaveBeenCalled();
        });
    });

    describe('when #save is called', () => {
        beforeEach(() => {
            injectValues.DatasetService.save.mockResolvedValue({
                status: 200,
                data: {
                    dataset: merge({}, injectValues.dataset, {
                        title: 'Ipsum',
                    }),
                },
            });

            ctrl = $controller('DatasetOneCtrl', { ...injectValues, $state });
            ctrl.form = { $setPristine: jest.fn() };
            ctrl.dataset.title = 'Lorem';
            ctrl.dataset.firstImport = 2;

            $state.current.name = 'dashboard.dataset.one.data';
        });

        describe('when it is content form', () => {
            it('should save content form', (done) => {
                $scope.$on('contentSaveForm', () => done());
                $state.current.name = 'dashboard.dataset.one.content.create';
                ctrl.save();
            });
        });

        describe('when raw_rowObjects_coercionScheme has changed', () => {
            it('should show reprocess dialog when content was edited', async () => {
                injectValues.$mdDialog.show.mockRejectedValue();

                $scope.datasetOneCtrl.dataset.raw_rowObjects_coercionScheme = {};
                $scope.datasetOneCtrl.dataset.contentEdited = true;

                await ctrl.save();

                expect(injectValues.$mdDialog.show).toHaveBeenCalled();
                expect(injectValues.DatasetService.save).not.toHaveBeenCalled();
            });

            it('should not show reprocess dialog for unchanged content', () => {
                injectValues.$mdDialog.show.mockRejectedValue();

                $scope.datasetOneCtrl.dataset.raw_rowObjects_coercionScheme = {};
                $scope.datasetOneCtrl.dataset.contentEdited = false;

                ctrl.save();

                expect(injectValues.$mdDialog.show).not.toHaveBeenCalled();
            });
        });

        describe('when request succeeded', () => {
            it('should call DatasetService.save when saving dataset', async () => {
                await ctrl.save();

                expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                    _id: pokemon1._id,
                    title: 'Lorem',
                    firstImport: 3,
                    tabDestination: 3,
                });
            });

            it('should not bump firstImport if noFirstImportIncrement flag is true', async () => {
                $state.current.params = {
                    noFirstImportIncrement: true,
                };

                await ctrl.save();

                expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                    _id: pokemon1._id,
                    title: 'Lorem',
                    firstImport: 2,
                });
            });

            it('should call DatasetService.save when saving additional datasets', async () => {
                ctrl.additionalDatasources.push({ _id: 20, title: 'additional' });

                await ctrl.save();

                expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                    _id: 20,
                    title: 'additional',
                });
            });

            it('should reset dataset and originalDataset objects', async () => {
                await ctrl.save();

                expect(ctrl.originalDataset).toHaveProperty('title', 'Ipsum');
                expect(ctrl.originalDataset).toEqual(ctrl.dataset);
            });

            it('should reset additional datasources objects', async () => {
                ctrl.additionalDatasources.push({ _id: 20, title: 'additional' });
                await ctrl.save();

                expect(ctrl.originalDataset).toHaveProperty('title', 'Ipsum');
                expect(ctrl.originalDataset).toEqual(ctrl.dataset);
            });

            it('should call form.$setPristine', async () => {
                await ctrl.save();

                expect(ctrl.form.$setPristine).toHaveBeenCalled();
            });

            it('should show success toast', async () => {
                await ctrl.save();

                expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Visualization updated!');
            });

            it('should redirect to processing', async () => {
                injectValues.DatasetService.save.mockResolvedValue({
                    status: 200,
                    data: {
                        dataset: merge({}, injectValues.dataset, {
                            title: 'Ipsum',
                            jobId: 1,
                        }),
                    },
                });
                await ctrl.save();

                expect($state.go).toHaveBeenCalledWith('dashboard.dataset.one.process');
            });
        });

        describe('when request failed', () => {
            beforeEach(() => {
                injectValues.DatasetService.save.mockRejectedValue([]);
            });

            it('should not call form.$setPristine', async () => {
                await ctrl.save();

                expect(ctrl.form.$setPristine).not.toHaveBeenCalled();
            });

            it('should not update originalDataset and dataset objects', async () => {
                await ctrl.save();

                expect(ctrl.dataset).toHaveProperty('title', 'Lorem');
                expect(ctrl.originalDataset).toHaveProperty('title', pokemon1.title);
            });

            it('should restore dataset\'s firstImport property', async () => {
                ctrl.originalDataset.firstImport = 2;

                await ctrl.save();

                expect(ctrl.dataset).toHaveProperty('firstImport', 2);
            });

            it('should show error toast', async () => {
                injectValues.DatasetService.save.mockRejectedValue({ data: { error: 'example error' } });
                await ctrl.save();

                expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('example error');
            });

            it('should show generic error toast', async () => {
                await ctrl.save();

                expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
            });
        });
    });

    describe('when #setDataset is called', () => {
        it('should assign dataset', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.setDataset({
                fe_filters: { fabricated: [] },
            });

            expect(ctrl.dataset).toEqual(ctrl.originalDataset);

            ctrl.dataset.fe_filters.fabricated.push({ param: 'val' });

            expect(ctrl.dataset).not.toEqual(ctrl.originalDataset);
        });

        it('should add relationship fields to dataset.fe_excludeFields', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.setDataset({
                columns: [],
                customFieldsToProcess: [],
                fe_nestedObject: {
                    fields: [],
                },
                relationshipFields: [{
                    field: 'custom field',
                }],
            });

            expect(ctrl.dataset.fe_excludeFields).toHaveProperty('custom field', false);
        });

        it('should add nested fields to dataset.fe_excludeFields', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.setDataset({
                columns: [],
                customFieldsToProcess: [],
                relationshipFields: [],
                fe_nestedObject: {
                    prefix: 'prefix',
                    fields: ['custom field'],
                },
            });

            expect(ctrl.dataset.fe_excludeFields).toHaveProperty('prefixcustom field', false);
        });
    });

    describe('when #verifyDatasetValidity is called', () => {
        it('should set form pristine when dataset has not changed', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.form = { $setPristine: jest.fn() };

            ctrl.setDataset({});

            ctrl.verifyDatasetValidity();

            expect(ctrl.form.$setPristine).toHaveBeenCalled();
        });

        it('should set form dirty when dataset has changed', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.form = { $setDirty: jest.fn() };

            ctrl.setDataset({
                fe_filters: { fabricated: [] },
            });

            ctrl.dataset.fe_filters.fabricated.push({ param: 'val' });

            ctrl.verifyDatasetValidity();

            expect(ctrl.form.$setDirty).toHaveBeenCalled();
        });

        it('should set form dirty when additional datasource has changed', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.form = { $setDirty: jest.fn() };

            ctrl.setDataset({});

            ctrl.additionalDatasources.push({ param: 'val' });

            ctrl.verifyDatasetValidity();

            expect(ctrl.form.$setDirty).toHaveBeenCalled();
        });
    });

    describe('when #saveContentForm is called', () => {
        it('should broadcast an event', (done) => {
            $scope.$on('contentSaveForm', () => done());
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.form = {
                $setPristine: jest.fn(),
            };
            ctrl.saveContentForm();

            expect(ctrl.form.$setPristine).toHaveBeenCalled();
        });
    });

    describe('when #closeContentForm is called', () => {
        it('should set form pristine', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.form = {
                $setPristine: jest.fn(),
            };
            ctrl.closeContentForm();

            expect(ctrl.form.$setPristine).toHaveBeenCalled();
        });
    });

    describe('when #redirectToAvailableStep is called', () => {
        it('should redirect to processing when dataset is dirty', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);
            ctrl.dataset.dirty = 1;

            ctrl.redirectToAvailableStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.process', { id: pokemon1._id });
        });

        it('should redirect to list when user has no access to steps', () => {
            injectValues.WIZARD_STEPS = [
                {
                    sref: 'dashboard.dataset.one.upload',
                    restrict: 'seeFirst',
                },
                {
                    sref: 'dashboard.dataset.one.example',
                    restrict: 'seeSecond',
                },
            ];
            injectValues.$scope.dashboardCtrl.can.mockReturnValue(false);
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.redirectToAvailableStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.list');
        });

        it('should redirect to last step', () => {
            injectValues.WIZARD_STEPS = [
                {
                    sref: 'dashboard.dataset.one.upload',
                },
                {
                    sref: 'dashboard.dataset.one.example',
                },
            ];
            injectValues.dataset.tabDestination = 1;
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.redirectToAvailableStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });

        it('should redirect to second step when first is restricted', () => {
            injectValues.WIZARD_STEPS = [
                {
                    sref: 'dashboard.dataset.one.upload',
                    restrict: 'seeFirst',
                },
                {
                    sref: 'dashboard.dataset.one.example',
                },
            ];
            injectValues.dataset.tabDestination = 1;
            injectValues.$scope.dashboardCtrl.can.mockReturnValue(false);
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.redirectToAvailableStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.example');
        });

        it('should redirect to first step when second is restricted', () => {
            injectValues.WIZARD_STEPS = [
                {
                    sref: 'dashboard.dataset.one.upload',
                },
                {
                    sref: 'dashboard.dataset.one.example',
                    restrict: 'seeSecond',
                },
            ];
            injectValues.dataset.tabDestination = 2;
            injectValues.$scope.dashboardCtrl.can.mockReturnValue(false);
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.redirectToAvailableStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('when #getSortedColumns is called', () => {
        let dataset;

        beforeEach(() => {
            dataset = merge({}, pokemon1, {
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
        });

        it('should add custom fields', () => {
            dataset.customFieldsToProcess = [{
                fieldName: 'custom field',
            }];
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            const fields = ctrl.getSortedColumns({ dataset });

            expect(fields).toContainEqual({
                name: 'custom field',
                sample: null,
                custom: true,
                customField: { fieldName: 'custom field' },
                customFieldIndex: 0,
                sourceName: dataset.fileName,
                sourceType: 'spreadsheet',
            });
        });

        it('should add nested objects', () => {
            dataset.fe_nestedObject = {
                prefix: 'prefix',
                fields: ['custom field'],
            };

            const ctrl = $controller('DatasetOneCtrl', injectValues);
            const fields = ctrl.getSortedColumns({ dataset });

            expect(fields).toContainEqual({
                name: 'prefixcustom field',
                sample: null,
                custom: true,
                sourceName: dataset.fileName,
                sourceType: 'spreadsheet',
            });
        });

        it('should add relationship fields', () => {
            dataset.relationshipFields = [{
                field: 'custom field',
            }];

            const ctrl = $controller('DatasetOneCtrl', injectValues);
            const fields = ctrl.getSortedColumns({ dataset });

            expect(fields).toContainEqual({
                name: 'custom field',
                custom: true,
                sourceName: dataset.fileName,
                sourceType: 'spreadsheet',
            });
        });

        it('should add additional datasources', () => {
            const additionalDatasources = [{
                columns: ['first', 'second'],
            }, {
                columns: ['third'],
            }];
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            const fields = ctrl.getSortedColumns({ dataset, additionalDatasources });

            expect(fields).toEqual(expect.arrayContaining(['first', 'second', 'third']));
        });

        it('should sort columns', () => {
            dataset.fe_fieldDisplayOrder = ['a', 'c'];
            dataset.columns = [{ name: 'c' }, { name: 'a' }, { name: 'b' }];
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            const fields = ctrl.getSortedColumns({ dataset });

            expect(fields).toEqual([{ name: 'a' }, { name: 'c' }, { name: 'b' }]);
        });
    });

    describe('when #getVisibleColumnNames is called', () => {
        it('should return available column names', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            ctrl.dataset.columns = [{ name: 'dataset column 1' }];
            ctrl.dataset.customFieldsToProcess = [{ fieldName: 'custom field 1' }];
            ctrl.dataset.fe_nestedObject.fields = ['nested field 1'];
            ctrl.dataset.relationshipFields = [{ field: 'relationship field 1' }];

            expect(ctrl.getVisibleColumnNames()).toEqual(['dataset column 1', 'custom field 1', 'nested field 1', 'relationship field 1']);
        });
    });

    describe('when #isContentForm is called', () => {
        it('should return proper value for active state', () => {
            const ctrl = $controller('DatasetOneCtrl', injectValues);

            $state.current.name = 'dashboard.dataset.one.content.create';
            expect(ctrl.isContentForm()).toBe(true);

            $state.current.name = 'dashboard.dataset.one.content.edit';
            expect(ctrl.isContentForm()).toBe(true);

            $state.current.name = 'dashboard.dataset.one';
            expect(ctrl.isContentForm()).toBe(false);
        });
    });
});
