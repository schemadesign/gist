const path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        shared: path.join(__dirname, 'shared/index.js'),
    },
    output: {
        path: path.join(__dirname, 'public/javascripts/build/'),
        filename: '[name].js',
        libraryTarget: 'window',
    },
    devtool: false,
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            options: {
                cacheDirectory: path.join(__dirname, '.cache'),
            },
        }],
    },
    externals: {
        qs: 'Qs',
        lodash: '_',
        moment: 'moment',
        arrays: 'arrays',
    },
};
