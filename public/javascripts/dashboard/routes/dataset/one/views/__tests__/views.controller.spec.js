import { merge, cloneDeep, unset } from 'lodash';

import '../../../../../app';
import '../views.controller';
import { pokemon1 } from '../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetViews: Controller', () => {
    let $rootScope, $controller, $scope;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
        });

        const dataset = merge({}, pokemon1, {
            columns: [],
        });

        $scope = $rootScope.$new();

        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };

        $scope.subdomain = 'glitter';
        $scope.team = { subdomain: 'glitter' };

        $scope.datasetOneCtrl = {
            form: {
                $setPristine: jest.fn(),
                $setValidity: jest.fn(),
                $setDirty: jest.fn(),
            },
            getSortedColumns: jest.fn().mockReturnValue([]),
            getVisibleColumnNames: jest.fn().mockReturnValue([]),
            getAllColumnNames: jest.fn().mockReturnValue([]),
            dataset,
            originalDataset: cloneDeep(dataset),
            verifyDatasetValidity: jest.fn(),
        };

        const DatasetService = {
            save: jest.fn().mockResolvedValue(),
        };
        const $state = {
            current: { name: 'dashboard.dataset.one.views' },
            is(value) { return this.current.name === value; },
            go: jest.fn(),
        };
        const $mdDialog = {
            show: jest.fn().mockResolvedValue(),
        };
        const AclService = {
            can: jest.fn().mockReturnValue(true),
        };
        const previewCopy = null;
        const views = [
            { name: 'gallery' },
            { name: 'pieChart' },
        ];

        injectValues = {
            $scope,
            $state,
            $mdDialog,
            DatasetService,
            AclService,
            previewCopy,
            views,
        };

        ctrl = $controller('DatasetViewsCtrl', injectValues);
    });

    it('should set available views', () => {
        expect(ctrl.views).toEqual([
            { name: 'gallery' },
            { name: 'pieChart' },
        ]);
    });

    describe('shouldShowPreviewOverlay', () => {
        it('should return true when in view state and preview has not loaded', () => {
            injectValues.$state.current.name = 'dashboard.dataset.one.views.view';

            expect(ctrl.shouldShowPreviewOverlay()).toBeTruthy();
        });

        it('should return false when not in view state', () => {
            expect(ctrl.shouldShowPreviewOverlay()).toBeFalsy();
        });

        it('should return false when in view state and view has loaded', () => {
            injectValues.$state.current.name = 'dashboard.dataset.one.views.view';
            ctrl.previewLoaded = true;

            expect(ctrl.shouldShowPreviewOverlay()).toBeFalsy();
        });
    });

    describe('getThumbnail', () => {
        it('should return empty string if thumbnail is undefined', () => {
            expect(ctrl.getThumbnail({})).toBe('');
        });

        it('should prepared url it thumbnail is not undefined', () => {
            expect(ctrl.getThumbnail({ thumbnail: 'sth.png' }))
                .toBe('/images/view-thumbnails/sth.png');
        });
    });

    describe('setDefaultView', () => {
        it('should mark view as default and save settings to draft', () => {
            ctrl.setDefaultView('pieChart');

            expect($scope.datasetOneCtrl.dataset.fe_views.default_view).toEqual('pieChart');
        });

        it('should verify if any data changed', () => {
            ctrl.setDefaultView('pieChart');

            expect($scope.datasetOneCtrl.verifyDatasetValidity).toHaveBeenCalled();
        });
    });

    describe('scaffoldView', () => {
        it('should assign scaffold properties and visibility', () => {
            const data = {};

            ctrl.scaffoldView(data, { scaffold: { prop: 'val' } }, true);

            expect(data).toEqual({
                prop: 'val',
                visible: true,
            });
        });
    });

    describe('setViewVisibility', () => {
        it('should insert new view if it does not exist', () => {
            ctrl.setViewVisibility({ name: 'barChart', scaffold: { prop: 'val' } }, true);

            expect($scope.datasetOneCtrl.dataset.fe_views.views.barChart).toEqual({
                prop: 'val',
                visible: true,
            });
        });
    });

    describe('saveData', () => {
        it('should assign new values to datasetOneCtrl.dataset', () => {
            const fe_views = { views: { barChart: { visible: true } } };

            ctrl.saveData({ fe_views });

            expect($scope.datasetOneCtrl.dataset.fe_views).toEqual(fe_views);
        });

        it('should verify if any data changed', () => {
            ctrl.saveData({ fe_views: { views: { barChart: { visible: true } } } });

            expect($scope.datasetOneCtrl.verifyDatasetValidity).toHaveBeenCalled();
        });
    });

    describe('openDetailDialog', () => {
        it('should call $mdDialog.open with proper controller', () => {
            ctrl.openDetailDialog();

            expect(injectValues.$mdDialog.show).toHaveBeenCalledWith(expect.objectContaining({
                controller: 'ObjectDetailDialogController',
            }));
        });
    });

    describe('openGeneralSettingsDialog', () => {
        it('should call $mdDialog.open with proper controller', () => {
            ctrl.openGeneralSettingsDialog();

            expect(injectValues.$mdDialog.show).toHaveBeenCalledWith(expect.objectContaining({
                controller: 'GeneralSettingsDialogCtrl',
            }));
        });
    });

    describe('openViewEditor', () => {
        it('should redirect to standard view editor', () => {
            ctrl.openViewEditor({ name: 'barChart' });

            expect(injectValues.$state.go)
                .toHaveBeenCalledWith('dashboard.dataset.one.views.view', { name: 'barChart' });
        });

        it('should open custom view modal', () => {
            ctrl.openViewEditor({ name: 'customView' });

            expect(injectValues.$mdDialog.show).toHaveBeenCalledWith({
                controller: 'glitterViewModalCtrl',
                templateUrl: 'glitter/view-modal.html',
                locals: { dataset: $scope.datasetOneCtrl.dataset },
            });
        });
    });
});
