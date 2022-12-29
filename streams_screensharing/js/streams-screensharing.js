$(function() {
    'use strict';
    apiRTC.setLogLevel(10);
    var screensharingStream = null;
    var connectedConversation = null;

    /**
     * Create and join a new conference
     * @author Apizee
     *
     * @param {string} name - Conference name
     * @return void
     */
    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;

        var localStream = null;
        var subscribedStreams = {};

        //==============================
        // CREATE USER AGENT
        //==============================
        var apiKey = '#INSERT_YOUR_API_KEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

        var ua = new apiRTC.UserAgent({
           uri: 'apiKey:' + apiKey
        });
        //==============================
        // REGISTER
        //==============================
        ua.register({
            cloudUrl: cloudUrl
        }).then(function(session) {
            // Save session
            connectedSession = session;

            //==============================
            // CREATE CONVERSATION
            //==============================
            connectedConversation = connectedSession.getConversation(name);

            //==============================
            // JOIN CONVERSATION
            //==============================
            connectedConversation.join()
                .then(function(response) {

                    //==============================
                    // CREATE LOCAL STREAM
                    //==============================
                    ua.createStream()
                        .then(function(stream) {
                            // Save local stream
                            localStream = stream;

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

                            //==============================
                            // PUBLISH OWN STREAM
                            //==============================
                            connectedConversation.publish(localStream);

                        }).catch(function(err) {
                            console.error('create stream error', err);
                        });

                    //==========================================================
                    // WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
                    //==========================================================
                    connectedConversation.on('availableStreamsUpdated', function(streams) {
                        var keys = Object.keys(streams);

                        for (var i = 0, len = keys.length; i < len; i++) {
                            if (typeof subscribedStreams[keys[i]] === 'undefined') {
                                //==============================
                                // SUBSCRIBE TO STREAM
                                //==============================
                                subscribedStreams[keys[i]] = streams[keys[i]];
                                connectedConversation.subscribeToMedia(keys[i]);
                            }
                        }
                    });

                    //==========================================================
                    // WHEN NEW STREAM IS ADDED TO CONVERSATION
                    //==========================================================
                    connectedConversation.on('streamAdded', function(stream) {
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
                    });

                });

            //=====================================================
            // WHEN STREAM WAS REMOVED FROM THE CONVERSATION
            //=====================================================
            connectedConversation.on('streamRemoved', function(streamInfos) {
                document.getElementById('remote-media-' + streamInfos.streamId).remove();
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

        // Join conference
        joinConference(conferenceName);
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