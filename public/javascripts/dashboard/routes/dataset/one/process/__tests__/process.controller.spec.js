import { cloneDeep } from 'lodash';

import '../../../../../app';
import '../process.controller';
import '../../one.constants';
import { pokemon1, privateVizWithEditor } from '../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('Settings: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        jest.useFakeTimers();
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();
        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        const dataset = JSON.parse(JSON.stringify(pokemon1));
        const additionalDatasources = [JSON.parse(JSON.stringify(privateVizWithEditor))];

        $scope.datasetOneCtrl = {
            dataset,
            originalDataset: cloneDeep(dataset),
            additionalDatasources,
            originalAdditionalDatasources: cloneDeep(additionalDatasources),
            setDataset: jest.fn(),
            setAdditionalDatasources: jest.fn(),
            redirectToAvailableStep: jest.fn(),
            form: {
                $setDirty: jest.fn(),
            },
        };

        const $state = {
            go: jest.fn(),
        };

        injectValues = {
            $scope,
            $state,
            DatasetService: {
                update: jest.fn().mockResolvedValue({}),
                killJob: jest.fn().mockResolvedValue({}),
                getJob: jest.fn().mockResolvedValue(null),
                get: jest.fn().mockResolvedValue(null),
                getAdditionalSources: jest.fn().mockResolvedValue(null),
            },
        };

        ctrl = $controller('DatasetProcessCtrl', injectValues);
    });

    afterEach(() => jest.clearAllTimers());

    describe('showAdvanced', () => {
        it('should initially set to false', () => {
            expect(ctrl.showAdvanced).toBeFalsy();
        });

        it('should toggle showAdvanced property', () => {
            ctrl.toggleShowAdvanced();

            expect(ctrl.showAdvanced).toBeTruthy();

            ctrl.toggleShowAdvanced();

            expect(ctrl.showAdvanced).toBeFalsy();
        });
    });

    describe('getDatasetUid', () => {
        it('should return dataset uid', () => {
            expect(ctrl.getDatasetUid('5a42fe1629232d26d4713775')).toBe('private-viz-with-editor');
        });
    });

    describe('getJobs', () => {
        it('should call DatasetService.getJob for each provided id', () => {
            injectValues.DatasetService.getJob.mockClear();

            ctrl.getJobs(['id1', 'id2']);

            expect(injectValues.DatasetService.getJob).toHaveBeenCalledTimes(2);
            expect(injectValues.DatasetService.getJob)
                .toHaveBeenCalledWith('id1', expect.anything(), expect.anything());
            expect(injectValues.DatasetService.getJob)
                .toHaveBeenCalledWith('id2', expect.anything(), expect.anything());
        });

        it('should go to error state if any of jobs returns failed state', async () => {
            injectValues.DatasetService.getJob.mockResolvedValue({
                id: 1,
                state: 'failed',
                error: 'some error',
                data: { id: pokemon1._id },
            });

            ctrl = $controller('DatasetProcessCtrl', injectValues);
            injectValues.DatasetService.getJob.mockClear();

            await ctrl.getJobs(['id1', 'id2']);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.error', {
                id: pokemon1._id,
                type: 'jobFailed',
                errMsg: 'some error',
            });
        });

        it('should fetch jobs again after 1000ms', async () => {
            injectValues.DatasetService.getJob.mockClear();
            injectValues.DatasetService.getJob.mockResolvedValue({
                id: 1,
                state: 'inactive',
                data: { id: pokemon1._id },
            });

            await ctrl.getJobs(['id1', 'id2']);

            jest.advanceTimersByTime(999);
            expect(injectValues.DatasetService.getJob).toHaveBeenCalledTimes(2);

            jest.advanceTimersByTime(1);
            expect(injectValues.DatasetService.getJob).toHaveBeenCalledTimes(4);
        });

        it('should clear jobId when no more active jobs are present', async () => {
            injectValues.DatasetService.getJob.mockClear();

            await ctrl.getJobs(['id1', 'id2']);

            expect($scope.datasetOneCtrl.dataset.jobId).toBe(0);
            expect($scope.datasetOneCtrl.originalDataset.jobId).toBe(0);
        });

        it('should go to available tab', async () => {
            injectValues.DatasetService.getJob.mockClear();

            await ctrl.getJobs(['id1', 'id2']);

            expect(injectValues.$scope.datasetOneCtrl.redirectToAvailableStep).toHaveBeenCalled();
        });

        it('should go to error state when getJob request fails', async () => {
            injectValues.DatasetService.getJob.mockRejectedValue();

            ctrl = $controller('DatasetProcessCtrl', injectValues);

            injectValues.DatasetService.getJob.mockClear();

            await ctrl.getJobs(['id1', 'id2']);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.error', {
                type: 'jobFailed',
                errMsg: 'Job not found',
            });
        });
    });

    describe('toggleImageScraping', () => {
        it('should call DatasetService.update with proper params', async () => {
            $scope.datasetOneCtrl.dataset.skipImageScraping = true;

            await ctrl.toggleImageScraping();

            expect(injectValues.DatasetService.update).toHaveBeenCalledWith(pokemon1._id.toString(), {
                skipImageScraping: true,
            });
            expect($scope.datasetOneCtrl.originalDataset.skipImageScraping).toBe(true);
        });

        it('should call datasetCtrl.showGenericErrorToast if request fails', async () => {
            $scope.datasetOneCtrl.originalDataset.skipImageScraping = false;
            $scope.datasetOneCtrl.dataset.skipImageScraping = true;

            injectValues.DatasetService.update.mockRejectedValue();

            await ctrl.toggleImageScraping();

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
            expect($scope.datasetOneCtrl.dataset.skipImageScraping).toBe(false);
        });
    });

    describe('killJobs', () => {
        it('should call DatasetService.killJob for all datasets', async () => {
            await ctrl.killJobs();

            expect(injectValues.DatasetService.killJob).toHaveBeenCalledTimes(2);
            expect(injectValues.DatasetService.killJob)
                .toHaveBeenCalledWith(pokemon1._id.toString());
            expect(injectValues.DatasetService.killJob)
                .toHaveBeenCalledWith(privateVizWithEditor._id.toString());
        });

        it('should go to available tab', async () => {
            await ctrl.killJobs();

            expect(injectValues.$scope.datasetOneCtrl.redirectToAvailableStep).toHaveBeenCalled();
        });

        it('should show error toast when request fails', async () => {
            injectValues.DatasetService.killJob.mockRejectedValue();

            await ctrl.killJobs();

            expect($scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('Could not cancel current job - please contact support for more help.');
        });
    });
});
