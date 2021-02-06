var ObjectId = require('mongodb').ObjectID;
var views = require('../../seeds/views');

/**
 * Set the ObjectId based on the $oid defined in ./seeds/views.json
 */
module.exports.views = views.map(function(view) {
    view['_id'] = ObjectId(view['_id']['$oid']);
    return view;
});
