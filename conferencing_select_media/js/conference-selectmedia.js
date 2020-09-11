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
        selectedVideoInputId = null;

    selectCamera.onchange = function (e) {
        console.error("selectCamera onchange :", e);
        createStream();
//        localStorage.setItem("videoSourceId_" + connectedSession.getId(), selectCamera.value);
    };
    selectMic.onchange = function (e) {
        console.error("selectMic onchange :", e);
        createStream();
//        localStorage.setItem("audioSourceId_" + connectedSession.getId(), selectMic.value);
    };

    function showSelectDevicesArea() {
        document.getElementById('select-device').style.display = 'inline-block';
    }
    function hideSelectDevicesArea() {
        document.getElementById('select-device').style.display = 'none';
    }

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

//        selectedVideoInputId = localStorage.getItem("videoSourceId_" + connectedSession.getId());

        for (i = 0; i < Object.values(res.videoinput).length; i++) {
            v = Object.values(res.videoinput)[i];
            console.log('getCameras', v);
            option = document.createElement("option");
            option.text = v.label || 'camera ' + (cameras.length + 1);
            option.value = v.id;
            selectCamera.appendChild(option);
            cameras.push(v);

            if (v.id === selectedVideoInputId && selectedVideoInputId !== null) {
                console.error("select caméra");
                selectCamera.value = selectedVideoInputId;
            }
        }

//       selectedAudioInputId = localStorage.getItem("audioSourceId_" + connectedSession.getId());
        for (i = 0; i < Object.values(res.audioinput).length; i++) {
            v = Object.values(res.audioinput)[i];
            console.log('getMicrophones', v);
            option = document.createElement("option");
            option.text = v.label || 'micro ' + (microphones.length + 1);
            option.value = v.id;
            selectMic.appendChild(option);
            microphones.push(v);

            if (v.id === selectedAudioInputId && selectedAudioInputId !== null) {
                console.error("select audio");
                selectMic.value = selectedAudioInputId;
            }
        }
        console.log('getDevices', cameras, microphones);

//        localStorage.setItem("videoSourceId_" + connectedSession.getId(), selectCamera.value);
//        localStorage.setItem("audioSourceId_" + connectedSession.getId(), selectMic.value);
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
            console.error('call :', call);
            localStream.release();
        }

        var createStreamOptions = {};
        createStreamOptions.audioInputId = selectMic.value;
        createStreamOptions.videoInputId = selectCamera.value;
/*
        console.debug(apiRTC.osName);

        if (apiRTC.osName === "iOS" || apiRTC.osName === "Android") {
            createStreamOptions.facingMode = 'environment';
        } else {
            createStreamOptions.videoInputId = selectCamera.value;
        }
*/

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
                    console.error('replacePublishedStream OK');
                })
                .catch(function (err) {
                    console.error('replacePublishedStream NOK');
                });
        } else {
            return callbacks.getStream();
        }
    };

    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';

        //==============================
        // CREATE USER AGENT
        //==============================
        ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
        });

//SELECT_MEDIA
        ua.on("mediaDeviceChanged", function (updatedContacts) {
            console.error("mediaDeviceChanged");
            manageMediaDevices();
        });
//SELECT_MEDIA

        manageMediaDevices();
        showSelectDevicesArea();

        //==============================
        // REGISTER
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