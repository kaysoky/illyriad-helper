// ==UserScript==
// @name        Illyriad Helpers
// @namespace   hoagies
// @description Adds some UI helpers to the base game to make specific repetitive things easier
// @include     https://elgea.illyriad.co.uk/*
// @version     1
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @resource    Box_HTML static/Box.html
// @resource    Box_CSS  static/Box.css
// @require     js/market.js
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js
// ==/UserScript==

this.$ = this.jQuery = jQuery.noConflict(true);

var CaravanHTML =
    '<span class="name" data="i=5|1">'
        + '<img src="//assets.illyriad.net/img/icons/trade/caravan_24.png" title="Caravans" />'
    + '</span>';

var IconHTMLPrefix = '<img src="//assets.illyriad.net/img/icons/trade/'
var CotterBody = 'peasant_';
var SkinnerBody = 'hunter_';
var HerbalistBody = 'herbgatherer_';
var MinerBody = 'miner_';
var IconHTMLSuffix = '_24.png" />';

var GoldHTML = '<span class="name resIcon ico-gold" data="i=4|1" title="Gold"></span>';
var WoodHTML = '<span class="name resIcon ico-wood" data="i=1|1" title="Wood"></span>';
var ClayHTML = '<span class="name resIcon ico-clay" data="i=1|2" title="Clay"></span>';
var IronHTML = '<span class="name resIcon ico-iron" data="i=1|3" title="Iron"></span>';
var StoneHTML = '<span class="name resIcon ico-stone" data="i=1|4" title="Stone"></span>';
var FoodHTML = '<span class="name resIcon ico-food" data="i=1|5" title="Food"></span>';
var HidesHTML = '<span class="name base pelts_24" data="c=186" title="Hides"></span>';
var HerbsHTML = '<span class="name itemsprite herbs_24" data="c=416" title="Herbs"></span>';
var MineralsHTML = '<span class="name base crystals_24" data="c=417" title="Minerals"></span>';
var EquipHTML = '<img src="//assets.illyriad.net/img/icons/equip_48.png" style="width:24px;height:24px" />'
var SaltsHTML = '<img src="//assets.illyriad.net/img/icons/salts.png" style="width:24px;height:24px" />'
var RareHerbsHTML = '<img src="//assets.illyriad.net/img/icons/herbs.png" style="width:24px;height:24px" />'
var GemsHTML = '<img src="//assets.illyriad.net/img/icons/gem.png" style="width:24px;height:24px" />'
var GrapesHTML = '<span class="name base grapes_24" data="c=253" title="Grapes"></span>'
var PawsHTML = '<img src="//assets.illyriad.net/img/icons/paws_48.png" style="width:24px;height:24px" />'
var ResourceIcons = [
    'undefined',  // 0
    WoodHTML,
    ClayHTML,
    IronHTML,
    StoneHTML,
    FoodHTML,     // 5
    GoldHTML,
    HidesHTML,
    HerbsHTML,
    MineralsHTML,
    EquipHTML,    // 10
    SaltsHTML,
    RareHerbsHTML,
    GemsHTML,
    GrapesHTML,
    PawsHTML,     // 15
];

var HTML_TEMPLATE = {
    'CaravanHTML'   : CaravanHTML,
    'WoodHTML'      : WoodHTML,
    'ClayHTML'      : ClayHTML,
    'IronHTML'      : IronHTML,
    'StoneHTML'     : StoneHTML,
    'FoodHTML'      : FoodHTML,
    'GoldHTML'      : GoldHTML,
    'HidesHTML'     : HidesHTML,
    'HerbsHTML'     : HerbsHTML,
    'MineralsHTML'  : MineralsHTML,
    'EquipHTML'     : EquipHTML,
    'SaltsHTML'     : SaltsHTML,
    'RareHerbsHTML' : RareHerbsHTML,
    'GemsHTML'      : GemsHTML,
    'GrapesHTML'    : GrapesHTML,
    'PawsHTML'      : PawsHTML,
}

String.prototype.replaceAll = function (search, replace) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replace);
}

// This is the first thing that runs when the page has loaded
function Initialize() {
    // Figure out the player's race
    var time = '_=' + (new Date).getTime();
    $.ajax({
        type: 'POST',
        url: '/Town/Castle?' + time,
        async: true,
        data: time
    }).done(function (data) {
        var race = $(data).find('td:contains("Race")')
            .parent()
            .find('td').filter(':last')
            .text().toLowerCase();

        // For some reason, some of the images for Dwarves and Orcs don't
        // follow the same URL pattern as the other races
        var cotterSuffix = '';
        if (race === 'dwarf' || race === 'orc') {
            cotterSuffix = '2';
        }

        // Fill in the image URLs for the special gatherers
        HTML_TEMPLATE['CotterHTML']    = IconHTMLPrefix + CotterBody    + race + cotterSuffix + IconHTMLSuffix;
        HTML_TEMPLATE['SkinnerHTML']   = IconHTMLPrefix + SkinnerBody   + race + IconHTMLSuffix;
        HTML_TEMPLATE['HerbalistHTML'] = IconHTMLPrefix + HerbalistBody + race + IconHTMLSuffix;
        HTML_TEMPLATE['MinerHTML']     = IconHTMLPrefix + MinerBody     + race + IconHTMLSuffix;

        // Continue on to place the helper in the UI
        PlaceButtons();
    });
}

// This places the sidebar and installs the primary event listeners
function PlaceButtons() {
    // Load the sidebar HTML template and fill in the values
    var sidebar = GM_getResourceText('Box_HTML');
    for (var key in HTML_TEMPLATE) {
        sidebar = sidebar.replaceAll('{' + key + '}', HTML_TEMPLATE[key]);
    }
    $('body').append(sidebar);

    // Load the special sidebar CSS
    GM_addStyle(GM_getResourceText('Box_CSS'));

    // Install the Market Helper button listener
    $('#MarketButton').click(function () {
        // Reset the view of the associated boxes
        $('#MarketHelperBox').show();
    });

    // Install the top-level Market helper listener(s)
    $('#RefreshResourceFinder').click(MarketHelperMain);

    // Install the Market Helper filter checkboxes
    function MarketCheckboxHandler() {
        function ToClassArray(elem, index) {
            return '.MarketHelperRow-' + $(elem).attr('value');
        }

        var shown = $.map(
            $('#MarketHelperBox').find('.MarketHelperCheck:checked'),
            ToClassArray).join(',');
        var hidden = $.map(
            $('#MarketHelperBox').find('.MarketHelperCheck').not(':checked'),
            ToClassArray).join(',');

        $('#MarketHelperTable').find(hidden).hide();
        $('#MarketHelperTable').find(shown).show();
    }
    $('#MarketHelperBox').find('.MarketHelperCheck').click(MarketCheckboxHandler);
    $('#MarketHelperBox').find('.MarketHelperCheck-row').click(function () {
        $(this).parent().parent().find('.MarketHelperCheck')
            .prop('checked', $(this).prop('checked'));

        MarketCheckboxHandler();
    });
}

// Run this stuff after the page is loaded
addEventListener('DOMContentLoaded', Initialize, false);
