import '../dataset.controller';


describe('Dataset: Controller', () => {
    let $rootScope,
        $controller,
        $scope;
    let injectValues,
        ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $scope = $rootScope.$new();

        $scope.dashboardCtrl = {
            showGenericErrorToast: jest.fn(),
            showSimpleToast: jest.fn(),
        };

        injectValues = {
            $scope,
        };

        ctrl = $controller('DatasetCtrl', injectValues);
    });

    describe('when #showSimpleToast is called', () => {
        it('should show a toast', () => {
            ctrl.showSimpleToast('example message');

            expect($scope.dashboardCtrl.showSimpleToast).toHaveBeenCalledWith('example message');
        });
    });

    describe('when #showGenericErrorToast is called', () => {
        it('should show a toast', () => {
            ctrl.showGenericErrorToast();

            expect($scope.dashboardCtrl.showGenericErrorToast).toHaveBeenCalledWith();
        });
    });
});
