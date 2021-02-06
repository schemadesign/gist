$(document).ready(function () {

    /**
     * Popup modal on embed code click
     */
    $('.gist-share-link').on('click', function (e) {
        e.preventDefault();

        $('#gist-share-modal')
            .on('show.bs.modal', function () {
                const titleItem = $('.article-title');
                const title = titleItem.length ? $arrayTitleItem.html() : '';

                const shareText = $('title').text();
                const shareUrl = window.location.href;

                const $container = $(this);

                $container
                    .find('#share-header')
                    .html(`Share ${title}`);
                $container
                    .find('#gist-share-url')
                    .text(shareUrl);

                $container
                    .find('#gist-twitter')
                    .attr('data-url', shareUrl)
                    .attr('data-text', shareText)
                    .sharrre({
                        share: {
                            twitter: true,
                        },
                        template: '<a href="#" class="btn btn-action background-color-brand"><span class="icon-twitter" aria-hidden="true"></span>Twitter</a>',
                        enableHover: false,
                        buttons: { twitter: { via: 'trygist' } },
                        click: function (api, options) {
                            api.openPopup('twitter');
                        },
                    });

                $container
                    .find('#gist-facebook')
                    .attr('data-url', shareUrl)
                    .sharrre({
                        share: {
                            facebook: true,
                        },
                        template: '<a href="#" class="btn btn-action background-color-brand"><span class="icon-facebook" aria-hidden="true"></span>Facebook</a>',
                        enableHover: false,
                        buttons: {},
                        click: function (api, options) {
                            api.openPopup('facebook');
                        },
                    });
            })
            .modal();

        return false;
    });

    const resizeIframes = () => {
        const height = arrays.getIframeHeight();

        $('.chart')
            .height(height)
            .find('iframe')
            .prop('height', height)
            .height(height);
    };

    $('.chart').each(function () {
        const $chart = $(this);
        const sourceKey = $chart.data('source-key');
        const chartType = $chart.data('chart-type');
        const revision = $chart.data('revision');

        const embedLink = `${window.location.protocol}//${window.location.host}/${sourceKey}/${chartType}?revision=${revision}&embed=true&defaultFilters=true`;
        const height = arrays.getIframeHeight();

        $chart
            .height(height)
            .html(`<iframe src="${embedLink}" frameborder="0"></iframe>`)
            .find('iframe')
            .height(height);
    });

    arrays.addResizeEventListener(resizeIframes, true);

    /**
     * Log out menu click
     */
    $('.gist-logout-link').on('click', function (e) {
        e.preventDefault();

        $.get('/auth/logout')
            .then(function (response) {
                if (response === 'ok') {
                    window.sessionStorage.removeItem('user');
                    window.sessionStorage.removeItem('team');
                    window.sessionStorage.removeItem('teams');
                    window.location.reload();
                }
            });
    });

});
