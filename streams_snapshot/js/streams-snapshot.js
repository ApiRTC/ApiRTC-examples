$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var localStream = null;
    var selectCamera = document.getElementById("select-camera");
    var selectMic = document.getElementById("select-mic");
    var selectedAudioInputId = null;
    var selectedVideoInputId = null;

    var cameraIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';

    function decorateSnapshotButtons() {
        var snapshotButton = document.getElementById('snapshot');
        var snapshotFullResButton = document.getElementById('snapshotFullReso');

        if (snapshotButton) {
            snapshotButton.innerHTML = cameraIconSvg + '<span> Snapshot</span>';
        }
        if (snapshotFullResButton) {
            snapshotFullResButton.innerHTML = cameraIconSvg + '<span> Snapshot Full Resolution</span>';
        }
    }

    function appendSnapshotToTimeline(snapshotSrc) {
        var timeline = document.getElementById('timeline');
        var snapshotItem = document.createElement('div');
        var anchor = document.createElement('a');
        var img = document.createElement('img');
        var resolution = document.createElement('p');

        snapshotItem.className = 'snapshot-item';
        resolution.className = 'snapshot-resolution';
        resolution.textContent = 'Loading resolution...';

        // Keep text readable even if external CSS is cached or overridden.
        snapshotItem.style.display = 'inline-block';
        snapshotItem.style.verticalAlign = 'top';
        snapshotItem.style.textAlign = 'center';
        snapshotItem.style.marginRight = '8px';
        anchor.style.display = 'block';
        resolution.style.display = 'block';
        resolution.style.margin = '4px 0 0';
        resolution.style.color = '#ffffff';
        resolution.style.fontFamily = 'Roboto, sans-serif';
        resolution.style.fontSize = '11px';
        resolution.style.lineHeight = '1.2';
        resolution.style.whiteSpace = 'normal';

        img.onload = function() {
            resolution.textContent = img.naturalWidth + ' x ' + img.naturalHeight + ' px';
        };
        img.onerror = function() {
            resolution.textContent = 'Resolution unavailable';
        };
        img.src = snapshotSrc;

        anchor.appendChild(img);
        snapshotItem.appendChild(anchor);
        snapshotItem.appendChild(resolution);
        timeline.appendChild(snapshotItem);
    }

    decorateSnapshotButtons();

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
    var ua = new apiRTC.UserAgent({
        uri: 'apzkey:myDemoApiKey'
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
                appendSnapshotToTimeline(snapshot);
            }).catch(function (error) {
                // error
                console.error('takeSnapshot error :', error);
            });
    });

    $('#snapshotFullReso').on('click', function () {
        console.log("snapshotFullReso");

        var snapshotOptions = {
            fullResolution: true,
        };

        console.log("snapshotOptions :", snapshotOptions);

        localStream.takeSnapshot(snapshotOptions)
            .then(function (snapshot) {
                console.log("takeSnapshot OK :", snapshot);
                appendSnapshotToTimeline(snapshot);
            }).catch(function (error) {
                // error
                console.error('takeSnapshot error :', error);
            });
    });
});