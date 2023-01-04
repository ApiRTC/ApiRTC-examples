$(function() {
    'use strict';

    apiRTC.setLogLevel(10);

    var ua = null,
        localStream = null,
        call = null,
        connectedConversation = null,
        connectedSession = null,
        selectCamera = document.getElementById("select-camera"),
        selectMic = document.getElementById("select-mic"),
        selectedAudioInputId = null,
        selectedVideoInputId = null,
//RTMP_STREAMING
        startStreaming = document.getElementById('startStreaming'),
        stopStreaming = document.getElementById('stopStreaming'),
        streamingService = document.getElementById('streamingService'),
        streamingServer = document.getElementById('streamingServer'),
        streamingStreamKey = document.getElementById('streamingStreamKey'),
        streamStatus = document.getElementById('stream-status'),
        conversationCall = null;
//RTMP_STREAMING END

    selectCamera.onchange = function (e) {
        console.debug("selectCamera onchange :", e);
        createStream();
    };
    selectMic.onchange = function (e) {
        console.debug("selectMic onchange :", e);
        createStream();
    };

    function showSelectDevicesArea() {
        document.getElementById('select-device').style.display = 'inline-block';
    }

//RTMP_STREAMING
    streamingStreamKey.onkeyup = checkPrivateKey;
    streamingStreamKey.onpaste = checkPrivateKey;

    startStreaming.onclick = function(e){
        connectedConversation.conversationCalls.forEach((conversationCallFound) => {
            if(conversationCallFound.callId === connectedConversation.getCallId(localStream)){
                conversationCall = conversationCallFound;
                let options = {
                    "service": streamingService.value, 
                    "server": streamingServer.value, 
                    "streamKey": streamingStreamKey.value
                }
                conversationCall.startStreaming(options);
                streamStatus.innerHTML = "Starting...";
                disableStartStreaming();
            }
        });
    }

    stopStreaming.onclick = function(e){
        conversationCall.stopStreaming();
        streamStatus.innerHTML = "Stopping...";
        disableStopStreaming();
    }

    apiRTC.addEventListener('MCUStreamingStarted', MCUStreamingStartedHandler);
    apiRTC.addEventListener('MCUStreamingStopped', MCUStreamingStoppedHandler);

    function MCUStreamingStartedHandler(e) {
        streamStatus.innerHTML = "Started";
        enableStopStreaming();
    }

    function MCUStreamingStoppedHandler(e) {
        streamStatus.innerHTML = "Stopped";
        enableStartStreaming();
    }

    function checkPrivateKey() {
        if(streamingStreamKey.value === ""){
            disableStartStreaming();
        }else{
            enableStartStreaming();
        }
    }
    function showSelectRTMPConfig() {
        document.getElementById('rtmp-config').style.display = 'block';
    }

    function enableStartStreaming() {
        startStreaming.disabled = false;
    }

    function disableStartStreaming() {
        startStreaming.disabled = true;
    }

    function enableStopStreaming() {
        stopStreaming.disabled = false;
    }

    function disableStopStreaming() {
        stopStreaming.disabled = true;
    }
//RTMP_STREAMING END

    function updateDeviceList(res) {

        console.log("updateDeviceList");

        var cameras = [],
            microphones = [],
            option = null,
            selectors = [selectCamera, selectMic],
            i = 0,
            v = 0;

        //Cleaning selectors
        selectors.forEach(function (select) {
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
        });

        for (i = 0; i < Object.values(res.videoinput).length; i++) {
            v = Object.values(res.videoinput)[i];
            console.log('getCameras', v);
            option = document.createElement("option");
            option.text = v.label || 'camera ' + (cameras.length + 1);
            option.value = v.id;
            selectCamera.appendChild(option);
            cameras.push(v);

            if (v.id === selectedVideoInputId && selectedVideoInputId !== null) {
                selectCamera.value = selectedVideoInputId;
            }
        }

        for (i = 0; i < Object.values(res.audioinput).length; i++) {
            v = Object.values(res.audioinput)[i];
            console.log('getMicrophones', v);
            option = document.createElement("option");
            option.text = v.label || 'micro ' + (microphones.length + 1);
            option.value = v.id;
            selectMic.appendChild(option);
            microphones.push(v);

            if (v.id === selectedAudioInputId && selectedAudioInputId !== null) {
                selectMic.value = selectedAudioInputId;
            }
        }
        console.log('getDevices', cameras, microphones);
    }

    function manageMediaDevices() {

        console.log("manageMediaDevices");
        var mediaDevices = ua.getUserMediaDevices();
        console.log("manageMediaDevices :", mediaDevices);
        updateDeviceList(mediaDevices);
    }
//SELECT_MEDIA

    //==============================
    // CREATE LOCAL STREAM
    //==============================
    var createStream = function () {
        // Release old stream if it exists

        if (localStream !== null) {
            call = connectedConversation.getConversationCall(localStream);
            localStream.release();
        }

        var createStreamOptions = {};
        createStreamOptions.audioInputId = selectMic.value;
        createStreamOptions.videoInputId = selectCamera.value;

        let callbacks = {};
        callbacks.getStream = () => {
            return new Promise((resolve, reject) => {
                ua.createStream(createStreamOptions)
                .then(function (stream) {
                    // Save local stream
                    localStream = stream;
                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {}, true);
                    return resolve(stream);
                })
                .catch(function (err) {
                    console.error('create stream error', err);
                    document.getElementById('error-device').innerHTML = 'ERROR :' + err.error.message;
                    document.getElementById('error-device').style.display = "block";
                    reject()
                });
            });
        };

        if (call !== null) {
            //Switch the camera if call is ongoing
            return call.replacePublishedStream(null, callbacks)
                .then(function (stream) {
                    console.debug('replacePublishedStream OK');
                })
                .catch(function (err) {
                    console.error('replacePublishedStream NOK');
                });
        } else {
            return callbacks.getStream();
        }
    };

    function showButtons(bool){
        if(bool){
            document.getElementById('modelButtons').style.display = "block";
        }else{
            document.getElementById('modelButtons').style.display = "none";
        }
    }

    function showActivatedAnnotationsButtons(bool){
        if(bool){
            activatedAnnotationsButtons.style.display = "block";
        }else{
            activatedAnnotationsButtons.style.display = "none";
        }
    }
    
    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';

        //==============================
        // CREATE USER AGENT
        //==============================
        var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)
        
        var ua = new apiRTC.UserAgent({
            uri: 'apiKey:' + apiKey
        });

