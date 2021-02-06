import '../list.controller';


describe('DatasetList: Controller', () => {
    let $rootScope, $controller, $scope, $state, $window;
    let injectValues, ctrl, datasets;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_, _$window_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $window = _$window_;
        });

        $window.$ = jest.fn().mockReturnValue({
            slideUp: _.noop,
            slideDown: _.noop,
        });

        $state = {
            go: jest.fn(),
        };

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };
        $scope.user = {
            _id: 'user id',
            canCreateNewViz: ['team id'],
        };
        $scope.team = { _id: 'team id' };
        $scope.env = {};
        $scope.subdomain = 'testing';

        datasets = [
            { _id: 'one' },
            { _id: 'two' },
        ];

        injectValues = {
            $scope,
            $state,
            DatasetService: {
                remove: jest.fn().mockResolvedValue({}),
            },
            AclService: {
                can: jest.fn().mockReturnValue(true),
                getAllFor: jest.fn().mockResolvedValue({ permission: 'example' }),
                setAllInStorage: jest.fn(),
            },
            datasets,
            $document: [{}],
            $window: {
                localStorage: {
                    getItem: jest.fn(),
                    setItem: jest.fn(),
                },
                setTimeout: jest.fn(fn => fn()),
            },
            $mdDialog: {
                show: jest.fn().mockResolvedValue(),
            },
            viewUrlService: {
                openViewUrl: jest.fn(),
            },
            Permissions: {
                isEditRole: true,
            },
            AuthService: {
                updateUser: jest.fn(),
                currentUser: jest.fn().mockReturnValue({}),
            },
        };

        ctrl = $controller('DatasetListCtrl', injectValues);
    });

    it('should instantiate properties correctly', () => {
        expect(ctrl).toHaveProperty('canAddNewViz', true);
        expect(ctrl).toHaveProperty('sortOptions', expect.any(Object));
        expect(ctrl).toHaveProperty('filterOptions', expect.any(Object));
        expect(ctrl).toHaveProperty('sortBy', expect.any(String));
        expect(ctrl).toHaveProperty('filterBy', expect.any(String));
        expect(ctrl).toHaveProperty('datasets', injectValues.datasets);
    });

    describe('when #updateSortBy is called', () => {
        it('should change sortBy option', () => {
            ctrl.updateSortBy('example');

            expect(ctrl.sortBy).toBe('example');
        });
    });

    describe('when #updateFilterBy is called', () => {
        it('should change filterBy option', () => {
            ctrl.updateFilterBy('example');

            expect(ctrl.filterBy).toBe('example');
        });
    });

    describe('when #filterDataset is called', () => {
        it('should return true for no filter', () => {
            expect(ctrl.filterDataset({})).toBe(true);
        });
    });

    describe('when #getListHint is called', () => {
        it('should return sample', () => {
            expect(ctrl.getListHint({ sample: true })).toBe('sample');
        });

        it('should return draft for replacement', () => {
            expect(ctrl.getListHint({ replacement: true })).toBe('draft');
        });

        it('should return draft for firstImport', () => {
            expect(ctrl.getListHint({ firstImport: true })).toBe('draft');
        });

        it('should return empty string in other cases', () => {
            expect(ctrl.getListHint({})).toBe('');
        });
    });

    describe('when #view is called', () => {
        it('should get permissions', () => {
            ctrl.view({ _id: 'dataset id' });

            expect(injectValues.AclService.getAllFor).toHaveBeenCalledWith('dataset', 'dataset id');
        });

        it('should store permissions', async () => {
            await ctrl.view({ _id: 'dataset id', fe_views: {} });

            expect(injectValues.AclService.setAllInStorage).toHaveBeenCalledWith('datasetPermissions', { permission: 'example' });
        });

        it('should open view url', async () => {
            await ctrl.view({ _id: 'dataset id', fe_views: { default_view: 'default view' } });

            expect(injectValues.viewUrlService.openViewUrl).toHaveBeenCalledWith('testing', {
                _id: 'dataset id', fe_views: { default_view: 'default view' },
            }, 'default view');
        });
    });

    describe('when #open is called', () => {
        it('should redirect to upload', () => {
            ctrl.open(1);

            expect(injectValues.$state.go).toHaveBeenCalledWith('dashboard.dataset.one.upload', { id: 1 });
        });
    });

    describe('when #remove is called', () => {
        it('should show the popup', () => {
            ctrl.remove({});

            expect(injectValues.$mdDialog.show).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should request dataset removal', async () => {
            await ctrl.remove({ _id: 'example id' });

            expect(injectValues.DatasetService.remove).toHaveBeenCalledWith('example id');
        });

        it('should filter out removed dataset', async () => {
            await ctrl.remove({ _id: 'one' });

            expect(ctrl.datasets).toEqual([{ _id: 'two' }]);
            expect(injectValues.$scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Visualization deleted.');
        });

        it('should show error when removing failed', async () => {
            injectValues.DatasetService.remove.mockRejectedValue();
            await ctrl.remove({});

            expect(injectValues.$scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });
});
