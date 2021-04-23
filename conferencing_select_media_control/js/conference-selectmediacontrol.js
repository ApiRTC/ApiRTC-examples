$(function() {
    'use strict';

    apiRTC.setLogLevel(0);

    var ua = null,
        localStream = null,
        call = null,
        connectedConversation = null,
        connectedSession = null,
        selectCamera = document.getElementById("select-camera"),
        selectMic = document.getElementById("select-mic"),
        selectedAudioInputId = null,
        selectedVideoInputId = null,
        defaultSettings = null,
        initialSettings = true,
        settings,
        capabilities,
        controllersDiv;

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
                    initialSettings = true;
                    initControllers();
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
                        initialSettings = true;
                        initControllers();
                    });

                }).catch(function (err) {
                    console.error('create stream error', err);
                });
        });
    }

    function initControllers(){
        capabilities = localStream.getCapabilities();
        console.log("capabilities : ", capabilities);
        settings = localStream.getSettings();
        console.log("settings : ", settings);
        controllersDiv = document.getElementById('controllers');
        
        if(initialSettings){
            defaultSettings = settings;
            initialSettings = false;
        }
        
        document.getElementById('controllers').style.display = "block";

        while (document.getElementById('tableBody').firstChild) {
            document.getElementById('tableBody').removeChild(document.getElementById('tableBody').lastChild);
        }

        showCapabilitiesControllers();
    }

    function showCapabilitiesControllers(){
        if(capabilities !== undefined && capabilities !== null && typeof capabilities === "object"){
            Object.keys(capabilities).forEach(function(capability){
                if(capability === "frameRate"){
                    addTableRow("frameRate", capabilities[capability], settings[capability], setFrameRate);
                }else if(capability === "height"){
                    addTableRow("height", capabilities[capability], settings[capability], setHeight);
                }else if(capability === "width"){
                    addTableRow("width", capabilities[capability], settings[capability], setWidth);
                }else if(capability === "resizeMode"){
                    addTableRow("resizeMode", capabilities[capability], settings[capability], setResizeMode);
                }else if(capability === "aspectRatio"){
                    addTableRow("aspectRatio", capabilities[capability], settings[capability], setAspectRatio);
                }else if(capability === "zoom"){
                    addTableRow("zoom", capabilities[capability], settings[capability], setZoom);
                }else if(capability === "iso"){
                    addTableRow("iso", capabilities[capability], settings[capability], setIso);
                }else if(capability === "focusDistance"){
                    addTableRow("focusDistance", capabilities[capability], settings[capability], setFocusDistance);
                }else if(capability === "exposureTime"){
                    addTableRow("exposureTime", capabilities[capability], settings[capability], setExposureTime);
                }else if(capability === "exposureCompensation"){
                    addTableRow("exposureCompensation", capabilities[capability], settings[capability], setExposureCompensation);
                }else if(capability === "whiteBalanceMode"){
                    addTableRow("whiteBalanceMode", capabilities[capability], settings[capability], setWhiteBalanceMode);
                }else if(capability === "focusMode"){
                    addTableRow("focusMode", capabilities[capability], settings[capability], setFocusMode);
                }else if(capability === "facingMode"){
                    addTableRow("facingMode", capabilities[capability], settings[capability], setFacingMode);
                }else if(capability === "exposureMode"){
                    addTableRow("exposureMode", capabilities[capability], settings[capability], setExposureMode);
                }else if(capability === "colorTemperature"){
                    addTableRow("colorTemperature", capabilities[capability], settings[capability], setColorTemperature);
                }else{
                    let p = document.createElement("p");
                    p.innerHTML = "Your device is able to use the capability : ", capability, " but there is no helper for this capability. No helper does not mean no compatibility, you can use the setCapability or setCapabilities function to use this capability.";
                    document.getElementById("controllers").appendChild(p);
                }
            });
    
            Object.keys(settings).forEach(function(set){
                if(set === "torch"){
                    addTableRow("torch", settings[set], settings[set], settings[set], setTorch);
                }
            });
        }
    }

    function addTableRow(name, rules, actualValue, func){
        let tr = document.createElement("tr")
        let tdName = document.createElement("td")
        let tdActualValue = document.createElement("td")
        let tdFunc = document.createElement("td")

        tdName.innerHTML = name
        tdActualValue.id = name + "Value";
        tdActualValue.innerHTML = actualValue

        if(typeof(actualValue) === "number"){
            let inputRange = document.createElement("input")
            inputRange.type = "range"
            inputRange.id = name
            inputRange.min = rules.min
            inputRange.max = rules.max
            inputRange.step = rules.step ? rules.step : 1;
            inputRange.value = actualValue;
            if(name==="aspectRatio"){
                inputRange.max = 10;
                inputRange.step = 0.01;
            }
            inputRange.addEventListener("change", function(e){
                func(e.target.value, true)
            })
            tdFunc.appendChild(inputRange)
        }else if(typeof(actualValue) === "string"){
            let select = document.createElement("select")
            select.id = name
            rules.forEach(function(rule){
                let opt = document.createElement("option");
                opt.text = rule;
                opt.value = rule;
                select.appendChild(opt);
            })
            select.value = actualValue;
            select.addEventListener("change", function(e){
                func(e.target.value, true)
            })
            tdFunc.appendChild(select)
        }else if(name === "torch"){
            let checkbox = document.createElement("input");
            checkbox.id = name;
            checkbox.type = "checkbox";
            checkbox.checked = actualValue;
            checkbox.addEventListener("change", function(e){
                let checked = document.getElementById(name).checked;
                func(checked, true)
            })
            tdFunc.appendChild(checkbox)
        }else{
            console.log(name, typeof(actualValue))
        }
        

        tr.appendChild(tdName)
        tr.appendChild(tdActualValue)
        tr.appendChild(tdFunc)
        document.getElementById('tableBody').appendChild(tr);
    }

    function setFrameRate(value, update){
        localStream.setFrameRate(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setHeight(value, update){
        localStream.setHeight(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setWidth(value, update){
        localStream.setWidth(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setAspectRatio(value, update){
        localStream.setAspectRatio(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setResizeMode(value, update){
        localStream.setResizeMode(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setZoom(value, update){
        localStream.setZoom(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setIso(value, update){
        localStream.setIso(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFocusDistance(value, update){
        localStream.setFocusDistance(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureTime(value, update){
        localStream.setExposureTime(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureCompensation(value, update){
        localStream.setExposureCompensation(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setWhiteBalanceMode(value, update){
        localStream.setWhiteBalanceMode(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFocusMode(value, update){
        localStream.setFocusMode(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFacingMode(value, update){
        localStream.setFacingMode(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureMode(value, update){
        localStream.setExposureMode(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setColorTemperature(value, update){
        localStream.setColorTemperature(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setTorch(value, update){
        localStream.setTorch(value).then(function(){
            if(update){
                updateSettings()
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function updateSettings(){
        settings = localStream.getSettings();
        
        Object.keys(settings).forEach(function(set){
            if(set === "frameRate"){
                document.getElementById("frameRateValue").innerHTML = settings.frameRate;
                document.getElementById("frameRate").value = settings.frameRate;
            }else if(set === "height"){
                document.getElementById("heightValue").innerHTML = settings.height;
                document.getElementById("height").value = settings.height;
            }else if(set === "width"){
                document.getElementById("widthValue").innerHTML = settings.width;
                document.getElementById("width").value = settings.width;
            }else if(set === "resizeMode"){
                document.getElementById("resizeModeValue").innerHTML = settings.resizeMode;
                document.getElementById("resizeMode").value = settings.resizeMode;
            }else if(set === "aspectRatio"){
                document.getElementById("aspectRatioValue").innerHTML = settings.aspectRatio;
                document.getElementById("aspectRatio").value = settings.aspectRatio;
            }else if(set === "zoom"){
                document.getElementById("zoomValue").innerHTML = settings.zoom;
                document.getElementById("zoom").value = settings.zoom;
            }else if(set === "iso"){
                document.getElementById("isoValue").innerHTML = settings.iso;
                document.getElementById("iso").value = settings.iso;
            }else if(set === "focusDistance"){
                document.getElementById("focusDistanceValue").innerHTML = settings.focusDistance;
                document.getElementById("focusDistance").value = settings.focusDistance;
            }else if(set === "exposureTime"){
                document.getElementById("exposureTimeValue").innerHTML = settings.exposureTime;
                document.getElementById("exposureTime").value = settings.exposureTime;
            }else if(set === "exposureCompensation"){
                document.getElementById("exposureCompensationValue").innerHTML = settings.exposureCompensation;
                document.getElementById("exposureCompensation").value = settings.exposureCompensation;
            }else if(set === "whiteBalanceMode"){
                document.getElementById("whiteBalanceModeValue").innerHTML = settings.whiteBalanceMode;
                document.getElementById("whiteBalanceMode").value = settings.whiteBalanceMode;
            }else if(set === "focusMode"){
                document.getElementById("focusModeValue").innerHTML = settings.focusMode;
                document.getElementById("focusMode").value = settings.focusMode;
            }else if(set === "facingMode"){
                document.getElementById("facingModeValue").innerHTML = settings.facingMode;
                document.getElementById("facingMode").value = settings.facingMode;
            }else if(set === "exposureMode"){
                document.getElementById("exposureModeValue").innerHTML = settings.exposureMode;
                document.getElementById("exposureMode").value = settings.exposureMode;
            }else if(set === "torch"){
                document.getElementById("torchValue").innerHTML = settings.torch;
                document.getElementById("torch").checked = settings.torch;
            }else if(set === "colorTemperature"){
                document.getElementById("colorTemperatureValue").innerHTML = settings.colorTemperature;
                document.getElementById("colorTemperature").value = settings.colorTemperature;
            }
        })
    }

    function resetSettings(){
        console.log("resetSettings");

        let constraints = localStream.getConstraints();
        let settingsToReset = {};
        Object.keys(constraints.advanced[0]).forEach(function(constraint){
            settingsToReset[constraint] = defaultSettings[constraint];
        })
        console.log("Constraints to reset with values : ", settingsToReset);
        localStream.setCapabilities(settingsToReset).then(function(){
            updateSettings();
        }).catch(function(error){
            console.log("Error : ", error);
        })
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

        document.getElementById('resetButton').addEventListener('click', function(e){
            resetSettings();
        })

        document.getElementById('takePhoto').addEventListener('click', function(e){
            localStream.takePhoto().then(function(blob){
                document.getElementById('photos').appendChild(blob)
            });

        })

        // Join conference
        joinConference(conferenceName);
    });
});