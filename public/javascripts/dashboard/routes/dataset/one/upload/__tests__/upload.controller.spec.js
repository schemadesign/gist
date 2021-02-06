import { merge, noop, cloneDeep, assign } from 'lodash';

import '../../../../../app';
import '../upload.controller';
import { pokemon1 } from '../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetUpload: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function (_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1);

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        $scope.subdomain = 'glitter';

        $scope.datasetOneCtrl = {
            form: {
                $setPristine: jest.fn(),
                $setValidity: jest.fn(),
                $setDirty: jest.fn(),
            },
            dataset,
            originalDataset: cloneDeep(dataset),
            setDataset: jest.fn(),
        };

        const DatasetService = {
            download: jest.fn().mockResolvedValue(),
            revert: jest.fn().mockResolvedValue({}),
            save: jest.fn().mockResolvedValue({}),
            deleteSource: jest.fn().mockResolvedValue(),
        };
        const Cron = jest.fn();
        Cron.update = jest.fn();
        const previousDatasets = [];
        const scheduledJob = {
            _id: 'some-id',
            $save: jest.fn(),
        };
        const viewUrlService = {
            openViewUrl: jest.fn(),
        };
        const $state = {
            is: jest.fn(),
            go: jest.fn(),
        };
        const $mdDialog = {
            show: jest.fn(),
        };

        const FILE_TYPES = {
            csv: { type: 'spreadsheet' },
            json: { type: 'json' },
        };

        injectValues = {
            $scope,
            $state,
            $mdDialog,
            DatasetService,
            previousDatasets,
            scheduledJob,
            Cron,
            viewUrlService,
            FILE_TYPES,
        };

        ctrl = $controller('DatasetUploadCtrl', injectValues);
    });

    it('should set this.scheduledJob and this.previousDatasets', () => {
        expect(ctrl.scheduledJob).toBe(injectValues.scheduledJob);
        expect(ctrl.previousDatasets).toBe(injectValues.previousDatasets);
    });

    it('should call set datasetOneCtrl.form valid when file has been uploaded', () => {
        assign($scope.datasetOneCtrl.dataset, {
            fileName: 'sth.csv',
            connection: null,
            apiEndPoint: null,
        });

        $scope.$digest();

        expect($scope.datasetOneCtrl.form.$setValidity).toHaveBeenCalledWith('_source', true);
    });

    it('should call set datasetOneCtrl.form valid when db has been connected', () => {
        assign($scope.datasetOneCtrl.dataset, {
            fileName: null,
            connection: { url: 'something' },
            apiEndPoint: null,
        });

        $scope.$digest();

        expect($scope.datasetOneCtrl.form.$setValidity).toHaveBeenCalledWith('_source', true);
    });

    it('should call set datasetOneCtrl.form valid when api has been connected', () => {
        assign($scope.datasetOneCtrl.dataset, {
            fileName: null,
            connection: null,
            apiEndPoint: 'something',
        });

        $scope.$digest();

        expect($scope.datasetOneCtrl.form.$setValidity).toHaveBeenCalledWith('_source', true);
    });

    it('should call set datasetOneCtrl.form invalid when there\'s no main source', () => {
        assign($scope.datasetOneCtrl.dataset, {
            fileName: null,
            connection: null,
            apiEndPoint: null,
        });

        $scope.$digest();

        expect($scope.datasetOneCtrl.form.$setValidity).toHaveBeenCalledWith('_source', false);
    });

    it('should infer the correct data type string', () => {
        assign($scope.datasetOneCtrl.dataset, {
            fileName: null,
            connection: null,
            apiEndPoint: null,
        });

        expect(ctrl.getTypeFromFileFormat()).toBe('spreadsheet');
    });

    describe('hasMainSource', () => {
        it('should return true when fileName is defined', () => {
            assign($scope.datasetOneCtrl.dataset, {
                fileName: 'sth.csv',
                connection: null,
                apiEndPoint: null,
            });

            expect(ctrl.hasMainSource()).toBeTruthy();
        });

        it('should return true when connection is defined', () => {
            assign($scope.datasetOneCtrl.dataset, {
                fileName: null,
                connection: { url: 'something' },
                apiEndPoint: null,
            });

            expect(ctrl.hasMainSource()).toBeTruthy();
        });

        it('should return true when connection is defined', () => {
            assign($scope.datasetOneCtrl.dataset, {
                fileName: null,
                connection: null,
                apiEndPoint: 'something',
            });

            expect(ctrl.hasMainSource()).toBeTruthy();
        });

        it('should return false when neither fileName, nor connection, nor apiEndPoint are defined', () => {
            assign($scope.datasetOneCtrl.dataset, {
                fileName: null,
                connection: null,
                apiEndPoint: null,
            });

            expect(ctrl.hasMainSource()).toBeFalsy();
        });
    });

    describe('hasAdditionalSource', () => {
        it('should return true when additionalDatasources array is not empty', () => {
            $scope.datasetOneCtrl.additionalDatasources = [{}];

            expect(ctrl.hasAdditionalSource()).toBeTruthy();
        });

        it('should return false when additionalDatasources array is empty', () => {
            $scope.datasetOneCtrl.additionalDatasources = [];

            expect(ctrl.hasAdditionalSource()).toBeFalsy();
        });
    });

    describe('getDatasets', () => {
        it('should return array containing main dataset and additional ones', () => {
            $scope.datasetOneCtrl.additionalDatasources = [{ foo: 'bar' }];

            expect(ctrl.getDatasets()).toEqual([
                pokemon1,
                { foo: 'bar' },
            ]);
        });
    });

    describe('isDownloading', () => {
        it('should return true after downloading original has started and return false after it finishes', async () => {
            const downloadingPromise = ctrl.download('original');
            expect(ctrl.isDownloading('original')).toBeTruthy();

            await downloadingPromise;
            expect(ctrl.isDownloading('original')).toBeFalsy();
        });

        it('should return true after downloading modified has started and return false after it finishes', async () => {
            const downloadingPromise = ctrl.download('modified');
            expect(ctrl.isDownloading('modified')).toBeTruthy();

            await downloadingPromise;
            expect(ctrl.isDownloading('modified')).toBeFalsy();
        });
    });

    describe('download', () => {
        it('should call DatasetService.download', async () => {
            await ctrl.download('original');

            expect(injectValues.DatasetService.download)
                .toHaveBeenCalledWith(pokemon1._id, 'original');
        });

        it('should call datasetCtrl.showGenericErrorToast when DatasetService.download throws', async () => {
            injectValues.DatasetService.download.mockRejectedValue({});

            await ctrl.download('original');

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('isHome', () => {
        it('should return true if it\'s in dashboard.dataset.one.upload state', () => {
            injectValues.$state.is.mockReturnValue(true);

            expect(ctrl.isHome()).toBeTruthy();
            expect(injectValues.$state.is).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });

        it('should return false if it\'s in dashboard.dataset.one.upload state', () => {
            injectValues.$state.is.mockReturnValue(false);

            expect(ctrl.isHome()).toBeFalsy();
        });
    });

    describe('openPrevious', () => {
        it('should call viewUrlService.openViewUrl with proper params', () => {
            ctrl.openPrevious({ _id: 'some-id' });

            expect(injectValues.viewUrlService.openViewUrl)
                .toHaveBeenCalledWith('glitter', {
                    _id: 'some-id',
                    fe_filters: {},
                }, 'gallery');
        });
    });

    describe('revertPrevious', () => {
        it('should set datasetOneCtrl.pending to true', () => {
            ctrl.revertPrevious({ id: 'some-id' }, { stopPropagation: noop });

            expect($scope.datasetOneCtrl.pending).toBe(true);
        });

        it('should call DatasetService.revert with proper params', () => {
            ctrl.revertPrevious({ id: 'some-id' }, { stopPropagation: noop });

            expect(injectValues.DatasetService.revert).toHaveBeenCalledWith('some-id', pokemon1._id);
        });

        it('should navigate to dashboard.dataset.one.process', async () => {
            injectValues.DatasetService.revert.mockResolvedValue({ data: { _id: 'other-id' } });

            await ctrl.revertPrevious({ id: 'some-id' }, { stopPropagation: noop });

            expect(injectValues.$state.go)
                .toHaveBeenCalledWith('dashboard.dataset.one.process', {
                    id: 'other-id',
                });
        });
    });

    describe('reimportAPIDatasource', () => {
        it('should set datasetOneCtrl.pending to true', () => {
            ctrl.reimportAPIDatasource();

            expect($scope.datasetOneCtrl.pending).toBe(true);
        });

        it('should call DatasetService.save with proper params', () => {
            ctrl.reimportAPIDatasource();

            expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                _id: pokemon1._id,
                replacement: true,
                dirty: 1,
                tabDestination: 1,
            });
        });

        it('should navigate to dashboard.dataset.one.process', async () => {
            await ctrl.reimportAPIDatasource();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.process');
        });

        it('should call datasetCtrl.showSimpleToast if DatasetService.save throws', async () => {
            injectValues.DatasetService.save.mockRejectedValue({ data: { error: 'Sample error' } });

            await ctrl.reimportAPIDatasource();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Sample error');
        });
    });

    describe('onMainFileUploadSuccess', () => {
        const responseData = {
            _id: 'some-id',
            uid: 'sth',
            format: 'sth',
            fileName: 'filename.csv',
            raw_rowObjects_coercionScheme: 'sth',
            fe_excludeFields: 'sth',
            fe_excludeFieldsObjDetail: 'sth',
            replacement: 'sth',
            replaced_id: 'sth',
            dirty: 1,
        };

        it('should merge required params into datasetOneCtrl.dataset', () => {
            ctrl.onMainFileUploadSuccess(responseData);

            expect($scope.datasetOneCtrl.dataset).toEqual({
                ...pokemon1,
                ...responseData,
            });
        });

        it('should merge required params into datasetOneCtrl.originalDataset', () => {
            ctrl.onMainFileUploadSuccess(responseData);

            expect($scope.datasetOneCtrl.originalDataset).toEqual($scope.datasetOneCtrl.dataset);
        });

        it('should go to dashboard.dataset.one.upload', () => {
            ctrl.onMainFileUploadSuccess(responseData);

            expect(injectValues.$state.go)
                .toHaveBeenCalledWith('dashboard.dataset.one.upload', { id: 'some-id' });
        });
    });

    describe('onAdditionalFileUploadSuccess', () => {
        beforeEach(() => {
            $scope.datasetOneCtrl.originalAdditionalDatasources = [{ _id: 'sth' }];
            $scope.datasetOneCtrl.additionalDatasources = [{ _id: 'sth' }];
        });

        it('should merge required params into datasetOneCtrl.additionalDatasources', () => {
            ctrl.onAdditionalFileUploadSuccess({ _id: 'some-id', fileName: 'new.csv' });

            expect($scope.datasetOneCtrl.additionalDatasources).toEqual([
                { _id: 'some-id', fileName: 'new.csv' },
            ]);
        });

        it('should merge required params into datasetOneCtrl.originalAdditionalDatasources', () => {
            ctrl.onAdditionalFileUploadSuccess({ _id: 'some-id', fileName: 'new.csv' });

            expect($scope.datasetOneCtrl.originalAdditionalDatasources)
                .toEqual($scope.datasetOneCtrl.additionalDatasources);
        });

        it('should go to dashboard.dataset.one.upload if there is no jobId', () => {
            $scope.datasetOneCtrl.dataset.firstImport = 1;

            ctrl.onAdditionalFileUploadSuccess({ jobId: 0 });

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });

        it('should go to dashboard.dataset.one.process if there is jobId', () => {
            $scope.datasetOneCtrl.dataset.firstImport = 1;

            ctrl.onAdditionalFileUploadSuccess({ jobId: 1 });

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.process');
        });
    });

    describe('onAncillaryFileUploadSuccess', () => {
        beforeEach(() => {
            ctrl.onAncillaryFileUploadSuccess({ fileName: 'filename.csv' });
        });

        it('should set datasetOneCtrl.dataset.ancillaryFile', () => {
            expect($scope.datasetOneCtrl.dataset.ancillaryFile).toEqual('filename.csv');
        });

        it('should go to dashboard.dataset.one.upload', () => {
            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('onConnectionSet', () => {
        beforeEach(() => {
            ctrl.onConnectionSet({ url: 'some-url' }, ['t1', 't2']);
        });

        it('should set connection and tables on datasetOneCtrl.dataset', () => {
            expect($scope.datasetOneCtrl.dataset.connection).toEqual({ url: 'some-url' });
            expect($scope.datasetOneCtrl.dataset.tables).toEqual(['t1', 't2']);
        });

        it('should mark form as dirty', () => {
            expect($scope.datasetOneCtrl.form.$setDirty).toHaveBeenCalled();
        });

        it('should go to dashboard.dataset.one.upload', () => {
            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('onAdditionalConnectionSet', () => {
        beforeEach(() => {
            $scope.datasetOneCtrl.additionalDatasources = [{ id: 'sth' }];
            ctrl.onAdditionalConnectionSet({ url: 'some-url' }, ['t1', 't2']);
        });

        it('should set connection and tables on datasetOneCtrl.dataset', () => {
            expect($scope.datasetOneCtrl.additionalDatasources[0]).toMatchObject({
                tables: ['t1', 't2'],
                connection: { url: 'some-url' },
            });
        });

        it('should mark form as dirty', () => {
            expect($scope.datasetOneCtrl.form.$setDirty).toHaveBeenCalled();
        });

        it('should go to dashboard.dataset.one.upload', () => {
            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('onApiEndpointSet', () => {
        beforeEach(() => {
            ctrl.onApiEndpointSet('http://endpoint.com', 'sth.*', 'JSON');
        });

        it('should set connection and tables on datasetOneCtrl.dataset', () => {
            expect($scope.datasetOneCtrl.dataset).toMatchObject({
                apiEndPoint: 'http://endpoint.com',
                JSONPath: 'sth.*',
                format: 'JSON',
            });
        });

        it('should mark form as dirty', () => {
            expect($scope.datasetOneCtrl.form.$setDirty).toHaveBeenCalled();
        });

        it('should go to dashboard.dataset.one.upload', () => {
            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload');
        });
    });

    describe('removeDatasource', () => {
        it('should update datasetOneCtrl.dataset when connection is unsaved', () => {
            $scope.datasetOneCtrl.dataset.connection = { url: 'sth' };
            $scope.datasetOneCtrl.originalDataset.connection = null;

            ctrl.removeDatasource();

            expect($scope.datasetOneCtrl.dataset.connection).toBeUndefined();
        });

        it('should update datasetOneCtrl.dataset when api endpoint is unsaved', () => {
            $scope.datasetOneCtrl.dataset.apiEndPoint = 'http://endpoint.com';
            $scope.datasetOneCtrl.originalDataset.apiEndPoint = null;

            ctrl.removeDatasource();

            expect($scope.datasetOneCtrl.dataset.apiEndPoint).toBeUndefined();
        });

        it('should show dialog and call DatasetService.deleteSource when it has saved connection', async () => {
            $scope.datasetOneCtrl.originalDataset.connection = { url: 'sth' };
            injectValues.$mdDialog.show.mockResolvedValue();

            await ctrl.removeDatasource();

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
            expect(injectValues.DatasetService.deleteSource).toHaveBeenCalledWith(pokemon1._id);
            expect($scope.datasetOneCtrl.originalDataset.connection).toBeUndefined();
        });

        it('should show dialog and call DatasetService.deleteSource when it has saved api endpoint', async () => {
            $scope.datasetOneCtrl.originalDataset.apiEndPoint = 'http://endpoint.com';
            injectValues.$mdDialog.show.mockResolvedValue();

            await ctrl.removeDatasource();

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
            expect(injectValues.DatasetService.deleteSource).toHaveBeenCalledWith(pokemon1._id);
            expect($scope.datasetOneCtrl.originalDataset.apiEndPoint).toBeUndefined();
        });

        it('should preserve api endpoint if dialog is cancelled', async () => {
            $scope.datasetOneCtrl.originalDataset.apiEndPoint = 'http://endpoint.com';
            injectValues.$mdDialog.show.mockRejectedValue();

            await ctrl.removeDatasource();

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
            expect(injectValues.DatasetService.deleteSource).not.toHaveBeenCalled();
            expect($scope.datasetOneCtrl.originalDataset.apiEndPoint).toBe('http://endpoint.com');
        });

        it('should preserve connection if dialog is cancelled', async () => {
            $scope.datasetOneCtrl.originalDataset.connection = { url: 'sth' };
            injectValues.$mdDialog.show.mockRejectedValue();

            await ctrl.removeDatasource();

            expect(injectValues.$mdDialog.show).toHaveBeenCalled();
            expect(injectValues.DatasetService.deleteSource).not.toHaveBeenCalled();
            expect($scope.datasetOneCtrl.originalDataset.connection).toEqual({ url: 'sth' });
        });

        it('should call datasetCtrl.showGenericErrorToast if DatasetService.deleteSource throws', async () => {
            $scope.datasetOneCtrl.originalDataset.connection = { url: 'sth' };
            injectValues.$mdDialog.show.mockResolvedValue();
            injectValues.DatasetService.deleteSource.mockRejectedValue();

            await ctrl.removeDatasource();

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
            expect($scope.datasetOneCtrl.originalDataset.connection).toEqual({ url: 'sth' });
        });
    });

    describe('openSchedulerModal', () => {
        it('should call $mdDialog.show', async () => {
            injectValues.$mdDialog.show.mockResolvedValue();

            ctrl.openSchedulerModal();

            expect(injectValues.$mdDialog.show).toHaveBeenCalledWith(expect.objectContaining({
                controller: 'SchedulerDialogCtrl',
            }));
        });

        it('should save new scheduled time', async () => {
            injectValues.$mdDialog.show.mockResolvedValue({
                command: 'time',
                cronTime: 'sth',
            });

            await ctrl.openSchedulerModal();

            expect(injectValues.scheduledJob.cronTime).toBe('sth');
            expect(injectValues.scheduledJob.$save).toHaveBeenCalled();
        });

        it('should create new cron job if it doesn\'t exist', async () => {
            const newJob = { $save: jest.fn() };

            injectValues.scheduledJob._id = null;
            injectValues.Cron.mockImplementation(() => newJob);
            injectValues.$mdDialog.show.mockResolvedValue({
                command: 'time',
                cronTime: 'sth',
            });

            await ctrl.openSchedulerModal();

            expect(injectValues.Cron).toHaveBeenCalledWith({
                cronTime: 'sth',
                datasetId: pokemon1._id,
            });
            expect(ctrl.scheduledJob).toBe(newJob);
            expect(newJob.$save).toHaveBeenCalled();
        });

        it('should call datasetCtrl.showSimpleToast', async () => {
            injectValues.scheduledJob.$save.mockResolvedValue();
            injectValues.$mdDialog.show.mockResolvedValue({ command: 'time' });

            await ctrl.openSchedulerModal();

            expect($scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('Automated job saved!');
        });

        it('should update cron job with a pause command', async () => {
            injectValues.$mdDialog.show.mockResolvedValue({
                command: 'schedule',
                action: 'pause',
            });
            injectValues.Cron.update.mockReturnValue({
                $promise: Promise.resolve({ key: 'val' }),
            });

            await ctrl.openSchedulerModal();

            expect(injectValues.Cron.update).toHaveBeenCalledWith({ id: 'some-id' }, { command: 'pause' });
            expect(ctrl.scheduledJob).toEqual({ key: 'val' });
            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Automated job paused!');
        });

        it('should update cron job with a resume command', async () => {
            injectValues.$mdDialog.show.mockResolvedValue({
                command: 'schedule',
                action: 'resume',
            });
            injectValues.Cron.update.mockReturnValue({
                $promise: Promise.resolve({ key: 'val' }),
            });

            await ctrl.openSchedulerModal();

            expect(injectValues.Cron.update).toHaveBeenCalledWith({ id: 'some-id' }, { command: 'resume' });
            expect(ctrl.scheduledJob).toEqual({ key: 'val' });
            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Automated job resumed!');
        });
    });
});
