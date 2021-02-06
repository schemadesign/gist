# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.8] - 2020-09-10
### Fixed

-   Fixed showing revision detail view [#3148]
-   Fixed url of show all button in grouped gallery when group by is set to date or number [#3148]

## [1.9.7] - 2020-07-10

### Added

-   Added endpoint to download ancillary file from public datasets for Gist products [#3141]

## [1.9.6] - 2020-07-02

### Changed

-   Allowed get website endpoint to be fetched without login [#3130]
-   Changed displaying delimited fields in table view [#3133]
-   Enabled scroll header on mobile [#3135]
-   Changed breakpoint for collapsing icons in header [#3135]
-   Redesign view tile in views tab [#3138]

### Fixed

-   Fixed redirect in simple pie set [#3132]
-   Fixed font size for percentage in pie chart on firefox [#3134]
-   Fixed displaying secondary title in gallery on firefox [#3134]
-   Fixed resize and size map on mobile [#3135]

### Added

-   Added option in gallery and timeline to toggle displaying field titles [#3136]
-   Added possibility to toggle full-screen option for embed mode [#3137]
-   Added translation for legend copy for dutch and english [#3124]

## [1.9.5] - 2020-06-22

### Added

-   Added Heatmap for map [#3121]
-   Added Markdown and hiperlink for subtitle in content view [#3123]

### Changed

-   Allowed enterprise team to upload json files [#3122]
-   Remove Grouped Gallery [#3127]

### Fixed

-   Fixed remove previous datasets on remove dataset [#3126]
-   Added handler for getting removed user from versions [#3125]

## [1.9.4] - 2020-06-02

### Added

-   Added download link of dataset in views tab [#3113]

### Changed

-   Improve map quality to show small countries and add addtional countries to map on iso 3 [#3117]

### Fixed

-   Fix vertical scrolling on hided legend in pie set [#3116]
-   Fix rounding circle for versioning of dataset [#3118]
-   Fix counting datasets in team popup [#3118]

## [1.9.3] - 2020-05-14

### Changed

-   Change styles for previous versions [#3111]
-   Updated readme [#3112]

### Fixed

-   Fixed showing warning of team without visualization or last update [#3102]
-   Fixed counting y on simple bar chart [#3099]
-   Fixed outline on country map [#3103]
-   Fixed ticks when is date type on cartesian charts [#3106]
-   Fixed team order [#3109]
-   Replaced waring triangle icon [#3110]

## Add

-   Added scale type for bubble map [#3103][#3104]
-   Added last updated & rearrange header expander bar [#3107]

## [1.9.2] - 2020-05-05

### Added

-   Friendlier token expiration message [#3096]

### Changed

-   Change warning label for csv and tsv upload screen [#3096]
-   Change saving processed raw row data [#3096]

### Fixed

-   Fix safari progress bar issue [#3096]

## [1.9.1] - 2020-04-28

### Added

-   Add information for superuser about inactive teams [#3091]
-   Add warning label for csv and tsv upload screen [#3091]

### Changed

-   Update nodemailer and aws-sdk [#3091]
-   Hide db integration for non super users [#3091]
-   Improve processing raw objects [#3091]

### Fixed

-   Fix searching and filtering in pie chart [#3091]
-   Fix replace copy timeline to grouped-gallery in url [#3091]

## [1.9.0] - 2020-04-20

### Added

-   Allow to register user with token [#3088]

## [1.8.10] - 2020-04-15

### Added

-   Add additional attempts for automatic update fails and add possibility to remove entirely job [#3085]
-   Add Field names to Gallery and Grouped Gallery View [#3085]

### Fixed

-   Fix downloading json file [#3085]

## [1.8.9] - 2020-03-26

### Added

-   Add Segment By to Pie Chart [#3079]
-   Add Segment By to Pie Set [#3079]
-   Add Segment By to Treemap [#3079]
-   Add Segment By to Line Chart [#3079]
-   Add Segment By to Area Chart [#3079]
-

## [1.8.8] - 2020-03-19

### Fixed

-   Fix Portugal and Spain translation for table [#3075]
-   Fix formatting data, number and percent in heatmap [#3075]

### Added

-   Add tile display for heatmap as checkbox [#3075]

### Changed

-   Uid as a param for dataset download endpoint [#3073]

## [1.8.7] - 2020-03-10

### Added

-   Add excluding fields to treemap [#3071]

### Fixed

-   Fix showing percents in pie set [#3071]
-   Fix excluding fields in pie set [#3071]

## [1.8.6] - 2020-03-02

### Fixed

-   Prevent creating empty delimited field on editing content [#3069]

## [1.8.5] - 2020-02-26

### Fixed

-   Fix slider filter [#3067]

## [1.8.4] - 2020-02-20

### Fixed

-   Fix filter with delimited fields which could be empty [#3064]

## [1.8.3] - 2020-02-13

### Added

-   Add percentage to pie chart/set [#3060]

## [1.8.2] - 2020-02-12

### Changed

-   Website API get modified to be accessible without credentials [#3056]

### Fixed

-   Restore Restore sentence splitting to words in wordcloud [#3050]
-   Added formatting fix for simple pie set [#3052]
-   Filter off invalid dates in bubble chart timeline [#3053]
-   Fix save button [#3055]
-   Fix going back [#3055]

## [1.8.1] - 2020-02-11

### Fixed

-   Fix creating delimited fields [#3057]

## [1.8.0] - 2020-01-30

### Added

-   Migrated to Mongo 3.6 and Mongoose 5.8 [#3038]
-   Added insight explorer to embeded mode [#3045]

## [1.7.17] - 2020-01-24

### Added

-   Added insight explorer to embeded mode

### Fixed

-   Fixed precise on axis on cartesian charts [#3038]
-   Fixed page copying [#3046]

## [1.7.16] - 2020-01-16

### Fixed

-   Fix calculation by same category on simple Cartesian chart [#3040]

## [1.7.15] - 2019-12-09

### Fixed

-   Fix displaying insight explorer on creating first insight [#3034]

## [1.7.14] - 2019-12-06

### Fixed

-   Restyle insights explorer [#3030]
-   Fix simple cartesian charts with missing meta data [#3030]
-   Always set insight as public on creating [#3031]

### Added

-   Added automatic reload insights explorer after create new insight [#3032]

## [1.7.13] - 2019-11-28

### Fixed

-   Make improvements in insights explorer [#3027]

## [1.7.12] - 2019-11-21

### Fixed

-   Fixed toggling insights explorer [#3024]

## [1.7.11] - 2019-11-18

### Fixed

-   Fixed displaying % value in all views [#2995]
-   Insights Explorer redesign [#3012]
-   Fixed displaying table on hidden controls [#3014]
-   Fixed making unique elements is pies sets and in treemap [#3019]
-   Fixed filter range on switching type [#3021]
-   Fixed toggling accessibility on area chart [#3021]

### Added

-   Allow displaying % range in filter [#3011]
-   Added screenshot feature [#3014][#3020]

## [1.7.10] - 2019-10-25

### Added

-   Save unpublished content to restore on reimport [#3006]
-   Add segment by to un grouped bar chart [#3007]

## [1.7.9] - 2019-10-17

### Added

-   Sort map legend alphabetically or by weight [#3000]
-   Add subtitle to detail view [#3002]
-   Allow dates in scatterplot [#3003]

## [1.7.8] - 2019-10-15

### Added

-   Add possibility to h normalize option in bar chart [#2998]
-   Custom path for JSONS [#2997]
-   Add Insights Explorer feature [#2992]

## [1.7.7] - 2019-10-11

### Fixed

-   Fix translations [#2993]

## [1.7.6] - 2019-10-09

### Fixed

-   Fix assign colors when value contains dot [#2987][#2988]

### Added

-   Support % in pie set aggregation [#2988]
-   Support % switching in Pie Chart, Pie Set, Bar Chart, Table, Treemap, Scatterplot [#2989]

## [1.7.5] - 2019-09-27

### Changes

-   Increase max-width of y-label in bar chart [#2984]

### Fixed

-   Fix re-render bar chart [#2984]

## [1.7.4] - 2019-09-16

### Added

-   Add handler for grouped-gallery in ur [#2979]
-   Add Yandex bot ignore to robots.txt [#2981]

### Changed

-   Remove sending finish import email [#2965]

### Fixed

-   Fix markdown multiple links bug [#2979]
-   Fix position of icons in grouped gallery [#2979]
-   Fix navigation chart in line chart [#2979]

## [1.7.3] - 2019-09-10

### Fixed

-   Fix showing stack by in bar and sort text in grouped gallery [#2976]

## [1.7.2] - 2019-09-06

### Fixed

-   Fix shaving gallery items depending on real line height [#2971]
-   Prevent adding copy suffix to overview page [#2972]

## [1.7.1] - 2019-09-05

### Added

-   Fix regexp for finding embed chart on website [#2970]

## [1.7.0] - 2019-09-04

### Added

-   Add Socrata integration [#2956]

### Fixed

-   Fix dropdowns on mobile in viz settings popup [#2958]
-   Fix typo in get-helpers [#2960]
-   Allowed website copy to continue on missing page [#2652]
-   Fixed going to next view [#2966]
-   Removed hover border on empty dropdowns[#2966]

## [1.6.5] - 2019-08-23

### Fixed

-   Fixed displaying video content

## [1.6.6] - 2019-08-26

### Fixed

-   Fixed blocking emails through env variables [#2963]

## [1.6.5] - 2019-08-23

### Fixed

-   Fixed displaying video content [#2959]

## [1.6.4] - 2019-08-13

### Changed

-   Moved "rescraping image" option from General Settings modal to Source tab [#2952]

### Fixed

-   Fixed links in charts for shared pages [#2951]

## [1.6.3] - 2019-08-09

### Added

-   Add detection if field is a markdown [#2940]
-   Add new date formats interpretation [#2948]

### Fixed

-   Fixed displaying dropdowns (especially on small screens) [#2934]
-   Fixed displaying table in preview mode on iOS and visual fixes for small screens [#2936]
-   Fixed updating user after invite and remove [#2939]
-   Fixed missing team id by populating proper user data [#2942]
-   Fixed missing id when switch in menu [#2949]

## [1.6.2] - 2019-08-09

### Fixed

-   Allow ordered and unordered list at the same time [#2944]

## [1.6.1] - 2019-08-08

### Fixed

-   Fix getting function which get filters for users [#2937]

## [1.6.0] - 2019-08-06

### Added

-   Allow adding a new field during a first setting visualisation [#2922]
-   Added markdown in detail view [#2930][#2932]

### Fixed

-   Styles fixes for IE [#2920]
-   Fixed date sample in fields tab [#2921]
-   Fixed error 500 while clicking on page in sites [#2924]
-   Fixed accessing page after copying site [#2924]
-   Fix issue with setting homepage in sites [#2925]
-   Added visual fixes for iOS [#2929]
-   Fixed filtering [#2935]

## [1.5.3] - 2019-07-30

### Fixed

-   Fix showing list of viz after create a viz [#2906]
-   Fix scrolling top after change state [#2910]
-   Fix map artifact on Antarctica [#2909]
-   Fix scraping a jpg images [#2912]
-   Fix cutting x axis on bar charts [#2917]
-   Fix slug & title on site/page/article duplication [#2913]

## [1.5.2] - 2019-07-25

### Changed

-   Hide copy about list when there is no visualisations [#2899]
-   Changed groupedBy on segmentBy when grouped by date in bar chart [#2898]
-   Hide preserve checkbox on first import [#2902]

### Added

-   Add image to item in content list [#2894][#2905]
-   Add shave to smartsheet and data dot world [#2900]

#### Fixed

-   Fix conversing from date to number [#2901][#2907]
-   Handle null values for jsons [#2914]

## [1.5.1] - 2019-07-23

### Changed

-   Updated Rhodium group user folder to add 1H {YEAR} to the US-CHINA investment hub [#2895]

## [1.5.0] - 2019-07-23

### Added

-   Add Functionality to preserve or override content on reimport [#2890]

### Changed

-   Improvements for content tab [#2891]

### Fixed

-   Fixed texts [#2884]
-   Extending cache (for icon picker) Fix icon picker and vis preview in IE [#2892]

## [1.4.10] - 2019-07-17

### Fixed

-   Fix blue outline on galleries items on click [#2878]
-   Fix updating user on users page [#2881]
-   Fix legend issues for Drupal [#2880][#2886]

### Changed

-   Redirect through redirection function from scatterplot item to another view [#2878][#2885]
-   Invert groupBy and chartBy logic in pie set [#2874][#2887]

## [1.4.9] - 2019-07-15

### Fixed

-   Fix fixed width of tooltips on scatterplot & bubble chart [#2870]
-   Fix scatterplot labels font size [#2868]
-   Fix adding, changing permissions after reimport [#2876]
-   Fix giving permissions between teams [#2877]

### Changed

-   Remove unit visualization type [#2861][#2875]

### Added

-   Added apostrophes replacing to proper one during upload process [#2869]

## [1.4.8] - 2019-07-9

### Fixed

-   Fix order of pie set [#2846]
-   Fix copying banner for new sample viz [#2852]
-   Fix cluster font and simplify getting color in pin map [#2856]
-   Fix infinite loader on regional map when no data [#2858]
-   Fix permissions invited user on reimport [#2866]

### Added

-   Added choosing order of pie set in chart settings [#2846]
-   Extended icons selector with 'Not Specified' option [#2851]
-   Added columns (field names) trimming before data ingestion [#2855]
-   Added skip page feature to visualizations that do not have it [#2858]

### Changed

-   Improve permissions for managing article, sites nad visualisations [#2849][#2854] [#2867]
-   Allow viewers, editors, admins or superAdmins only to create insights [#2859]
-   Filter undefined in referrers on performance page [#2857]
-   Improved accessibility for visualisations charts [#2858]
-   Remove help section from upload tab [#2865]
-   Remove intercom from gist [#2860]

## [1.4.7] - 2019-07-2

### Fixed

-   Prevent to change cached unique values by changing entries on content [#2833]
-   Add missing scripts for performance page [#2838]
-   Fix flag [#2843]

### Changed

-   Reimport take a imported fields instead of new fields [#2841][#2848] [#2850]
-   Unify checking and using isEmbed [#2839]

### Added

-   Add possibility to rename a Multiple selected Y axis label [#2842]

## [1.4.6] - 2019-06-28

### Fixed

-   Set form as unchanged if field isn't selectable [#2826]
-   Fixed url rendering in popup [#2821]
-   Fixed range slider dates [#2829]

### Changed

-   Change logic of showing image type of gallery[#2822]
-   Allow viewers to see vizs in viz list page [#2818][#2835]
-   Change disabled option to toggling aggregate options in pin map [#2827][#2832]
-   Initially exclude all filters [#2825]
-   Display drupal tags in popup [#2823]

## [1.4.5] - 2019-06-28

### Fixed

-   Fix scroll on iOS [#2834]

## [1.4.4] - 2019-06-25

### Fixed

-   Fix showing icon images in detail view popup [#2809]
-   Fix setting group by from query [#2811]
-   Fixed displaying charts on Drupal [#2810]
-   Fix horizontal scroll on configuring views page [#2807]
-   Add query param to allow exclude default filters in shared pages [#2816]
-   Fixed clipping titles & subtitles in gallery items [#2799]

### Changed

-   Change error message for bubble chart restriction [#2817]
-   Disable the setting a unit visualization as default [#2812]
-   Updated icons and changed icons managment [#2808][#2824]

## [1.4.3] - 2019-06-19

### Fixed

-   Fix displaying filter pills [#2780]
-   Fixed deselecting fields when use api data import [#2790]
-   Fix splitting when empty data [#2795]
-   Fix displaying no data on map [#2798]
-   Fixed displaying custom icons [#2803]
-   Fixed horizontal scroll on popup [#2804]
-   Fixed too much space below legend on preview page [#2788]
-   Fixed unecessary scroll on preview page [#2788]
-   Fixed alignment of images in gallery [#2788]

### Changed

-   Increased caching limit [#2801]
-   Hide the tab when only visualisations are visible [#2788]

## [1.4.2] - 2019-06-14

### Fixed

-   Render cluster text in white/black depending on brand accent color [#2796]

## [1.4.1] - 2019-06-14

### Fixed

-   Encode field name to exclude [#2774]
-   Fixed filter empty samples [#2775]
-   Adjusted max height of dropdowns when chart is in embedded mode [#2785]

### Changed

-   Change error level in case of duplicate inserting [#2777]
-   Change showing a grouping of pins on map [#2793]

## [1.4.0] - 2019-06-12

### Added

-   Added detail view popup [#2773]

### Changed

-   Adjust displaying buttons in source tab [#2766]
-   Keep filters in wordcloud item link [#2767]
-   Display team name instead of team URL in the dashboard [#2776]

### Fixed

-   Fixed gap between gallery rows on mobile [#2761]
-   Fixed dropdown hover effect on Microsoft browsers [#2763]
-   Fixed cropped gallery item caption [#2761]
-   Fixed mobile gallery item too large & clipped text [#2768]
-   Country and bubble map fixes [#2749]
-   Fixed updating charts colors [#2772]

## [1.3.3] - 2019-06-06

### Changed

-   Center gallery tiles [#2743]
-   Inverting Labels in Pie Chart [#2754]
-   Results and Pagination control style updates [#2745]

### Fixed

-   Fix croping images [#2739]
-   Prevent firing scraping image process when there's no documents [#2751]
-   Fix popup position on map on small screens [#2755]
-   Fixed embedded visualizations in articles [#2750]

### Added

-   Added new icons [#2756][#2762]
-   Add new date format [#2757]

## [1.3.2] - 2019-05-31

### Added

-   Allow delimited fields for new field [#2731]

### Fixed

-   Fix slider and change on slider won't resize bubbles on map [#2727]
-   Trigger resize only if width changed [#2736]
-   Fix position pagination page dropdown [#2740]
-   Fix coloring map [#2742]
-   Fix getting values for range slider [#2746]

## [1.3.1] - 2019-05-28

### Fixed

-   Fix removing vis on discarding reimported data [#2699]
-   Fix creating insights for map and treemap. [#2732][#2721]
-   Fix treemap pattern view [#2721]
-   Fix reimport CSV if image fails, we still want to reimport it. [#2720]
-   Fix saving in filter format modal [#2722]
-   Fixed hover effects on visualization elements and clicking on visualizations, insights & articles tiles on IE[#2672]

### Changed

-   Change option name in Aggregate By to 'None' [#2718]
-   Change option name in Group By to 'None' [#2726][#2728]

## [1.3.0] - 2019-05-23

### Fixed

-   Fix special char issue [#2711]
-   Fix filters special characters issue [#2710]

### Changed

-   Change logic of json nests object [#2684]
-   Throttle view and dataset fetching endpoints [#2734]

### Added

-   Functionality to add new fields [#2676]
-   Allow rotate globe on mobile [#2712]

## [1.2.9] - 2019-05-22

### Added

-   Detect mobile devices [#2706]

### Fixed

-   Remove result if img is broken [#2709]
-   Fix chart tooltip hover issue on all mobile devices [#2706]
-   Fix other performance bar char labels [#2705]

## [1.2.8] - 2019-05-21

### Fixed

-   Fix performance bar-chart initial height [#2692]
-   Fix chart tooltip hover issue on mobile [#2695]
-   Fix chart tooltip position on mobile [#2695]
-   Fix views grouped button color after click [#2690]

### Changed

-   Replace Y axis with ranks instead of urls in refferers chart [#2692][#2700]
-   Change minimal radius of bubble in map [#2693]
-   Change order of chart icons in navbar [#2694]
-   Start domain from 0 in map to match proper opacity [#2696]

## [1.2.7] - 2019-05-20

### Fixed

-   Fix bar chart sort controls [#2685]
-   Fix map controls position [#2686]
-   Remove `<li>` bullet style [#2681]
-   Hamburger menu alignment, size & hover color [#2689]

### Added

-   New icons in icon picker [#2683]

### Changed

-   Better charts size adjustment in Drupal [#2678]

## [1.2.6] - 2019-05-16

### Fixed

-   Unescape filters before query [#2671]

### Added

-   Add tabs to icon picker [#2669]

### Changed

-   Visual adjustments in team icons section [#2669]

### Fixed

-   Fix uploading images [#2663]
-   Fix displaying tiles images on vizualizations/articles lists [#2663]
-   Fixed mobile and visualization styles for login buttons [#2673]

## [1.2.5] - 2019-05-15

### Added

-   Add icon picker [#2655]

### Changed

-   Update links and page titles [#2653][#2670]
-   Add links and styles for footer [#2660]
-   Disable applying font style on team page [#2662]

### Fixed

-   Fix dots icon position [#2657]
-   Fix scroll on mobile views menu [#2651]
-   Fix mobile filters menu icon position on iOS [#2651]
-   Fix animation of sort controls in embedded mode [#2646]
-   Fix showing header with title on globe view [#2656]
-   Copy banner to new dataset after reimport [#2647]

## [1.2.4] - 2019-05-10

### Added

-   Add arrows in detail views redirected from remaining views [#2631]
-   Add displaying preset icons in team settings [#2638]
-   Add hover effect on heatmap gallery items [#2644]

### Fixed

-   Fix follow link to match font weight [#2634]
-   Add missing charts to restricted [#2635]
-   Unescape filter object value [#2642]
-   Prevent animation of search input [#2641]
-   Fix limit in grouped gallery [#2636]
-   Fix display unit select for advanced/aggregate charts [#2643]
-   Disable click on map on external access (Drupal) [#2640]
-   Add rounding percentage numbers [#2625]
-   Prevent resetting chart by in treemap after changing group by [#2639]
-   Fix Treemap hovers on Drupal [#2645]
-   Fix map tooltip zIndex [#2644]
-   Fix the cutting of line in table [#2644]
-   Fix the showing UI controls on map [#2654]

### Changed

-   Remove the beta label from Gist logo [#2649]

## [1.2.3] - 2019-05-07

### Added

-   Add accent color for arrows in details view [#2617]
-   Add pointer to read more button in insights [#2618]
-   Add default icons preset [#2630]

### Fixed

-   Fix toggling legend in bar chart [#2621]
-   Fix displaying output formats for fields type date [#2616]
-   Placeholder search translation for table view [#2624]

### Changed

-   Remove "for free" label [#2620]
-   Extracted map for Drupal [#2593]

## [1.2.2] - 2019-05-06

### Changed

-   Allow pdf files to be upload

## [1.2.1] - 2019-04-29

### Added

-   Disable sign-up with third parties [#2599]

### Changed

-   Improve filter restriction on slices of pie set [#2599]
-   Remove bottom margin from pie chart view [#2599]
-   Change label for pagination limits [#2599]
-   Change explore to showcase [#2599]
-   Allow negative results in map view [#2599]
-   Resize team description input [#2599]

### Fixed

-   Fixed links that weren't using https correctly [#2602]
-   Fix burger button offset on mobile [#2599]
-   Get unique iso codes for mapbox [#2599]
-   Use escaped category when selecting bars [#2599]
-   Fix matching colours in bar chart [#2599]

### Changed

-   Extracted pie chart [#2601]

## [1.2.0] - 2019-04-24

### Added

-   Add Treemap to be rendered by Drupal [#2591]
-   Create Salesforce integration [#2577]
-   Add prev/next in object details [#2585]

### Changed

-   Display rules for Drupal tags [#2583]
-   Remove legend animation on start [#2587]
-   Change label for pagination limits [#2586]
-   Change default width of labels in area graph [#2586]
-   Move article icon to bottom [#2586]
-   Increase translation value on image hover [#2586]
-   Change font weight of view all button [#2586]
-   Dynamic copyright year in footer [#2589]
-   Limit display of delimited fields to 2 [#2584]
-   Allow to disable aggregate by for map view [#2590]
-   Add click-through to treemap [#2603]
-   Use specific D3 library to not interfere with other visualisations [#2604]

### Fixed

-   Fix downloading datasets with non-latin characters in filenames [#2586]
-   Fix links on shared revisioned datasets [#2585]
-   Don't render a legend when it's disabled [#2594]
-   Fix protocol for staging [#2597]
-   Add Treemap view to Drupal tags [#2598]
-   Fix prev/next buttons on IE [#2600]
-   Fix salesforce for custom routes [#2600]
-   Fix displaying controls on map view [#2600]
-   Sharing visualizations with range filters [#2603]

## [1.1.11] - 2019-04-17

### Changed

-   Updated RhodiumGroup Submodule

## [1.1.10] - 2019-04-16

### Added

-   Added token validation and renewal [#2575]

### Fixed

-   Map link fix for country map type [#2574]
-   Returns a sample doc if a valid one does not exist [#2573]
-   Fix fetching fonts from cdn [#2578]

## [1.1.9] - 2019-04-12

### Added

-   Added tests for external requests [#2563]
-   Added fonts to cdn [#2567]

### Changed

-   Moved fontello to fonts folder [#2567]
-   Separated common css for external purpose [#2568]
-   Add pin icons to legend for pin map view [#2569]
-   Map settings consistent with gallery settings [#2569]

### Fixed

-   Tooltip size on map view [#2569]
-   Fix viewport for pie chart [#2572]

## [1.1.8] - 2019-04-09

### Added

-   Add redirect to detail view in treemap [#2549]
-   Page indicator in grouped gallery [#2552]
-   Added create visualization with token login [#2557]
-   Show icons in showcase and team tiles indicating which views are enabled in dataset [#2498]

### Changed

-   Description size in view settings [#2552]
-   Typography of data format [#2552]
-   Change copy for database connection [#2556]
-   Add animation to grouped gallery of icons [#2556]
-   Edit visualization use login with token [#2557]

### Fixed

-   Fix size of bar chart on mobile [#2554]
-   Make pin icon more crispy [#2556]
-   Fix saving team settings [#2556]
-   Replace UTF-8 chars with Latin letters in downloaded filenames [#2556]
-   Check if delimited fields are not empty on details page [#2556]
-   Allow to reupload same file as viz thumbnail [#2556]
-   Change label size for date values on area chart [#2556]
-   No effect when overriding JSON datatype to 'Text' [#2558]

## [1.1.7] - 2019-04-03

### Added

-   Allow multiple legends in one page for bar charts [#2532]
-   Add conditions to view settings [#2539]
-   Add pagination to bar chart [#2545]

### Changed

-   Send needed files to CDN [#2537]
-   Match Mapbox hover tooltip font and style with standard Gist tooltips [#2484]
-   Hide Map By option for map view when Plot by Latitude and Longitude is turned on [#2539]
-   Show title in tooltip for bubble map view [#2539]
-   Removing env JSON [#2542]
-   Change gallery settings to be more intuitive [#2541]
-   Change map settings to be more intuitive [#2546]
-   Change behaviour of switching sort by option in grouped gallery [#2547]

### Fixed

-   Fix displaying data in table [#2538]
-   Show bubbles and pins in map view for negative values of aggregate by [#2539]
-   Fix generating API when user is Super Admin and is another team + change response status and display messages in Frontend [#2540]
-   Fix usage of subdomain in Gist [#2544]

## [1.1.6] - 2019-03-29

### Added

-   Add copy gist visualization tag [#2523]
-   Add option to manually start task job [#2522]
-   Add max height for icons in object details [#2526]

### Changed

-   Run dbscan only on small datasets [#2533]
-   Change style of initials in grouped image gallery [#2530]
-   Change hover animation in image gallery view [#2531]

### Fixed

-   Fix hovers on globe [#2528]

## [1.1.5] - 2019-03-27

### Changed

-   Change borders in grouped gallery [#2515]
-   Revert changes to initials and remove borders only from grouped icons gallery [#2525]

### Fixed

-   Fix to find visualization only by uid [#2512]
-   Fix adding icons to team [#2518]
-   Fix table view issues [#2516]
-   Unwind grouping option when aggregating pagination [#2517]
-   Fix wrong url to typography styles [#2519]

## [1.1.4] - 2019-03-26

### Added

-   Add initials to image-less tiles in icon gallery [#2509]
-   Add cropping visualisation images for showcase [#2506]

### Changed

-   Removed unused user modules from Gist repository [#2510]

### Fixed

-   Drupal charts fixes [#2502]
-   Fix glyphicons urls [#2508]
-   Add delimited fields to dropdowns with limited field types [#2509]
-   Fix group by delimited field in grouped gallery [#2509]
-   Fix delimited fields for group by in treemap [#2511]

## [1.1.3] - 2019-03-22

### Changed

-   Add edit visualization redirection [#2499]
-   Sort vizs also according to first revisions createdAt [#2497]

### Fixed

-   Hotfix to update missing function in rhodiumgroup [#2504]
-   Fix unescaping dates with slash [#2494]
-   Fix showing sorting direction button in gallery view [#2495]
-   Fix adding legend items only to current visualisation [#2496]

## [1.1.2] - 2019-03-20

### Changed

-   Remove global drupal config [#2475]
-   Extract only styles used in visualizations [#2467]
-   Adjustments in using external styles [#2493]

### Fixed

-   Fix overlapping search box on map [#2481]
-   UX data.world improvements and wording changes [#2478]
-   Add missing left margin in bar chart [#2482]
-   Fix showing tooltip on pie chart and pie set [#2483]

## [1.1.1] - 2019-03-20

### Fixed

-   Fix problem with grouping by year on empty date field in timeline [#2489]

## [1.1.0] - 2019-03-15

### Added

-   Ability to fetch a visualization from Drupal [#2432]

### Changed

-   Separate views from global scope [#2447]
-   Separate analytics libs for Drupal use cases [#2453]
-   Scope views for multiple instances [#2470]
-   Replace timeline with grouped gallery [#2426]
-   Improvements for grouped gallery [#2485]

### Fixed

-   Clickthrough revision for bar chart and word cloud views [#2473]
-   Data.world reimport conditional [#2472]
-   Pie Set mobile title viewable on desktop breakpoint [#2471]
-   Fix negative years [#2462]
-   Fix caching dates and moment formatted dates [#2486]

## [1.0.37] - 2019-03-14

### Changed

-   Change gallery thumbnail size [#2466]

### Fixed

-   Fix clickthrough logic for table view [#2466]
-   Fix links to single results on map view [#2466]
-   Fix building links for embedded views [#2466]

## [1.0.36] - 2019-03-13

### Added

-   Add limit to word cloud popup [#2437]
-   Add sample viz for new teams by creating user [#2443]

### Changed

-   Drupal user shouldn't be editable in users list [#2442]

### Fixed

-   Process revision before storing it [#2444]
-   Hompage Javascript dependencies fix [#2448]
-   Pipedrive specific failure message display [#2449]
-   Pie Set Has Image filter fix [#2454]
-   Add a missing argument in default dropdown [#2461]
-   Fix getting route path in shared viz [#2464]

## [1.0.35] - 2019-03-07

### Added

-   Data.world data source integration & OAuth2 flow [#2439]
-   Add clickThroughView to treemap tile [#2434]

### Changed

-   Optimise generating colours list [#2431]
-   Change unit to fix a sizing issue on tiles [#2445]
-   Deployment Scripts Update [#2433]
-   Add prefix to viz classes [#2415]

### Fixed

-   Fix position of article tiles on Safari [#2435]
-   Change non-existent error type for processing screen [#2438]
-   Fix dots colors in bubble legend [#2440]
-   Fix default dropdown [#2450]

[unreleased]: https://github.com/schemadesign/gist/compare/1.9.8...develop
[1.9.8]: https://github.com/schemadesign/gist/compare/1.9.7...1.9.8
[1.9.7]: https://github.com/schemadesign/gist/compare/1.9.6...1.9.7
[1.9.6]: https://github.com/schemadesign/gist/compare/1.9.5...1.9.6
[1.9.5]: https://github.com/schemadesign/gist/compare/1.9.4...1.9.5
[1.9.4]: https://github.com/schemadesign/gist/compare/1.9.3...1.9.4
[1.9.3]: https://github.com/schemadesign/gist/compare/1.9.2...1.9.3
[1.9.2]: https://github.com/schemadesign/gist/compare/1.9.1...1.9.2
[1.9.1]: https://github.com/schemadesign/gist/compare/1.9.0...1.9.1
[1.9.0]: https://github.com/schemadesign/gist/compare/1.8.10...1.9.0
[1.8.10]: https://github.com/schemadesign/gist/compare/1.8.9...1.8.10
[1.8.9]: https://github.com/schemadesign/gist/compare/1.8.8...1.8.9
[1.8.8]: https://github.com/schemadesign/gist/compare/1.8.7...1.8.8
[1.8.7]: https://github.com/schemadesign/gist/compare/1.8.6...1.8.7
[1.8.6]: https://github.com/schemadesign/gist/compare/1.8.5...1.8.6
[1.8.5]: https://github.com/schemadesign/gist/compare/1.8.4...1.8.5
[1.8.4]: https://github.com/schemadesign/gist/compare/1.8.3...1.8.4
[1.8.3]: https://github.com/schemadesign/gist/compare/1.8.2...1.8.3
[1.8.2]: https://github.com/schemadesign/gist/compare/1.8.1...1.8.2
[1.8.1]: https://github.com/schemadesign/gist/compare/1.8.0...1.8.1
[1.8.0]: https://github.com/schemadesign/gist/compare/1.7.17...1.8.0
[1.7.17]: https://github.com/schemadesign/gist/compare/1.7.16...1.7.17
[1.7.16]: https://github.com/schemadesign/gist/compare/1.7.15...1.7.16
[1.7.15]: https://github.com/schemadesign/gist/compare/1.7.14...1.7.15
[1.7.14]: https://github.com/schemadesign/gist/compare/1.7.13...1.7.14
[1.7.13]: https://github.com/schemadesign/gist/compare/1.7.12...1.7.13
[1.7.12]: https://github.com/schemadesign/gist/compare/1.7.11...1.7.12
[1.7.11]: https://github.com/schemadesign/gist/compare/1.7.10...1.7.11
[1.7.10]: https://github.com/schemadesign/gist/compare/1.7.9...1.7.10
[1.7.9]: https://github.com/schemadesign/gist/compare/1.7.8...1.7.9
[1.7.8]: https://github.com/schemadesign/gist/compare/1.7.7...1.7.8
[1.7.7]: https://github.com/schemadesign/gist/compare/1.7.6...1.7.7
[1.7.6]: https://github.com/schemadesign/gist/compare/1.7.5...1.7.6
[1.7.5]: https://github.com/schemadesign/gist/compare/1.7.4...1.7.5
[1.7.4]: https://github.com/schemadesign/gist/compare/1.7.3...1.7.4
[1.7.3]: https://github.com/schemadesign/gist/compare/1.7.2...1.7.3
[1.7.2]: https://github.com/schemadesign/gist/compare/1.7.1...1.7.2
[1.7.1]: https://github.com/schemadesign/gist/compare/1.7.0...1.7.1
[1.7.0]: https://github.com/schemadesign/gist/compare/1.6.6...1.7.0
[1.6.6]: https://github.com/schemadesign/gist/compare/1.6.5...1.6.6
[1.6.5]: https://github.com/schemadesign/gist/compare/1.6.4...1.6.5
[1.6.4]: https://github.com/schemadesign/gist/compare/1.6.3...1.6.4
[1.6.3]: https://github.com/schemadesign/gist/compare/1.6.2...1.6.3
[1.6.2]: https://github.com/schemadesign/gist/compare/1.6.1...1.6.2
[1.6.1]: https://github.com/schemadesign/gist/compare/1.6.0...1.6.1
[1.6.0]: https://github.com/schemadesign/gist/compare/1.5.3...1.6.0
[1.5.3]: https://github.com/schemadesign/gist/compare/1.5.2...1.5.3
[1.5.2]: https://github.com/schemadesign/gist/compare/1.5.1...1.5.2
[1.5.1]: https://github.com/schemadesign/gist/compare/1.5.0...1.5.1
[1.5.0]: https://github.com/schemadesign/gist/compare/1.4.10...1.5.0
[1.4.10]: https://github.com/schemadesign/gist/compare/1.4.9...1.4.10
[1.4.9]: https://github.com/schemadesign/gist/compare/1.4.8...1.4.9
[1.4.8]: https://github.com/schemadesign/gist/compare/1.4.7...1.4.8
[1.4.7]: https://github.com/schemadesign/gist/compare/1.4.6...1.4.7
[1.4.6]: https://github.com/schemadesign/gist/compare/1.4.5...1.4.6
[1.4.5]: https://github.com/schemadesign/gist/compare/1.4.4...1.4.5
[1.4.4]: https://github.com/schemadesign/gist/compare/1.4.3...1.4.4
[1.4.3]: https://github.com/schemadesign/gist/compare/1.4.2...1.4.3
[1.4.2]: https://github.com/schemadesign/gist/compare/1.4.1...1.4.2
[1.4.1]: https://github.com/schemadesign/gist/compare/1.4.0...1.4.1
[1.4.0]: https://github.com/schemadesign/gist/compare/1.3.3...1.4.0
[1.3.3]: https://github.com/schemadesign/gist/compare/1.3.2...1.3.3
[1.3.2]: https://github.com/schemadesign/gist/compare/1.3.1...1.3.2
[1.3.1]: https://github.com/schemadesign/gist/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/schemadesign/gist/compare/1.2.9...1.3.0
[1.2.9]: https://github.com/schemadesign/gist/compare/1.2.8...1.2.9
[1.2.8]: https://github.com/schemadesign/gist/compare/1.2.7...1.2.8
[1.2.7]: https://github.com/schemadesign/gist/compare/1.2.6...1.2.7
[1.2.6]: https://github.com/schemadesign/gist/compare/1.2.5...1.2.6
[1.2.5]: https://github.com/schemadesign/gist/compare/1.2.4...1.2.5
[1.2.4]: https://github.com/schemadesign/gist/compare/1.2.3...1.2.4
[1.2.3]: https://github.com/schemadesign/gist/compare/1.2.2...1.2.3
[1.2.2]: https://github.com/schemadesign/gist/compare/1.2.1...1.2.2
[1.2.1]: https://github.com/schemadesign/gist/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/schemadesign/gist/compare/1.1.11...1.2.0
[1.1.11]: https://github.com/schemadesign/gist/compare/1.1.10...1.1.11
[1.1.10]: https://github.com/schemadesign/gist/compare/1.1.9...1.1.10
[1.1.9]: https://github.com/schemadesign/gist/compare/1.1.8...1.1.9
[1.1.8]: https://github.com/schemadesign/gist/compare/1.1.7...1.1.8
[1.1.7]: https://github.com/schemadesign/gist/compare/1.1.6...1.1.7
[1.1.6]: https://github.com/schemadesign/gist/compare/1.1.5...1.1.6
[1.1.5]: https://github.com/schemadesign/gist/compare/1.1.4...1.1.5
[1.1.4]: https://github.com/schemadesign/gist/compare/1.1.3...1.1.4
[1.1.3]: https://github.com/schemadesign/gist/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/schemadesign/gist/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/schemadesign/gist/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/schemadesign/gist/compare/1.0.37...1.1.0
[1.0.37]: https://github.com/schemadesign/gist/compare/1.0.36...1.0.37
[1.0.36]: https://github.com/schemadesign/gist/compare/1.0.35...1.0.36
[1.0.35]: https://github.com/schemadesign/gist/compare/1.0.34...1.0.35
[#2431]: https://github.com/schemadesign/gist/pull/2431
[#2435]: https://github.com/schemadesign/gist/pull/2435
[#2438]: https://github.com/schemadesign/gist/pull/2438
[#2434]: https://github.com/schemadesign/gist/pull/2434
[#2433]: https://github.com/schemadesign/gist/pull/2433
[#2440]: https://github.com/schemadesign/gist/pull/2440
[#2450]: https://github.com/schemadesign/gist/pull/2450
[#2439]: https://github.com/schemadesign/gist/pull/2439
[#2437]: https://github.com/schemadesign/gist/pull/2437
[#2415]: https://github.com/schemadesign/gist/pull/2415
[#2443]: https://github.com/schemadesign/gist/pull/2443
[#2442]: https://github.com/schemadesign/gist/pull/2442
[#2444]: https://github.com/schemadesign/gist/pull/2444
[#2445]: https://github.com/schemadesign/gist/pull/2445
[#2426]: https://github.com/schemadesign/gist/pull/2426
[#2448]: https://github.com/schemadesign/gist/pull/2448
[#2449]: https://github.com/schemadesign/gist/pull/2449
[#2454]: https://github.com/schemadesign/gist/pull/2454
[#2447]: https://github.com/schemadesign/gist/pull/2447
[#2453]: https://github.com/schemadesign/gist/pull/2453
[#2470]: https://github.com/schemadesign/gist/pull/2470
[#2461]: https://github.com/schemadesign/gist/pull/2461
[#2464]: https://github.com/schemadesign/gist/pull/2464
[#2432]: https://github.com/schemadesign/gist/pull/2432
[#2466]: https://github.com/schemadesign/gist/pull/2466
[#2473]: https://github.com/schemadesign/gist/pull/2473
[#2472]: https://github.com/schemadesign/gist/pull/2472
[#2471]: https://github.com/schemadesign/gist/pull/2471
[#2462]: https://github.com/schemadesign/gist/pull/2462
[#2481]: https://github.com/schemadesign/gist/pull/2481
[#2478]: https://github.com/schemadesign/gist/pull/2478
[#2482]: https://github.com/schemadesign/gist/pull/2482
[#2483]: https://github.com/schemadesign/gist/pull/2483
[#2467]: https://github.com/schemadesign/gist/pull/2467
[#2484]: https://github.com/schemadesign/gist/pull/2484
[#2485]: https://github.com/schemadesign/gist/pull/2485
[#2486]: https://github.com/schemadesign/gist/pull/2486
[#2497]: https://github.com/schemadesign/gist/pull/2497
[#2489]: https://github.com/schemadesign/gist/pull/2489
[#2494]: https://github.com/schemadesign/gist/pull/2494
[#2493]: https://github.com/schemadesign/gist/pull/2493
[#2495]: https://github.com/schemadesign/gist/pull/2495
[#2498]: https://github.com/schemadesign/gist/pull/2498
[#2496]: https://github.com/schemadesign/gist/pull/2496
[#2475]: https://github.com/schemadesign/gist/pull/2475
[#2504]: https://github.com/schemadesign/gist/pull/2504
[#2502]: https://github.com/schemadesign/gist/pull/2502
[#2499]: https://github.com/schemadesign/gist/pull/2499
[#2512]: https://github.com/schemadesign/gist/pull/2512
[#2508]: https://github.com/schemadesign/gist/pull/2508
[#2509]: https://github.com/schemadesign/gist/pull/2509
[#2506]: https://github.com/schemadesign/gist/pull/2506
[#2510]: https://github.com/schemadesign/gist/pull/2510
[#2516]: https://github.com/schemadesign/gist/pull/2516
[#2511]: https://github.com/schemadesign/gist/pull/2511
[#2515]: https://github.com/schemadesign/gist/pull/2515
[#2518]: https://github.com/schemadesign/gist/pull/2518
[#2517]: https://github.com/schemadesign/gist/pull/2517
[#2519]: https://github.com/schemadesign/gist/pull/2519
[#2528]: https://github.com/schemadesign/gist/pull/2528
[#2523]: https://github.com/schemadesign/gist/pull/2523
[#2522]: https://github.com/schemadesign/gist/pull/2522
[#2526]: https://github.com/schemadesign/gist/pull/2526
[#2525]: https://github.com/schemadesign/gist/pull/2525
[#2530]: https://github.com/schemadesign/gist/pull/2530
[#2531]: https://github.com/schemadesign/gist/pull/2531
[#2533]: https://github.com/schemadesign/gist/pull/2533
[#2532]: https://github.com/schemadesign/gist/pull/2532
[#2537]: https://github.com/schemadesign/gist/pull/2537
[#2538]: https://github.com/schemadesign/gist/pull/2538
[#2539]: https://github.com/schemadesign/gist/pull/2539
[#2540]: https://github.com/schemadesign/gist/pull/2540
[#2541]: https://github.com/schemadesign/gist/pull/2541
[#2542]: https://github.com/schemadesign/gist/pull/2542
[#2544]: https://github.com/schemadesign/gist/pull/2544
[#2545]: https://github.com/schemadesign/gist/pull/2545
[#2546]: https://github.com/schemadesign/gist/pull/2546
[#2547]: https://github.com/schemadesign/gist/pull/2547
[#2552]: https://github.com/schemadesign/gist/pull/2552
[#2549]: https://github.com/schemadesign/gist/pull/2549
[#2554]: https://github.com/schemadesign/gist/pull/2554
[#2556]: https://github.com/schemadesign/gist/pull/2556
[#2557]: https://github.com/schemadesign/gist/pull/2557
[#2558]: https://github.com/schemadesign/gist/pull/2558
[#2563]: https://github.com/schemadesign/gist/pull/2563
[#2567]: https://github.com/schemadesign/gist/pull/2567
[#2568]: https://github.com/schemadesign/gist/pull/2568
[#2569]: https://github.com/schemadesign/gist/pull/2569
[#2574]: https://github.com/schemadesign/gist/pull/2574
[#2573]: https://github.com/schemadesign/gist/pull/2573
[#2572]: https://github.com/schemadesign/gist/pull/2572
[#2575]: https://github.com/schemadesign/gist/pull/2575
[#2578]: https://github.com/schemadesign/gist/pull/2578
[#2577]: https://github.com/schemadesign/gist/pull/2577
[#2583]: https://github.com/schemadesign/gist/pull/2583
[#2591]: https://github.com/schemadesign/gist/pull/2591
[#2587]: https://github.com/schemadesign/gist/pull/2587
[#2589]: https://github.com/schemadesign/gist/pull/2589
[#2584]: https://github.com/schemadesign/gist/pull/2584
[#2585]: https://github.com/schemadesign/gist/pull/2585
[#2586]: https://github.com/schemadesign/gist/pull/2586
[#2590]: https://github.com/schemadesign/gist/pull/2590
[#2593]: https://github.com/schemadesign/gist/pull/2593
[#2594]: https://github.com/schemadesign/gist/pull/2594
[#2597]: https://github.com/schemadesign/gist/pull/2597
[#2598]: https://github.com/schemadesign/gist/pull/2598
[#2600]: https://github.com/schemadesign/gist/pull/2600
[#2603]: https://github.com/schemadesign/gist/pull/2603
[#2604]: https://github.com/schemadesign/gist/pull/2604
[#2599]: https://github.com/schemadesign/gist/pull/2599
[#2601]: https://github.com/schemadesign/gist/pull/2601
[#2602]: https://github.com/schemadesign/gist/pull/2602
[#2616]: https://github.com/schemadesign/gist/pull/2616
[#2618]: https://github.com/schemadesign/gist/pull/2618
[#2617]: https://github.com/schemadesign/gist/pull/2617
[#2621]: https://github.com/schemadesign/gist/pull/2621
[#2620]: https://github.com/schemadesign/gist/pull/2620
[#2624]: https://github.com/schemadesign/gist/pull/2624
[#2630]: https://github.com/schemadesign/gist/pull/2630
[#2639]: https://github.com/schemadesign/gist/pull/2639
[#2634]: https://github.com/schemadesign/gist/pull/2634
[#2631]: https://github.com/schemadesign/gist/pull/2631
[#2635]: https://github.com/schemadesign/gist/pull/2635
[#2642]: https://github.com/schemadesign/gist/pull/2642
[#2641]: https://github.com/schemadesign/gist/pull/2641
[#2636]: https://github.com/schemadesign/gist/pull/2636
[#2643]: https://github.com/schemadesign/gist/pull/2643
[#2638]: https://github.com/schemadesign/gist/pull/2638
[#2640]: https://github.com/schemadesign/gist/pull/2640
[#2625]: https://github.com/schemadesign/gist/pull/2625
[#2644]: https://github.com/schemadesign/gist/pull/2644
[#2652]: https://github.com/schemadesign/gist/pull/2652
[#2645]: https://github.com/schemadesign/gist/pull/2645
[#2646]: https://github.com/schemadesign/gist/pull/2646
[#2647]: https://github.com/schemadesign/gist/pull/2647
[#2649]: https://github.com/schemadesign/gist/pull/2649
[#2651]: https://github.com/schemadesign/gist/pull/2651
[#2653]: https://github.com/schemadesign/gist/pull/2653
[#2654]: https://github.com/schemadesign/gist/pull/2654
[#2655]: https://github.com/schemadesign/gist/pull/2655
[#2656]: https://github.com/schemadesign/gist/pull/2656
[#2657]: https://github.com/schemadesign/gist/pull/2657
[#2660]: https://github.com/schemadesign/gist/pull/2660
[#2662]: https://github.com/schemadesign/gist/pull/2662
[#2669]: https://github.com/schemadesign/gist/pull/2669
[#2670]: https://github.com/schemadesign/gist/pull/2670
[#2671]: https://github.com/schemadesign/gist/pull/2671
[#2663]: https://github.com/schemadesign/gist/pull/2663
[#2673]: https://github.com/schemadesign/gist/pull/2673
[#2684]: https://github.com/schemadesign/gist/pull/2684
[#2685]: https://github.com/schemadesign/gist/pull/2685
[#2678]: https://github.com/schemadesign/gist/pull/2678
[#2681]: https://github.com/schemadesign/gist/pull/2681
[#2686]: https://github.com/schemadesign/gist/pull/2686
[#2683]: https://github.com/schemadesign/gist/pull/2683
[#2689]: https://github.com/schemadesign/gist/pull/2689
[#2690]: https://github.com/schemadesign/gist/pull/2690
[#2692]: https://github.com/schemadesign/gist/pull/2692
[#2693]: https://github.com/schemadesign/gist/pull/2693
[#2694]: https://github.com/schemadesign/gist/pull/2694
[#2696]: https://github.com/schemadesign/gist/pull/2696
[#2695]: https://github.com/schemadesign/gist/pull/2695
[#2699]: https://github.com/schemadesign/gist/pull/2699
[#2700]: https://github.com/schemadesign/gist/pull/2700
[#2705]: https://github.com/schemadesign/gist/pull/2705
[#2706]: https://github.com/schemadesign/gist/pull/2706
[#2709]: https://github.com/schemadesign/gist/pull/2709
[#2711]: https://github.com/schemadesign/gist/pull/2711
[#2712]: https://github.com/schemadesign/gist/pull/2712
[#2734]: https://github.com/schemadesign/gist/pull/2734
[#2722]: https://github.com/schemadesign/gist/pull/2722
[#2710]: https://github.com/schemadesign/gist/pull/2710
[#2718]: https://github.com/schemadesign/gist/pull/2718
[#2672]: https://github.com/schemadesign/gist/pull/2672
[#2721]: https://github.com/schemadesign/gist/pull/2721
[#2720]: https://github.com/schemadesign/gist/pull/2720
[#2676]: https://github.com/schemadesign/gist/pull/2676
[#2740]: https://github.com/schemadesign/gist/pull/2740
[#2727]: https://github.com/schemadesign/gist/pull/2727
[#2726]: https://github.com/schemadesign/gist/pull/2726
[#2728]: https://github.com/schemadesign/gist/pull/2728
[#2731]: https://github.com/schemadesign/gist/pull/2731
[#2732]: https://github.com/schemadesign/gist/pull/2732
[#2736]: https://github.com/schemadesign/gist/pull/2736
[#2743]: https://github.com/schemadesign/gist/pull/2743
[#2742]: https://github.com/schemadesign/gist/pull/2742
[#2745]: https://github.com/schemadesign/gist/pull/2745
[#2746]: https://github.com/schemadesign/gist/pull/2746
[#2739]: https://github.com/schemadesign/gist/pull/2739
[#2751]: https://github.com/schemadesign/gist/pull/2751
[#2749]: https://github.com/schemadesign/gist/pull/2749
[#2754]: https://github.com/schemadesign/gist/pull/2754
[#2757]: https://github.com/schemadesign/gist/pull/2757
[#2750]: https://github.com/schemadesign/gist/pull/2750
[#2755]: https://github.com/schemadesign/gist/pull/2755
[#2756]: https://github.com/schemadesign/gist/pull/2756
[#2763]: https://github.com/schemadesign/gist/pull/2763
[#2761]: https://github.com/schemadesign/gist/pull/2761
[#2762]: https://github.com/schemadesign/gist/pull/2762
[#2766]: https://github.com/schemadesign/gist/pull/2766
[#2767]: https://github.com/schemadesign/gist/pull/2767
[#2768]: https://github.com/schemadesign/gist/pull/2768
[#2775]: https://github.com/schemadesign/gist/pull/2775
[#2774]: https://github.com/schemadesign/gist/pull/2774
[#2772]: https://github.com/schemadesign/gist/pull/2772
[#2773]: https://github.com/schemadesign/gist/pull/2773
[#2776]: https://github.com/schemadesign/gist/pull/2776
[#2777]: https://github.com/schemadesign/gist/pull/2777
[#2780]: https://github.com/schemadesign/gist/pull/2780
[#2785]: https://github.com/schemadesign/gist/pull/2785
[#2790]: https://github.com/schemadesign/gist/pull/2790
[#2793]: https://github.com/schemadesign/gist/pull/2793
[#2795]: https://github.com/schemadesign/gist/pull/2795
[#2796]: https://github.com/schemadesign/gist/pull/2796
[#2798]: https://github.com/schemadesign/gist/pull/2798
[#2801]: https://github.com/schemadesign/gist/pull/2801
[#2804]: https://github.com/schemadesign/gist/pull/2804
[#2803]: https://github.com/schemadesign/gist/pull/2803
[#2788]: https://github.com/schemadesign/gist/pull/2788
[#2809]: https://github.com/schemadesign/gist/pull/2809
[#2810]: https://github.com/schemadesign/gist/pull/2810
[#2811]: https://github.com/schemadesign/gist/pull/2811
[#2807]: https://github.com/schemadesign/gist/pull/2807
[#2817]: https://github.com/schemadesign/gist/pull/2817
[#2816]: https://github.com/schemadesign/gist/pull/2816
[#2812]: https://github.com/schemadesign/gist/pull/2812
[#2799]: https://github.com/schemadesign/gist/pull/2799
[#2818]: https://github.com/schemadesign/gist/pull/2818
[#2827]: https://github.com/schemadesign/gist/pull/2827
[#2825]: https://github.com/schemadesign/gist/pull/2825
[#2821]: https://github.com/schemadesign/gist/pull/2821
[#2822]: https://github.com/schemadesign/gist/pull/2822
[#2823]: https://github.com/schemadesign/gist/pull/2823
[#2824]: https://github.com/schemadesign/gist/pull/2824
[#2826]: https://github.com/schemadesign/gist/pull/2826
[#2829]: https://github.com/schemadesign/gist/pull/2829
[#2832]: https://github.com/schemadesign/gist/pull/2832
[#2833]: https://github.com/schemadesign/gist/pull/2833
[#2834]: https://github.com/schemadesign/gist/pull/2834
[#2839]: https://github.com/schemadesign/gist/pull/2839
[#2838]: https://github.com/schemadesign/gist/pull/2838
[#2835]: https://github.com/schemadesign/gist/pull/2835
[#2842]: https://github.com/schemadesign/gist/pull/2842
[#2841]: https://github.com/schemadesign/gist/pull/2841
[#2849]: https://github.com/schemadesign/gist/pull/2849
[#2843]: https://github.com/schemadesign/gist/pull/2843
[#2848]: https://github.com/schemadesign/gist/pull/2848
[#2850]: https://github.com/schemadesign/gist/pull/2850
[#2846]: https://github.com/schemadesign/gist/pull/2846
[#2851]: https://github.com/schemadesign/gist/pull/2851
[#2852]: https://github.com/schemadesign/gist/pull/2852
[#2854]: https://github.com/schemadesign/gist/pull/2854
[#2855]: https://github.com/schemadesign/gist/pull/2855
[#2856]: https://github.com/schemadesign/gist/pull/2856
[#2857]: https://github.com/schemadesign/gist/pull/2857
[#2858]: https://github.com/schemadesign/gist/pull/2858
[#2860]: https://github.com/schemadesign/gist/pull/2860
[#2859]: https://github.com/schemadesign/gist/pull/2859
[#2861]: https://github.com/schemadesign/gist/pull/2861
[#2865]: https://github.com/schemadesign/gist/pull/2865
[#2866]: https://github.com/schemadesign/gist/pull/2866
[#2867]: https://github.com/schemadesign/gist/pull/2867
[#2868]: https://github.com/schemadesign/gist/pull/2868
[#2869]: https://github.com/schemadesign/gist/pull/2869
[#2870]: https://github.com/schemadesign/gist/pull/2870
[#2876]: https://github.com/schemadesign/gist/pull/2876
[#2875]: https://github.com/schemadesign/gist/pull/2875
[#2877]: https://github.com/schemadesign/gist/pull/2877
[#2878]: https://github.com/schemadesign/gist/pull/2878
[#2874]: https://github.com/schemadesign/gist/pull/2874
[#2881]: https://github.com/schemadesign/gist/pull/2881
[#2880]: https://github.com/schemadesign/gist/pull/2880
[#2885]: https://github.com/schemadesign/gist/pull/2885
[#2886]: https://github.com/schemadesign/gist/pull/2886
[#2887]: https://github.com/schemadesign/gist/pull/2887
[#2884]: https://github.com/schemadesign/gist/pull/2884
[#2895]: https://github.com/schemadesign/gist/pull/2895
[#2890]: https://github.com/schemadesign/gist/pull/2890
[#2892]: https://github.com/schemadesign/gist/pull/2892
[#2891]: https://github.com/schemadesign/gist/pull/2891
[#2899]: https://github.com/schemadesign/gist/pull/2899
[#2898]: https://github.com/schemadesign/gist/pull/2898
[#2900]: https://github.com/schemadesign/gist/pull/2900
[#2901]: https://github.com/schemadesign/gist/pull/2901
[#2902]: https://github.com/schemadesign/gist/pull/2902
[#2905]: https://github.com/schemadesign/gist/pull/2905
[#2914]: https://github.com/schemadesign/gist/pull/2914
[#2906]: https://github.com/schemadesign/gist/pull/2906
[#2907]: https://github.com/schemadesign/gist/pull/2907
[#2910]: https://github.com/schemadesign/gist/pull/2910
[#2909]: https://github.com/schemadesign/gist/pull/2909
[#2912]: https://github.com/schemadesign/gist/pull/2912
[#2917]: https://github.com/schemadesign/gist/pull/2917
[#2913]: https://github.com/schemadesign/gist/pull/2913
[#2920]: https://github.com/schemadesign/gist/pull/2920
[#2921]: https://github.com/schemadesign/gist/pull/2921
[#2922]: https://github.com/schemadesign/gist/pull/2922
[#2924]: https://github.com/schemadesign/gist/pull/2924
[#2925]: https://github.com/schemadesign/gist/pull/2925
[#2929]: https://github.com/schemadesign/gist/pull/2929
[#2930]: https://github.com/schemadesign/gist/pull/2930
[#2932]: https://github.com/schemadesign/gist/pull/2932
[#2935]: https://github.com/schemadesign/gist/pull/2935
[#2937]: https://github.com/schemadesign/gist/pull/2937
[#2934]: https://github.com/schemadesign/gist/pull/2934
[#2936]: https://github.com/schemadesign/gist/pull/2936
[#2939]: https://github.com/schemadesign/gist/pull/2939
[#2940]: https://github.com/schemadesign/gist/pull/2940
[#2942]: https://github.com/schemadesign/gist/pull/2942
[#2944]: https://github.com/schemadesign/gist/pull/2944
[#2948]: https://github.com/schemadesign/gist/pull/2948
[#2949]: https://github.com/schemadesign/gist/pull/2949
[#2951]: https://github.com/schemadesign/gist/pull/2951
[#2952]: https://github.com/schemadesign/gist/pull/2952
[#2956]: https://github.com/schemadesign/gist/pull/2956
[#2958]: https://github.com/schemadesign/gist/pull/2958
[#2960]: https://github.com/schemadesign/gist/pull/2960
[#2959]: https://github.com/schemadesign/gist/pull/2959
[#2963]: https://github.com/schemadesign/gist/pull/2963
[#2965]: https://github.com/schemadesign/gist/pull/2965
[#2966]: https://github.com/schemadesign/gist/pull/2966
[#2970]: https://github.com/schemadesign/gist/pull/2970
[#2971]: https://github.com/schemadesign/gist/pull/2971
[#2972]: https://github.com/schemadesign/gist/pull/2972
[#2976]: https://github.com/schemadesign/gist/pull/2976
[#2979]: https://github.com/schemadesign/gist/pull/2979
[#2984]: https://github.com/schemadesign/gist/pull/2984
[#2981]: https://github.com/schemadesign/gist/pull/2981
[#2988]: https://github.com/schemadesign/gist/pull/2988
[#2989]: https://github.com/schemadesign/gist/pull/2989
[#2992]: https://github.com/schemadesign/gist/pull/2992
[#2993]: https://github.com/schemadesign/gist/pull/2993
[#2995]: https://github.com/schemadesign/gist/pull/2995
[#2998]: https://github.com/schemadesign/gist/pull/2998
[#2997]: https://github.com/schemadesign/gist/pull/2997
[#3000]: https://github.com/schemadesign/gist/pull/3000
[#3002]: https://github.com/schemadesign/gist/pull/3002
[#3003]: https://github.com/schemadesign/gist/pull/3003
[#3006]: https://github.com/schemadesign/gist/pull/3006
[#3007]: https://github.com/schemadesign/gist/pull/3007
[#3011]: https://github.com/schemadesign/gist/pull/3011
[#3012]: https://github.com/schemadesign/gist/pull/3012
[#3014]: https://github.com/schemadesign/gist/pull/3014
[#3019]: https://github.com/schemadesign/gist/pull/3019
[#3020]: https://github.com/schemadesign/gist/pull/3020
[#3021]: https://github.com/schemadesign/gist/pull/3021
[#3024]: https://github.com/schemadesign/gist/pull/3024
[#3027]: https://github.com/schemadesign/gist/pull/3027
[#3030]: https://github.com/schemadesign/gist/pull/3030
[#3031]: https://github.com/schemadesign/gist/pull/3031
[#3032]: https://github.com/schemadesign/gist/pull/3032
[#3034]: https://github.com/schemadesign/gist/pull/3034
[#3038]: https://github.com/schemadesign/gist/pull/3038
[#3040]: https://github.com/schemadesign/gist/pull/3040
[#3045]: https://github.com/schemadesign/gist/pull/3045
[#3046]: https://github.com/schemadesign/gist/pull/3046
[#3057]: https://github.com/schemadesign/gist/pull/3057
[#3050]: https://github.com/schemadesign/gist/pull/3050
[#3052]: https://github.com/schemadesign/gist/pull/3052
[#3053]: https://github.com/schemadesign/gist/pull/3053
[#3055]: https://github.com/schemadesign/gist/pull/3055
[#3056]: https://github.com/schemadesign/gist/pull/3056
[#3060]: https://github.com/schemadesign/gist/pull/3060
[#3064]: https://github.com/schemadesign/gist/pull/3064
[#3067]: https://github.com/schemadesign/gist/pull/3067
[#3069]: https://github.com/schemadesign/gist/pull/3069
[#3071]: https://github.com/schemadesign/gist/pull/3071
[#3073]: https://github.com/schemadesign/gist/pull/3073
[#3075]: https://github.com/schemadesign/gist/pull/3075
[#3079]: https://github.com/schemadesign/gist/pull/3079
[#3079]: https://github.com/schemadesign/gist/pull/3079
[#3088]: https://github.com/schemadesign/gist/pull/3088
[#3091]: https://github.com/schemadesign/gist/pull/3091
[#3096]: https://github.com/schemadesign/gist/pull/3096
[#3099]: https://github.com/schemadesign/gist/pull/3099
[#3102]: https://github.com/schemadesign/gist/pull/3102
[#3103]: https://github.com/schemadesign/gist/pull/3103
[#3104]: https://github.com/schemadesign/gist/pull/3104
[#3106]: https://github.com/schemadesign/gist/pull/3106
[#3107]: https://github.com/schemadesign/gist/pull/3107
[#3109]: https://github.com/schemadesign/gist/pull/3109
[#3110]: https://github.com/schemadesign/gist/pull/3110
[#3111]: https://github.com/schemadesign/gist/pull/3111
[#3112]: https://github.com/schemadesign/gist/pull/3112
[#3113]: https://github.com/schemadesign/gist/pull/3113
[#3116]: https://github.com/schemadesign/gist/pull/3116
[#3117]: https://github.com/schemadesign/gist/pull/3117
[#3118]: https://github.com/schemadesign/gist/pull/3118
[#3121]: https://github.com/schemadesign/gist/pull/3121
[#3123]: https://github.com/schemadesign/gist/pull/3123
[#3122]: https://github.com/schemadesign/gist/pull/3122
[#3126]: https://github.com/schemadesign/gist/pull/3126
[#3125]: https://github.com/schemadesign/gist/pull/3125
[#3127]: https://github.com/schemadesign/gist/pull/3127
[#3130]: https://github.com/schemadesign/gist/pull/3130
[#3133]: https://github.com/schemadesign/gist/pull/3133
[#3132]: https://github.com/schemadesign/gist/pull/3132
[#3135]: https://github.com/schemadesign/gist/pull/3135
[#3134]: https://github.com/schemadesign/gist/pull/3134
[#3136]: https://github.com/schemadesign/gist/pull/3136
[#3137]: https://github.com/schemadesign/gist/pull/3137
[#3138]: https://github.com/schemadesign/gist/pull/3138
[#3124]: https://github.com/schemadesign/gist/pull/3124
[#3141]: https://github.com/schemadesign/gist/pull/3141
[#3148]: https://github.com/schemadesign/gist/pull/3148
