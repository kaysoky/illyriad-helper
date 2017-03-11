/**
 * This file contains the Javascript backing the `Market Helper` tab
 */

// Determines the amount of data returned by /World/MapData
// The result is a square of width (2 * ZOOM + 1)
var ZOOM = 12;
var WORLD_DATA_WIDTH = 2 * ZOOM + 1;

// How many squares to search to the North/East/South/West of your town
var SEARCH_RADIUS = 3;

// Returns the coordinates of the active town
function GetTownCoordinates() {
    var center = $('.cityMenu.selected > div:nth-child(5) > span:first')
        .text().split(' | ');
    return [parseInt(center[0]), parseInt(center[1])];
}

// Helper that calls a (synchronous) lambda for each town you own
// The town is switched back to the original one after all calls
// and the `continuation` will be called at that point
// Note: The actual page does not change, so data should only be gathered
//       from AJAX requests rather than from the DOM
function ForEachTown(lambda, continuation) {
    var original = $('#citiesMenu .cityMenu.selected').attr('data-townid');
    var towns = $('#citiesMenu .cityMenu')
        .map(function () { return $(this).attr('data-townid'); })
        .get();

    // Switches to the given town and then runs the given continuation
    function SwitchTown(id, continuation) {
        $.ajax({
            type: 'POST',
            url: '/Home/UpdateResources',
            async: true,
            data: 'ChangeTown=' + id
        }).done(continuation)
        .fail(function () {
            alert('Failed to switch towns');
        });
    }

    // Used to run a lambda asynchronously over each town
    function TownLooper() {
        var next = towns.pop();
        lambda();
        if (next) {
            SwitchTown(next, TownLooper);
        } else {
            // Switch back to the original town
            SwitchTown(original, continuation);
        }
    }

    SwitchTown(towns.pop(), TownLooper);
}

// Parse the result of POST /Trade/PopupHarvesting
// For the number of available caravans
function FreeCaravanHelper(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].Name === 'Caravan') {
            return data[i].Available;
        }
    }

    return 0;
}

