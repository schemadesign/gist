import '../../../../../../app';
import '../smartsheet.controller';
import { merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetConnectSmartsheetCtrl:Controller', () => {
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

        $scope.datasetOneCtrl = {
            dataset,
        };

        $scope.datasetUploadCtrl = {
            onSmartsheetEndpointSet: jest.fn(),
        };

        $scope.user = {
            hasSmartsheetToken: true,
        };

        injectValues = {
            $scope,
            smartsheets: [],
        };

        ctrl = $controller('DatasetConnectSmartsheetCtrl', injectValues);
    });

    it('should get Smartsheet data on load', () => {
        expect(ctrl.smartsheets).toEqual([]);
    });

    it('should send correct sheet data when calling connect', () => {
        ctrl.sheet = {};
        ctrl.connect();
        expect($scope.datasetUploadCtrl.onSmartsheetEndpointSet).toHaveBeenCalledWith(ctrl.sheet);
    });

    it('should assign the passed sheet', () => {
        const name = 'Unique Name';
        ctrl.selectSheet({ name });
        expect(ctrl.sheet.name).toBe(name);
    });

    it('should determine active box correctly', () => {
        const name = 'blank';
        ctrl.sheet = { name };
        expect(ctrl.activeBox(name)).toBeTruthy();
    });
});
