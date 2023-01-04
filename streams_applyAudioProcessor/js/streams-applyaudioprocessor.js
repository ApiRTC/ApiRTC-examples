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
    var streamWithEffect = null;

    selectCamera.onchange = function (e) {
        selectedVideoInputId = selectCamera.value;
        createStream();
    };

    selectMic.onchange = function (e) {
        selectedAudioInputId = selectMic.value;
        createStream();
    };

    //==============================
    // CREATE USER AGENT
    //==============================
    var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:' + apiKey,
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
                        mediaElement.muted = false;
                        //mediaElement.muted = true;
                        mediaElement.controls = true;
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
        createStream();
    }).catch(function (error) {
        // error
        console.error('User agent registration failed', error);
    });

    // Click on apply Blur
    $('#startNoiseReduction').on('click', function () {



//TODO


        console.log('Clic on startNoiseReduction');

        localStream.applyAudioProcessor('noiseReduction').then((streamWithEffect) => {
            console.log('noised reduction stream :', streamWithEffect);

            localStream.removeFromDiv('local-container', 'local-media');
            streamWithEffect.addInDiv('local-container', 'local-media', {}, false);

            localStream = streamWithEffect;

        }).catch(function(error) {

            // In case of error applyAudioProcessor will give return :
            //     - the reason,
            //     - the type of effect that is applied to the stream
            //     - the stream

            console.error('Catch on applyAudioProcessor message : ', error.message);
            console.error('Catch on applyAudioProcessor appliedAudioProcessorType : ', error.appliedVideoProcessorType);
            console.error('Catch on applyAudioProcessor stream : ', error.stream);

        });

    });

    // Click on applyNone
    $('#stopNoiseReduction').on('click', function () {

//TODO

        console.log('Clic on stopNoiseReduction');

        localStream.applyAudioProcessor('none').then((streamWithEffect) => {
            console.log('then applyVideoProcessor none() : ', streamWithEffect);

            localStream.removeFromDiv('local-container', 'local-media');
            streamWithEffect.addInDiv('local-container', 'local-media', {}, false);

            localStream = streamWithEffect;

        }).catch(function(error) {

            // In case of error applyAudioProcessor will give return :
            //     - the reason,
            //     - the type of effect that is applied to the stream
            //     - the stream

            console.error('Catch on applyAudioProcessor message : ', error.message);
            console.error('Catch on applyAudioProcessor appliedAudioProcessorType : ', error.appliedVideoProcessorType);
            console.error('Catch on applyAudioProcessor stream : ', error.stream);

        });
    });
});