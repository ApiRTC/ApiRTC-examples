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
                .on("contactListUpdate", function(updatedContacts) {
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

                var subscribeOptions = {};

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

                // Create a wrapper div to hold the video and the snapshot button overlay
                var wrapper = document.createElement('div');
                wrapper.id = 'wrapper-' + stream.streamId;
                wrapper.className = 'remote-stream-wrapper';

                // Create video element
                var mediaElement = document.createElement('video');
                mediaElement.id = 'remote-media-' + stream.streamId;
                mediaElement.autoplay = true;
                mediaElement.muted = false;

                // Helper : take snapshot and display result in timeline
                function takeAndDisplaySnapshot(snapshotOptions) {
                    console.log('Take snapshot on remote stream:', stream.streamId, snapshotOptions);

                    stream.takeSnapshot(snapshotOptions)
                        .then(function(snapshot) {
                            console.log('takeSnapshot OK :', snapshot);

                            var timeline = document.getElementById('snapshots-timeline');
                            var imgWrapper = document.createElement('div');
                            imgWrapper.className = 'snapshot-item';

                            var img = document.createElement('img');
                            img.title = 'Snapshot from stream ' + stream.streamId;

                            var label = document.createElement('p');
                            label.textContent = 'Stream ' + stream.streamId;

                            var resolution = document.createElement('p');
                            resolution.className = 'snapshot-resolution';

                            img.onload = function() {
                                resolution.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' px';
                            };
                            img.src = snapshot;

                            imgWrapper.appendChild(img);
                            imgWrapper.appendChild(label);
                            imgWrapper.appendChild(resolution);
                            timeline.insertBefore(imgWrapper, timeline.firstChild);
                        }).catch(function(error) {
                            console.error('takeSnapshot error :', error);
                        });
                }

                var cameraIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

                // Full resolution snapshot button (camera icon only)
                var snapshotBtn = document.createElement('button');
                snapshotBtn.id = 'snapshot-btn-' + stream.streamId;
                snapshotBtn.className = 'snapshot-btn @snapshot-btn--highres';
                snapshotBtn.title = 'Take snapshot at highest resolution';
                snapshotBtn.innerHTML = cameraIconSvg + '<span>Highest Res</span>';

                // Low resolution snapshot button (camera icon + label)
                var snapshotLowResBtn = document.createElement('button');
                snapshotLowResBtn.id = 'snapshot-lowres-btn-' + stream.streamId;
                snapshotLowResBtn.className = 'snapshot-btn snapshot-btn--lowres';
                snapshotLowResBtn.title = 'Take snapshot at current resolution';
                snapshotLowResBtn.innerHTML = cameraIconSvg + '<span>Low Res</span>';

                // Add elements to wrapper
                wrapper.appendChild(mediaElement);
                wrapper.appendChild(snapshotBtn);
                wrapper.appendChild(snapshotLowResBtn);

                // Add wrapper to remote container
                document.getElementById('remote-container').appendChild(wrapper);

                // Attach stream to video element
                stream.attachToElement(mediaElement);

                //==============================
                // SNAPSHOT BUTTONS CLICK HANDLERS
                //==============================
                snapshotBtn.addEventListener('click', function() {
                    takeAndDisplaySnapshot({ applyRemotely: true, fullResolution: true });
                });

                snapshotLowResBtn.addEventListener('click', function() {
                    takeAndDisplaySnapshot({ applyRemotely: true });
                });

            }).on('streamRemoved', function(stream) {
                var wrapper = document.getElementById('wrapper-' + stream.streamId);
                if (wrapper) {
                    wrapper.remove();
                }
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
    $('#muteAudio').on('click', function() {
        console.log('MAIN - Click muteAudio');
        localStream.disableAudio();
    });
    $('#unMuteAudio').on('click', function() {
        console.log('MAIN - Click unMuteAudio');
        localStream.enableAudio();
    });
    $('#muteVideo').on('click', function() {
        console.log('MAIN - Click muteVideo');
        localStream.disableVideo();
    });
    $('#unMuteVideo').on('click', function() {
        console.log('MAIN - Click unMuteVideo');
        localStream.enableVideo();
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
                        console.log("stopped event on stream");
                        var elem = document.getElementById('local-screensharing');
                        if (elem !== null) {
                            elem.remove();
                        }
                        screensharingStream = null;
                    });

                    screensharingStream = stream;
                    connectedConversation.publish(screensharingStream);

                    var container = document.getElementById('local-container');
                    var mediaElement = document.createElement('video');
                    mediaElement.id = 'local-screensharing';
                    mediaElement.autoplay = true;
                    mediaElement.muted = true;
                    container.appendChild(mediaElement);
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
