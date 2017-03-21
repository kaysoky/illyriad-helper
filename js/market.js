/**
 * This file contains the Javascript backing the `Market Helper` tab
 */

// Returns the coordinates of the active town
function GetTownCoordinates() {
    var center = $('.cityMenu.selected > div:nth-child(5) > span:first')
        .text().split(' | ');
    return [parseInt(center[0]), parseInt(center[1])];
}

// Helper that calls a (asynchronous) lambda for each town you own
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
        lambda(function () {
            if (next) {
                SwitchTown(next, TownLooper);
            } else {
                // Switch back to the original town
                SwitchTown(original, continuation);
            }
        });
    }

    SwitchTown(towns.pop(), TownLooper);
}

// Event that should fire whenever a filter is clicked
function MarketHelperFilterHandler() {
    function ToClassArray(elem, index) {
        return '.MarketHelperRow-' + $(elem).attr('value');
    }

    var filters = $('#MarketHelperBox').find('input[name=MarketFilter]');
    var shown = $.map(
        filters.filter(':checked'),
        ToClassArray).join(',');
    var hidden = $.map(
        filters.not(':checked'),
        ToClassArray).join(',');

    $('#MarketHelperTable').find(hidden).hide();
    $('#MarketHelperTable').find(shown).show();
}

// Fills in the market table with all resources nearby
// There are several continuations of this function (written sequentially)
var UnitIDMapping = {};
function MarketHelperMain() {
    $('#MarketHelperSpinner').show();

    // Clean up the table of resources
    $('#MarketHelperTable tr').not(':first').remove();

    var [X, Y] = GetTownCoordinates();

    // Holds a mapping between the Unit's name and ID
    // This is used to create the convenience buttons next to each resource
    UnitIDMapping = {};

    // Figure out the number of free gatherers
    $.ajax({
        type: 'POST',
        url: '/Trade/PopupHarvesting',
        async: true,
        data: 'SendX=' + X + '&SendY=' + Y
    }).done(function (data) {
        for (var i = 0; i < data.length; i++) {
            // Populate the UnitIDMapping for use later on in this function
            UnitIDMapping[data[i].Name] = data[i].UnitId;

            // Fill in the UI table with available gatherers
            $('#Available' + data[i].Name + 's').text(data[i].Available);
        }

        // Continue onto this helper's continuation
        DetermineTradeMovements();
    }).fail(function () {
        alert('Failed to figure out number of free gatherers');
    });
}

// Continuation of the market helper
// Loops through all your towns and determines all outgoing trade movements
var outbound = new Set();
function DetermineTradeMovements() {
    // Figure out what gatherers are currently enroute
    var time = '_=' + (new Date).getTime();
    outbound = new Set();

    ForEachTown(function (continuation) {
        $.ajax({
            type: 'POST',
            url: '/Trade/Movements?' + time,
            async: true,
            data: time
        }).done(function (data) {
            var data = $(data);

            // Parses the result of POST /Trade/Movements
            // This helper function searches for a fieldset with the given legend
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

            continuation();
        }).fail(function () {
            alert('Failed to fetch dispatched gatherers');
        });
    }, GatherResources);
}

