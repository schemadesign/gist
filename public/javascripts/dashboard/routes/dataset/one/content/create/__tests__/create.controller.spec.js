import '../create.controller';
import { cloneDeep, merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetContentCreate: Controller', () => {
    let $rootScope, $controller, $scope, $state, $q;
    let injectValues, ctrl;

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject((_$controller_, _$rootScope_, _$q_) => {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $q = _$q_;
        });

        $state = {
            go: jest.fn(),
        };

        const dataset = merge({}, pokemon1, {
            columns: [
                { name: 'Pokemon No' },
                { name: 'Name' },
            ],
        });

        $scope = $rootScope.$new();

        $scope.datasetOneCtrl = {
            dataset,
            originalDataset: cloneDeep(dataset),
            additionalDatasources: [],
        };

        $scope.datasetCtrl = {
            showGenericErrorToast: jest.fn(),
            showSimpleToast: jest.fn(),
        };

        injectValues = {
            $scope,
            $state,
            Content: {
                save: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
            },
        };

        ctrl = $controller('ContentCreateCtrl', injectValues);

        ctrl.form = {};
    });

    it('should set parameters', () => {
        expect(ctrl.entry).toEqual({
            srcDocPKey: pokemon1._id,
            published: false,
            rowParams: {
                'Max CP': null,
                Name: null,
                'Pokemon No': null,
                'Pokemon No_': null,
                'Type 1': null,
                'Type 2': null,
            },
        });
    });

    it('should not save content when form is dirty', () => {
        ctrl.form.$pristine = true;
        $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.save).not.toHaveBeenCalled();

        ctrl.form.$pristine = false;
        ctrl.form.$invalid = true;
        $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.save).not.toHaveBeenCalled();
    });

    it('should save content', async () => {
        await $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.save).toHaveBeenCalledWith({
            datasetId: pokemon1._id,
        }, expect.any(Object));
        expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith(expect.any(String));
        expect($scope.datasetOneCtrl.dataset.contentEdited).toBe(true);
        expect($scope.datasetOneCtrl.originalDataset.contentEdited).toBe(true);
        expect($state.go).toHaveBeenCalledWith('dashboard.dataset.one.content.list', { sortBy: 'updatedAt' });
    });

    it('should show error when saving failed', () => {
        injectValues.Content.save = jest.fn().mockReturnValue({
            $promise: $q.reject({}),
        });
        ctrl = $controller('ContentCreateCtrl', injectValues);
        ctrl.form = {};
        $scope.$broadcast('contentSaveForm');
        $scope.$digest();

        expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
    });
});
