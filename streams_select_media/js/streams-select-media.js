$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var localStream = null;
    var call = null;
    var contact = null;
    var selectCamera = document.getElementById("select-camera");
    var selectMic = document.getElementById("select-mic");
    var selectedAudioInputId = null;
    var selectedVideoInputId = null;

    selectCamera.onchange = function (e) {
        selectedVideoInputId = selectCamera.value;
        createStream();
    };

    selectMic.onchange = function (e) {
        selectedAudioInputId = selectMic.value;
        createStream();
    };

    function showCallArea() {
        document.getElementById('start-call').style.display = 'none';
        document.getElementById('call').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are currently in a video call';
        document.getElementById('hangup').style.display = 'inline-block';
    }

    function hideCallArea() {
        document.getElementById('start-call').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'Video call demo';
        document.getElementById('hangup').style.display = 'none';
    }

    function setCallListeners() {
        call.on("streamAdded", function (stream) {
            // Get remote media container
            var container = document.getElementById('remote-container');

            // Create media element
            var mediaElement = document.createElement('video');
            mediaElement.id = 'remote-media-' + stream.contact.getId();
            mediaElement.autoplay = true;
            mediaElement.muted = false;

            // Add media element to media container
            container.appendChild(mediaElement);

            // Attach stream
            stream.attachToElement(mediaElement);
        })
        .on('streamRemoved', function (stream) {
            // Remove media element
            document.getElementById('remote-media-' + stream.contact.getId()).remove();
        })
        .on('hangup', function () {
            // Hide call area
            hideCallArea();
            call = null;
        });
    }

    //==============================
    // CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:myDemoApiKey',
        //apiRTCMediaDeviceDetectionEnabled : true, //This option can be use on Chrome/Android or Safari as event ondevicechange is not supported on these browsers
        //apiRTCMediaDeviceDetectionDelay : 7000
    });

    //==============================
    // updateDeviceList
    //==============================

    function updateDeviceList (res) {

        console.log('updateDeviceList', (res));

        var cameras = [],
            microphones = [],
            option = null,
            selectors = [selectCamera, selectMic];

        //Cleaning selectors
        selectors.forEach(function(select) {
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
        });

        for (var i = 0; i < Object.values(res.videoinput).length; i++) {
            var v = Object.values(res.videoinput)[i];
            console.log('getCameras', v);
            option = document.createElement("option");
            option.text = v.label || 'camera ' + (cameras.length + 1);
            option.value = v.id;
            selectCamera.appendChild(option);
            cameras.push(v);
        }
        if (selectedVideoInputId !== null) {
            selectCamera.value = selectedVideoInputId;
        }

        for (var i = 0; i < Object.values(res.audioinput).length; i++) {
            var v = Object.values(res.audioinput)[i];
            console.log('getMicrophones', v);
            option = document.createElement("option");
            option.text = v.label || 'micro ' + (microphones.length + 1);
            option.value = v.id;
            selectMic.appendChild(option);
            microphones.push(v);
        }
        console.log('getDevices', cameras, microphones);

        if (selectedAudioInputId !== null) {
            selectMic.value = selectedAudioInputId;
        }
    }

    ua.on('mediaDeviceChanged', function (event) {
        //Listen for mediaDeviceChanged event to update devices list
        console.log('mediaDeviceChanged :', event);
        var res = ua.getUserMediaDevices();
        updateDeviceList (res);
    });

    //==============================
    // CREATE LOCAL STREAM
    //==============================
    var createStream = function () {
        // Release old stream if it exists
        if (localStream !== null) {
            localStream.release();
        }

        var createStreamOptions = {};
        createStreamOptions.audioInputId = selectMic.value;
        createStreamOptions.videoInputId = selectCamera.value;

/*
        createStreamOptions.constraints = {
            audio: true,
            video: {
                deviceId: selectCamera.value,
                height: { min: 240, ideal: 480, max: 480 },
                width: { ideal: 640, max: 640, min: 320},
            }
        };
*/

        let callbacks = {};
        callbacks.getStream = () => {
            return new Promise((resolve, reject) => {
                ua.createStream(createStreamOptions)
                .then(function (stream) {
                    // Save local stream
                    localStream = stream;
                    var mediaElement = document.getElementById('local-media');
                    // Get media container
                    var container = document.getElementById('local-container');
                    if (mediaElement === null) {
                        // Create media element
                        mediaElement = document.createElement('video');
                        mediaElement.id = 'local-media';
                        mediaElement.autoplay = true;
                        mediaElement.muted = true;
                        // Add media element to media container
                        container.appendChild(mediaElement);
                    }
                    document.getElementById('error-device').style.display = "none";
                    // Attach stream
                    localStream.attachToElement(mediaElement);

                    stream.on('trackStopped', function (trackInfo) {
                        console.debug('trackStopped :', trackInfo);
                    })
                    .on('stopped', function () {
                        console.debug('stream stopped');
                    });

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
            call.replacePublishedStreams(null, callbacks);
        } else {
            callbacks.getStream();
        }

    };
    //==============================
    // REGISTER
    //==============================
    ua.register({
        cloudUrl: cloudUrl
    }).then(function (session) {
        // Save session
        connectedSession = session;

        // Display user number
        document.getElementById('my-number').innerHTML = 'Your number is ' + connectedSession.id;
        createStream();
        //==============================
        // WHEN A CONTACT CALLS ME
        //==============================
        connectedSession.on('incomingCall', function (invitation) {
            if (call === null) {
                //==============================
                // ACCEPT CALL INVITATION
                //==============================
                invitation.accept(localStream)
                    .then(function (inCall) {
                        call = inCall;
                        setCallListeners();
                    });

                // Show call area
                showCallArea();
            } else {
                call.decline();
            }
        });
    }).catch(function (error) {
        // error
        console.error('User agent registration failed', error);
    });

    //==============================
    // START CALL
    //==============================
    $('#start-call').on('submit', function (e) {
        e.preventDefault();

        // Get call number
        var callNumber = document.getElementById('call-number').value;

        // Show call area
        showCallArea();

        //==============================
        // GET CONTACT
        //==============================
        contact = connectedSession.getContact(callNumber.toString());

        if (contact !== null) {
            //====================================
            // CALL CONTACT
            //====================================
            call = contact.call(localStream)
                .on('accepted', function () {
                    // Call is accepted
                })
                .on('declined', function () {
                    console.warn('User has declined your call invitation');
                });
            setCallListeners();
        }
    });

    // Click on hangup button
    $('#hangup').on('click', function () {
        // Call hangup
        call.hangUp();
        call = null;
        // Hide call area
        hideCallArea();
    });
});