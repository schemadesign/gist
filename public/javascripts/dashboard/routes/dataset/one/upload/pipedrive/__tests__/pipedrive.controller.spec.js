import '../../../../../../app';
import '../pipedrive.controller';
import { merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';

describe('DatasetConnectPipedriveCtrl:Controller', () => {
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
            onPipedriveEndpointSet: jest.fn(),
        };

        $scope.user = {
            hasPipedriveToken: true
        };

        injectValues = {
            $scope
        };

        ctrl = $controller('DatasetConnectPipedriveCtrl', injectValues);
    });

    it('should send corresponding selection data ', () => {
        const selection = 'organizations';
        ctrl.connect(selection);
        expect($scope.datasetUploadCtrl.onPipedriveEndpointSet).toHaveBeenCalledWith(selection);
    });
});
