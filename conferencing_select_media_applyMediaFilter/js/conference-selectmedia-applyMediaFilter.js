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
        checkboxbackgroundSub = document.getElementById("backgroundSub"),
        checkboxnoiseRed = document.getElementById("noiseRed"),
        selectedAudioInputId = null,
        selectedVideoInputId = null;

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
        videoFilterProcess();
    };

    function videoFilterProcess() {
        console.error("videoFilterProcess");
        console.error("checkboxbackgroundSub.value:", checkboxbackgroundSub.value);

        let imgUrl = '';

        console.debug("checkboxbackgroundSub.value:", checkboxbackgroundSub.value);
        switch (checkboxbackgroundSub.value) {
            case 'nofilter':
                console.error("noiseReductionprocess nofilter");
                applyVideoFilter('none');
                break;
            case 'blur':
                console.error("noiseReductionprocess nofilter");
                applyVideoFilter('blur');
                break;
            case 'image_beach':
                imgUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e';
                var videoProcessorOptions = {
                    backgroundImageUrl : imgUrl,
                }
                applyVideoFilter('backgroundImage', videoProcessorOptions);
                break;
            case 'image_granite':
                imgUrl = 'https://images.unsplash.com/photo-1559131463-f9386f12e2db';
                var videoProcessorOptions = {
                    backgroundImageUrl : imgUrl,
                }
                applyVideoFilter('backgroundImage', videoProcessorOptions);
                break;
            case 'apiRTC_granite':
                imgUrl = './img/background_apiRTC_2.jpg';
                var videoProcessorOptions = {
                    backgroundImageUrl : imgUrl,
                }
                applyVideoFilter('backgroundImage', videoProcessorOptions);
                break;
            case 'apiRTC_office':
                imgUrl = './img/background_apiRTC.jpg';
                var videoProcessorOptions = {
                    backgroundImageUrl : imgUrl,
                }
                applyVideoFilter('backgroundImage', videoProcessorOptions);
                break;
            default:
                console.log(`Sorry, not a good filter value`);
        }
    }

    function applyVideoFilter(filterType, videoProcessorOptions) {
        localStream.applyVideoProcessor(filterType, videoProcessorOptions).then((streamWithEffect) => {
            console.error('stream With Effect :', streamWithEffect);

            let options = {};
            connectedConversation.unpublish(localStream, options);
            // Save local stream
            localStream = streamWithEffect;
            streamWithEffect.removeFromDiv('local-container', 'local-media');
            streamWithEffect.addInDiv('local-container', 'local-media', {}, true);
            connectedConversation.publish(localStream, options);

        }).catch((error) => {
            console.error('Catch on applyAudioProcessor message : ', error.message);
            console.error('Catch on applyAudioProcessor appliedAudioProcessorType : ', error.appliedVideoProcessorType);
            console.error('Catch on applyAudioProcessor stream : ', error.stream);
        }); 
    }
//BACKGROUND_SUBSTRACTION

//NOISE_REDUCTION
    checkboxnoiseRed.onchange = function (e) {
        console.debug("checkboxnoiseRed onchange :", e);
        noiseReductionProcess();
    };

    function noiseReductionProcess() {
        console.error("noiseReductionprocess");
        console.error("checkboxnoiseRed.value:", checkboxnoiseRed.value);
        switch (checkboxnoiseRed.value) {
            case 'nofilter':
                console.error("noiseReductionprocess nofilter");
                applyNoiseFilter('none');
                break;
            case 'ON':
                console.error("noiseReductionprocess ON");
                applyNoiseFilter('noiseReduction');
                break;
            default:
                console.log(`Sorry, not a good filter value`);
        }
    };

    function applyNoiseFilter(filterType) {
        localStream.applyAudioProcessor(filterType).then((streamWithEffect) => {
            console.error('stream With Effect :', streamWithEffect);

            let options = {};
            connectedConversation.unpublish(localStream, options);
            // Save local stream
            localStream = streamWithEffect;
            streamWithEffect.removeFromDiv('local-container', 'local-media');
            streamWithEffect.addInDiv('local-container', 'local-media', {controls:true}, true);
            connectedConversation.publish(localStream, options);

        }).catch((error) => {
            console.error('Catch on applyAudioProcessor message : ', error.message);
            console.error('Catch on applyAudioProcessor appliedAudioProcessorType : ', error.appliedVideoProcessorType);
            console.error('Catch on applyAudioProcessor stream : ', error.stream);
        }); 
    }
//NOISE_REDUCTION

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

        var createStreamOptions = {};
        createStreamOptions.audioInputId = selectMic.value;
        createStreamOptions.videoInputId = selectCamera.value;
        return new Promise((resolve, reject) => {

            ua.createStream(createStreamOptions)
                .then(function (stream) {

                    // Save local stream
                    localStream = stream;
                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {controls:true}, true);
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

    function joinConference(name) {

        let cloudUrl = 'https://cloud.apizee.com';
        let apiKey = 'myDemoApiKey';

        //==============================
        // CREATE USER AGENT
        //==============================
        ua = new apiRTC.UserAgent({
            uri: 'apzkey:' + apiKey
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
            connectedConversation = connectedSession.getOrCreateConversation(name);
  

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

                    console.error('connectedConversation streamAdded stream:', stream);

                    stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {controls : true}, false);
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
                        connectedConversation.publish(stream, options);
                    }).catch(function (err) {
                        console.error('join error', err);
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