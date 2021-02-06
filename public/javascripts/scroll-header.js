/* global ScrollMagic */

function initScrollMagic(noControls = false) {
    // TODO do not pin controls but keep header animation on mobile?

    // Disable pin if viewing preview
    const isPreview = $('.gist-site-content').hasClass('preview');
    const isEmbedded = $('body').hasClass('view-embedded');

    if (!isPreview) {
        const controller = new ScrollMagic.Controller();

        const embeddedScene = {
            offset: -$('.sort-control').outerHeight(),
            triggerElement: '.gist-site-content',
        };

        const triggerElement = noControls ? '.gist-stick' : '.gist-controls';

        const normalScene = {
            offset: -$('.navbar-fixed-top').innerHeight(),
            triggerElement,
        };

        const scene = !isEmbedded ? normalScene : embeddedScene;

        new ScrollMagic.Scene(scene)
            .triggerHook('onLeave')
            .setPin(triggerElement)
            .setClassToggle('body', 'gist-controls-pinned')
            .addTo(controller);
    }
}
