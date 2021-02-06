const _ = require('lodash');

const DOT_REPLACEMENT = '——DOT——';

const setSafeColorMapping = (colors) => _.mapKeys(colors, (value, key) => key.replace(/\./g, DOT_REPLACEMENT));

const restoreColorMapping = (colors) => {
    const dotRegEx = new RegExp(DOT_REPLACEMENT, 'g');

    return _.mapKeys(colors, (value, key) => key.replace(dotRegEx, '.'));
};

module.exports.setSafeColorMapping = setSafeColorMapping;
module.exports.restoreColorMapping = restoreColorMapping;

function generateShade(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = (f >> 8) & 0x00FF,
        B = f & 0x0000FF;
    return '#' + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

function getShades(color, denom) {
    var shades = [];
    const fraction = 1 / denom;
    shades.push(color);
    for (var i = 1; i < denom; i += 1) {
        shades.push(generateShade(color, i * fraction));
    }
    return shades;
}

var defaultPalette = [
    '#1B6DFC',
    '#0CB7FA',
    '#FA79FC',
    '#FB3705',
    '#F9D307',
    '#FA9007',
    '#7D5807',
    '#B2E606',
    '#069908',
    '#7B07FD',
];

// Calculate a palette based on team palette and # of labels
var _createShadePalette = function (labels, palette) {
    // Creade shades if there are more labels than colors
    if (labels && labels.length > 0) {
        var colorPalette = [];
        if (labels.length > palette.length) {
            //process color shades depending on # of labels and # of key colors
            var dataColorProportion = labels.length / palette.length;
            let numShadesPerColor;

            if (dataColorProportion > 2) {
                numShadesPerColor = 3;
            } else {
                // Use 2 shades when number of labels
                // is between 1x & 3x # of colors
                numShadesPerColor = 2;
            }

            _.each(labels, function (color, i) {
                colorPalette.push(...getShades(palette[i % palette.length], numShadesPerColor));
            });

            return colorPalette;
        } else {
            return palette;
        }
    }
    return palette;
};

var _processMappedColors = function (labels = [], shadePalette, rules) {

    // start with colors of array matching length of labels
    const processedPalette = shadePalette.slice(0, labels.length);
    const newColors = _.times(labels.length, () => true);

    const updatedRules = restoreColorMapping(rules);

    // Swap colors when color rule has been assigned to a different label
    _.forEach(updatedRules, (value, rule) => {
        // index where color rule's color should be assigned
        const indexForRule = labels.indexOf(rule);

        if (indexForRule > -1) {
            // Return if color is the same as in default palette
            if (processedPalette[indexForRule] === value) {
                return;
            }

            // Put new color in palettes
            processedPalette[indexForRule] = value;

            // Note position of new colors to prevent shading
            newColors[indexForRule] = false;

            // Shade color which is from default palette
            const indexOfSquatter = processedPalette.indexOf(value);
            if (indexOfSquatter > -1 && newColors[indexOfSquatter]) {
                processedPalette[indexOfSquatter] = generateShade(value, -0.25);
            }
        }
    });

    return processedPalette;
};

var _processColors = function (labels, teamPalette, rules) {
    var processedPalette;

    if (!labels || labels.length === 0) {
        processedPalette = defaultPalette;
    } else if (!teamPalette || teamPalette.length === 0) {
        processedPalette = _createShadePalette(labels, defaultPalette);
    } else {
        processedPalette = _createShadePalette(labels, teamPalette);
    }

    if (rules) {
        processedPalette = _processMappedColors(labels, processedPalette, rules);
    }

    return processedPalette;
};

module.exports.processColors = _processColors;
