const winston = require('winston');
const _ = require('lodash');

const View = require('../../../models/views');
const config = require('../../../controllers/client/config');
const { VIEW_TYPE_TIMELINE, VIEW_TYPE_GROUPED_GALLERY } = require('../../../config/views.config');
const { scaffoldView } = require('../../../utils/views');

module.exports = { addMeta };

function addMeta(view = {}) {
    return async function (req, res, next) {
        const dataSource = req.dataSource;
        const replaceTimeline = name => name === VIEW_TYPE_GROUPED_GALLERY ? VIEW_TYPE_TIMELINE : name;
        // previous middleware may have provided an override to the viewType (e.g. add-shared-page)
        let viewType = replaceTimeline(req.viewType);

        // if view has not been specified, try and get it from the query params
        if (!viewType) {
            if (view.name) {
                viewType = replaceTimeline(view.name);
            } else if (req.params.view_type) {
                viewType = replaceTimeline(req.params.view_type);
            } else if (dataSource.fe_views.default_view) {
                // no view specified in url - redirect to default view
                viewType = config.formatDefaultView(dataSource.fe_views.default_view);

                return res.redirect(`/${req.params.source_key}/${viewType}`);
            } else {
                winston.error('Cannot add metadata for an unknown view: %s', req.params.view_type);

                return next(new Error('Cannot add metadata for an unknown view'));
            }
        }

        req.viewType = viewType;
        req.camelCaseViewType = _.camelCase(viewType);

        // Given the view type, add the metadata that other middleware will need
        // first we need the full view object
        try {
            const loadedView = await View.findOne({ name: req.camelCaseViewType }).lean().exec();

            req.viewSettings = loadedView.settings;
            req.viewLookup = loadedView.lookup;

            // Apply missing settings to outdated views
            const { scaffold } = scaffoldView(loadedView, dataSource);
            const scaffoldedSettings = Object.assign({}, scaffold, dataSource.fe_views.views[req.camelCaseViewType]);

            dataSource.fe_views.views[req.camelCaseViewType] = scaffoldedSettings;
        } catch (err) {
            winston.error('Error adding view metadata', err);

            return next(err);
        }

        winston.debug('View metadata added');
        next();
    };
}
