module.exports = {
    extends: [
        '../.eslintrc.js',
        'plugin:angular/johnpapa',
    ],
    rules: {
        'angular/controller-as': 1,
        'angular/controller-as-vm': 0,
        'angular/controller-name': [
            2,
            '/[A-Z].*Ctrl/',
        ],
        'angular/file-name': 0,
        'angular/function-type': [
            2,
            'named',
        ],
    },
};
