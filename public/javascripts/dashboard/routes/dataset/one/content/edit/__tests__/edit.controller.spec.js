import '../edit.controller';
import { cloneDeep, merge } from 'lodash';
import { pokemon1 } from '../../../../../../../../../internals/testing/backend/fixtures/datasets';


describe('DatasetContentEdit: Controller', () => {
    let $rootScope, $controller, $scope, $state, $q;
    let injectValues, ctrl;

    beforeEach(() => {
        window.arrays = {
            subtractMarkdown: () => {},
        };
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
                { name: 'Pokemon No_', operation: 'ToInteger' },
                { name: 'Name', operation: 'ToString' },
                { name: 'Max HP', operation: 'ToFloat' },
            ],
            _team: {
                subdomain: 'team',
            },
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

        $scope.env = {
            s3Bucket: 'develop',
        };

        injectValues = {
            $scope,
            $state,
            Content: {
                update: jest.fn().mockReturnValue({
                    $promise: Promise.resolve({}),
                }),
            },
            entry: {
                rowParams: {
                    'Pokemon No_': '1',
                    Name: 'Bulbasaur',
                    'Max HP': '5.8',
                },
                pKey: '01',
                updatedAt: '1544480230934',
            },
            FileUploadService: {
                entryImageUploader: jest.fn().mockReturnValue({}),
            },
            DatasetService: {
                postScrapeImages: jest.fn(),
            },
        };

        ctrl = $controller('ContentEditCtrl', injectValues);

        ctrl.form = {};
    });

    it('should set parameters', () => {
        expect(ctrl.entry).toEqual({
            rowParams: {
                'Pokemon No_': 1,
                Name: 'Bulbasaur',
                'Max HP': 5.8,
            },
            pKey: '01',
            updatedAt: '1544480230934',
        });
    });

    it('should not save content when form is dirty', () => {
        ctrl.form.$pristine = true;
        $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.update).not.toHaveBeenCalled();

        ctrl.form.$pristine = false;
        ctrl.form.$invalid = true;
        $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.update).not.toHaveBeenCalled();
    });

    it('should save content', async () => {
        ctrl.entry._id = 100;
        await $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.update).toHaveBeenCalledWith({
            datasetId: pokemon1._id,
            entryId: 100,
        }, expect.any(Object));
        expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith(expect.any(String));
        expect($scope.datasetOneCtrl.dataset.contentEdited).toBe(true);
        expect($scope.datasetOneCtrl.originalDataset.contentEdited).toBe(true);
        expect($state.go).toHaveBeenCalledWith('dashboard.dataset.one.content.list');
    });

    it('should skip nested fields', async () => {
        Object.assign(ctrl.entry.rowParams, {
            nested: [1, 2, 3],
        });
        await $scope.$broadcast('contentSaveForm');

        expect(injectValues.Content.update).toHaveBeenCalledWith(
            expect.any(Object),
            expect.not.objectContaining({ nested: [1, 2, 3] }),
        );
    });

    it('should show error when saving failed', () => {
        injectValues.Content.update = jest.fn().mockReturnValue({
            $promise: $q.reject({}),
        });
        ctrl = $controller('ContentEditCtrl', injectValues);
        ctrl.form = {};
        $scope.$broadcast('contentSaveForm');
        $scope.$digest();

        expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
    });

    it('should mark forms not pristine when image uploaded', () => {
        ctrl = $controller('ContentEditCtrl', injectValues);
        ctrl.form = {};
        $scope.datasetOneCtrl.form = {};
        $scope.entryImagesUploader.onCompleteItem(
            {
                uploadUrls: {
                    'images/source': {
                        publicUrl: 'url',
                    },
                },
            },
            null,
            200,
            null,
        );

        expect(!$scope.datasetOneCtrl.form.$pristine && !ctrl.form.$pristine).toBeTruthy();
    });
});
