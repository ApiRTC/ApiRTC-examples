$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var connectedConversation = null;
    var localStream = null;
    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var ua = null;
    var userRole = null;
    var joinRequest = null;

    // User actions

    $('#moderatorLogin').on('click', function (e) {
        e.preventDefault();
        console.log('Click moderator login');
        registerAsModerator();
    });

    $('#guestLogin').on('click', function (e) {
        e.preventDefault();
        console.log('Click guest login');
        registerAsGuest();
    });

    $('#create').on('submit', function (e) {
        e.preventDefault();
        console.log('Click create conference');
        document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        createConference();
    });

    $('#join').on('submit', function (e) {
        e.preventDefault();
        console.log('Click join conference');
        var conferenceName = document.getElementById('conference-name').value;
        document.getElementById('join').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        joinConference(conferenceName);
    });

    $('#leaveConference').on('click', function (e) {
        e.preventDefault();
        console.log('Click leave conference');
        handleLeaveConference();
    });

    $('#acceptJoinRequest').on('click', function (e) {
        e.preventDefault();
        console.log('Click accept join request');
        acceptJoinRequest();
    });

    $('#declineJoinRequest').on('click', function (e) {
        e.preventDefault();
        console.log('Click decline join request');
        declineJoinRequest();
    });

    $('#contacts').on('click', 'button', function (e) {
        e.preventDefault();
        var contactId = $(this).attr('data-id');
        console.log('Click eject contact :', contactId);
        var contact = connectedConversation.getContacts()[contactId];
        if (contact !== undefined) {
            connectedConversation.eject(contact);
        }
    });

    //

    /**
     * Register user as a moderator 
     */
    function registerAsModerator(name) {

        console.log('Register as moderator');

        // Use defined login
        var login = "apizee:" + $('#login').val();
        console.log('Login :', login);

        // Create user agent
        ua = new apiRTC.UserAgent({
            uri: login
        });

        // Use defined password
        var password = document.getElementById('passwordId').value;
        console.log('Password :', password);

        var registerInformation = {};
        registerInformation.password = password;

        // Register user agent
        ua.register(registerInformation).then(function (session) {

            // Keep actual session
            connectedSession = session;
            handleNewSession();

            userRole = 'moderator';

            document.getElementById('title').innerHTML = 'You are registered as a moderator';
            document.getElementById('moderatorLoginDiv').style.display = 'none';
            document.getElementById('guestLoginDiv').style.display = 'none';
            document.getElementById('create').style.display = 'inline-block';
        }).catch(function (err) {
            console.error('User agent registration failed', err);
        });
    }

    /**
     * Register user as a guest
     */
    function registerAsGuest(name) {

        console.log('Register as guest');

        // Use defined apiKey
        var apiKey = document.getElementById('apiKey').value;
        console.log('apiKey :', apiKey);

        // Create user agent
        ua = new apiRTC.UserAgent({
            uri: 'apzkey:' + apiKey
        });

        // Register user agent
        ua.register({
            cloudUrl: cloudUrl
        }).then(function (session) {

            console.log('User registered successfully');

            // Keep actual session
            connectedSession = session;

            userRole = 'guest';

            document.getElementById('title').innerHTML = 'You are registered as a Guest';
            document.getElementById('moderatorLoginDiv').style.display = 'none';
            document.getElementById('guestLoginDiv').style.display = 'none';
            document.getElementById('join').style.display = 'inline-block';
        });
    }

    function handleNewSession() {
        connectedSession
            .on('contactListUpdate', function (updatedContacts) {
                console.log('Contact list update :', updatedContacts);
                if (userRole === 'moderator') {
                    if (connectedConversation !== null) {
                        updateContactList();
                    }
                }
            });
    }

    /**
     * Create private conversation (conference) by moderator user
     */
    function createConference() {

        console.log('Create conference');

        var enterprise = ua.getEnterprise();
        enterprise.createPrivateConference()
            .then(function (conversation) {

                console.log('Conference created successfully');

                // Keep actual conversation
                connectedConversation = conversation;

                connectedSession.on('conversationJoinRequest', function (request) {
                    console.log('New join request :', request);

                    // Keep actual request
                    joinRequest = request;
                    document.getElementById('joinRequest').style.display = 'block';
                });

                document.getElementById('title').innerHTML = 'You are in conference: ' + conversation.getName();

                handleNewConference();
            })
            .catch(function (err) {
                console.error('Create private conference error', err);
            });
    }

    /**
     * Join conference by guest user
     */
    function joinConference(name) {

        console.log('Join conference :', name);

        connectedConversation = connectedSession.getConference(name);
        connectedConversation.on('waitingForModeratorAcceptance', function (moderator) {
            document.getElementById('waitingLabel').innerHTML = 'Waiting moderator acceptance...';
        });
        handleNewConference();
    }

    function handleNewConference() {

        console.log('Manage new conference');

        // Listen streamListChanged event to have info about active streams and subscribe to the remote streams
        connectedConversation.on('streamListChanged', function (streamInfo) {
            console.log('streamListChanged :', streamInfo);
            if (streamInfo.listEventType === 'added') {
                if (streamInfo.isRemote === true) {
                    connectedConversation.subscribeToMedia(streamInfo.streamId)
                        .then(function (stream) {
                            console.log('Subscribe to media is successful');
                        }).catch(function (err) {
                            console.error('Subscribe to media error', err);
                        });
                }
            }
        });

        // Listen streamAdded event to render a new remote stream in html
        connectedConversation.on('streamAdded', function (stream) {
            console.log('Stream added :', stream);
            stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
        }).on('streamRemoved', function (stream) {
            console.log('Stream removed :', stream);
            stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
        });

        // Listen participantEjected event 
        connectedConversation.on('participantEjected', function (data) {
            if (userRole === 'guest') {
                if (data.self) {
                    console.log('User was ejected');
                    // If user was ejected handle conference leaving things
                    handleLeaveConference();
                }
            }
            else if (userRole === 'moderator') {
                if (data.contact) {
                    // Remove Eject button for the user
                    document.getElementById('eject-' + data.contact.getId()).remove();
                }
            }
        });

        // Create own local stream
        var createStreamOptions = {};
        createStreamOptions.constraints = {
            audio: true,
            video: true
        };
        ua.createStream(createStreamOptions)
            .then(function (stream) {
                console.log('Created stream :', stream);
                localStream = stream;
                stream.removeFromDiv('local-container', 'local-media');
                stream.addInDiv('local-container', 'local-media', {}, true);

                // Join conference if it's not joined and publish the local stream
                if (connectedConversation.isJoined()) {
                    console.log('Conversation already joined');
                    console.log('Publish stream :', localStream);
                    connectedConversation.publish(localStream, null);
                }
                else {
                    connectedConversation.join()
                        .then(function (response) {
                            console.log('Conversation joined');
                            document.getElementById('waitingLabel').innerHTML = '';
                            connectedConversation.publish(localStream, null);

                        }).catch(function (err) {
                            console.error('Conversation join error', err);
                            handleLeaveConference();
                        });
                }
            }).catch(function (err) {
                console.error('create stream error', err);
            });
    }

    function handleLeaveConference() {

        console.log('Leave conference');

        switch (userRole) {
            case 'moderator':
                document.getElementById('create').style.display = 'inline-block';
                document.getElementById('title').innerHTML = 'Conference demo - create & join';
                break;
            case 'guest':
                document.getElementById('join').style.display = 'inline-block';
                document.getElementById('title').innerHTML = 'Conference demo - join';
                break;
            default:
                break;
        }

        document.getElementById('conference').style.display = 'none';

        //

        if (connectedConversation !== null) {
            connectedConversation.destroy();
            connectedConversation.leave()
                .then(function () {
                    console.log('Conversation leave OK');
                    connectedConversation = null;
                }).catch(function (err) {
                    console.error('Conversation leave error', err);
                });
            $('#remote-container').empty();
        }

        if (localStream !== null) {
            localStream.release();
            localStream = null;
        }
    }

    /**
     * Accept join request by moderator user
     */
    function acceptJoinRequest() {

        console.log('Accept join request');

        joinRequest.accept()
            .then(function () {
                console.log('Join request accepted');
                document.getElementById('joinRequest').style.display = 'none';
            })
            .catch(function (err) {
                console.error('Request accept error', err);
            });
    }

    /**
     * Decline join request by moderator user
     */
    function declineJoinRequest() {

        console.log('Decline join request');

        joinRequest.decline()
            .then(function () {
                console.log('Join request was declined');
                document.getElementById('joinRequest').style.display = 'none';
            })
            .catch(function (err) {
                console.error('Request decline error', err);
            });
    }

    /**
     * Updates contact list on moderator side
     */
    function updateContactList() {
        var contactList = connectedConversation.getContacts();
        var contactsHtml = '';
        for (var contactId in contactList) {
            contactsHtml += '<button id="eject-' + contactId + '" data-id="' + contactId + '">Eject user ' + contactId + '</button>';
        }
        document.getElementById('contacts').innerHTML = contactsHtml;
    }
});