//SELECT_MEDIA
        ua.on("mediaDeviceChanged", function (updatedContacts) {
            console.debug("mediaDeviceChanged");
            manageMediaDevices();
        });
//SELECT_MEDIA

        manageMediaDevices();
        showSelectDevicesArea();
        showSelectRTMPConfig();

        //==============================
        // REGISTER
        //==============================
        ua.register({
            cloudUrl: cloudUrl,
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
            // CREATE CONVERSATION
            //==============================
            connectedConversation = connectedSession.getConversation(name);

            //==========================================================
            // ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
            //==========================================================
            connectedConversation.on('streamListChanged', function(streamInfo) {

                console.log("streamListChanged :", streamInfo);

                if (streamInfo.listEventType === 'added') {
                    if (streamInfo.isRemote === true) {

                        connectedConversation.subscribeToMedia(streamInfo.streamId)
                            .then(function () {
                                console.log('subscribeToMedia success');
                            }).catch(function (err) {
                                console.error('subscribeToMedia error', err);
                            });
                    }
                }
            });

            //=====================================================
            // BIS/ ADD EVENT LISTENER : WHEN STREAM WAS REMOVED FROM THE CONVERSATION
            //=====================================================
            connectedConversation
                .on('streamAdded', function(stream) {
                    console.log('connectedConversation streamAdded');
                    stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
                }).on('streamRemoved', function(stream) {
                    console.log('connectedConversation streamRemoved');
                    stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
                });

            //==============================
            // CREATE LOCAL STREAM & JOIN CONVERSATION
            //==============================
            var createStreamOptions = {};
            createStreamOptions.constraints = {
                audio: true,
                video: true
            };
            createStream()
                .then(function (stream) {
                    console.log('createStream return OK');

                    connectedConversation.join()
                    .then(function(response) {

                        var options = {};
                        //options.qos.videoForbidInactive = true;
                        //options.qos.videoMinQuality = 'medium';

                        connectedConversation.publish(stream, options);
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
    });
});