import '../new.controller';


describe('DatasetNew: Controller', () => {
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

        $scope.user = { _id: 'user id' };
        $scope.team = { _id: 'team id' };

        injectValues = {
            $scope,
            $state,
            DatasetService: {
                save: jest.fn().mockResolvedValue({}),
            },
            AclService: {
                can: jest.fn().mockReturnValue(true),
                setAllFor: jest.fn(),
            },
            $window: {},
            AuthService: {
                updateUser: jest.fn(),
            },
        };

        ctrl = $controller('DatasetNewCtrl', injectValues);
    });

    it('should instantiate properties correctly', () => {
        expect(ctrl).toHaveProperty('canCreateCustomViz', true);
        expect(ctrl).toHaveProperty('canCreateStandardViz', true);
        expect(ctrl).toHaveProperty('dataset', {
            vizType: 'standardViz',
        });
    });

    describe('when #catsRule is called', () => {
        it('should return true for Catlas Drug Delivery', () => {
            ctrl.dataset.title = 'Catlas Drug Delivery';
            expect(ctrl.catsRule()).toBe(true);
        });
    });

    describe('when #dogsRule is called', () => {
        it('should return true for Isle of Dogs', () => {
            ctrl.dataset.title = 'Isle of Dogs';
            expect(ctrl.dogsRule()).toBe(true);
        });
    });

    describe('when #submitForm is called', () => {
        it('should save the dataset', () => {
            ctrl.dataset.title = 'example title';
            ctrl.submitForm(true);

            expect(ctrl.submitting).toBe(true);
            expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                vizType: 'standardViz',
                title: 'example title',
                author: 'user id',
                _team: 'team id',
                uid: 'example-title',
                updatedBy: 'user id',
            });
        });

        it('should redirect on success', async () => {
            injectValues.DatasetService.save.mockResolvedValue({ data: { id: 'dataset id' } });
            await ctrl.submitForm(true);

            expect(injectValues.AclService.setAllFor).toHaveBeenCalledWith('dataset', 'dataset id', 'standardViz');
            expect($state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload', { id: 'dataset id' });
        });

        it('should redirect on failure', async () => {
            injectValues.DatasetService.save.mockRejectedValue({ status: 500, data: 'error msg' });
            await ctrl.submitForm(true);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.error', {
                type: 'badFormat',
                errMsg: 'error msg',
                returnTo: 'dashboard.dataset.list',
            });
        });
    });
});
