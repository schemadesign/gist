import '../../../../../../app';
import '../salesforce.controller';

describe('DatasetConnectSalesforceCtrl:Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function (_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();

        $scope.datasetUploadCtrl = {
            onSalesforceEndpointSet: jest.fn(),
        };

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
        };

        $scope.user = {
            hasSalesforceToken: true,
        };

        injectValues = {
            $scope,
            Salesforce: {
                getFields: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({ fields: ['Field 1', 'Field 2'] }),
                }),
                getTables: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({ tables: ['Table 1', 'Table 2'] }),
                }),
                validateQuery: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({ totalSize: 1 }),
                }),
            },
        };

        ctrl = $controller('DatasetConnectSalesforceCtrl', injectValues);
    });

    it('should have initially set', () => {
        expect(ctrl.fields).toEqual([]);
        expect(ctrl.selectedTable).toEqual('');
        expect(ctrl.selectedFields).toEqual([]);
        expect(ctrl.selectedField).toEqual('');
        expect(ctrl.fieldSearchText).toEqual('');
        expect(ctrl.tableSearchText).toEqual('');
    });

    it('should get tables', () => {
        expect(ctrl.tables).toEqual(['Table 1', 'Table 2']);
    });

    describe('when connect', () => {
        it('should send corresponding selection data ', async () => {
            await ctrl.connect();

            expect($scope.datasetUploadCtrl.onSalesforceEndpointSet).toHaveBeenCalledWith({
                fields: [],
                name: 'salesforce',
                table: '',
            });
        });

        it('should show toast with error when totalSize us equal to 0', async () => {
            injectValues.Salesforce.validateQuery = jest.fn().mockReturnValue({
                $promise: Promise.resolve({ totalSize: 0 }),
            });

            await ctrl.connect();

            expect($scope.datasetCtrl.showSimpleToast)
                .toHaveBeenCalledWith('No data found for this section');
        });

        it('should show toast on error from backend', async () => {
            injectValues.Salesforce.validateQuery = jest.fn().mockReturnValue({
                $promise: Promise.reject({}),
            });

            await ctrl.connect();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalled();
        });
    });

    describe('when getFields', () => {
        it('should reset selected Fields', () => {
            ctrl.selectedFields = ['Field 1'];
            ctrl.getFields();

            expect(ctrl.selectedFields).toEqual([]);
        });

        it('should get fields', async () => {
            ctrl.selectedTable = 'Table 1';
            await ctrl.getFields();

            expect(injectValues.Salesforce.getFields).toHaveBeenCalledWith({ table: 'Table 1' });
            expect(ctrl.fields).toEqual(['Field 1', 'Field 2']);
        });
    });

    describe('when tableQuerySearch', () => {
        it('should get filtered table by query', () => {
            ctrl.tableSearchText = '1';

            expect(ctrl.tableQuerySearch()).toEqual(['Table 1']);
        });
    });

    describe('when fieldQuerySearch', () => {
        it('should get filtered fields by query', async () => {
            ctrl.selectedTable = 'Table 1';
            await ctrl.getFields();
            ctrl.fieldSearchText = 'field 1';

            expect(ctrl.fieldQuerySearch()).toEqual(['Field 1']);
        });
    });
});
