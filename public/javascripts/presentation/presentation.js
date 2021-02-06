/* global screenfull, App, $, _ */
'use strict';
(function () {
    // ----------
    _.extend(window.App, {
        slideTime: 1000, // If you modify this, also modify .slide.animate in presentation.css
        // ----------
        init: function () {
            var self = this;
            this.$slideContainer = $('.slides');
            this.$slides = $('.slide');
            this.$footerSlides = $('.footer-slide');
            this.$header = $('#header');
            this.slideCount = this.$slides.length;
            this.slideIndex = 0;
            this.initFullscreen();
            this.$header.on('mouseenter', function () {
                $('#header-top').fadeOut();
                $('#header-inner').fadeIn();
            });
            this.$header.on('mouseleave', function () {
                $('#header-top').fadeIn();
                $('#header-inner').fadeOut();
            });
            this.$header.on('click', function (event) {
                event.stopPropagation(); // so it doesn't trigger a slide change
            });
            this.$slideContainer.on('click', function (event) {
                if (event.clientX < window.innerWidth / 2) {
                    self.previousSlide();
                } else {
                    self.nextSlide();
                }
            });
            this.$slideContainer.on('mousemove', function (event) {
                var width = self.$slideContainer.width();
                var url = '/images/presentation/arrow-' + (event.clientX < width / 2 ? 'left' : 'right') + '.png';
                self.$slideContainer.css({
                    cursor: 'url(' + url + '), pointer',
                });
            });
        },
        // ----------
        initFullscreen: function () {
            var $button = $('#fullscreen-icon');
            $button.click(function () {
                screenfull.request();
            });
            screenfull.on('change', function () {
                if (screenfull.isFullscreen) {
                    $('#footer').fadeOut();
                    $('#header').fadeOut();
                } else {
                    $('#footer').fadeIn();
                    $('#header').fadeIn();
                }
            });
        },
        // ----------
        previousSlide: function () {
            this.animateSlide({
                slideIndex: this.slideIndex === 0 ? this.slideCount - 1 : this.slideIndex - 1,
                currentClass: 'off-right',
                nextClass: 'off-left',
            });
        },
        // ----------
        nextSlide: function () {
            this.animateSlide({
                slideIndex: (this.slideIndex + 1) % this.slideCount,
                currentClass: 'off-left',
                nextClass: 'off-right',
            });
        },
        // ----------
        animateSlide: function (args) {
            var self = this;
            var $current = this.$slides.eq(this.slideIndex);
            this.slideIndex = args.slideIndex;
            var $next = this.$slides.eq(this.slideIndex);
            $next.removeClass('hidden');
            $next.addClass(args.nextClass);
            $next.addClass('animate');
            $current.addClass('animate');
            setTimeout(function () {
                $next.removeClass(args.nextClass);
                $current.addClass(args.currentClass);
            }, 1);
            setTimeout(function () {
                $next.removeClass('animate');
                $current.removeClass('animate');
                $current.removeClass(args.currentClass);
                self.updateSlides();
            }, this.slideTime);
        },
        // ----------
        updateSlides: function () {
            var self = this;
            this.$slides.each(function (i, el) {
                $(el).toggleClass('hidden', i !== self.slideIndex);
            });
            this.$footerSlides.each(function (i, el) {
                $(el).toggleClass('hidden', i !== self.slideIndex);
            });
        },
    });
    // ----------
    $(document).ready(function () {
        App.init();
    });
})();
