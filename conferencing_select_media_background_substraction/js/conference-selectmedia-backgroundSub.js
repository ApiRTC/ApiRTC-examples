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
//BACKGROUND_SUBSTRACTION
        checkboxbackgroundSub = document.getElementById("backgroundSub"),
        selectResolution = document.getElementById("select-resolution"),
//BACKGROUND_SUBSTRACTION
        selectedAudioInputId = null,
        selectedVideoInputId = null,
        resArray = {
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

//BACKGROUND_SUBSTRACTION IMAGE
    var imageData = null;

    const image = new Image();
    //image.src = './img/background_apiRTC.jpg';
    image.src = './img/background_apiRTC_2.jpg';

    image.onload = () => {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0 );
        imageData = context.getImageData(0, 0, 640, 480);
        console.debug("image is loaded");
    };
//BACKGROUND_SUBSTRACTION IMAGE

    selectCamera.onchange = function (e) {
        console.debug("selectCamera onchange :", e);
        createStream();
    };
    selectMic.onchange = function (e) {
        console.debug("selectMic onchange :", e);
        createStream();
    };
//BACKGROUND_SUBSTRACTION
    checkboxbackgroundSub.onchange = function (e) {
        console.debug("checkboxbackgroundSub onchange :", e);
        createStream();
    };
    selectResolution.onchange = function (e) {
        console.debug("selectResolution onchange :", e);
        createStream();
    };
//BACKGROUND_SUBSTRACTION

    function showSelectDevicesArea() {
        document.getElementById('select-device').style.display = 'inline-block';
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

        createStreamOptions.constraints = resArray[selectResolution.value];
//BACKGROUND_SUBSTRACTION
        console.debug("checkboxbackgroundSub.value:", checkboxbackgroundSub.value);
        switch (checkboxbackgroundSub.value) {
            case 'nofilter':
              break;
            case 'blur':
                createStreamOptions.filters = [
                    { type: 'backgroundSubtraction', options: { backgroundMode: 'blur' } },
                ];
              break;
            case 'transparent':
                createStreamOptions.filters = [
                    { type: 'backgroundSubtraction', options: { backgroundMode: 'transparent' } },
                ];
                break;
            case 'image':
                createStreamOptions.filters = [
                    { type: 'backgroundSubtraction', options: { backgroundMode: 'image', image: imageData } },
                ];
                break;
            default:
                console.log(`Sorry, not a good filter value`);
        }
//BACKGROUND_SUBSTRACTION

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
            console.debug("mediaDeviceChanged");
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