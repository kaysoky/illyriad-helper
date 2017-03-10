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

var GoldHTML = '<span class="name resIcon ico-gold" data="i=4|1" title="Gold"></span>';
var WoodHTML = '<span class="name resIcon ico-wood" data="i=1|1" title="Wood"></span>';
var ClayHTML = '<span class="name resIcon ico-clay" data="i=1|2" title="Clay"></span>';
var IronHTML = '<span class="name resIcon ico-iron" data="i=1|3" title="Iron"></span>';
var StoneHTML = '<span class="name resIcon ico-stone" data="i=1|4" title="Stone"></span>';
var FoodHTML = '<span class="name resIcon ico-food" data="i=1|5" title="Food"></span>';
var ResourceIcons = [
    'undefined',
    WoodHTML,
    ClayHTML,
    IronHTML,
    StoneHTML,
    FoodHTML,
    GoldHTML,
];

var HTML_TEMPLATE = {
    'CaravanHTML' : CaravanHTML,
    'WoodHTML'    : WoodHTML,
    'ClayHTML'    : ClayHTML,
    'IronHTML'    : IronHTML,
    'StoneHTML'   : StoneHTML,
    'FoodHTML'    : FoodHTML,
    'GoldHTML'    : GoldHTML
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
    $('#MarketButton').click(MarketHelper);

    // Install the Market Helper filter checkboxes
    $('#MarketHelperBox').find('.MarketHelperCheck').click(function () {
        var resource = $(this).attr('value');

        $('#MarketHelperTable').find('.MarketHelperRow-' + resource).toggle();
    });
}

// Run this stuff after the page is loaded
addEventListener('DOMContentLoaded', PlaceButtons, false);
