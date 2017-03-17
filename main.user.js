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
var CotterHTML =
    '<span class="name" data="i=5|683">'
        + '<img src="//assets.illyriad.net/img/icons/trade/peasant_dwarf2_24.png" title="Cotters" />'
    + '</span>';
var SkinnerHTML =
    '<span class="name" data="i=5|684">'
        + '<img src="//assets.illyriad.net/img/icons/trade/hunter_dwarf_24.png" title="Skinners">'
    + '</span>';

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
    'CotterHTML'    : CotterHTML,
    'SkinnerHTML'   : SkinnerHTML,
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

// This runs when the page has loaded
// It places the sidebar and installs the primary event listeners
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
    $('#RefreshResourceFinder').click(MarketHelper);

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
addEventListener('DOMContentLoaded', PlaceButtons, false);
