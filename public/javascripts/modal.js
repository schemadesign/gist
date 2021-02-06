/* global nunjucks */

((arrays, $) => {
    Object.assign(arrays, {
        showSingleResultModal,
        showDetailViewModal,
    });

    function showSingleResultModal() {
        $('#alert-modal')
            .on('show.bs.modal', function () {
                var $modalBody = $(this).find('.modal-body');
                $modalBody.append('<p>There\'s only one result here. Try clearing a filter or changing the view settings to access more results.</p>');
            })
            .modal();
    }

    async function showDetailViewModal(objectId, objectIndex, viewType, options = arrays.getDefaultOptions()) {
        const url = arrays
            .getApiRoute(options, '/views/object-details/graph-data', true)
            .split('?')[0];
        const preparedFilters = arrays.getPreparedFilters({ options, filterObj: options.filterObj });
        const data = {
            subdomain: options.subdomain,
            objectIndex,
            objectId,
            viewType,
        };
        const vh = window.innerHeight * 0.01;

        document.documentElement.style.setProperty('--vh', `${vh}px`);
        _.merge(preparedFilters, data);

        await setDetailViewContent({ url, preparedFilters, options, firstTime: true });
    }

    async function setDetailViewContent({ url, preparedFilters, options, firstTime }) {
        if (!_.get(options, 'viewOptions.viewInteractivity', true)) {
            return;
        }

        const pageLoading = $('.gist-modal-loading');
        const modal = $('#detailView');
        const modalBody = modal.find('.modal-body');
        modalBody
            .empty()
            .hide();

        if (firstTime) {
            modal.modal();
            pageLoading.show();

            if (arrays.isIE()) {
                modal.addClass('modal--ie');
            }
        }

        const response = await $.get({ url, data: preparedFilters });
        const body = nunjucks.render('views/shared/detail-view-content.njk', response);

        modalBody.append(body);

        const callback = () => {
            pageLoading.hide();
            modalBody.fadeIn();
        };

        const { objectId, objectIndex, viewType } = preparedFilters;
        $('.gist-expand').attr('href', arrays.getDetailsViewUrl(options, objectId, objectIndex, viewType));

        const images = modal.find('.gist-image-with-fallback');

        arrays.checkForImageFallbacks({ callback, isCallback: true, images });

        const clickHandler = async (e, direction) => {
            e.preventDefault();

            preparedFilters.objectIndex = parseInt(objectIndex, 10) + direction;
            preparedFilters.objectId = e.currentTarget.dataset.id;

            modalBody.fadeOut('fast', async () => {
                pageLoading.show();
                await setDetailViewContent({ url, preparedFilters, options });
            });
        };

        $('.item-arrow--right').click((e) => clickHandler(e, 1));
        $('.item-arrow--left').click((e) => clickHandler(e, -1));
    }
})(window.arrays, window.jQuery);
