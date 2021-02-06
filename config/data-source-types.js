/**
 * Strings in this Array represent valid data source type fields that can
 * exist on a datasourceDescription.
 */
const DATA_SOURCE_TYPES = [
    'fileName',
    'apiEndPoint',
    'smartsheet',
    'pipedrive',
    'datadotworld',
    'socrata',
    'salesforce',
];

if (typeof module !== 'undefined') {
    module.exports = DATA_SOURCE_TYPES;
}
