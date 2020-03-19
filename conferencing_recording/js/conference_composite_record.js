let $1 = $(function() {
    'use strict';

    apiRTC.setLogLevel(10);
    var connectedConversation = null;

    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;
        var localStream = null;

        //==============================
        // 1/ CREATE USER AGENT
        //==============================

        var ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
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
            // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM WAS REMOVED FROM THE CONVERSATION
            //=====================================================

            connectedConversation.on('streamAdded', function(stream) {
                stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
            }).on('streamRemoved', function(stream) {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);

            }).on('recordingAvailable', function(recordingInfo) {
                console.log('recordingInfo :', recordingInfo);
                console.log('recordingInfo.mediaURL :', recordingInfo.mediaURL);
                $("#"+ recordingInfo.mediaId).replaceWith('<li id=' + recordingInfo.mediaId + '>Your recording is available <a target="_blank" href=' + recordingInfo.mediaURL + '> here </a></li>');  //CLICKABLE RECORDING LINK//
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
                .then(function (stream) {

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
                            connectedConversation.publish(localStream, null);
                        }).catch(function (err) {
                        console.error('Conversation join error', err);
                    });

                }).catch(function (err) {
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
        // Join conference
        joinConference(conferenceName);

        document.getElementById('recordStart').style.display = 'inline-block';
    });

    //====================================
    // 8/ ADD COMPOSITE RECORDING BUTTONS
    //====================================

    // START COMPOSITE RECORDING //
    $('#startCompositeRecording').on('click', function(e) {

        console.log("startCompositeRecording");

        connectedConversation.startRecording()
            .then(function (recordingInfo) {
                console.info('startRecording', recordingInfo);
                console.info('startRecording mediaURL', recordingInfo.mediaURL);
                $("#recordingInfo").append('<li id=' + recordingInfo.mediaId + '>When ready, your recording will be available <a target="_blank" href=' + recordingInfo.mediaURL + '> here </a></li>');  //CLICKABLE RECORDING LINK//
                document.getElementById('recordStart').style.display = 'none';
                document.getElementById('recordStop').style.display = 'inline-block';
            })
            .catch(function (err) {
                console.error('startRecording', err);
            });
    });

    // STOP COMPOSITE RECORDING //
    $('#stopCompositeRecording').on('click', function(e) {

        console.log("stopCompositeRecording");

        connectedConversation.stopRecording()
            .then(function (recordingInfo) {
                    console.info('stopRecording', recordingInfo);
                    document.getElementById('recordStart').style.display = 'inline-block';
                    document.getElementById('recordStop').style.display = 'none';
                })
                .catch(function (err) {
                    console.error('stopRecording', err);
                });
    });
});