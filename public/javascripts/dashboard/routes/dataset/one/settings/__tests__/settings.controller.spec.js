import { cloneDeep, merge, noop } from 'lodash';
import mockDate from 'mockdate';

import '../../../../../app';
import '../settings.controller';
import { apiDataset } from '../../../../../../../../internals/testing/backend/fixtures/datasets';

const DRUPAL_TAGS = [{
    name: 'Pie Chart',
    tag: '<gist-visualization chart-id="6d2d0" chart-type="pie-chart" subdomain="glitter" visualization="game-of-thrones"/>',
}, {
    name: 'Line Graph',
    tag: '<gist-visualization chart-id="6d2d1" chart-type="line-graph" subdomain="glitter" visualization="game-of-thrones"/>',
}, {
    name: 'Bar Chart',
    tag: '<gist-visualization chart-id="6d2d2" chart-type="bar-chart" subdomain="glitter" visualization="game-of-thrones"/>',
}, {
    name: 'Area Chart',
    tag: '<gist-visualization chart-id="6d2d3" chart-type="area-chart" subdomain="glitter" visualization="game-of-thrones"/>',
}, {
    name: 'Map',
    tag: '<gist-visualization chart-id="6d2d4" chart-type="map" subdomain="glitter" visualization="game-of-thrones"/>',
}];

