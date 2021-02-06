((arrays, $, _, moment, noUiSlider, Noty) => {
    Object.assign(arrays, {
        constructedFilterObj,
        checkForImageFallbacks,
        checkForTitleOverflow,
    });

    function checkIfLangIsSet(passedFunction) {
        if (!$('html').attr('langs')) {
            return setTimeout(() => checkIfLangIsSet(passedFunction), 100);
        }

        passedFunction();
    }

    $(window).on('load', function () {
        /**
         * Add class to body to prevent weird page width transitions
         */

        $('body').addClass('gist-app-ready');
    });

    function adjustIframe() {
        const height = arrays.getIframeHeight() - arrays.constants.EMBEDDED_NAVIGATION_BAR_HEIGHT;

        $('.gist-site-content').height(height);
    }

    function isArticle() {
        try {
            return $(window.parent.document).find('.gist-article').length > 0;
        } catch (e) {
            return false;
        }
    }

    function setDropdownMaxHeight() {
        const MIN_HEIGHT = 100;
        const DROPDOWN_HEIGHT_RATIO = 0.6;

        const height = Math.min(screen.height, window.innerHeight);

        return Math.max(MIN_HEIGHT, Math.round(height * DROPDOWN_HEIGHT_RATIO));
    }

    function adjustDropdownHeight() {
        const dropdownMaxHeight = screen.height < window.innerHeight || arrays.isIE() ? `${setDropdownMaxHeight()}px` : null;

        $('.gist-filter-menu-group, .gist-filter-menu-subgroup, .gist-views-menu-group')
            .css('max-height', dropdownMaxHeight);
    }

    $(document).ready(function () {
        if (window.linkify) {
            $('.gist-visualization-description, .gist-description').linkify({
                attributes: {
                    rel: 'noopener noreferrer',
                },
            });
        }

        const isEmbedded = $('body').hasClass('view-embedded');
        const isIE = arrays.isIE();

        if (isEmbedded) {
            if (isArticle()) {
                $('body').addClass('gist-article-embedded');

                adjustIframe();

                arrays.addResizeEventListener(adjustIframe);
            }
        }

        if (isEmbedded || isIE) {
            adjustDropdownHeight();
        }

        // todo: only for gist website
        $(document).ajaxError(function (event, jqxhr) {
            if (jqxhr.status === 401) {
                window.location.href = '/auth/login';
            }
        });

        setOriginalTextAttribute('.gist-explore-tile-header h2');
        const isWebkit = 'WebkitAppearance' in document.documentElement.style;

        /**
         * Truncate vis title if not webkit browser
         */
        if (!isWebkit) {
            loopThroughTileElement('.gist-explore-tile-header h2', 28);

            $(window).on('resize', function () {
                loopThroughTileElement('.gist-explore-tile-header h2', 28);
            });
        }

        const onStoryClick = function () {
            let baseUrl = $(this).attr('subdomain-url');
            const shareLink = $(this).attr('share-link');
            const samePage = $(this).attr('same-page');

            if (typeof baseUrl === 'undefined') {
                baseUrl = '';
            }

            if (!!samePage && shareLink) {
                window.location.href = baseUrl + shareLink;
                return;
            }

            if (shareLink) {
                const viewTab = window.open(baseUrl + shareLink, '_blank');
                viewTab.focus();
            }
        };

        $('.gist-story-title-text').on('click', onStoryClick);

        /**
         * Allow click on links within the panel
         */
        $('.gist-source-link, .gist-team-link, .gist-insights-link').on('click', function (e) {
            e.stopPropagation();
        });

        /**
         * Hide filter list items & make un-tabbable until filter menu is expanded
         */
        $('.gist-filter-menu-group-item').hide();

        /**
         * Show filter menu on header bar click
         */
        $('.gist-filter-menu-toggle').on('click', function () {
            $(this).parents('li').toggleClass('open');
            const isVisible = $('.gist-filter-menu-group').is(':visible');
            if (isVisible === true) {
                $('.gist-filter-menu-group-item').show();
                $(this).attr('aria-label', 'Hide filter options');
                $(this).attr('aria-expanded', 'true');
            } else {
                $('.gist-filter-menu-group-item').hide();
                $(this).attr('aria-label', 'Show filter options');
                $(this).attr('aria-expanded', 'false');
            }
        });

        /**
         * Header navbar toggle button
         */
        const navbarToggleWrapper = $('.gist-header-expand-button-wrapper');
        const hasDescription = navbarToggleWrapper.hasClass('has-description');
        const hasUpdatedDate = navbarToggleWrapper.hasClass('has-updated-date');
        const hasInsight = navbarToggleWrapper.hasClass('has-insights');
        const countInsights = hasInsight && $('.gist-insights-bar .gist-insights-frame').length;

        const headerExpanderToggleButton = $('#gist-header-expand-button');
        const hiddenButtonClass = 'gist-header-expand-button--hidden';

        function toggleHeaderExpander() {
            if (!isEmbedded && hasInsight && countInsights) {
                $('#insights-explorer').toggleClass('showing');
            } else {
                $('#gist-header-expander').toggleClass('showing');
            }

            headerExpanderToggleButton.toggleClass('expand');
            window.setTimeout(window.dispatchEvent, 1000, new Event('resize'));
        }

        headerExpanderToggleButton.on('click', toggleHeaderExpander);

        if ((hasInsight && countInsights) || (isEmbedded && (hasDescription || hasUpdatedDate))) {
            headerExpanderToggleButton.removeClass(hiddenButtonClass);
        }

        function updateInsights() {
            const { datasetId } = arrays.getDefaultOptions();

            if (!datasetId) {
                return;
            }

            $.get(`api/story/insights/${datasetId}`, (stories = []) => {
                if (_.isArray(stories) && stories.length) {
                    const insightsBar = $('.gist-insights-bar');

                    if (!insightsBar.length) {
                        return;
                    }

                    insightsBar.empty();

                    stories.forEach(({ _id: sharedPageId, title, sharedPages }) => {
                        const html = nunjucks.render('views/partials/insights_explorer_frame.njk', {
                            sharedPageId,
                            subdomain: window.location.origin,
                            story: {
                                title,
                                sharedPages,
                            },
                        });

                        insightsBar.append(html);
                    });

                    if (hasInsight && headerExpanderToggleButton.hasClass(hiddenButtonClass)) {
                        headerExpanderToggleButton.removeClass(hiddenButtonClass);
                        toggleHeaderExpander();
                    }

                    $('.gist-story-title-text').on('click', onStoryClick);
                }
            });
        }

        // todo: attach this listener only when filter menu is visible
        /**
         * Hide filter menu when click off
         */
        $(document).on('click show.bs.dropdown', function (e) {
            const target = e.target;

            if (!$(target).is('.gist-filter-menu-toggle') && !$(target).parents().is('.gist-filter-menu-toggle') && !$(target).parents().is('#gist-filter-menu')) {

                const $menuToggle = $('.gist-filter-menu-toggle');
                $menuToggle.parent().removeClass('open');
                $('.gist-filter-menu-group-item').hide();
                $menuToggle.attr('aria-label', 'Show filter options');
                $menuToggle.attr('aria-expanded', 'false');
            }
        });

        /**
         * Expand filter menu submenus on hover or focus
         */
        const SUBMENU_OPEN_CLASS_NAME = 'gist-has-open-submenu';
        const DATA_STATE_PROP = 'data-state';
        const CLICKED_STATE = 'clicked';
        const $slideoutTriggers = $('#gist-filter-menu .gist-slideout-trigger');
        const $filterMenu = $('.gist-filter-menu-group');

        const getSubmenu = ($item) => $item.parent().find('.gist-filter-menu-subgroup');

        $slideoutTriggers.on('click', function (e) {
            e.preventDefault();

            if (isIE) {
                const $item = $(this);

                getSubmenu($item)
                    .prop(DATA_STATE_PROP, CLICKED_STATE)
                    .show();
            }
        });

        $slideoutTriggers.on('mouseenter', function () {
            $slideoutTriggers.blur();
        });

        $slideoutTriggers.on('mouseover focus', function () {
            const $item = $(this);

            $item.attr('aria-expanded', true);
            $filterMenu.addClass(SUBMENU_OPEN_CLASS_NAME);

            if (isIE) {
                $('.gist-filter-menu-subgroup')
                    .prop(DATA_STATE_PROP, '')
                    .hide();
                getSubmenu($item).show();
            }
        });

        $slideoutTriggers.on('mouseout blur', function () {
            const $item = $(this);

            $item.attr('aria-expanded', false);
            $filterMenu.removeClass(SUBMENU_OPEN_CLASS_NAME);

            if (isIE) {
                const $subMenu = getSubmenu($item);
                const $state = $subMenu.prop(DATA_STATE_PROP);

                if ($state !== CLICKED_STATE) {
                    $subMenu.css('display', '');
                }
            }
        });

        /**
         * Filter and Filter Submenu arrow key navigation
         */
        $slideoutTriggers.on('keydown', function (e) {
            if (e.keyCode === 39) {
                const id = $(this).attr('href');
                const filterSubmenuOption = id + ' a';

                $(filterSubmenuOption).first().focus();
            } else if (e.keyCode === 40) {
                const nextId = parseInt($(this).attr('id').split('-')[1]) + 1;
                $('#column-' + nextId + '-link').focus();
            } else if (e.keyCode === 38) {
                const previousId = parseInt($(this).attr('id').split('-')[1]) - 1;
                $('#column-' + previousId + '-link').focus();
            }
        });

        $('.gist-filter-menu-subgroup a').on('keydown', function (e) {
            if (e.keyCode === 37) {
                const id = $(this).parents('.gist-filter-menu-subgroup').attr('id');
                const filterColumnLink = '#' + id + '-link';
                $(filterColumnLink).focus();
            }
        });


        function getPlaceholderTextWidth(placeholder) {
            const temporarySpan = $('<span style="font-size:1.125em"/>')
                .html(placeholder)
                .css({
                    position: 'absolute',
                    left: -99999,
                    top: -9999,
                })
                .appendTo('body');
            const textWidth = temporarySpan.width();

            temporarySpan.remove();

            return textWidth;
        }

        /**
         * Search criteria click dropdown item to select
         */

        const setSearchWidth = () => {
            const searchInput = $('.gist-search-input');
            const searchInputPlaceholder = searchInput.attr('placeholder');
            const searchWidth = searchInputPlaceholder ? getPlaceholderTextWidth(searchInputPlaceholder) : 9;

            searchInput
                .css('width', searchWidth + 'px')
                .css('display', 'inline-block');
        };

        checkIfLangIsSet(setSearchWidth);

        $('.gist-search-dropdown-item a').on('click', function (e) {
            e.preventDefault();

            const $this = $(this);

            const colname = $this.data('colname');
            const operation = $this.data('operation');
            const outputFormat = $this.data('output-format');

            // Changing only column to output in placeholder
            const searchColname = $('.gist-search-colname');
            const searchColnameValue = searchColname.attr('value');
            const $searchInput = $('.gist-search-input');
            const getRenamedPlaceholder = () => $searchInput
                .attr('placeholder')
                .replace(searchColnameValue, colname);

            searchColname.attr('value', colname);

            document.l10n.formatValues(
                ['search-by-arg-placeholder', { search_name: colname }],
            ).then(([translatedPlaceholder]) => {
                const placeholder = translatedPlaceholder || getRenamedPlaceholder();
                const inputWidth = getPlaceholderTextWidth(placeholder);

                $searchInput
                    .attr('placeholder', placeholder)
                    .animate({ width: inputWidth }, 300);
            });

            if (operation) {
                $searchInput.data('operation', operation);
            } else {
                $searchInput.removeData('operation');
            }

            if (outputFormat) {
                $searchInput.data('output-format', outputFormat);
            } else {
                $searchInput.removeData('outputFormat');
            }

            validateSearchInput();

            $('.gist-search-control .dropdown-toggle').attr('aria-expanded', 'false');
            $this.closest('.gist-dropdown').removeClass('open');
        });

        $('.gist-dropdown').on('show.bs.dropdown', ({ target }) => {
            const MARGIN = 8;
            const ROW_HEIGHT = 55;
            const MIN_HEIGHT = 2 * ROW_HEIGHT;

            const { top, height } = target.getBoundingClientRect();
            const maxHeight = Math.max(
                Math.floor((window.innerHeight - top - height - MARGIN) / ROW_HEIGHT) * ROW_HEIGHT,
                MIN_HEIGHT,
            );

            $(target).find('.dropdown-menu').css('max-height', `${maxHeight}px`);
        });

        $('.gist-dropdown').on('hidden.bs.dropdown', ({ target }) => {
            $(target).find('.dropdown-menu').css('max-height', null);
        });

        /**
         * Mobile search popover
         */
        $('.gist-search-toggle').on('click', function (e) {
            e.preventDefault();
            $('.gist-form-search').toggleClass('gist-search-active');
            $('.gist-mobile-search-popover').toggleClass('gist-search-open');
            $('.gist-search-input').focus();
        });

        /**
         * Close mobile search popover
         */
        $('.gist-search-close').on('click', function (e) {
            e.preventDefault();
            $('.gist-search-input').focusout();
            $('.gist-mobile-search-popover').addClass('gist-search-closing');
            setTimeout(function () {
                $('.gist-form-search').toggleClass('gist-search-active');
                $('.gist-mobile-search-popover')
                    .toggleClass('gist-search-open')
                    .removeClass('gist-search-closing');
            }, 200);
        });

        /**
         * Remove focus border when clicking on a dropdown to close the menu
         */
        $('.gist-dropdown-toggle-button-has-caret').on('click', function () {
            if ($(this).closest('.gist-dropdown').hasClass('open')) {
                $(this).blur();
            }
        });

        /**
         * Function to validate search input
         */
        function validateSearchInput(validCb, invalidCb) {
            // Check if moment.js is loaded on this page
            if (!moment) {
                console.info('Moment.js not loaded on this page');
                return;
            }

            const $input = $('#gist-search-control-input');
            const $searchControl = $input.closest('.gist-search-control');

            // Validate date field using Moment
            if ($input.data('operation') === 'ToDate') {

                const searchQ = $input.val();
                const outputFormat = $input.data('output-format');
                const searchDateFormatted = moment.utc(searchQ, outputFormat, true); // true for strict date parsing
                const searchDate = moment.utc(searchQ);

                if (searchQ.length && !(searchDateFormatted.isValid() || searchDate.isValid())) {

                    $searchControl.addClass('gist-search-control-invalid');

                    if (invalidCb && typeof invalidCb === 'function') {
                        invalidCb();
                    }
                    return;
                }

                $searchControl.removeClass('gist-search-control-invalid');
                if (validCb && typeof validCb === 'function') {
                    validCb();
                }

                return;
            }

            $searchControl.removeClass('gist-search-control-invalid');
        }

        /**
         * Run validation on search input
         */
        $('#gist-search-control-input').on('keyup', function () {
            validateSearchInput();
        });

        $('.gist-form-search').on('submit', function (e) {
            validateSearchInput(function () {
                // Valid
                console.info('Valid date submitted');
            }, function () {
                // Invalid
                e.preventDefault();
                console.info('Invalid date submitted');
            });
        });

        /**
         * Popup modal on embed code click
         */
        $('.gist-share-link').on('click', function (e) {
            e.preventDefault();
            POST_toGetURLForSharingCurrentPage(function (err, share_url) {
                if (err) {
                    console.log(err);
                } else {
                    $('#gist-share-modal')

                        .on('show.bs.modal', function () {

                            // initialize text and attr

                            const $arrayTitle = $('.gist-title');
                            let arrayTitle = '';
                            if ($arrayTitle.length) {
                                arrayTitle = $('.gist-title a').text();
                            }

                            $(this).find('#gist-facebook').attr('data-url', share_url);
                            $(this).find('#gist-twitter').attr('data-url', share_url);
                            $(this).find('#gist-share-url').text(share_url);

                            const embedUrl = '<iframe src="' + share_url + '?embed=true" width="640" height="480" frameborder="0"></iframe>';
                            $('#gist-embed-url').text(embedUrl);

                            /**
                             * Initialize Sharrre buttons
                             */
                            $(this).find('#gist-twitter').sharrre({
                                share: {
                                    twitter: true,
                                },
                                template: '<a href="#" class="btn btn-action background-color-brand"><span class="icon-twitter" aria-hidden="true"></span>Twitter</a>',
                                enableHover: false,
                                buttons: { twitter: { via: 'trygist' } },
                                click: function (api) {
                                    api.openPopup('twitter');
                                },
                            });

                            $(this).find('#gist-facebook').sharrre({
                                share: {
                                    facebook: true,
                                },
                                template: '<a href="#" class="btn btn-action background-color-brand"><span class="icon-facebook" aria-hidden="true"></span>Facebook</a>',
                                enableHover: false,
                                buttons: {},
                                click: function (api) {
                                    api.openPopup('facebook');
                                },
                            });
                        })
                        .modal();
                }
            });

            return false;
        });
        $('#gist-create-story').on('click', function () {
            $('#gist-stories-modal')
                .on('show.bs.modal', function () {
                    const $form = $(this).find('form#gist-share-story-form');

                    $form.submit(function (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        $('#gist-page-loading').show();

                        saveStory($('#gist-story-title').val(), $('#gist-story-caption').val(), function (err) {
                            $('#gist-page-loading').hide();

                            if (err) {
                                createNotification('error', 'Something went wrong, please try again later', '#gist-modal-noty').show();
                                return;
                            }

                            createNotification('success', 'Successfully created new Insight!', '#gist-noty').show();
                            updateInsights();

                            $('#gist-explore-stories').removeClass('hide');
                            $('#gist-stories-modal').modal('hide');
                            $('#gist-story-title').val('');
                            $('#gist-story-caption').val('');
                        });
                    });
                })
                .modal();
        });

        const images = $('.gist-image-with-fallback');

        checkForImageFallbacks({ options: arrays.getDefaultOptions(), images });

        $('.gist-expand-caption').click(function () {
            const longText = $(this).parent().attr('originalText');
            $(this).parent().text(longText);
        });

        /**
         * Array description expand/collapse text
         */
        $('.gist-description-expand').on('click', function () {

            $('.gist-description').css('display', 'none');
            $('.gist-description-full').css('display', 'inline');
            $('.gist-description-expand').css('display', 'none');
            $('.gist-description-collapse').css('display', 'inline');
        });

        $('.gist-description-collapse').on('click', function () {
            $('.gist-description').css('display', 'inline');
            $('.gist-description-full').css('display', 'none');
            $('.gist-description-collapse').css('display', 'none');
            $('.gist-description-expand').css('display', 'inline-block');
        });

        $('#gist-login').on('click', function (e) {
            e.preventDefault();
            window.location.href = '/auth/login';
        });

        $('#gist-login-submit').on('click', function (e) {
            e.preventDefault();
            $('#gist-loginForm').submit();
            setTimeout(function () {
                $('#gist-page-loading').show();
            }, 2000);
        });

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

        /**
         * Toggle legend
         */
        $('.gist-legend-open').on('click', function (e) {
            e.preventDefault();
            $('.gist-section').addClass('gist-legend-opened');
        });

        /**
         * Close legend
         */
        $('.gist-legend-close').on('click', function (e) {
            e.preventDefault();
            $('.gist-section').removeClass('gist-legend-opened');
        });

        $('.gist-legend').on('focusin', function () {
            $('gist-section').addClass('gist-legend-opened');
        });

        /**
         * Initialize filter menu range slider
         */
        const filterRangeSliders = $('.gist-filter-menu-range-slider');

        const displayFormatting = (value, { isDate, isPercent, outputFormat }) => {
            if (isDate) {
                return moment(value).format(outputFormat);
            } else if (isPercent) {
                return `${value}%`;
            }

            return arrays.displayNumberWithComma(value);
        };

        filterRangeSliders.each(function () {
            if (!noUiSlider) {
                console.info('nouislider not loaded on this page');
                return false;
            }

            if (!moment) {
                console.info('Moment.js not loaded on this page');
                return false;
            }

            const $this = $(this);
            const $parent = $this.parent();
            const rangeSlider = $this[0];
            const valsDisplay = [
                $parent.find('.gist-filter-menu-range-slider-val-min'),
                $parent.find('.gist-filter-menu-range-slider-val-max'),
            ];
            const $filterButton = $parent.find('.gist-filter-menu-range-slider-button');
            const urlForFilterValue = $filterButton.attr('href');
            const queryJoinChar = urlForFilterValue.indexOf('?') > -1 ? '&' : '?';

            const column = $this.data('column');
            const typeOperation = $this.data('type-operation');
            const outputFormat = $this.data('output-format');

            let min = $this.data('min');
            let max = $this.data('max');
            let filterMin = $this.data('filter-min');
            let filterMax = $this.data('filter-max');

            if (min.valueOf() === max.valueOf()) {
                console.error('Cannot initialize range slider: min and max are equal');
                return true;
            }

            const sliderOptions = {
                range: {
                    min: min,
                    max: max,
                },
                start: [min, max],
                connect: true,
            };

            let isInteger = typeOperation === 'ToInteger';
            let isFloat = typeOperation === 'ToFloat';
            const isDate = typeOperation === 'ToDate';
            const isPercent = typeOperation === 'ToPercent';
            const formatter = {
                from: function (val) {
                    return Number.parseInt(val);
                },
                to: function (val) {
                    return Math.floor(val);
                },
            };

            if (isInteger && !Number.isInteger(min) && !Number.isInteger(max)) {
                isInteger = false;
                isFloat = true;
            }

            if (isInteger || isPercent) {
                min = parseInt(min, 10);
                max = parseInt(max, 10);
                filterMin = parseInt(filterMin, 10);
                filterMax = parseInt(filterMax, 10);
                sliderOptions.format = formatter;

            } else if (isFloat) {
                min = parseFloat(min);
                max = parseFloat(max);
                filterMin = parseFloat(filterMin);
                filterMax = parseFloat(filterMax);

            } else if (isDate) {
                min = moment(min, outputFormat, true); // true for strict date parsing
                max = moment(max, outputFormat, true);
                filterMin = moment(filterMin, outputFormat, true);
                filterMax = moment(filterMax, outputFormat, true);
            }

            if (isNaN(filterMin)) {
                filterMin = min;
            }

            if (isNaN(filterMax)) {
                filterMax = max;
            }

            // Set handle positions
            const start = filterMin.valueOf() ? filterMin : min;
            const end = filterMax.valueOf() ? filterMax : max;

            // Update slider ranges
            sliderOptions.range.min = isDate ? min.valueOf() : min;
            sliderOptions.range.max = isDate ? max.valueOf() : max;
            sliderOptions.start[0] = isDate ? start.valueOf() : start;
            sliderOptions.start[1] = isDate ? end.valueOf() : end;

            // Initialize slider
            noUiSlider.create(rangeSlider, sliderOptions);
            rangeSlider.noUiSlider.on('update', function (values, handle) {
                if (isInteger || isPercent) {
                    values[0] = parseInt(values[0], 10);
                    values[1] = parseInt(values[1], 10);

                } else if (isFloat) {
                    values[0] = parseFloat(values[0]);
                    values[1] = parseFloat(values[1]);

                } else if (isDate) {
                    values[0] = parseInt(values[0], 10);
                    values[1] = parseInt(values[1], 10);
                }

                // Display formatted date in UI
                valsDisplay[handle].html(displayFormatting(values[handle], { isDate, isPercent, outputFormat }));

                // Show Filter button on change
                if (start.valueOf() !== values[0].valueOf() || end.valueOf() !== values[1].valueOf()) {
                    // Values to place in URL query
                    let filterVals = {
                        min: isDate ? moment(values[0]).format(outputFormat) : values[0],
                        max: isDate ? moment(values[1]).format(outputFormat) : values[1],
                    };

                    if (filterVals.min === filterVals.max) {
                        filterVals = filterVals.min;
                    }

                    $filterButton.attr('href', urlForFilterValue + queryJoinChar + column + '=' + JSON.stringify(filterVals));
                    $filterButton.addClass('gist-filter-menu-range-slider-button-visible');
                } else {
                    // Hide filter button if not changed
                    $filterButton.removeClass('gist-filter-menu-range-slider-button-visible');
                    $filterButton.attr('href', urlForFilterValue);
                }
            });

            return true;
        });

        $('.gist-download-current-view').on('click', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const loader = $('#gist-page-loading');

            $('.navbar-visualization-menu .dropdown-toggle').click();
            loader.show();
            createNotification('success', 'Your screenshot is preparing...').show();

            const isLegendHidden = !!$('.gist-legend-open').length && !$('.gist-legend-opened').length;

            $.ajax({
                url: window.location.origin + '/json-api/v1/screenshot',
                type: 'POST',
                data: {
                    url: window.location.href,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    legend: isLegendHidden ? 'hidden' : 'visible',
                },
                cache: false,
                success: function ({ data }) {
                    loader.hide();

                    const arrayBufferView = new Uint8Array(data);
                    const blob = new Blob([arrayBufferView], { type: 'image/png' });

                    const urlCreator = window.URL || window.webkitURL;
                    const src = urlCreator.createObjectURL(blob);

                    const [chartType, title] = window.location.pathname.split('/').reverse();

                    const link = document.createElement('a');

                    link.download = `${title}-${chartType}.png`;
                    link.href = src;

                    link.click();
                    createNotification('success', 'Your screenshot is downloaded!').show();

                    urlCreator.revokeObjectURL(src);
                },
                error: function () {
                    loader.hide();
                    createNotification('error', 'Cannot create screenshot').show();
                },
            });
        });

        // Click handler for the download link
        $('.gist-download-link').on('click', function (e) {
            e.preventDefault();

            const options = arrays.getDefaultOptions();

            $('#gist-page-loading').show();

            downloadFile({
                _id: options.datasetId,
                title: options.title,
                format: options.format,
            });
        });

        /**
         * Checks to see if the dataset can be downloaded
         * Then sends a GET request to /api/dataset/download with the originalOrModified param as original
         * Save the data, and then remove the disabled class + stop the downloading balls
         * @param {Object} dataset
         */
        function downloadFile(dataset) {
            const originalOrModified = dataset.fileName ? 'original' : 'modified';
            // Time to send the download request & make sure the download is complete
            $.get('api/dataset/download/' + dataset._id + '?originalOrModified=' + originalOrModified, function (data) {
                const format = dataset.format.toLowerCase();
                const formattedData = format === 'json' ? [JSON.stringify(data)] : [data];
                const blob = new Blob(formattedData, { type: format + ';charset=utf-8' });

                if (window.saveAs) {
                    window.saveAs(blob, dataset.title + '.' + format);
                }
                createNotification('success', 'Your dataset has been downloaded!', '#gist-noty').show();
            }).done(function () {
                // Perform these tasks no matter what
                $('#gist-page-loading').hide();
            }).fail(function () {
                // Show an update message in case of failure
                createNotification('error', 'Something went wrong, please try again later', '#gist-noty').show();
                // Get rid of the page loading thing
                $('#gist-page-loading').hide();
            });
        }
    });

    /**
     * Construct filter object
     * Analog of nunjucks filter constructedFilterObj() in app.js:63
     */
    function constructedFilterObj(existing_filterObj, this_filterCol, this_filterVal, isThisAnActiveFilter) {
        const filterObj = existing_filterObj;
        if (Array.isArray(this_filterCol)) {
            for (var i = 0; i < this_filterCol.length; i++) {
                if (existing_filterObj.hasOwnProperty(this_filterCol[i])) {
                    continue;
                } else {
                    //since this is currently only for the pie set, it's guaranteed that if this is an array, the filter
                    // values will also be an array whose indices match up to the indices of the cols
                    filterObj[this_filterCol[i]] = this_filterVal[i];
                }
            }
        } else {
            if (isThisAnActiveFilter === false) { // do not push if active, since we'd want the effect of unsetting it
                const filterVals = filterObj[this_filterCol] || [];
                if (Array.isArray(this_filterVal) && filterVals.indexOf(this_filterVal) === -1) {
                    for (var i = 0; i < this_filterVal.length; i++) {
                        filterVals.push(this_filterVal[i]);
                    }
                    filterObj[this_filterCol] = filterVals.length === 1 ? filterVals[0] : filterVals;
                } else {
                    filterObj[this_filterCol] = this_filterVal;
                }
            }
        }

        return filterObj;
    }

    /**
     Make space for filter
     */
    const viewType = window.location.pathname.split('/')[2];
    const filterSpaceExceptions = ['map', 'globe', 'pie-chart'];
    const siteContent = document.querySelector('.gist-site-content');
    if (siteContent && !filterSpaceExceptions.includes(viewType)) {
        const filters = document.querySelector('.gist-filter-tag');
        siteContent.style.paddingBottom = filters ? '60px' : '0px';
    }

    function POST_toGetURLForSharingCurrentPage(callback) { // callback: (err:Error, share_url:String) -> Void
        const parameters = {
            url: window.location.href,
        };

        $.post(window.location.origin + '/json-api/v1/share', parameters, function (data) {
            const share_url = data.share_url;
            let err = null;
            if (!share_url) {
                err = new Error('Missing share_url from response.');
            }
            callback(err, share_url, data.share_id, data.story_id, data.story_caption);
        }, 'json');
    }

    function saveStory(title, caption, callback) {
        const parameters = {
            title: title,
            caption: caption,
            sharedPages: [{ url: window.location.href }],
        };

        function recursivelyPollJobState(jobId, callback) {
            $.ajax({
                url: window.location.origin + '/api/job/' + jobId + '/state',
                type: 'GET',
                success: function (data) {
                    if (data.state === 'failed') {
                        callback('failed');
                    } else if (data.state === 'complete') {
                        callback(null);
                    } else {
                        setTimeout(function () {
                            recursivelyPollJobState(jobId, callback);
                        }, 3000);
                    }
                },
                error: function (jqXHR, textStatus) {
                    callback(textStatus);
                },
            });
        }

        $.ajax({
            url: window.location.origin + '/json-api/v1/story',
            type: 'POST',
            data: JSON.stringify(parameters),
            dataType: 'json',
            contentType: 'application/json',
            success: function (data) {
                setTimeout(function () {
                    recursivelyPollJobState(data.jobId, callback);
                }, 5000);
            },
            error: function (jqXHR, textStatus) {
                callback(textStatus);
            },
        });
    }

    function setOriginalTextAttribute(element) {
        $(element).each(function (index, currentElement) {
            $(currentElement).attr('originalText', currentElement.innerText);
        });
    }

    function loopThroughTileElement(element, fontSize) {
        const containerWidth = findFirstPositiveLength($('.gist-explore-tile-header'));
        $(element).each(function (index, currentElement) {
            const text = $(currentElement).attr('originalText');
            currentElement.innerText = truncate(containerWidth, text, fontSize);

        });
    }

    function createNotification(type, text, container) {
        return new Noty({
            type: type,
            container: container,
            theme: 'bootstrap-v3',
            text: text,
            timeout: 3000,
            progressBar: false,
            closeWith: ['click', 'button'],
            animation: {
                open: 'noty_effects_open',
                close: 'noty_effects_close',
            },
        });
    }

    function truncate(containerWidth, text, fontSize) {
        // font size is 28 px
        // max number of lines is 2
        // so if the length of the title * 28 > the width of the explore tile container * 2, it needs to be truncated
        const textSize = fontSize * text.length;
        const containerMax = containerWidth * 2;

        if (textSize / 2 > containerMax) {
            const difference = parseInt((textSize - containerMax) / fontSize);
            const maxLength = (text.length - 3 - difference) * 2;
            // console.log(maxLength)
            // remove the difference from the end of the string
            let truncatedText = text.substring(0, maxLength);
            truncatedText += '...';
            return truncatedText;
        }
        return text;

    }

    /**
     * This method is a helper to find the first valid width in
     * a given JQuery Object element list.
     * @param {JQuery Object} elements
     */
    function findFirstPositiveLength(elements) {
        // Instantiaate validWidth to 200 just incase we can't find any valid widths
        let validWidth = 200;
        // Loop through all elements
        elements.each(function (index, currentElement) {
            // See if the width is greater than 0 which means it's visible
            if (currentElement.clientWidth > 0) {
                validWidth = currentElement.clientWidth;
                // Break out of the loop
                return false;
            }
        });

        return validWidth;
    }

    /**
     * Missing image fallback
     */
    function checkForImageFallbacks({
                                        callback = () => {
                                        }, options = {}, images,
                                    }) {
        if (!images.length) {
            callback();
            return;
        }

        images.each(function () {
            const $this = $(this);
            const img = new Image();

            img.onerror = function () {
                if ($this[0].hasAttribute('scraped')) {
                    const originalImage = $this.attr('original-image');
                    $this.attr('src', originalImage);
                    $this.removeAttr('scraped');
                    const img = new Image();

                    img.onerror = function () {
                        callback();

                        if (_.get(options, 'filterObj.Has Image')) {
                            $this.parents('.gallery-item--image').remove();
                        } else {
                            const img = new Image();
                            displayNotFound($this);
                            addOnLoad(img, $this);
                        }
                    };

                    addOnLoad(img, $this);
                } else {
                    $this.removeClass('gist-image-with-fallback');
                    displayNotFound($this);

                    callback();
                }
            };
            addOnLoad(img, $this);
        });

        function addOnLoad(img, $this) {
            img.onload = function () {
                $this.removeClass('gist-image-with-fallback');
                callback();
            };

            img.src = $this.attr('src');
        }

        function displayNotFound($this) {
            if ($this[0].hasAttribute('no-not-found')) {
                return;
            }

            const imagePlaceholder = $this[0].hasAttribute('large-image') ? '/images/image-not-found-lg.png' : '/images/image-not-found-sm.png';
            $this.attr('src', imagePlaceholder);
        }
    }

    function checkForTitleOverflow() {
        function toggleDisplayValForArr(arr) {
            arr.each(function (index, element) {
                const $element = $(element);
                $element
                    .attr('title', $element.find('.gallery-title-wrapper').text())
                    .find('.gallery-object-title-ellipses')
                    .show();
            });
        }

        // grab all h2 secondary column items, assign gallery title truncation height
        const galleryTitles = $('.gallery-title');

        const overflowGalleryTitles = galleryTitles.filter(function (index, el) {
            const $el = $(el);
            return $el.find('.gallery-title-wrapper').height() - 5 > $el.height();
        });

        toggleDisplayValForArr(overflowGalleryTitles);
    }
})(window.arrays, window.jQuery, window._, window.moment, window.noUiSlider, window.Noty);
