var import_types = require('../../datasources/datatypes');

exports.GetDatasources = function () {
    //var datasourceObj = [];
    var commandArgs = process.argv.slice(2);

    /* // Parsing
     // - "-f moma_artists marvel_character_database -i nested_object nested"
     // - "-f moma_artists marvel_character_database"

     var fileStartIndex = commandArgs.indexOf('-f');
     var importStartIndex = commandArgs.indexOf('-i');
     var files = [], formats = [];
     var format;

     if (fileStartIndex !== -1 && importStartIndex !== -1) {
     files = commandArgs.slice(fileStartIndex+1, importStartIndex);
     formats = commandArgs.slice(importStartIndex+1);
     } else if (fileStartIndex !== -1) {
     files = commandArgs.slice(fileStartIndex+1);
     } else {
     files = commandArgs;
     }

     for (var i = 0; i < files.length; i ++) {
     format = formats[i];
     if (format != import_types.Import_formats.NestedField && format != import_types.Import_formats.NestedObject) {
     format = null;
     }

     datasourceObj.push({
     file: files[i],
     importFormat: format
     });
     } */

    return commandArgs;
};