describe('Settings: Controller', () => {
    let $rootScope, $controller, $scope, $document;
    let injectValues;
    let $mdToast = {};

    beforeEach(() => {
        angular.mock.module('arraysApp');

        inject(function (_$controller_, _$rootScope_, _$document_) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $document = _$document_;
            $document[0].execCommand = jest.fn();
        });

        Object.assign($mdToast, {
            show: jest.fn(),
            simple: jest.fn().mockReturnValue($mdToast),
            textContent: jest.fn().mockReturnValue($mdToast),
            position: jest.fn().mockReturnValue($mdToast),
            hideDelay: jest.fn().mockReturnValue($mdToast),
            parent: jest.fn().mockReturnValue($mdToast),
        });

        $scope = $rootScope.$new();
        $scope.datasetCtrl = {
            showSimpleToast: jest.fn(),
            showGenericErrorToast: jest.fn(),
        };
        $scope.env = {
            s3Bucket: 'bucket',
        };
        $scope.team = {
            subdomain: 'glitter',
        };
        $scope.datasetOneCtrl = {
            dataset: cloneDeep(apiDataset),
            originalDataset: cloneDeep(apiDataset),
            form: {
                $setDirty: jest.fn(),
            },
        };
        $scope.subdomain = 'glitter';
        $scope.isVisualizationEditor = true;
        $scope.isAdmin = false;

        $scope.user = {
            isSuperAdmin: false,
        };

        injectValues = {
            $scope,
            $mdToast,
            $document,
            DatasetService: {
                save: jest.fn(),
                update: jest.fn(),
                approvalRequest: jest.fn().mockImplementation((id, { state }) => {
                    return Promise.resolve({
                        status: 200,
                        data: { state },
                    });
                }),
            },
            FileUploadService: {
                newUploader: jest.fn().mockReturnValue({}),
                newUploaderWithResize: jest.fn().mockReturnValue({}),
            },
            AssetService: {},
            JsonApi: {
                share: jest.fn().mockImplementation(({ url }) => {
                    return Promise.resolve({
                        status: 200,
                        data: { share_url: url },
                    });
                }),
            },
            viewUrlService: {
                getViewUrl: jest.fn().mockReturnValue('url'),
            },
        };
    });

    it('should get view url', () => {
        $controller('DatasetSettingsCtrl', injectValues);

        expect(injectValues.viewUrlService.getViewUrl)
            .toHaveBeenCalledWith(
                'glitter',
                expect.any(Object),
                'gallery',
            );
    });

    describe('create Drupal tags', () => {
        it('for Drupal user (visualizationEditor)', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            expect(ctrl.drupalTags).toEqual(DRUPAL_TAGS);
        });

        it('for team admins', () => {
            injectValues.$scope.isAdmin = true;
            injectValues.$scope.isVisualizationEditor = false;

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            expect(ctrl.drupalTags).toEqual(DRUPAL_TAGS);
        });

        it('for super admins', () => {
            injectValues.$scope.isAdmin = false;
            injectValues.$scope.isVisualizationEditor = false;
            injectValues.$scope.user.isSuperAdmin = true;

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            expect(ctrl.drupalTags).toEqual(DRUPAL_TAGS);
        });
    });

    it('should not create Drupal tags for normal user', () => {
        injectValues.$scope.isAdmin = false;
        injectValues.$scope.isVisualizationEditor = false;
        injectValues.$scope.user.isSuperAdmin = false;

        const ctrl = $controller('DatasetSettingsCtrl', injectValues);

        expect(ctrl.drupalTags).toEqual([]);
    });

    it('should set embed url', async () => {
        const ctrl = $controller('DatasetSettingsCtrl', injectValues);
        await injectValues.JsonApi.share;
        expect(ctrl.embedUrl).toBe('<iframe src="url?embed=true" width="640" height="480" frameborder="0"></iframe>');
    });

    describe('when click on clipboard icon', () => {
        it('should copy to clipboard', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.copyToClipboard('tag');

            expect(injectValues.$document[0].execCommand).toHaveBeenCalledWith('copy');
            expect(injectValues.$mdToast.show).toHaveBeenCalled();
            expect(injectValues.$mdToast.simple).toHaveBeenCalled();
            expect(injectValues.$mdToast.textContent).toHaveBeenCalledWith('Copied');
        });
    });

    describe('when ctrl.submitListingRequest is called', () => {
        it('should send listing request', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            ctrl.submitListingRequest();

            expect(injectValues.DatasetService.approvalRequest)
                .toHaveBeenCalledWith(apiDataset._id, { state: 'pending' });
        });

        it('should set new state in datasetOneCtrl.dataset and datasetOneCtrl.originalDataset', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.submitListingRequest();

            expect($scope.datasetOneCtrl.dataset.state).toBe('pending');
            expect($scope.datasetOneCtrl.originalDataset.state).toBe('pending');
        });

        it('should show success toast', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.submitListingRequest();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Request submitted.');
        });

        it('should show error toast if request errored', async () => {
            injectValues.DatasetService.approvalRequest.mockRejectedValue({});

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.submitListingRequest().catch(noop);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when ctrl.cancelListingRequest is called', () => {
        it('should send listing request', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            ctrl.cancelListingRequest();

            expect(injectValues.DatasetService.approvalRequest)
                .toHaveBeenCalledWith(apiDataset._id, { state: undefined });
        });

        it('should set new state in datasetOneCtrl.dataset and datasetOneCtrl.originalDataset', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.cancelListingRequest();

            expect($scope.datasetOneCtrl.dataset.state).toBeUndefined();
            expect($scope.datasetOneCtrl.originalDataset.state).toBeUndefined();
        });

        it('should show success toast', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.cancelListingRequest();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Request cancelled.');
        });

        it('should show error toast if request errored', async () => {
            injectValues.DatasetService.approvalRequest.mockRejectedValue({});

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.cancelListingRequest().catch(noop);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when ctrl.approveListingRequest is called', () => {
        it('should send listing request', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            ctrl.approveListingRequest();

            expect(injectValues.DatasetService.approvalRequest)
                .toHaveBeenCalledWith(apiDataset._id, { state: 'approved' });
        });

        it('should set new state in datasetOneCtrl.dataset and datasetOneCtrl.originalDataset', async () => {
            $scope.datasetOneCtrl.dataset.state = undefined;
            $scope.datasetOneCtrl.originalDataset.state = undefined;

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.approveListingRequest();

            expect($scope.datasetOneCtrl.dataset.state).toBe('approved');
            expect($scope.datasetOneCtrl.originalDataset.state).toBe('approved');
        });

        it('should show success toast', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.approveListingRequest();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Request approved.');
        });

        it('should show error toast if request errored', async () => {
            injectValues.DatasetService.approvalRequest.mockRejectedValue({});

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.approveListingRequest().catch(noop);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when ctrl.disapproveListingRequest is called', () => {
        it('should send listing request', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            ctrl.disapproveListingRequest();

            expect(injectValues.DatasetService.approvalRequest)
                .toHaveBeenCalledWith(apiDataset._id, { state: 'disapproved' });
        });

        it('should set new state in datasetOneCtrl.dataset and datasetOneCtrl.originalDataset', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.disapproveListingRequest();

            expect($scope.datasetOneCtrl.dataset.state).toBe('disapproved');
            expect($scope.datasetOneCtrl.originalDataset.state).toBe('disapproved');
        });

        it('should show success toast', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.disapproveListingRequest();

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Request rejected.');
        });

        it('should show error toast if request errored', async () => {
            injectValues.DatasetService.approvalRequest.mockRejectedValue({});

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            await ctrl.disapproveListingRequest().catch(noop);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });
    });

    describe('when ctrl.getBannerUrl is called', () => {
        it('returns dataset.banner if it begins with http', () => {
            $scope.datasetOneCtrl.dataset.banner = 'http://some-image-url.com';

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            expect(ctrl.getBannerUrl()).toBe('http://some-image-url.com?0');
        });

        it('constructs banner url', () => {
            $scope.datasetOneCtrl.dataset.banner = 'some-image.png';

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            expect(ctrl.getBannerUrl())
                .toBe('https://bucket.nyc3.digitaloceanspaces.com/glitter/datasets/5b07033050f5c886278b6d2d/assets/banner/some-image.png?0');
        });
    });

    describe('when datasetOneCtrl.dataset.brandColor.accent changes its value', () => {
        it('should set datasetOneCtrl.form dirty', () => {
            $controller('DatasetSettingsCtrl', injectValues);

            $scope.datasetOneCtrl.dataset.brandColor.accent = '#111111';
            $scope.$digest();

            expect($scope.datasetOneCtrl.form.$setDirty).toHaveBeenCalled();
        });
    });

    describe('when image is being uploaded', () => {
        beforeEach(() => {
            injectValues.DatasetService.save.mockResolvedValue({
                status: 200,
                data: {
                    dataset: merge({}, apiDataset, {
                        banner: 'file.png',
                    }),
                },
            });
        });

        it('should call DatasetService.save after succesful upload', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);

            expect(injectValues.DatasetService.save).toHaveBeenCalledWith({
                _id: apiDataset._id,
                banner: 'file.png',
            });
        });

        it('should set pending flag on upload start', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.imageUploader.onBeforeUploadItem();

            expect(ctrl.uploadPending).toBeTruthy();
        });

        it('should show success toast on successful update', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);

            expect($scope.datasetCtrl.showSimpleToast).toHaveBeenCalledWith('Image uploaded!');
        });

        it('should unset pending flag on successful update', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.uploadPending = true;
            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);

            expect(ctrl.uploadPending).toBeFalsy();
        });

        it('should update image url if filename stays the same', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);
            const filename1 = ctrl.getBannerUrl();

            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);
            const filename2 = ctrl.getBannerUrl();

            expect(filename1).not.toEqual(filename2);
        });

        it('should show error toast on dataset save error', async () => {
            injectValues.DatasetService.save.mockRejectedValue();

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });

        it('should unset pending flag on dataset save error', async () => {
            injectValues.DatasetService.save.mockRejectedValue();

            const ctrl = $controller('DatasetSettingsCtrl', injectValues);
            ctrl.uploadPending = true;
            await ctrl.imageUploader.onCompleteItem({ file: { name: 'file.png' } }, {}, 200);

            expect(ctrl.uploadPending).toBeFalsy();
        });

        it('should show toast on upload error', () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.imageUploader.onErrorItem();

            expect($scope.datasetCtrl.showGenericErrorToast).toHaveBeenCalled();
        });

        it('should unset pending flag on upload error', async () => {
            const ctrl = $controller('DatasetSettingsCtrl', injectValues);

            ctrl.uploadPending = true;
            ctrl.imageUploader.onErrorItem();

            expect(ctrl.uploadPending).toBeFalsy();
        });
    });
});
