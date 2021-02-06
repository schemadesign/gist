(($) => {
    $(function () {
        // mobile conversion nav menu
        var burger = document.querySelector('.w-burger-menu');
        var overlay = document.querySelector('.w-nav-overlay');

        if (burger !== null) {
            burger.addEventListener('click', function (e) {
                e.preventDefault();
                if (burger.className === 'w-burger-menu') {
                    burger.classList.add('open');
                    overlay.classList.add('open');
                } else {
                    burger.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        }
    });
})(window.jQuery);
