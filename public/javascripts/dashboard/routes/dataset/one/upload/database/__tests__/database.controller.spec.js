import { merge } from 'lodash';

import '../../../../../../app';
import '../database.controller';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetConnectDatabase: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function(_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1);
        const $state = {
            params: {},
        };

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
            connectToRemoteDatasource: jest.fn().mockResolvedValue(),
        };

        injectValues = {
            $scope,
            $state,
            DatasetService,
        };

        ctrl = $controller('DatasetConnectDatabaseCtrl', injectValues);
    });

    it('should set proper defaults if there is no connection', () => {
        expect(ctrl.connection).toEqual({
            type: 'hadoop',
            url: '',
            connected: false,
        });
        expect(ctrl.tables).toEqual([]);
    });

    it('should set proper defaults if there is a connection', () => {
        $scope.datasetOneCtrl.dataset.connection = {
            url: 'http://some.url',
            connected: true,
        };
        $scope.datasetOneCtrl.dataset.tables = ['t1', 't2'];

        ctrl = $controller('DatasetConnectDatabaseCtrl', injectValues);

        expect(ctrl.connection).toEqual({
            type: 'hadoop',
            url: 'http://some.url',
            connected: true,
        });
        expect(ctrl.tables).toEqual(['t1', 't2']);
    });

    describe('handleUrlChange', () => {
        it('should reset possiblePaths, path and connected properties', () => {
            ctrl.tables = ['t1', 't2'];
            ctrl.connection = { connected: true };

            ctrl.handleUrlChange();

            expect(ctrl.tables).toBeUndefined();
            expect(ctrl.connection.connected).toBeFalsy();
        });
    });

    describe('connect', () => {
        it('should call DatasetService.connectToRemoteDatasource', () => {
            ctrl.connection = { url: 'http://some.url' };

            ctrl.connect();

            expect(ctrl.pending).toBe(true);
            expect(injectValues.DatasetService.connectToRemoteDatasource)
                .toHaveBeenCalledWith(pokemon1._id, { url: 'http://some.url' });
        });

        it('should set possible tables after successful DatasetService.connectToRemoteDatasource call', async () => {
            ctrl.connection = { url: 'http://some.url' };
            injectValues.DatasetService.connectToRemoteDatasource.mockResolvedValue({
                data: [{ name: 'table1' }, { name: 'table2' }],
            });

            await ctrl.connect();

            expect(ctrl.tables).toEqual([{ name: 'table1' }, { name: 'table2' }]);
            expect(ctrl.connection).toMatchObject({
                connected: true,
                tableName: 'table1',
            });
            expect(ctrl.pending).toBe(false);
        });

        it('should show toast after unsuccessful DatasetService.connectToRemoteDatasource call', async () => {
            ctrl.connection = { url: 'http://some.url' };
            injectValues.DatasetService.connectToRemoteDatasource.mockRejectedValue({
                data: { error: 'Some error' },
            });

            await ctrl.connect();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Some error');
            expect(ctrl.pending).toBe(false);
        });
    });

    describe('save', () => {
        it('should invoke method defined in $state with proper params', () => {
            const successInvokePath = 'someMethod';
            injectValues.$state.params = { successInvokePath };

            ctrl = $controller('DatasetConnectDatabaseCtrl', injectValues);

            $scope.datasetUploadCtrl[successInvokePath] = jest.fn();

            ctrl.connection = { url: 'http://some.url' };
            ctrl.tables = [{ name: 'table1' }];
            ctrl.save();

            expect($scope.datasetUploadCtrl[successInvokePath])
                .toHaveBeenCalledWith({ url: 'http://some.url' }, [{ name: 'table1' }]);
        });
    });
});
