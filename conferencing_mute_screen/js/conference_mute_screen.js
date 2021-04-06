$(function() {
    'use strict';

    apiRTC.setLogLevel(10);
    var localStream = null,
        screensharingStream = null,
        connectedConversation = null;

    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;

        //==============================
        // 1/ CREATE USER AGENT
        //==============================
        var ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
        });

        var registerInformation = {};
        registerInformation.cloudUrl = cloudUrl;

        //==============================
        // 2/ REGISTER
        //==============================
        ua.register(registerInformation).then(function(session) {
            // Save session
            connectedSession = session;

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

            ua.enableMeshRoomMode(true); //Activate Mesh room mode

            connectedConversation = connectedSession.getConversation(name);

            //==========================================================
            // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
            //==========================================================
            connectedConversation.on('streamListChanged', function(streamInfo) {

                console.log("streamListChanged :", streamInfo);

                var subscribeOptions = {
                    //audioOnly : true,
                    //videoOnly : true
                };

                if (streamInfo.listEventType === 'added') {
                    if (streamInfo.isRemote === true) {

                        connectedConversation.subscribeToMedia(streamInfo.streamId, subscribeOptions)
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
                /*
                                // Subscribed Stream is available for display
                                // Get remote media container
                                var container = document.getElementById('remote-container');
                                // Create media element
                                var mediaElement = document.createElement('video');
                                mediaElement.id = 'remote-media-' + stream.streamId;
                                mediaElement.autoplay = true;
                                mediaElement.muted = false;
                                // Add media element to media container
                                container.appendChild(mediaElement);
                                // Attach stream
                                stream.attachToElement(mediaElement);
                */
            }).on('streamRemoved', function(stream) {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
                /*
                                document.getElementById('remote-media-' + stream.streamId).remove();
                */
            });

            connectedConversation.on('error', function(errorInfo) {
                console.error("connectedConversation error streamInfo :", errorInfo.streamInfo);
                console.error("connectedConversation error errorCode :", errorInfo.errorCode);
                console.error("connectedConversation error errorInfo :", errorInfo.errorInfo);
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
                    /*
                                        // Get media container
                                        var container = document.getElementById('local-container');

                                        // Create media element
                                        var mediaElement = document.createElement('video');
                                        mediaElement.id = 'local-media';
                                        mediaElement.autoplay = true;
                                        mediaElement.muted = true;

                                        // Add media element to media container
                                        container.appendChild(mediaElement);

                                        // Attach stream
                                        localStream.attachToElement(mediaElement);
                    */

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
        document.getElementById('callActions').style.display = 'block';
        // Join conference
        joinConference(conferenceName);
    });

    //==============================
    // CALL ACTIONS
    //==============================
    //muteAudio from call
    $('#muteAudio').on('click', function() {
        console.log('MAIN - Click muteAudio');
        localStream.muteAudio();
    });
    //unMuteAudio from call
    $('#unMuteAudio').on('click', function() {
        console.log('MAIN - Click unMuteAudio');
        localStream.unmuteAudio();
    });
    //muteVideo from call
    $('#muteVideo').on('click', function() {
        console.log('MAIN - Click muteVideo');
        localStream.muteVideo();
    });
    //unMuteVideo from call
    $('#unMuteVideo').on('click', function() {
        console.log('MAIN - Click unMuteVideo');
        localStream.unmuteVideo();
    });

    //==============================
    // SCREENSHARING FEATURE
    //==============================
    $('#toggle-screensharing').on('click', function() {
        if (screensharingStream === null) {

            const displayMediaStreamConstraints = {
                video: {
                    cursor: "always"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            };

            apiRTC.Stream.createDisplayMediaStream(displayMediaStreamConstraints, false)
                .then(function(stream) {

                    stream.on('stopped', function() {
                        //Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
                        console.log("stopped event on stream");
                        var elem = document.getElementById('local-screensharing');
                        if (elem !== null) {
                            elem.remove();
                        }
                        screensharingStream = null;
                    });

                    screensharingStream = stream;
                    connectedConversation.publish(screensharingStream);
                    // Get media container
                    var container = document.getElementById('local-container');

                    // Create media element
                    var mediaElement = document.createElement('video');
                    mediaElement.id = 'local-screensharing';
                    mediaElement.autoplay = true;
                    mediaElement.muted = true;

                    // Add media element to media container
                    container.appendChild(mediaElement);

                    // Attach stream
                    screensharingStream.attachToElement(mediaElement);

                })
                .catch(function(err) {
                    console.error('Could not create screensharing stream :', err);
                });
        } else {
            connectedConversation.unpublish(screensharingStream);
            screensharingStream.release();
            screensharingStream = null;
            var elem = document.getElementById('local-screensharing');
            if (elem !== null) {
                elem.remove();
            }
        }
    });
});