/**
 * This file contains the Javascript backing the `Mail` background helper
 */

// Subject texts of messages that provide no real value to the player
var BANAL_SUBJECTS = [
    'Caravans begin gathering at square',
    'Your caravans are returning from square'
];

// An odd part of the URL used to page through messages
var MAIL_PAGER = '/1/-1/1/1/';

// How often to make a pass at cleaning up messages
var MAIL_HELPER_PERIOD = 30000; // Milliseconds

// A periodic function that goes through the player's in-game inbox
// and deletes messages that have no real value
function MailHelperMain(page = 1) {
    var time = '_=' + (new Date).getTime();

    // Fetch and parse the inbox of "Trade" messages
    $.ajax({
        type: 'POST',
        url: 'Communication/Mail/2' + (page > 1 ? MAIL_PAGER + page : '') + '?' + time,
        async: true,
        data: time
    }).done(function (data) {
        var isLastPage = parseInt($(data)
            .find('div[name=TopPagination]')
            .find('table')
            .filter(':last')
            .find('b').text()) === page;

        var messages = $(data)
            .find('#messages').find('tr')

            // Filter out all messages that don't originate from the 'System'
            .filter(function () {
                return $(this).find('td:nth-child(3)').text() !== 'System';

            // Filter out any messages that don't contain the BANAL_SUBJECTS
            }).filter(function () {
                var i = BANAL_SUBJECTS.length;
                var text = $(this).find('td:nth-child(4)').text();
                while (i--) {
                    if (text.indexOf(BANAL_SUBJECTS[i]) !== -1) {
                        return true;
                    }
                }
                return false;

            // Retrieve the message ID from the remaining messages
            }).map(function () {
                return $(this).find('td:nth-child(2) > input').attr('data');
            }).get();

        // Delete all those banal messages
        if (messages.length > 0) {
            $.ajax({
                type: 'POST',
                url: '/Communication/AlterMail',
                async: true,
                data: 'MsgActionTypeID=1'
                    + '&MsgIDs=' + messages.join('|')
                    + '&MsgTypeID=1'
            }).done(function () {
                // Repeat this cleanup every few seconds
                setTimeout(MailHelperMain, MAIL_HELPER_PERIOD);
            });
        } else {
            if (isLastPage) {
                setTimeout(MailHelperMain, MAIL_HELPER_PERIOD);
            } else {
                // In case there are too many interesting messages on this page
                MailHelperMain(page + 1);
            }
        }
    });
}
