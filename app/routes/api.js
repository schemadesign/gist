const express = require('express');
const router = express.Router();

const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../tmp') });

const limiter = require('../utils/limiter');
const slowDown = require('../utils/slowDown');

const { checkCors, checkPermissions, API_ALLOWED } = require('./permissions');

const ctrlAdmin = require('../controllers/api/admin');
const ctrlDataset = require('../controllers/api/dataset/index');
const ctrlConnection = require('../controllers/api/dataset/remote');
const ctrlCron = require('../controllers/api/dataset/cron');
const ctrlUsers = require('../controllers/api/users/users');
const ctrlTeam = require('../controllers/api/team');
const ctrlPerformance = require('../controllers/api/performance');
const ctrlPage = require('../controllers/api/page');
const ctrlWebsite = require('../controllers/api/website');
const ctrlView = require('../controllers/api/views');
const ctrlJob = require('../controllers/api/job');
const ctrlReimport = require('../controllers/api/dataset/reimport');
const ctrlContent = require('../controllers/api/dataset/content');
const ctrlCreatedField = require('../controllers/api/dataset/created-field');
const ctrlStory = require('../controllers/api/sharing/stories');
const ctrlPermissions = require('../controllers/api/permissions');
const ctrlSmartsheet = require('../libs/datasources/smartsheet');
const ctrlDatadotworld = require('../libs/datasources/data-dot-world');
const ctrlSalesforce = require('../libs/datasources/salesforce');
const ctrlSocrata = require('../libs/datasources/socrata');
const ctrlAssets = require('../controllers/api/assets');
const ctrlApiKeys = require('../controllers/api/apikeys');
const ctrlRegisterLink = require('../controllers/api/registerLink');
const ctrlToken = require('../controllers/api/token');


