$(function() {
    'use strict';

    apiRTC.setLogLevel(10);
    var ua = null;
    var publishedStream = null; 
    var connectedConversation = null;

    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;

        //==============================
        // 1/ CREATE USER AGENT
        //==============================
        var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

        ua = new apiRTC.UserAgent({
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

            connectedSession
                .on("contactListUpdate", function (updatedContacts) { //display a list of connected users
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
                            .then(function (stream) {
                                console.log('subscribeToMedia success');
                            }).catch(function (err) {
                                console.error('subscribeToMedia error', err);
                            });
                    }
                }
            });

            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED FROM THE CONVERSATION
            //=====================================================
            connectedConversation.on('streamAdded', function(stream) {
                stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
            }).on('streamRemoved', function(stream) {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
            });

            //==============================
            // 5/ JOIN CONVERSATION
            //==============================
            connectedConversation.join()
                .then(function(response) {
                    console.debug('Conversation is joined');

                    //Display publish buttons
                    document.getElementById('callActions').style.display = 'block';
                }).catch(function (err) {
                    console.error('Conversation join error', err);
                });
        });
    };

    function createStreamAndPublish(type) {

        var createStreamOptions = {};

        createStreamOptions.constraints = {
            audio: true,
            video: true
        };
        if (type === 'audio') {
            createStreamOptions.constraints.video = false;
        }

        ua.createStream(createStreamOptions)
            .then(function (stream) {

                console.log('createStream :', stream);
                let call = null;

                if (publishedStream !== null) {
                    call = connectedConversation.getConversationCall(publishedStream);
                    console.debug('call :', call);
                }

                if (call !== null) {

                    let callbacks = {};
                    callbacks.getStream = () => {
                        return new Promise((resolve, reject) => {
                             return resolve(stream);
                        });
                    };

                    //==============================
                    // 7/ REPLACE STREAM IF THERE IS A PUBLISH
                    //==============================
                    //Replace stream if call is ongoing
                    call.replacePublishedStream(null, callbacks)
                        .then(function (stream) {
                            console.debug('replacePublishedStream OK');
                        })
                        .catch(function (err) {
                            console.error('replacePublishedStream NOK');
                        });
                } else {
                    //==============================
                    // 7/ PUBLISH OWN STREAM
                    //==============================
                    connectedConversation.publish(stream, null);
                }

                if(publishedStream){
                    publishedStream.release();
                }
                publishedStream = stream;

                stream.removeFromDiv('local-container', 'local-media');
                stream.addInDiv('local-container', 'local-media', {}, true);

            }).catch(function (err) {
                console.error('create stream error', err);
            });
    };

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

    //==============================
    // CALL ACTIONS
    //==============================
    //publish audio only
    $('#pubAudio').on('click', function () {
        console.log('MAIN - Click pubAudio');
        createStreamAndPublish('audio');
    });
    //publish audio and video
    $('#pubAudioAndVideo').on('click', function () {
        console.log('MAIN - Click pubAudioAndVideo');
        createStreamAndPublish('video');
    });
    //unPublish
    $('#unPublish').on('click', function () {
        console.log('MAIN - Click unPublish');

        connectedConversation.unpublish(publishedStream, null);
        
        if(publishedStream){
            publishedStream.removeFromDiv('local-container', 'local-media');
            publishedStream.release();
            publishedStream = null;
        }
    });
    //leave conversation
    $('#leave').on('click', function () {
        console.log('MAIN - Click leave');

        console.log("leaveConference");

        document.getElementById('create').style.display = 'inline-block';
        document.getElementById('conference').style.display = 'none';
        document.getElementById('title').innerHTML = 'Conference demo - join / leave';
        document.getElementById('callActions').style.display = 'none';

        //Leave Conversation
        if (connectedConversation !== null) {
            //Leaving actual conversation

            connectedConversation.destroy();
            connectedConversation.leave()
                .then(function() {
                    console.debug('Conversation leave OK');
                }).catch(function (err) {
                    console.error('Conversation leave error', err);
                });
            connectedConversation = null;
            $('#remote-container').empty();
        }

        //Release localStream
        if (publishedStream !== null) {
            //Releasing publishedStream
            publishedStream.release();
        }

        //Unregister
        ua.unregister();
        ua = null;
    });
});

