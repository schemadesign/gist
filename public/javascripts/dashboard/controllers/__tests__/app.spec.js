import '../app';


describe('Dashboard (app): Controller', () => {
    let $rootScope,
        $controller,
        $scope,
        $state;
    let $mdToast = {};
    let injectValues,
        ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_, _$state_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $state = _$state_;
        });

        $scope = $rootScope.$new();

        $scope.$state = {
            current: {
                name: '',
            },
        };

        Object.assign($mdToast, {
            show: jest.fn(),
            simple: jest.fn().mockReturnValue($mdToast),
            textContent: jest.fn().mockReturnValue($mdToast),
            position: jest.fn().mockReturnValue($mdToast),
            hideDelay: jest.fn().mockReturnValue($mdToast),
            parent: jest.fn().mockReturnValue($mdToast),
        });

        injectValues = {
            $scope,
            $mdToast,
            AuthService: {
                reload: jest.fn(),
                currentUser: jest.fn().mockReturnValue({ defaultLoginTeam: {} }),
                allTeams: jest.fn(),
                currentTeam: jest.fn().mockReturnValue({}),
            },
            AclService: {
                can: jest.fn(),
            },
            env: {},
            Permissions: {
                isEditRole: true,
                canEnter: jest.fn(),
            },
        };

        ctrl = $controller('DashboardCtrl', injectValues);
    });

    it('should set isVisualizationEditor and redirect to dashboard.dataset.list', () => {
        jest.spyOn($state, 'go');
        injectValues.AuthService.currentUser = jest.fn().mockReturnValue({
            role: 'visualizationEditor',
            defaultLoginTeam: {},
        });
        $scope.$state = {
            current: {
                name: 'dashboard.dataset.list',
            },
        };


        ctrl = $controller('DashboardCtrl', injectValues);

        expect($scope.isVisualizationEditor).toBe(true);
        expect($state.go).toHaveBeenCalledWith('dashboard.dataset.list');
    });

    describe('on $stateChangeStart', () => {
        it('should redirect to dashboard.dataset.list', () => {
            jest.spyOn($state, 'go');

            injectValues.AuthService.currentUser = jest.fn().mockReturnValue({
                role: 'visualizationEditor',
                defaultLoginTeam: {},
            });

            ctrl = $controller('DashboardCtrl', injectValues);
            jest.spyOn($scope, 'closeLeft');
            $rootScope.$broadcast(
                '$stateChangeStart',
                { name: 'dashboard.fake.state' },
            );

            expect($state.go).toHaveBeenCalledWith('dashboard.dataset.list');
            expect($scope.closeLeft).not.toHaveBeenCalled();
        });

        it('should close left', () => {
            jest.spyOn($scope, 'closeLeft');
            $rootScope.$broadcast(
                '$stateChangeStart',
                { name: 'dashboard.fake.state' },
            );

            expect($scope.closeLeft).toHaveBeenCalled();
        });
    });

    describe('when #showSimpleToast is called', () => {
        it('should show a toast', () => {
            ctrl.showSimpleToast('example message');

            expect(injectValues.$mdToast.show).toHaveBeenCalled();
            expect(injectValues.$mdToast.simple).toHaveBeenCalled();
            expect(injectValues.$mdToast.textContent).toHaveBeenCalledWith('example message');
        });

        it('should show a toast with parameters', () => {
            ctrl.showSimpleToast('example message', { hideDelay: 1000, parent: 'parent' });

            expect(injectValues.$mdToast.hideDelay).toHaveBeenCalledWith(1000);
            expect(injectValues.$mdToast.parent).toHaveBeenCalledWith('parent');
        });
    });

    describe('when #showGenericErrorToast is called', () => {
        it('should show a toast', () => {
            ctrl.showGenericErrorToast();

            expect(injectValues.$mdToast.textContent).toHaveBeenCalledWith('An error occurred.');
        });
    });
});