router.get('/job/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlJob.getJob);
router.get('/job/:id/state', checkCors(), checkPermissions({ isAnonymous: false }), ctrlJob.getJobState);
router.get('/job/:id/log', checkPermissions({ isAnonymous: false }), ctrlJob.getJobLog);

// admin functions
router.post('/admin/invite', checkCors(), checkPermissions({ isAnonymous: false }), ctrlAdmin.invite);

// dataset settings
router.post('/dataset/getDatasetsWithQuery', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getDatasetsWithQuery);
router.post('/dataset/remove', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.remove);
router.get('/dataset/get/:id', slowDown(), checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.get);
router.get('/dataset/getAdditionalSources/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getAdditionalSourcesWithSchemaID);
router.post('/dataset/save', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.save);
router.put('/dataset/update/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.update);
router.put('/dataset/approve/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.approvalRequest);
router.get('/dataset/job/:datasetId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getJob);
router.put('/dataset/draft/:datasetId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.draft);
router.get('/dataset/cachedValues/:id/:field', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getCachedValues);
router.get('/dataset/keywords/:id/:field', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getKeywords);
router.get('/dataset/canExcludeField/:id/:name', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.canExcludeField);

// dataset content tab
router.get('/dataset/content/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlContent.getContent);
router.post('/dataset/content/:datasetId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlContent.createDataset);
router.get('/dataset/content/:datasetId/:rowId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlContent.getRow);
router.put('/dataset/content/:datasetId/:rowId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlContent.updateRow);
router.delete('/dataset/content/:datasetId/:rowId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlContent.removeDateset);
router.post('/dataset/content/:datasetId/createField/:field', checkCors(), checkPermissions({ isAnonymous: true }), ctrlCreatedField.createField);
router.post('/dataset/content/:datasetId/removeField/:field', checkCors(), checkPermissions({ isAnonymous: true }), ctrlCreatedField.removeField);

// dataset reimport
router.post('/dataset/replaceReimportedDataset', checkCors(), checkPermissions({ isAnonymous: false }), ctrlReimport.replaceReimportedDataset);
router.post('/dataset/publishNewDescription', checkCors(), checkPermissions({ isAnonymous: false }), ctrlReimport.publishNewDescription);

router.post('/dataset/removeSubdataset', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.removeSubdataset);
router.get('/dataset/reimportDatasets/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getDependencyDatasetsForReimporting);
router.get('/dataset/jobStatus/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getJobStatus);

router.get('/dataset/getAssetUploadSignedUrl/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.signedUrlForAssetsUpload);
router.get('/dataset/deleteBanner/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.deleteBanner);
router.post('/dataset/revert/:previous/:current', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.revert);

// dataset upload
router.post('/dataset/upload', checkCors(), checkPermissions({ isAnonymous: false }), upload.single('file'), ctrlDataset.upload);
router.post('/dataset/uploadAncillaryFile', checkCors(), checkPermissions({ isAnonymous: false }), upload.array('file', 12), ctrlDataset.uploadAncillaryFile);
router.post('/dataset/job/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.startJob);
router.get('/dataset/download/:id', checkCors(), checkPermissions({ isAnonymous: true }), ctrlDataset.download);
router.get('/dataset/previous/:id', checkCors(), checkPermissions({ isAnonymous: true }), ctrlDataset.getPreviousVersions);
router.get('/download/:_team/:uid', checkCors(), checkPermissions({ isAnonymous: true }), ctrlDataset.downloadLatest);
router.get('/dataset/ancillary/:team/:uid', checkCors(), checkPermissions({ isAnonymous: true }), ctrlDataset.getAncillary);

router.delete('/dataset/source/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.deleteSource);
router.delete('/dataset/job/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.killJob);

// dataset format data
router.get('/dataset/getAvailableMatchFns', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.getAvailableMatchFns);

// dataset import
router.get('/dataset/preImport/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.preImport);
router.get('/dataset/importProcessed/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.importProcessed);
router.get('/dataset/postImport/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.postImport);
router.get('/dataset/scrapeImages/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.scrapeImages);
router.post('/dataset/scrapeImages/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.postScrapeImages);
router.post('/dataset/jsonPath', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.readSampleJSONPath);

router.post('/dataset/connect/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlConnection.connect);
router.post('/dataset/colsForJoinTables/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlConnection.getColumnsForFieldMapping);

// schedule auto updating
router.post('/dataset/cron', checkCors(), checkPermissions({ isAnonymous: false }), ctrlCron.save);
router.get('/dataset/cron/:datasetId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlCron.get);
router.put('/dataset/cron/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlCron.update);
router.delete('/dataset/cron/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlCron.delete);

// manage users
router.get('/user/search', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.search);
router.get('/user/searchEmail', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.searchEmail);
router.post('/user/authToken', checkCors(API_ALLOWED), checkPermissions({ isAnonymous: true }), limiter, slowDown(50), ctrlUsers.createAuthToken);
router.options('/user/authToken', checkCors(API_ALLOWED), checkPermissions({ isAnonymous: true }), limiter, slowDown(50));
router.post('/user', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.createWithToken);
router.get('/user/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.get);
router.get('/user/:id/email', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.getEmail);
router.put('/user/:id', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.update);
router.get('/user/:id/resend', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.resend);
router.get('/user/:email/reset', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.reset);
router.put('/user/:id/updateProfile', checkCors(), checkPermissions({ isAnonymous: true }), ctrlUsers.updateProfile);
router.post('/user/:id/checkPw', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.checkPw);
router.post('/user/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.save);
router.delete('/user/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.delete);
router.get('/user/getAll/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.getAll);
router.put('/user/defaultLoginTeam/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.defaultLoginTeam);
router.put('/user/sampleImported/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlUsers.sampleImported);

// views
router.get('/view', checkCors(), checkPermissions({ isAnonymous: false }), ctrlView.getAll);
router.get('/view/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlView.get);
router.get('/view/:id/dataset/:datasetId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlView.getDetailed);

// stories
router.get('/story', checkCors(), checkPermissions({ isAnonymous: false }), ctrlStory.getAll);
router.get('/story/insights/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlStory.getByDataSourceDescriptionId);
router.get('/story/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlStory.get);
router.put('/story/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlStory.save);
router.delete('/story/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlStory.remove);

// datasourceMapping in format view
router.get('/dataset/getMappingDatasourceCols/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataset.loadDatasourceColumnsForMapping);

// teams, website setting info
router.post('/team', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.create);
router.get('/team', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.getAll);
router.get('/team/search', checkCors(), checkPermissions({ isAnonymous: true }), ctrlTeam.search);
router.get('/team/loadIcons', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.loadIcons);
router.get('/team/deleteImage/:id/:folder/:filename', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.deleteImage);
router.get('/team/getAssetUploadSignedUrl/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.signedUrlForAssetsUpload);
router.put('/team/admin/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.addAdmin);
router.put('/team/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.update);
router.delete('/team/admin/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlTeam.deleteAdmin);
router.delete('/team/:id', checkPermissions({ isAnonymous: false }), ctrlTeam.delete);

// performance
router.get('/performance/pageviews/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPerformance.getPageViews);
router.get('/performance/pageviews/total/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPerformance.getTotalPageViews);
router.get('/performance/referrers/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPerformance.getReferrers);
router.get('/performance/technology/:technology/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPerformance.getTechnology);
router.get('/performance/segment/:operator?/:teamId', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPerformance.getSegment);

// website
router.post('/website', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.create);
router.get('/website', checkCors(), checkPermissions({ isAnonymous: true }), ctrlWebsite.getAll);
router.get('/website/search/:team_id/:subdomain', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.getByTeamAndSubdomain);
router.get('/website/team-search', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.getByTeam);
router.get('/website/search', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.search);
router.get('/website/:id', checkCors(), checkPermissions({ isAnonymous: true }), ctrlWebsite.get);
router.put('/website/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.update);
router.delete('/website/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlWebsite.delete);

// page
router.post('/page', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.create);
router.get('/page', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.getAll);
router.get('/page/search/:website_id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.getByWebsite);
router.get('/page/search', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.search);
router.get('/page/team/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.getByTeam);
router.get('/page/getAssetUploadSignedUrl/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.signedUrlForAssetsUpload);
router.delete('/page/deleteImage/:id/:folder/:filename', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.deleteImage);
router.put('/page/approve/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.approvalRequest);
router.delete('/page/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.delete);
router.put('/page/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.update);
router.get('/page/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPage.get);

// acl permissions
router.post('/permissions/dataset', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPermissions.setAllDatasetPermissions);
router.get('/permissions/user/:id/:role', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPermissions.getAllUserPermissions);
router.get('/permissions/dataset/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPermissions.getAllDatasetPermissions);
router.get('/permissions/team/:id', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPermissions.getAllTeamPermissions);

// smartsheet
router.get('/smartsheet/sheets', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSmartsheet.getSheets);

// data.world
router.get('/datadotworld/datasets', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDatadotworld.getDatasets);
router.get('/datadotworld/datasets/tables', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDatadotworld.getTables);
router.get('/datadotworld/datasets/queries', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDatadotworld.getQueries);

// salesforce
router.get('/salesforce/validateQuery', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.validateQuery);
router.get('/salesforce/validateToken', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.validateToken);
router.get('/salesforce/fields', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.getFields);
router.get('/salesforce/tables', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.getTables);

// socrata
router.get('/socrata', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSocrata.findDatasets);

// apikeys
router.get('/apiKey/getKey', checkCors(), checkPermissions({ isAnonymous: false }), ctrlApiKeys.getKey);
router.put('/apiKey/generate', checkCors(), checkPermissions({ isAnonymous: false }), ctrlApiKeys.generate);
router.post('/apiKey/update', checkCors(), checkPermissions({ isAnonymous: false }), ctrlApiKeys.update);

router.get('/register-link', checkCors(), checkPermissions({ isAnonymous: false }), ctrlRegisterLink.get);

router.get('/token/:tokenId', checkCors(), checkPermissions({ isAnonymous: true }), ctrlToken.validate);

// s3
router.get('/s3/:key*', checkCors(), checkPermissions({ isAnonymous: true }), ctrlAssets.getS3Asset);

module.exports = router;
