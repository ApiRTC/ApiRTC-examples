$(function () {
    'use strict';

    var localStream = null;
    var selectCamera = document.getElementById("select-camera");
    var selectMic = document.getElementById("select-mic");
    var selectedAudioInputId = null;
    var selectedVideoInputId = null;
    var recordedVideoBuffer = null;

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
    var apiKey = '#INSERT_YOUR_API_KEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

    var ua = new apiRTC.UserAgent({
        uri: 'apiKey:' + apiKey
    });

    //==============================
    // FETCH MEDIA
    //==============================

    function updateDeviceList (res) {
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

        console.log('fetchUserMediaDevices', (res));
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

    ua.on('mediaDeviceChanged', function (invitation) {
        //Listen for mediaDeviceChanged event to update devices list
        console.log('mediaDeviceChanged');
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
        ua.createStream({audioInputId: selectMic.value, videoInputId: selectCamera.value})
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
            })
            .catch(function (err) {
                document.getElementById('error-device').innerHTML = 'ERROR :' + err.error.message;
                document.getElementById('error-device').style.display = "block";
                console.error('create stream error', err);
             });
    };

    createStream();

    // Click on startRecording button
    $('#startRecording').on('click', function () {
        console.log("startRecording");
        localStream.startRecord().then(function () {
                console.log("Recording started");
            }).catch(function (error) {
                // error
                console.error('startRecord failed :', error);
            });
    });
    // Click on startRecordingVP9 button
    $('#startRecordingVP9').on('click', function () {
        console.log("startRecordingVP9");
        var options = {mimeType: 'video/webm;codecs=vp9'};
        localStream.startRecord(options).then(function () {
            console.log("Recording started");
        }).catch(function (error) {
            // error
            console.error('startRecord failed :', error);
        });
    });
    // Click on stopRecording button
    $('#stopRecording').on('click', function () {
        console.log("stopRecording");
        localStream.stopRecord().then(function (recordedVideoBuff) {
            console.log("Recording stopped");
            recordedVideoBuffer = recordedVideoBuff
            console.log("recordedVideoBuffer :", recordedVideoBuffer);
        }).catch(function (error) {
            // error
            console.error('stopRecording failed :', error);
        });
    });
    // Click on stopRecording button
    $('#pauseRecording').on('click', function () {
        console.log("pauseRecording");
        localStream.pauseRecord().then(function () {
            console.log("Recording paused");
        }).catch(function (error) {
            // error
            console.error('pauseRecord failed :', error);
        });
    });
    // Click on stopRecording button
    $('#resumeRecording').on('click', function () {
        console.log("resumeRecording");
        localStream.resumeRecord().then(function () {
            console.log("Recording resumed");
        }).catch(function (error) {
            // error
            console.error('resumeRecord failed :', error);
        });
    });
    // Click on play button
    $('#play').on('click', function () {
        console.log("play");
        if (recordedVideoBuffer !== null) {
            var recordedVideo = document.querySelector('video#recordedVideo');
            recordedVideo.src = window.URL.createObjectURL(recordedVideoBuffer);
            recordedVideo.play();
        } else {
            console.log("no recorded video ready");
        }
    });
    // Click on download button
    $('#download').on('click', function () {
        console.log("download");
        if (recordedVideoBuffer !== null) {
            var url = window.URL.createObjectURL(recordedVideoBuffer);
            var a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'record_ApiRTC.webm';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            }, 100);
        } else {
            console.log("no recorded video ready");
        }
    });
});