module.exports = {
    extends: [
        '../../.eslintrc.js',
    ],
    env: {
        browser: true,
        node: false,
    },
    globals: {
        arrays: false,
        $: false,
        jQuery: false,
        _: false,
        d3: false,
        moment: false,
        mixpanel: false,
        THREE: false,
        TWEEN: false,
        angular: false,
        textures: false,
        Qs: false,
        noUiSlider: false,
        Noty: false,
    },
    overrides: [
        {
            files: [
                '**/*.spec.js',
            ],
            globals: {
                inject: false,
            },
        },
    ],
};