// Event handler for clicking the `Market Helper` button
function MarketHelper() {
    // Reset the view of the associated boxes
    $('#MarketHelperBox').show();
    $('#MarketHelperSpinner').show();

    // Reset the filter checkboxes
    $('#MarketHelperBox').find('.MarketHelperCheck').prop('checked', true);

    // Clean up the table of resources
    $('#MarketHelperTable tr').not(':first').remove();

    var [X, Y] = GetTownCoordinates();

    // Figure out the number of free caravans
    $.ajax({
        type: 'POST',
        url: '/Trade/PopupHarvesting',
        async: true,
        data: 'SendX=' + X + '&SendY=' + Y
    }).done(function (data) {
        $('#AvailableCaravans').text(FreeCaravanHelper(data));
    }).fail(function () {
        alert('Failed to figure out number of free caravans');
    });

    // Figure out what caravans are currently enroute
    var time = '_=' + (new Date).getTime();
    var outbound = new Set();

    ForEachTown(function () {
        $.ajax({
            type: 'POST',
            url: '/Trade/Movements?' + time,
            async: false,
            data: time
        }).done(function (data) {
            var data = $(data);

            // Helper function that searches for a fieldset with the given legend
            // and then extracts coordinates from the n-th field of the underlying
            // table.  The results are stored in the parent's `outbound` set.
            function ParseTradeMovements(search, index) {
                var rows = data
                    .find('legend:contains("' + search + '")')
                    .parent()
                    .find('table')
                    .find('tr').not(':first');

                for (var i = 0; i < rows.length; i++) {
                    var text = rows.eq(i)
                        .find('td:nth-child(' + index + ')')
                        .text();

                    // Skip outbound trade that isn't headed towards a "location"
                    if (text.indexOf('[@l=') === -1) {
                        continue;
                    }

                    var [oX, oY] = text.split('[@l=')[1].split('|');
                    outbound.add(oY + '|' + oX);
                }
            }

            ParseTradeMovements('outbound trade', 3);
        }).fail(function () {
            alert('Failed to fetch dispatched caravans');
        });
    }, function () {
        // Aggregator for the parsed world data
        var resources = [];
        var results_pending = Math.pow(2 * SEARCH_RADIUS + 1, 2);

        // Helper that parse and filters each set of world map data
        function WorldMapParser(data) {
            for (var bunch in data.n) {
                // Exclude resources that are occupied by any army
                if (data.c[bunch]) {
                    continue;
                }

                // Exclude resources that are on sovereign territory
                if (data.s[bunch]) {
                    continue;
                }

                // Exclude resources that are already being gathered
                if (data.n[bunch].rd) {
                    continue;
                }

                // Exclude resources that you are already sending a caravan towards
                if (outbound.has(bunch)) {
                    continue;
                }

                // NOTE: The returned coordinates are in form: {Y, X}
                var coords = bunch.split('|');
                var rX = parseInt(coords[1]);
                var rY = parseInt(coords[0]);
                var distance = Math.round(
                        Math.sqrt(Math.pow(X - rX, 2) + Math.pow(Y - rY, 2))
                    * 100) / 100;
                var type = parseInt(data.n[bunch].i);

                if (type > 0 && type <= 6) {
                    resources.push({
                        'distance' : distance,
                        'data' : '<tr class="MarketHelperRow-' + type + '">'
                            + '<td><a href="#/World/Map/' + rX + '/' + rY + '">' + rX + '|' + rY + '</a></td>'
                            + '<td>' + distance + '</td>'
                            + '<td>' + ResourceIcons[type] + '</td>'
                            + '<td>'
                                + '<input class="short MarketHelperButton" '
                                    + 'type="submit" '
                                    + 'value="Send!" '
                                    + 'query="'
                                        + 'SendX=' + rX
                                        + '&SendY=' + rY
                                        + '&UnitId=1'
                                        + '&Quantity=1'
                                + '" />'
                            + '</td>'
                        + '</tr>'
                    });
                }
            }

            // Once all the results are in, fill in the table
            if (--results_pending <= 0) {
                // Sort by distance (ascending)
                resources.sort(function(a, b) { return a['distance'] - b['distance']; });
                $('#MarketHelperTable').append(
                    resources.reduce(
                        function(acc, next) { return acc + next['data']; },
                        ''));

                // Add a button listener for the "Send!" buttons on each row
                $('#MarketHelperTable').find('.MarketHelperButton').click(function () {
                    var available = parseInt($('#AvailableCaravans').text());
                    if (!available) {
                        return;
                    }

                    // Decrement the available caravans
                    $('#AvailableCaravans').text('' + (available - 1));

                    // Send the caravan!
                    var query = $(this).attr('query');
                    $.ajax({
                        type: 'POST',
                        url: '/Trade/SendHarvesting',
                        async: true,
                        data: query
                    }).fail(function () {
                        alert('Failed to send caravans to ' + query);
                    });

                    // Delete the row
                    $(this).parent().parent().remove();
                });

                $('#MarketHelperSpinner').hide();
            }
        }

        // Send out all the world map data requests
        for (var sX = -SEARCH_RADIUS; sX <= SEARCH_RADIUS; sX++) {
            for (var sY = -SEARCH_RADIUS; sY <= SEARCH_RADIUS; sY++) {
                // Gather data on the surrounding tiles
                $.ajax({
                    type: 'POST',
                    url: '/World/MapData',
                    async: true,
                    data:  'x=' + (X + sX * WORLD_DATA_WIDTH)
                        + '&y=' + (Y + sY * WORLD_DATA_WIDTH)
                        + '&zoom=' + ZOOM
                        + '&dir='
                }).done(WorldMapParser)
                .fail(function () {
                    alert('Failed to fetch world map information');
                });
            }
        }
    });
}
