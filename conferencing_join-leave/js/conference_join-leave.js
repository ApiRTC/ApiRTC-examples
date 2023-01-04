$(function() {
    'use strict';

    apiRTC.setLogLevel(10);

    var connectedConversation = null;
    var localStream = null;
    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;

    //==============================
    // 1/ CREATE USER AGENT
    //==============================
    var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:' + apiKey
    });

    //==============================
    // 2/ REGISTER
    //==============================
    ua.register({
        cloudUrl: cloudUrl
    }).then(function(session) {
        // Save session
        connectedSession = session;

        //Display joinConference button when registered
        document.getElementById('create').style.display = 'inline-block';
    });

    function joinConference(name) {

        connectedSession
            .on("contactListUpdate", function(updatedContacts) { //display a list of connected users
                console.log("MAIN - contactListUpdate", updatedContacts);
                if (connectedConversation !== null) {
                    let contactList = connectedConversation.getContacts();
                    console.info("contactList  connectedConversation.getContacts() :", contactList);
                }
            });

        //==============================
        // 3/ CREATE CONVERSATION
        //==============================
        connectedConversation = connectedSession.getConversation(name);

        //==========================================================
        // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
        //==========================================================
        connectedConversation.on('streamListChanged', function(streamInfo) {

            console.log("streamListChanged :", streamInfo);

            if (streamInfo.listEventType === 'added') {
                if (streamInfo.isRemote === true) {

                    connectedConversation.subscribeToMedia(streamInfo.streamId)
                        .then(function(stream) {
                            console.log('subscribeToMedia success');
                        }).catch(function(err) {
                            console.error('subscribeToMedia error', err);
                        });
                }
            }
        });
        //=====================================================
        // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
        //=====================================================
        connectedConversation.on('streamAdded', function(stream) {
            stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
        }).on('streamRemoved', function(stream) {
            stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
        });

        //==============================
        // 5/ CREATE LOCAL STREAM
        //==============================
        var createStreamOptions = {};
        createStreamOptions.constraints = {
            audio: true,
            video: true
        };

        ua.createStream(createStreamOptions)
            .then(function(stream) {

                console.log('createStream :', stream);

                // Save local stream
                localStream = stream;
                stream.removeFromDiv('local-container', 'local-media');
                stream.addInDiv('local-container', 'local-media', {}, true);

                //==============================
                // 6/ JOIN CONVERSATION
                //==============================
                connectedConversation.join()
                    .then(function(response) {
                        //==============================
                        // 7/ PUBLISH OWN STREAM
                        //==============================
                        connectedConversation.publish(localStream);
                    }).catch(function(err) {
                        console.error('Conversation join error', err);
                    });

            }).catch(function(err) {
                console.error('create stream error', err);
            });
    }

    //==============================
    // CREATE CONFERENCE
    //==============================
    $('#create').on('submit', function(e) {
        e.preventDefault();

        // Get conference name
        var conferenceName = document.getElementById('conference-name').value;

        document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are in conference: ' + conferenceName;

        // Join conference
        joinConference(conferenceName);
    });

    // Click on leaveConference button
    $('#leaveConference').on('click', function() {
        console.log("leaveConference");

        document.getElementById('create').style.display = 'inline-block';
        document.getElementById('conference').style.display = 'none';
        document.getElementById('title').innerHTML = 'Conference demo - join / leave';

        // Leave Conversation
        if (connectedConversation !== null) {
            // Leaving actual conversation
            connectedConversation.leave()
                .then(function() {
                    console.debug('Conversation leave OK');
                    connectedConversation.destroy();
                    connectedConversation = null;
                }).catch(function(err) {
                    console.error('Conversation leave error', err);
                });
            $('#remote-container').empty();
        }

        //Release localStream
        if (localStream !== null) {
            //Releasing LocalStream
            localStream.release();
        }
    });

});