$(function() {
    'use strict';

    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var activeContact = null;
    var activeChats = {};

    function showChatBox() {
        document.getElementById('chat').style.display = 'block';
    }

    //Wrapper to send a message to a contact and display sent message in UI
    function sendMessageToActiveContact(message) {
        if (message !== '') {
            $('#typing-area').val('');
            var messageLine = '<li><b>Me</b> : ' + message + '</li>';
            $('#message-list').append(messageLine);
            activeChats[activeContact.getId()].push(messageLine); //save message

            //Actually send message to active contact
            activeContact.sendMessage(message)
                .then(function() {
                    //Message successfully sent!
                })
                .catch(function(err) {
                    //An error occured...
                    $('#message-list').append('<li><i>* Could not send message to contact : "' + message + '", ' + err.error.message +  ' *</i></li>');
                });
        }
    }

    //Select active contact for chatbox UI
    function setActiveContact(contactId) {
        if (activeContact === null) {
            // Show chatbox
            showChatBox();
        }
        //==============================
        // GET CONTACT OBJECT
        //==============================
        activeContact = connectedSession.getContact(contactId);
        //Restore previous chat messsages
        $('#message-list').empty();
        for (var i = 0; i < activeChats[activeContact.getId()].length; i++) {
            $('#message-list').append(activeChats[activeContact.getId()][i]);
        }
        document.getElementById('active-contact-id').innerHTML = activeContact.getId();
    }

    //Initialize chat history for contact if needed
    function addContactToActiveChats(contactId) {
        if (!activeChats.hasOwnProperty(contactId)) {
            activeChats[contactId] = [];
            var contactLabel = $('<li />', {
                text: contactId,
                class: 'active-chat'
            });
            contactLabel.on('click', function(e) {
                setActiveContact(contactId);
            });
            $('#active-chats').append(contactLabel);
        }
    }

    //==============================
    // CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
        uri: 'apzkey:myDemoApiKey'
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

        //==============================
        // WHEN CHAT MESSAGE IS  RECEIVED
        //==============================

        //Listen to contact message events globally
        connectedSession.on('contactMessage', function(e) {
            //Save contact to contact list
            addContactToActiveChats(e.sender.getId());
            if (activeContact === null) {
                setActiveContact(e.sender.getId());
            }
            var messageLine = '<li><b>' + e.sender.getId() + '</b> : ' + e.content + '</li>';
            activeChats[e.sender.getId()].push(messageLine); //save message
            //Display message in UI
            if (e.sender === activeContact) {
                $('#message-list').append(messageLine);
            }
        });

    }).catch(function(error) {
        // error
        console.error('User agent registering failed', error);
    });

    //==============================
    // START CHAT
    //==============================
    $('#start-chat').on('click', function(e) {
        // Get contact from it's id
        var contactId = document.getElementById('contact-id').value;
        if (contactId !== '') {
            addContactToActiveChats(contactId.toString());
            setActiveContact(contactId);
        }
    });
    $('#contact-id').keypress(function (e) {
        if (e.which == 13) {
            // Get contact from it's id
            var contactId = document.getElementById('contact-id').value;
            if (contactId !== '') {
                addContactToActiveChats(contactId.toString());
                setActiveContact(contactId);
            }
            return false;
        }
    });

    //==============================
    // SEND CHAT MESSAGE TO ACTIVE CONTACT
    //==============================
    $('#send-message').on('click', function() {
        sendMessageToActiveContact($('#typing-area').val().toString());
    });
    $('#typing-area').keypress(function (e) {
        if (e.which == 13) {
            sendMessageToActiveContact($('#typing-area').val().toString());
            return false;
        }
    });
});