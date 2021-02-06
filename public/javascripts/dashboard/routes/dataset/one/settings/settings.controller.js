const SHOWCASE_THUMBNAIL_WIDTH = 336;
const SHOWCASE_THUMBNAIL_HEIGHT = 252;
const LINE_GRAPH = 'line-graph';
const BAR_CHART = 'bar-chart';
const AREA_CHART = 'area-chart';
const PIE_CHART = 'pie-chart';
const MAP = 'map';
const TREEMAP = 'treemap';
const VIZ_RESTRICTIONS = [LINE_GRAPH, BAR_CHART, AREA_CHART, PIE_CHART, MAP, TREEMAP];

function DatasetSettingsCtrl($scope, DatasetService, FileUploadService, AssetService, JsonApi, $mdToast, $mdDialog, viewUrlService, modalService, $document) {
    const { datasetOneCtrl, datasetCtrl, team } = $scope;
    const datasetSettingsCtrl = this;

    datasetSettingsCtrl._imageRevision = 0;
    datasetSettingsCtrl.uploadPending = false;
    datasetSettingsCtrl.drupalTags = [];

    $scope.$watch('datasetOneCtrl.dataset.brandColor.accent', (newAccentColor) => {
        if (datasetOneCtrl.originalDataset.brandColor.accent !== newAccentColor) {
            datasetOneCtrl.form.$setDirty();
        }
    });

    /**
     * If sb sets visible, listed and approved flags and then unsets visible or listed
     */
    $scope.$watchGroup([
        'datasetOneCtrl.dataset.fe_visible',
        'datasetOneCtrl.dataset.fe_listed',
        'datasetOneCtrl.dataset.state',
        'datasetOneCtrl.originalDataset.state',
    ], ([visible, listed, nextState, currentState]) => {
        if (currentState !== 'approved' && nextState === 'approved' && (!listed || !visible)) {
            datasetOneCtrl.dataset.state = null;
        }
    });

    if ($scope.isVisualizationEditor || $scope.user.isSuperAdmin || $scope.isAdmin) {
        createDrupalTags();

        $scope.openDrupalTagsDialog = openDrupalTagsDialog;
    }

    const viewUrl = viewUrlService.getViewUrl(
        $scope.subdomain,
        datasetOneCtrl.originalDataset,
        datasetOneCtrl.originalDataset.fe_views.default_view,
    );

    JsonApi.share({ url: viewUrl }).then(({ data: { share_url } }) => {
        datasetSettingsCtrl.embedUrl = '<iframe src="' + share_url + '?embed=true" width="640" height="480" frameborder="0"></iframe>';
    });

    const updateListing = (state, successMessage) => {
        datasetSettingsCtrl.requestPending = true;

        return DatasetService
            .approvalRequest(datasetOneCtrl.dataset._id, { state })
            .then((response) => {
                datasetSettingsCtrl.requestPending = false;

                if (response.status === 200 && response.data) {
                    datasetCtrl.showSimpleToast(successMessage);
                    datasetOneCtrl.originalDataset.state = response.data.state;
                    datasetOneCtrl.dataset.state = response.data.state;
                } else {
                    return Promise.reject();
                }
            })
            .catch(() => {
                datasetCtrl.showGenericErrorToast();
                datasetSettingsCtrl.requestPending = false;
                return Promise.reject();
            });
    };

    datasetSettingsCtrl.submitListingRequest = () => updateListing('pending', 'Request submitted.');

    datasetSettingsCtrl.cancelListingRequest = () => updateListing(undefined, 'Request cancelled.');

    datasetSettingsCtrl.approveListingRequest = () => updateListing('approved', 'Request approved.');

    datasetSettingsCtrl.disapproveListingRequest = () => updateListing('disapproved', 'Request rejected.');

    datasetSettingsCtrl.imageUploader = FileUploadService.newUploaderWithResize('banner', 'settingsForm', 'dataset', datasetOneCtrl.dataset._id, SHOWCASE_THUMBNAIL_WIDTH, SHOWCASE_THUMBNAIL_HEIGHT);

    datasetSettingsCtrl.imageUploader.onCompleteItem = (fileItem, response, status) => {
        if (status === 200) {
            return DatasetService
                .save({
                    _id: datasetOneCtrl.dataset._id,
                    banner: fileItem.file.name,
                })
                .then(({ data }) => {
                    datasetSettingsCtrl._imageRevision += 1;
                    datasetOneCtrl.dataset.banner = datasetOneCtrl.originalDataset.banner = data.dataset.banner;
                    datasetCtrl.showSimpleToast('Image uploaded!');
                })
                .catch(datasetCtrl.showGenericErrorToast)
                .then(() => (datasetSettingsCtrl.uploadPending = false));
        }

        return Promise.reject();
    };

    datasetSettingsCtrl.imageUploader.onGetSignedUrlError = function (message) {
        $mdToast.show($mdToast.simple()
            .textContent(message)
            .position('top right')
            .hideDelay(3000),
        );
    };

    datasetSettingsCtrl.imageUploader.onErrorItem = () => {
        datasetCtrl.showGenericErrorToast();
        datasetSettingsCtrl.uploadPending = false;
    };

    datasetSettingsCtrl.imageUploader.onBeforeUploadItem = () => {
        datasetSettingsCtrl.uploadPending = true;
    };

    datasetSettingsCtrl.deleteBanner = () => {
        datasetSettingsCtrl.uploadPending = true;

        AssetService
            .deleteBanner(datasetOneCtrl.dataset._id)
            .then(() => {
                datasetOneCtrl.dataset.banner = null;
                datasetOneCtrl.originalDataset.banner = null;
                datasetCtrl.showSimpleToast('Image deleted.');
            })
            .catch(datasetCtrl.showGenericErrorToast)
            .then(() => (datasetSettingsCtrl.uploadPending = false));
    };

    datasetSettingsCtrl.getBannerUrl = () => {
        const { banner } = datasetOneCtrl.dataset;
        let url;

        if (banner.startsWith('http')) {
            url = banner;
        } else {
            url = `https://${$scope.env.s3Bucket}.${$scope.env.s3Domain}/${$scope.team.subdomain}/datasets/${datasetOneCtrl.dataset._id}/assets/banner/${banner}`;
        }

        return `${url}?${datasetSettingsCtrl._imageRevision}`;
    };

    datasetSettingsCtrl.copyToClipboard = link => {
        const tempInput = $document[0].createElement('input');

        tempInput.setAttribute('value', link);
        $document[0].body.appendChild(tempInput);
        tempInput.select();
        $document[0].execCommand('copy');
        $mdToast.show(
            $mdToast.simple()
                .textContent('Copied')
                .position('top right')
                .hideDelay(3000),
        );
        $document[0].body.removeChild(tempInput);
    };

    function openDrupalTagsDialog() {
        modalService.openDialog('drupalTags', {
            drupalTags: datasetSettingsCtrl.drupalTags,
            copyToClipboard: datasetSettingsCtrl.copyToClipboard,
        });
    }

    function createDrupalTags() {
        const { dataset: { uid, fe_views, _id } } = datasetOneCtrl;
        const visibleViews = _.flow(
            (data) => _.map(data, (value, key) => ({ name: _.kebabCase(key), ...value })),
            (data) => _.filter(data, (({ visible, name }) => visible && VIZ_RESTRICTIONS.includes(name))),
        )(fe_views.views);

        datasetSettingsCtrl.drupalTags = visibleViews.map(({ name }, index) => ({
            name: _.startCase(name),
            tag: `<gist-visualization chart-id="${_id.toString().slice(-4)}${index}" chart-type="${name}" subdomain="${team.subdomain}" visualization="${uid}"/>`,
        }));
    }
}

angular
    .module('arraysApp')
    .controller('DatasetSettingsCtrl', DatasetSettingsCtrl);
