angular
    .module('arraysApp')
    /**
     * File type constants to get if a file is either a spreadsheet or json type.
     */
    .constant('FILE_TYPES', {
        csv: {
            type: 'spreadsheet',
        },
        tsv: {
            type: 'spreadsheet',
        },
        json: {
            type: 'json',
        },
    });
