var winston = require('winston');
const _ = require('lodash');

var mongoose_client = require('./mongoose_client');
var mongoose = mongoose_client.mongoose;
var Schema = mongoose.Schema;
var View_scheme = Schema({
    name: String,
    settings: { type: Array, default: [] },

    // be sure to call .markModified(path) on the model before saving if you update this Mixed property via Mongoose
    lookup: Schema.Types.Mixed,

    displayAs: String,
    icon: String,
    thumbnail: String,
    scaffold: { type: Object, default: {} },
    // _team: {type: Schema.Types.ObjectId, ref: 'Team'}
});

var view = mongoose.model('View', View_scheme);
var Team = require('./teams');

view.getAllBuiltInViews = function (fn) {
    view.find({})
        .select({ _id: 0, name: 1 })
        .exec(function (err, builtInViews) {
            if (err) {
                fn(err);
            } else {
                if (!builtInViews.length) {
                    winston.warn('List of built-in views is empty.');
                }
                builtInViews.forEach((view) => {
                    view.name = _.kebabCase(view.name);
                });
                fn(null, builtInViews);
            }
        });
};

view.getAllBuiltInViewsAsObject = async function () {
    const views = await view
        .find({})
        .select({ _id: 0, name: 1, displayAs: 1 });

    // Create object of view display names with names as keys
    return _.transform(views, (result, { name, displayAs }) => {
        result[name] = displayAs;
    }, {});
};

view.getAllCustomViews = function (fn) {
    var customViews = [];
    Team.find({ isEnterprise: true }, { subdomain: 1 })
        .exec(function (err, allEnterprise) {
            if (allEnterprise) {
                allEnterprise.forEach((team) => {
                    customViews.push(team.subdomain);
                });
            }
            fn(err, customViews);

        });

    // var customViews = ["atlas","insight","rhodiumgroup"];
    // fn(null,customViews);
};

module.exports = view;
