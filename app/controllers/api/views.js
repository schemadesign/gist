const { handleError } = require('../../utils/requests');
const { getAllViews, getView, prepareView, scaffoldView } = require('../../utils/views');
const { getDataset } = require('../../utils/datasets');

module.exports.getAll = getAll;
module.exports.get = get;
module.exports.getDetailed = getDetailed;

async function getAll(req, res) {
    try {
        const views = await getAllViews(req.user);

        res.json(views);
    } catch (err) {
        handleError(err, res);
    }

}

async function get(req, res) {
    try {
        const view = await getView(req.params.id);
        const readyView = prepareView(view);

        res.json(readyView);
    } catch (err) {
        handleError(err, res);
    }
}

async function getDetailed(req, res) {
    try {
        const view = await getView(req.params.id);
        const dataset = await getDataset(req.params.datasetId);
        const preparedView = prepareView(view);
        const scaffoldedView = scaffoldView(preparedView, dataset);

        res.json(scaffoldedView);
    } catch (err) {
        handleError(err, res);
    }
}
