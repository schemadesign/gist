import '../../../../../../app';
import '../datadotworld.controller';
import { merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetConnectPipedriveCtrl:Controller', () => {
    let $rootScope, $controller, $scope, Datadotworld;
    let injectValues, ctrl;

    const datasetInfo = {
        owner: 'donkey-kong',
        id: 'd0nk3y-kong',
        title: 'Donkey Kong Country'
    };

    const query = {
        body: 'SELECT * FROM TABLE',
        name: 'Sample Query',
        language: 'SQL'
    };

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
            onDatadotworldEndpointSet: jest.fn(),
        };

        $scope.user = {
            hasDatadotworldToken: true
        };

        Datadotworld = {
            get: jest.fn(),
            getQueries: jest.fn(),
            getTables: jest.fn()
        };

        injectValues = {
            $scope,
            Datadotworld,
            datasets: [],
        };

        ctrl = $controller('DatasetConnectDatadotworldCtrl', injectValues);
    });

    it('should pull datasets data on load, and load queries and tables on selection', () => {
        expect(ctrl.datasets).toEqual([]);
        ctrl.loadDatasetInfo(datasetInfo);
        expect(injectValues.Datadotworld.getTables).toHaveBeenCalledWith({ id: datasetInfo.id, owner: datasetInfo.owner });
        expect(injectValues.Datadotworld.getQueries).toHaveBeenCalledWith({ id: datasetInfo.id, owner: datasetInfo.owner });
        expect(ctrl.datadotworld).toEqual(expect.any(Object));
    });

    it('should assign correct values with selectQuery', () => {
        ctrl.loadDatasetInfo(datasetInfo);
        ctrl.selectQuery(query);
        expect(ctrl.datadotworld).toEqual(expect.any(Object));
        expect(ctrl.datadotworld.query).toBe(query.body);
    });

    it('should assign correct values with selectTable', () => {
        const table = 'dk';
        ctrl.loadDatasetInfo(datasetInfo);
        ctrl.selectTable(table);
        expect(ctrl.datadotworld).toEqual(expect.any(Object));
        expect(ctrl.datadotworld.table).toBe(table);
    });

    it('should not carry over old table values if selectQuery is called', () => {
        const table = 'dk';
        ctrl.loadDatasetInfo(datasetInfo);
        ctrl.selectTable(table);
        ctrl.selectQuery(query);
        expect(ctrl.datadotworld.table).toBeUndefined();
    });

    it('should send datadotworld object on connect', () => {
        const table = {
            tableName: 'dk'
        };
        ctrl.loadDatasetInfo(datasetInfo);
        ctrl.selectTable(table);
        ctrl.connect();
        expect($scope.datasetUploadCtrl.onDatadotworldEndpointSet).toHaveBeenCalledWith(ctrl.datadotworld);
    });
});
