(function () {
    angular
        .module('arraysApp')
        .service('DatasetService', DatasetService);

    function DatasetService($http, FileSaver) {

        var getMappingDatasourceCols = function (pKey) {
            return $http.get('api/dataset/getMappingDatasourceCols/' + pKey);
        };

        var remove = function (id) {
            return $http.post('api/dataset/remove', { id: id });
        };

        var update = function (id, update) {
            return $http.put('api/dataset/update/' + id, update);
        };

        var canExcludeField = function (id, fieldName) {
            return $http.get(`api/dataset/canExcludeField/${id}/${fieldName}`);
        };

        var draft = function (data) {
            return $http.put(
                `api/dataset/draft/${data._id}`,
                _.pick(data, ['fe_views', 'fe_excludeFieldsObjDetail', 'objectTitle', 'fe_image', 'colorMapping']),
            );
        };

        var get = function (id) {
            // New Dataset
            if (!id) {
                return {
                    type: 'standardViz',
                    urls: [],
                };
            }

            return $http.get('api/dataset/get/' + id)
                .then(function (response) {
                    if (response.data.error) {
                        return { error: response.data.error, dataset: response.data.description };
                    }
                    return response.data.dataset;
                });
        };

        var getAdditionalSources = function (id) {

            return $http.get('api/dataset/getAdditionalSources/' + id)
                .then(function (response) {
                    if (response.data.error) {
                        return { error: response.data.error, datasets: response.data.sources };
                    }

                    return response.data.sources;
                }).catch(function (err) {
                    console.log(err);
                    return [];
                });
        };

        var save = function (dataset) {
            return $http.post('api/dataset/save', dataset);
        };

        var deleteSource = function (id) {
            return $http.delete('api/dataset/source/' + id);
        };

        var preImport = function (id) {
            return $http.get('api/dataset/preImport/' + id);
        };

        var scrapeImages = function (id) {
            return $http.get('api/dataset/scrapeImages/' + id);
        };

        var postScrapeImages = function (id, rowIds) {
            return $http.post('api/dataset/scrapeImages/' + id, { rowIds: rowIds });
        };

        var importProcessed = function (id) {
            return $http.get('api/dataset/importProcessed/' + id);
        };

        var postImport = function (id) {
            return $http.get('api/dataset/postImport/' + id);
        };

        var getAvailableMatchFns = function () {
            return $http.get('api/dataset/getAvailableMatchFns')
                .then(function (response) {
                    return response.data.availableMatchFns;
                }).catch(function (err) {
                    console.log(err);
                    return [];
                });

        };

        var getJobStatus = function (id) {
            return $http.get('api/dataset/jobStatus/' + id)
                .then(function (response) {

                    return response.data;
                });
        };

        const getJob = function (datasetId) {
            return $http.get(`api/dataset/job/${datasetId}`).then(({ data }) => data.job);
        };

        var getDatasetsWithQuery = function (query) {
            return $http.post('api/dataset/getDatasetsWithQuery', query)
                .then(function (response) {
                    var data = response.data;
                    return data.datasets;
                }).catch(function (err) {
                    if (err.status !== 404) {
                        console.log(err);
                    }
                    return [];
                });
        };

        var removeSubdataset = function (id, childReplacement) {

            return $http.post('api/dataset/removeSubdataset', { id: id, childReplacement: childReplacement });
        };

        var getReimportDatasets = function (id) {

            return $http.get('api/dataset/reimportDatasets/' + id)
                .then(function (response) {
                    var data = response.data;
                    return data.datasets;
                }).catch(function (err) {
                    console.log(err);
                    return [];
                });
        };

        var killJob = function (id) {
            return $http.delete('api/dataset/job/' + id);
        };

        const startJob = id => $http.post(`api/dataset/job/${id}`);

        var connectToRemoteDatasource = function (datasetId, connectionInfo) {
            return $http.post('api/dataset/connect/' + datasetId, connectionInfo);
        };

        var colsForJoinTables = function (datasetId, connectionInfo) {
            return $http.post('api/dataset/colsForJoinTables/' + datasetId, connectionInfo);
        };

        var approvalRequest = function (datasetId, state) {
            return $http.put('api/dataset/approve/' + datasetId, state);
        };

        var replaceReimportedDataset = function (newId, oldId, childReplacement) {
            return $http.post('api/dataset/replaceReimportedDataset', {
                newId: newId, oldId: oldId, childReplacement: childReplacement,
            });
        };

        var publishNewDescription = function (newId, oldId) {
            return $http.post('api/dataset/publishNewDescription', { newId: newId, oldId: oldId });
        };

        var readJSON = function (datasetId, apiEndPoint) {
            return $http.post('api/dataset/jsonPath', apiEndPoint, { timeout: 5000 });
        };

        var download = function (datasetId, originalOrModified) {
            return $http.get(`api/dataset/download/${datasetId}?originalOrModified=${originalOrModified}`)
                .then((file) => {
                    const headers = file.headers();
                    const [, fileName] = headers['content-disposition'].match(/filename=(.*)$/);
                    const fileType = headers['content-type'];
                    let { data } = file;

                    if (fileType === 'application/json') {
                        data = JSON.stringify(data);
                    }

                    const blob = new Blob([data], { type: `${fileType};charset=utf-8` });

                    FileSaver.saveAs(blob, decodeURIComponent(fileName));
                });
        };

        var getPreviousDatasets = function (datasetId) {
            return $http.get('/api/dataset/previous/' + datasetId);
        };

        var getCachedValues = function (datasetId, field) {
            return $http.get('api/dataset/cachedValues/' + datasetId + '/' + encodeURIComponent(field));
        };

        var getKeywords = function (datasetId, field) {
            return $http.get('api/dataset/keywords/' + datasetId + '/' + encodeURIComponent(field));
        };

        var revert = function (prevDatasetId, currentDatasetId) {
            return $http.post('api/dataset/revert/' + prevDatasetId + '/' + currentDatasetId);
        };

        return {
            removeSubdataset: removeSubdataset,
            deleteSource: deleteSource,
            remove: remove,
            get: get,
            readJSON: readJSON,
            draft: draft,
            connectToRemoteDatasource: connectToRemoteDatasource,
            killJob: killJob,
            startJob,
            colsForJoinTables: colsForJoinTables,
            getAdditionalSources: getAdditionalSources,
            getReimportDatasets: getReimportDatasets,
            save: save,
            update: update,
            approvalRequest: approvalRequest,
            getJobStatus: getJobStatus,
            getJob: getJob,
            getAvailableMatchFns: getAvailableMatchFns,
            getDatasetsWithQuery: getDatasetsWithQuery,
            getMappingDatasourceCols: getMappingDatasourceCols,
            preImport: preImport,
            postImport: postImport,
            scrapeImages: scrapeImages,
            postScrapeImages: postScrapeImages,
            importProcessed: importProcessed,
            replaceReimportedDataset: replaceReimportedDataset,
            publishNewDescription: publishNewDescription,
            download: download,
            getPreviousDatasets: getPreviousDatasets,
            getCachedValues: getCachedValues,
            getKeywords: getKeywords,
            revert: revert,
            canExcludeField,
        };
    }
})();
