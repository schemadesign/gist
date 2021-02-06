var filterObj = filterObj || {};

// for displaying active tab on load
if (Object.keys(filterObj).length > 0) {
    $('#vsTabs li.active').removeClass('active');
    $('#vsTabs li:nth-child(2)').addClass('active');

    $('.tab-content div#visualizations').removeClass('active');
    $('.tab-content div#insights').addClass('active');
}


//render filter on each view

function regularForm(str) {
    return str.trim().replace(/([A-Z])/g, ' $1')
        .replace('\\u002e', '.')
        .replace(/^./, function(s) {
            return s.toUpperCase();
        });
}

$('.row.story-main-content').each(function(index, currentElem) {
    var index = $(this).attr('id');
    var needToPopulate = insights[index].sharedPages[0].query;
    if (insights[index].sharedPages[0].other) {
        var otherProperties = insights[index].sharedPages[0].other;
        for (var key in otherProperties) {
            needToPopulate[key] = otherProperties[key];
        }
    }
    var container = $(currentElem).find('.row.filter');
    var indexCount = 0;
    var currentAdded = [];

    populateFilter(true);

    function populateFilter(limit) {
        var singlePointMutation = false;
        if (limit == false) {
            container.find('.expand-filter').remove();
        }

        for (var key in needToPopulate) {
            if (Array.isArray(needToPopulate[key])) {
                needToPopulate[key] = needToPopulate[key].join(', ');
            }

            // TODO remove conditional enterprise logic
            // insight
            if (key === 'singlePointMutations') {
                delete needToPopulate[key];
                continue;
            }

            var style;

            if (needToPopulate[key].includes('required')) {
                style = 'style="font-weight: bold;"';
            } else {
                style = 'style="font-weight: normal;"';
            }

            if (currentAdded.indexOf(key) == -1) {

                if (needToPopulate[key]) {
                    indexCount++;
                    container.append('<div class=\'filter-col story-info\'' + style + '><span class=\'title\'>' + regularForm(key) + ': </span><span> ' +
                        needToPopulate[key] + '</span></div>');
                    currentAdded.push(key);
                    if (limit && indexCount > 3 && indexCount < Object.keys(needToPopulate).length) {
                        container.append('<a class=\'pointer expand-filter\'> Read more</a>');
                        break;
                    }
                }
            }
        }
    }


    $(currentElem).find('.expand-filter').click(function(e) {
        e.preventDefault();
        populateFilter(false);

    });
});

// Listen to when a tab is clicked, and update the url
$('#vsTabs li').on('click', function(e) {
    window.history.pushState('', '', '/' + e.currentTarget.innerText.toLowerCase());
});
