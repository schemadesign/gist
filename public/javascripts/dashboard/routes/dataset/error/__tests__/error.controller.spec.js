import '../error.controller';


describe('DatasetError: Controller', () => {
    let $rootScope, $controller, $scope, $state;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        $state = {
            go: jest.fn(),
        };

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showGenericErrorToast: jest.fn(),
            showSimpleToast: jest.fn(),
        };
        $scope.team = {};

        injectValues = {
            $scope,
            $state,
            DatasetService: {
                killJob: jest.fn().mockResolvedValue({}),
                startJob: jest.fn().mockResolvedValue({}),
            },
            AuthService: {
                logout: jest.fn(),
            },
            $transition$: {
                params: jest.fn().mockReturnValue({
                    type: 'type',
                    id: 'id',
                    errMsg: 'err msg',
                }),
            },
            $window: {},
        };

        ctrl = $controller('DatasetErrorCtrl', injectValues);
    });

    it('should instantiate properties correctly', () => {
        expect(ctrl).toHaveProperty('errorCode', 'type');
        expect(ctrl).toHaveProperty('errorDatasetId', 'id');
        expect(ctrl).toHaveProperty('errorMessage', 'err msg');
    });

    describe('when #killTask is called', () => {
        it('should request killing a job', () => {
            ctrl.killTask();

            expect(injectValues.DatasetService.killJob).toHaveBeenCalledWith('id');
        });

        it('should redirect on success', async () => {
            injectValues.DatasetService.killJob.mockResolvedValue({ status: 200, data: 'ok' });
            await ctrl.killTask();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.data', { id: 'id' });
        });

        it('should show a toast on failure', async () => {
            injectValues.DatasetService.killJob.mockResolvedValue({ status: 200, data: 'fail' });
            await ctrl.killTask();

            expect(injectValues.$scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when #restartImport is called', () => {
        it('should request starting a job', () => {
            ctrl.restartImport();

            expect(injectValues.DatasetService.startJob).toHaveBeenCalledWith('id');
        });

        it('should redirect on success', async () => {
            injectValues.DatasetService.startJob.mockResolvedValue({ status: 200, data: 'ok' });
            await ctrl.restartImport();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.process', { id: 'id' });
        });

        it('should show a toast on failure', async () => {
            injectValues.DatasetService.startJob.mockRejectedValue({ status: 500, error: 'fail' });
            await ctrl.restartImport();

            expect(injectValues.$scope.datasetCtrl.showSimpleToast).toHaveBeenCalled();
        });
    });

    describe('when #backToPreviousStep is called', () => {
        it('should redirect to a custom state', () => {
            injectValues.$transition$.params.mockReturnValue({ returnTo: 'dashboard.example' });
            ctrl = $controller('DatasetErrorCtrl', injectValues);

            ctrl.backToPreviousStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.example', {});
        });

        it('should redirect to the list', () => {
            ctrl.backToPreviousStep();

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.list', { id: 'id' });
        });
    });

    describe('when #logOut is called', () => {
        it('should logout user', () => {
            injectValues.$transition$.params.mockReturnValue({ returnTo: 'dashboard.example' });
            ctrl = $controller('DatasetErrorCtrl', injectValues);

            ctrl.logOut();

            expect(injectValues.AuthService.logout).toHaveBeenCalledWith('dashboard.example');
        });
    });
});
