import '../../../../../../app';
import '../google-sheet.controller';


describe('DatasetConnectGoogleSheet: Controller', () => {
    let $rootScope, $controller, $scope;
    let ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function(_$controller_, _$rootScope_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();

        $scope.datasetUploadCtrl = {
            onApiEndpointSet: jest.fn(),
        };

        ctrl = $controller('DatasetConnectGoogleSheetCtrl', { $scope });
    });

    it('should set defaults', () => {
        expect(ctrl).toMatchObject({
            endpoint: '',
        });
    });

    describe('connect', () => {
        it('should call datasetUploadCtrl.onApiEndpointSet with prepared URL', () => {
            ctrl.endpoint = 'https://docs.google.com/spreadsheets/u/1/d/efawefawq2398yrf98awjfd983jd893/edit?ntd=1&usp=sheets_home&ths=true';

            ctrl.connect();

            expect($scope.datasetUploadCtrl.onApiEndpointSet)
                .toHaveBeenCalledWith('https://docs.google.com/spreadsheets/u/1/d/efawefawq2398yrf98awjfd983jd893/export?format=csv', undefined, 'CSV');
        });
    });
});