$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var localStream = null;
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

    //==============================
    // MANAGE SNAPSHOT FILTERS
    //==============================
    var blurslider = document.getElementById("blur");
    var blurvalue = blurslider.value + 'px';
    blurslider.oninput = function() {
        blurvalue = this.value + 'px';
    }

    var brightnessslider = document.getElementById("brightness");
    var brightnessvalue = brightnessslider.value + '%';
    brightnessslider.oninput = function() {
        brightnessvalue = this.value + '%';
    }

    var contrastslider = document.getElementById("contrast");
    var contrastvalue = contrastslider.value + '%';
    contrastslider.oninput = function() {
        contrastvalue = this.value + '%';
    }

    var grayscaleslider = document.getElementById("grayscale");
    var grayscalevalue = grayscaleslider.value + '%';
    grayscaleslider.oninput = function() {
        grayscalevalue = this.value + '%';
    }

    var huerotateslider = document.getElementById("hue-rotate");
    var huerotatevalue = huerotateslider.value + 'deg';
    huerotateslider.oninput = function() {
        huerotatevalue = this.value + 'deg';
    }

    var invertslider = document.getElementById("invert");
    var invertvalue = invertslider.value + '%';
    invertslider.oninput = function() {
        invertvalue = this.value + '%';
    }

    var opacityslider = document.getElementById("opacity");
    var opacityvalue = opacityslider.value + '%';
    opacityslider.oninput = function() {
        opacityvalue = this.value + '%';
    }

    var saturateslider = document.getElementById("saturate");
    var saturatevalue = saturateslider.value + '%';
    saturateslider.oninput = function() {
        saturatevalue = this.value + '%';
    }

    var sepiaslider = document.getElementById("sepia");
    var sepiavalue = sepiaslider.value + '%';
    sepiaslider.oninput = function() {
        sepiavalue = this.value + '%';
    }

    //==============================
    // CREATE USER AGENT
    //==============================
    var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

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

    $('#snapshot').on('click', function () {
        console.log("snapshot");

        var snapshotOptions = {
            filters: {
                blur: blurvalue,
                brightness : brightnessvalue,
                contrast : contrastvalue,
                'hue-rotate' : huerotatevalue,
                grayscale : grayscalevalue,
                invert : invertvalue,
                opacity : opacityvalue,
                saturate : saturatevalue,
                sepia : sepiavalue
            }
        };

        console.log("snapshotOptions :", snapshotOptions);

        localStream.takeSnapshot(snapshotOptions)
            .then(function (snapshot) {
                console.log("takeSnapshot OK :", snapshot);
                $('#timeline').append('<a><img src="' + snapshot + '" /></a>');
            }).catch(function (error) {
                // error
                console.error('takeSnapshot error :', error);
            });
    });
});