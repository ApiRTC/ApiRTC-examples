$(function() {
    'use strict';

    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var activeConversation = null;

    function showChatBox() {
        document.getElementById('chat').style.display = 'block';
        document.getElementById('conversation-selector').style.display = 'none';
    }

    //Wrapper to send a message to everyone in the conversation and display sent message in UI
    function sendMessageToActiveConversation(message) {
        if (message !== '') {
            $('#typing-area').val('');
            $('#message-list').append('<li><b>Me</b> : ' + message + '</li>');

            //Actually send message to active contact
            activeConversation.sendMessage(message);
        }
    }

    function joinConversation (name) {
        if (name !== '') {
            activeConversation = connectedSession.getConversation(name);

            //Listen to incoming messages from conversation
            activeConversation.on('message', function(e) {
                $('#message-list').append('<li><b>' + e.sender.getId() + '</b> : ' + e.content + '</li>');
            });
            //Listen for any participants entering or leaving the conversation
            activeConversation.on('contactJoined', function(contact) {
                console.log("Contact that has joined :", contact);
                renderUserList();
            })
            .on('contactLeft', function(contact) {
                console.log("Contact that has left :", contact);
                renderUserList();
            });

            activeConversation.join()
                .then(function() {
                    //Conversation was successfully joined
                    document.getElementById('active-conversation-name').innerHTML = activeConversation.getName();
                    showChatBox();
                    renderUserList();
                })
                .catch(function(err) {
                    //Woops! User agent was not able to join conversation
                });
        }
    }

    function renderUserList () {
        var contacts = activeConversation.getContacts();
        $('#active-users').empty();
        $('#active-users').append('<li><b>Active users</b></li>');
        var keys = Object.keys(contacts);
        for (var i = 0; i < keys.length; i++) {
            $('#active-users').append('<li>' + contacts[keys[i]].getId() + '</li>');
        }
    }

    //==============================
    // CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:myDemoApiKey'
    });

    //==============================
    // REGISTER
    //==============================
    ua.register({
        cloudUrl: cloudUrl
    }).then(function(session) {
        // Save session
        connectedSession = session;

        // Display user number
        document.getElementById('my-number').innerHTML = connectedSession.getId();

    }).catch(function(error) {
        // error
        console.error('User agent registering failed', error);
    });

    //==============================
    // START CHAT
    //==============================
    $('#start-chat').on('click', function(e) {
        // Join conversation from its name
        joinConversation(document.getElementById('conversation-name').value);
    });
    $('#conversation-name').keypress(function (e) {
        if (e.which == 13) {
            // Join conversation from its name
            joinConversation(document.getElementById('conversation-name').value);
            return false;
        }
    });

    //==============================
    // SEND CHAT MESSAGE TO ACTIVE CONVERSATION
    //==============================
    $('#send-message').on('click', function() {
        sendMessageToActiveConversation($('#typing-area').val().toString());
    });
    $('#typing-area').keypress(function (e) {
        if (e.which == 13) {
            sendMessageToActiveConversation($('#typing-area').val().toString());
            return false;
        }
    });
});