// Continuation of the market helper
// Iterates through adjacent map squares and fills in a table of resources
function GatherResources() {
    var [X, Y] = GetTownCoordinates();

    // Determines the amount of data returned by /World/MapData
    // The result is a square of width (2 * ZOOM + 1)
    var ZOOM = parseInt($('#MarketZoomLevel').val());
    ZOOM = Math.max(0, Math.min(25, ZOOM));
    var WORLD_DATA_WIDTH = 2 * ZOOM + 1;

    // How many squares to search to the North/East/South/West of your town
    var SEARCH_RADIUS = parseInt($('#MarketSearchRadius').val());
    SEARCH_RADIUS = Math.max(0, SEARCH_RADIUS);

    // Aggregator for the parsed world data
    var resources = [];
    var results_pending = Math.pow(2 * SEARCH_RADIUS + 1, 2);

    // Helper that parse and filters each set of world map data
    function WorldMapParser(data) {
        // Helper for filtering out spots that are already occupied
        function CheckAvailability(bunch) {
            // Exclude resources that are occupied by any army
            if (data.c[bunch]) {
                return false;
            }

            // Exclude resources that are on sovereign territory
            if (data.s[bunch]) {
                return false;
            }

            // Exclude resources that are on towns
            if (data.t[bunch]) {
                return false;
            }

            // Exclude resources that are already being gathered
            if (data.n[bunch] && data.n[bunch].rd) {
                return false;
            }

            // Exclude resources that you are already sending a gatherer towards
            if (outbound.has(bunch)) {
                return false;
            }

            return true;
        }

        // Helper for parsing a data key into X, Y, and distance
        function ParseCoordinates(bunch) {
            // NOTE: The returned coordinates are in form: {Y, X}
            var coords = bunch.split('|');
            var rX = parseInt(coords[1]);
            var rY = parseInt(coords[0]);
            var distance = Math.round(
                    Math.sqrt(Math.pow(X - rX, 2) + Math.pow(Y - rY, 2))
                * 100) / 100;

            return [rX, rY, distance];
        }

        // Combine the two resource lists (caravan and non-caravan)
        var notables = data.n;
        for (var bunch in data.d) {
            if (!notables[bunch]) {
                notables[bunch] = {};
            }

            notables[bunch].flags = data.d[bunch];
        }

        for (var bunch in notables) {
            if (!CheckAvailability(bunch)) {
                continue;
            }

            var [rX, rY, distance] = ParseCoordinates(bunch);

            // Holds the resource icons and buttons to generate for this row
            var enums = [];
            var units = new Set();

            // Populate the caravan-compatible resources
            if (notables[bunch].i) {
                var type = parseInt(notables[bunch].i);
                if (type > 0 && type <= 6) {
                    enums.push(type);
                    units.add('Caravan');
                }
            }

            // Populate the cotter, miner, herbalist, or skinner resources
            if (notables[bunch].flags) {
                var flags = notables[bunch].flags.split('|');
                for (var i = 0; i < 9; i++) {
                    if (flags[i] === '0') {
                        continue;
                    }

                    // These reference the `ResourceIcons` list defined in
                    // `main.user.js`, which starts at index 7
                    enums.push(i + 7);

                    if (i <= 3 || i === 7) {
                        units.add('Cotter');
                    } else if (i === 4 || i === 8) {
                        units.add('Skinner');
                    } else if (i === 5) {
                        units.add('Herbalist');
                    } else if (i === 6) {
                        units.add('Miner');
                    }
                }
            }

            // Convert the `enums` and `units` into a table row
            resources.push({
                'distance' : distance,
                'data' : '<tr class="'
                            + enums.reduce(function (acc, next) {
                                return acc + ' MarketHelperRow-' + next;
                            }, '')
                        + '">'
                    + '<td><a href="#/World/Map/' + rX + '/' + rY + '">' + rX + '|' + rY + '</a></td>'
                    + '<td>' + distance + '</td>'
                    + '<td>'
                        + enums.reduce(function (acc, next) {
                            return acc + ResourceIcons[next];
                        }, '')
                    + '</td>'
                    + '<td>'
                        + Array.from(units).reduce(function (acc, next) {
                            var unit = UnitIDMapping[next];
                            return acc +
                                '<input class="short MarketHelperButton" '
                                    + 'type="submit" '
                                    + 'value="' + next + '" '
                                    + 'query="'
                                        + 'SendX=' + rX
                                        + '&SendY=' + rY
                                        + '&UnitId=' + unit
                                        + '&Quantity=1'
                                + '" />'
                        }, '')
                    + '</td>'
                + '</tr>'
            });
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
                // Send the caravan!
                var query = $(this).attr('query');
                $.ajax({
                    type: 'POST',
                    url: '/Trade/SendHarvesting',
                    async: true,
                    data: query
                }).fail(function () {
                    alert('Failed to send gatherers to ' + query);
                });

                // Decrement the number of available gatherers
                var selector = '#Available' + $(this).attr('value') + 's';
                $(selector).text(parseInt($(selector).text()) - 1);

                // Delete the row
                $(this).parent().parent().remove();
            });

            // Apply the resource filter
            MarketHelperFilterHandler();

            // And hide the spinner
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
}
