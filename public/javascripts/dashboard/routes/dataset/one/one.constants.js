angular
    .module('arraysApp')
    /**
     * Definitions for wizard steps
     * `active` prop must be defined for proper highlighting if step has child states
     */
    .constant('WIZARD_STEPS', [
        {
            label: 'Source',
            sref: 'dashboard.dataset.one.upload',
        },
        {
            label: 'Fields',
            sref: 'dashboard.dataset.one.data',
            restrict: 'seeFields',
        },
        {
            label: 'Content',
            sref: 'dashboard.dataset.one.content.list',
            active: 'dashboard.dataset.one.content',
            restrict: 'seeContent',
            skipOnFirstImport: true,
        },
        {
            label: 'Filters',
            sref: 'dashboard.dataset.one.filters',
            restrict: 'seeFilters',
        },
        {
            label: 'Views',
            sref: 'dashboard.dataset.one.views',
            restrict: 'seeViews',
        },
        {
            label: 'Display',
            sref: 'dashboard.dataset.one.settings',
        },
    ])
    /**
     * Updating these fields will trigger reprocessing from relevant stage
     */
    .constant('REPROCESS_TRIGGERING_FIELDS', {
        raw_rowObjects_coercionScheme: {
            dirty: 1,
            firstImport: 2,
        },
        'fe_image.field': {
            dirty: 4,
            firstImport: 5,
            nonEmpty: true,
        },
        'fe_filters.fieldsNotAvailable': {
            dirty: 3,
            firstImport: 4,
        },
        fe_excludeFields: {
            dirty: 3,
            firstImport: 2,
        },
        apiEndPoint: {
            dirty: 1,
            firstImport: 1,
        },
        JSONPath: {
            dirty: 1,
            firstImport: 1,
        },
    })
    /**
     * List of stop words
     */
    .constant('STOP_WORDS', ['a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'nor', 'of', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'would', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves']);
