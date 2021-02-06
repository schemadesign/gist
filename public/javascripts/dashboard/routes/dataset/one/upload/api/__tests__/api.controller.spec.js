import { merge, noop, cloneDeep } from 'lodash';

import '../../../../../../app';
import '../api.controller';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetConnectApi: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function(_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1);

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        $scope.datasetOneCtrl = {
            dataset,
        };

        $scope.datasetUploadCtrl = {
            onApiEndpointSet: jest.fn(),
        };

        const DatasetService = {
            readJSON: jest.fn().mockResolvedValue(),
        };

        injectValues = {
            $scope,
            DatasetService,
        };

        ctrl = $controller('DatasetConnectApiCtrl', injectValues);
    });

    it('should set defaults', () => {
        expect(ctrl).toMatchObject({
            fileType: 'csv',
            connected: false,
            endpoint: '',
        });
    });

    describe('handleEndpointChange', () => {
        it('should reset possiblePaths, path and connected properties', () => {
            ctrl.possiblePaths = ['sth'];
            ctrl.path = 'sth';
            ctrl.connected = true;

            ctrl.handleEndpointChange();

            expect(ctrl).toMatchObject({
                possiblePaths: undefined,
                connected: false,
                path: undefined,
            });
        });
    });

    describe('hasPossiblePaths', () => {
        it('should return true if there are possible paths', () => {
            ctrl.possiblePaths = ['sth'];

            expect(ctrl.hasPossiblePaths()).toBeTruthy();
        });

        it('should return false if there are no possible paths', () => {
            ctrl.possiblePaths = [];

            expect(ctrl.hasPossiblePaths()).toBeFalsy();
        });
    });

    describe('connect', () => {
        it('should call datasetUploadCtrl.onApiEndpointSet for CSV endpoint', () => {
            ctrl.fileType = 'csv';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.connect();

            expect($scope.datasetUploadCtrl.onApiEndpointSet)
                .toHaveBeenCalledWith('http://endpoint.com', undefined, 'CSV');
        });

        it('should call datasetUploadCtrl.onApiEndpointSet for TSV endpoint', () => {
            ctrl.fileType = 'tsv';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.connect();

            expect($scope.datasetUploadCtrl.onApiEndpointSet)
                .toHaveBeenCalledWith('http://endpoint.com', undefined, 'TSV');
        });

        it('should call datasetUploadCtrl.onApiEndpointSet for JSON endpoint if path has been chosen', () => {
            ctrl.fileType = 'json';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.path = 'sth.*';
            ctrl.connect();

            expect($scope.datasetUploadCtrl.onApiEndpointSet)
                .toHaveBeenCalledWith('http://endpoint.com', 'sth.*', 'JSON');
        });

        it('should call DatasetService.readJSON for JSON endpoint if path has not been chosen', () => {
            ctrl.fileType = 'json';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.path = undefined;

            ctrl.connect();

            expect(ctrl.pending).toBe(true);
            expect(injectValues.DatasetService.readJSON)
                .toHaveBeenCalledWith(pokemon1._id, { url: 'http://endpoint.com' });
        });

        it('should set possible paths in controller after successful DatasetService.readJSON call', async () => {
            ctrl.fileType = 'json';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.path = undefined;
            injectValues.DatasetService.readJSON.mockResolvedValue({
                data: ['path1', 'path2'],
            });

            await ctrl.connect();

            expect(ctrl.pending).toBe(false);
            expect(ctrl).toMatchObject({
                connected: true,
                possiblePaths: ['path1', 'path2'],
                path: 'path1',
            });
        });

        it('should show error toast if DatasetService.readJSON throws', async () => {
            ctrl.fileType = 'json';
            ctrl.endpoint = 'http://endpoint.com';
            ctrl.path = undefined;
            injectValues.DatasetService.readJSON.mockRejectedValue();

            await ctrl.connect();

            expect(ctrl.pending).toBe(false);
            expect($scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('Problem with connecting to the endpoint');
        });
    });
});
