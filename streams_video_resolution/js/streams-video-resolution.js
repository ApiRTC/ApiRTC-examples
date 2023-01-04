$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var localStream = null;
    var call = null;
    var contact = null;
    var selectResolution = document.getElementById("select-resolution");

    var resArray = {
        'QVGA': {
            audio: true,
            video: {
                width: {min: 320, ideal: 320, max: 640},
                height: {min: 240, ideal: 240, max: 480}
            }
        },
        'VGA': {
            audio: true,
            video: {
                width: {min: 320, ideal: 640, max: 640},
                height: {min: 240, ideal: 480, max: 480}
            }
        },
        'XGA': {
            audio: true,
            video: {
                width: {min: 320, ideal: 1024, max: 1024},
                height: {min: 240, ideal: 768, max: 768}
            }
        },
        'HD': {
            audio: true,
            video: {
                width: {min: 320, ideal: 1280, max: 1280},
                height: {min: 240, ideal: 720, max: 720}
            }
        },
        'FullHD': {
            audio: true,
            video: {
                width: {min: 320, ideal: 1920, max: 1920},
                height: {min: 240, ideal: 1080, max: 1080}
            }
        }
    };

    selectResolution.onchange = function (e) {
        createStream();
    };

    function showCallArea() {
        document.getElementById('start-call').style.display = 'none';
        document.getElementById('call').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are currently in a video call';
    }

    function hideCallArea() {
        document.getElementById('start-call').style.display = 'inline-block';
        document.getElementById('call').style.display = 'none';
        document.getElementById('title').innerHTML = 'Video call demo';
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
    var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:' + apiKey
    });

    //==============================
    // CREATE LOCAL STREAM
    //==============================
    var createStream = function () {
        // Release old stream if it exists
        if (localStream !== null) {
            localStream.release();
        }

        var createStreamOptions = {
            constraints: resArray[selectResolution.value],
            //facingMode : 'environment'
        };

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
            }).catch(function (err) {
                document.getElementById('error-device').innerHTML = 'ERROR :' + err;
                document.getElementById('error-device').style.display = "block";
                console.error('create stream error', err);
            });
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

                // Display hangup button
                document.getElementById('hangup').style.display = 'inline-block';
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
                        // Display hangup button
                        document.getElementById('hangup').style.display = 'inline-block';
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