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
        selectedVideoInputId = null,
        settings,
        capabilities,
        controllersDiv;

    selectCamera.onchange = function (e) {
        console.error("selectCamera onchange :", e);
        createStream();
    };
    selectMic.onchange = function (e) {
        console.error("selectMic onchange :", e);
        createStream();
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
            tableRemove ('local-container', localStream);
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
                    tableCreate('local-container', stream);
                    initControllers(stream);
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
                    console.log('replacePublishedStream OK');
                })
                .catch(function (err) {
                    console.log('replacePublishedStream NOK');
                });
        } else {
            return callbacks.getStream();
        }
    };

    /*
        Add table with stream capacities and settings
    */
    function tableCreate(parentDivName, stream) {

        console.log("tableCreate");

        const parentDiv = document.getElementById(parentDivName),
              tbl = document.createElement('table');

        tbl.setAttribute("id", "tbl-" + stream.streamId);
        tbl.style.border = '1px solid white';
        tbl.style.color = 'white';
        tbl.style.textAlign = 'center';

        var header = tbl.createTHead();

        const tr = header.insertRow();
        const td = tr.insertCell();

        let streamLocalOrRemote = '';
        if (stream.isRemote){
            streamLocalOrRemote = 'remote';
        } else {
            streamLocalOrRemote = 'local';
        }
        td.appendChild(document.createTextNode('Settings for ' + streamLocalOrRemote + ' stream :' + stream.streamId));
        td.setAttribute('colspan', '3');

        const tr2 = header.insertRow();
        const td1 = tr2.insertCell();
        td1.appendChild(document.createTextNode(`Capability name`));
        const td2 = tr2.insertCell();
        td2.appendChild(document.createTextNode(`Actual value`));
        const td3 = tr2.insertCell();
        td3.appendChild(document.createTextNode(`Change value`));

        let tblbody = tbl.createTBody();
        tblbody.setAttribute("id", "tblbody-" + stream.streamId);

        parentDiv.appendChild(tbl);
    }

    /*
        Remove table with stream capacities and settings
    */
    function tableRemove (parentDivName, stream) {
        document.getElementById(parentDivName).removeChild(document.getElementById('tbl-'+ stream.streamId));
    }

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
                    tableCreate('remote-container', stream);
                    initControllers(stream);
                    stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
                }).on('streamRemoved', function(stream) {
                    console.log('connectedConversation streamRemoved');
                    tableRemove ('remote-container', stream);
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

    function initControllers(stream){
        stream.getCapabilities()
            .then(function (capa) {
                console.error("capabilities : ", capa);
                capabilities = capa;

                stream.getSettings()
                    .then(function (set) {
                        console.error("settings : ", set);

                        controllersDiv = document.getElementById('controllers');
                        settings = set;

                        document.getElementById('controllers').style.display = "block";
                        showCapabilitiesControllers(stream);

                    }).catch(function (err) {
                        console.error('getSettings error', err);
                    });

            }).catch(function (err) {
                console.error('getCapabilities error', err);
            });
    }

    function showCapabilitiesControllers(stream){

        console.log('showCapabilitiesControllers');
        let streamId = stream.getId();

        if(capabilities !== undefined && capabilities !== null && typeof capabilities.video === "object"){
            Object.keys(capabilities.video).forEach(function(capability){

                if (capability === "frameRate"){
                    addTableRow("frameRate", capabilities.video[capability], settings.video[capability], setFrameRate, stream);
                } else if (capability === "height"){
                    addTableRow("height", capabilities.video[capability], settings.video[capability], setHeight, stream);
                } else if (capability === "width"){
                    addTableRow("width", capabilities.video[capability], settings.video[capability], setWidth, stream);
                } else if (capability === "resizeMode"){
                    addTableRow("resizeMode", capabilities.video[capability], settings.video[capability], setResizeMode, stream);
                } else if (capability === "aspectRatio"){
                    addTableRow("aspectRatio", capabilities.video[capability], settings.video[capability], setAspectRatio, stream);
                } else if (capability === "zoom"){
                    addTableRow("zoom", capabilities.video[capability], settings.video[capability], setZoom, stream);
                } else if (capability === "iso"){
                    addTableRow("iso", capabilities.video[capability], settings.video[capability], setIso, stream);
                } else if (capability === "focusDistance"){
                    addTableRow("focusDistance", capabilities.video[capability], settings.video[capability], setFocusDistance, stream);
                } else if (capability === "exposureTime"){
                    addTableRow("exposureTime", capabilities.video[capability], settings.video[capability], setExposureTime, stream);
                } else if (capability === "exposureCompensation"){
                    addTableRow("exposureCompensation", capabilities.video[capability], settings.video[capability], setExposureCompensation, stream);
                } else if (capability === "whiteBalanceMode"){
                    addTableRow("whiteBalanceMode", capabilities.video[capability], settings.video[capability], setWhiteBalanceMode, stream);
                } else if (capability === "focusMode"){
                    addTableRow("focusMode", capabilities.video[capability], settings.video[capability], setFocusMode, stream);
                } else if (capability === "facingMode"){
                    addTableRow("facingMode", capabilities.video[capability], settings.video[capability], setFacingMode, stream);
                } else if (capability === "exposureMode"){
                    addTableRow("exposureMode", capabilities.video[capability], settings.video[capability], setExposureMode, stream);
                } else if (capability === "colorTemperature"){
                    addTableRow("colorTemperature", capabilities.video[capability], settings.video[capability], setColorTemperature, stream);
                } else if (capability === "torch"){
                    addTableRow("torch", capabilities.video[capability], settings.video[capability], setTorch, stream);
                } else if (capability === "deviceId"){
                    addTableRow("deviceId", capabilities.video[capability], settings.video[capability], setDeviceId, stream);
                } else if (capability === "groupId"){
                    addTableRow("groupId", capabilities.video[capability], settings.video[capability], setGroupId, stream);
                } else {
                    console.error( "Your device is able to use the capability : " + capability + ", but this not managed by this tutorial ");
                }
            });
    
            Object.keys(capabilities.audio).forEach(function(capability){

                console.error( "capabilities audio TODO :", capability);

                if (capability === "autoGainControl"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setAutoGainControl, stream);
                } else if (capability === "channelCount"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setChannelCount, stream);
                } else if (capability === "echoCancellation"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setEchoCancellation, stream);
                } else if (capability === "noiseSuppression"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setNoiseSuppression, stream);
                } else if (capability === "latency"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setLatency, stream);
                } else if (capability === "deviceId"){
                    addTableRow("deviceId", capabilities.video[capability], settings.video[capability], setDeviceId, stream);
                } else if (capability === "groupId"){
                    addTableRow("groupId", capabilities.video[capability], settings.video[capability], setGroupId, stream);
                } else if (capability === "sampleRate"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setSampleRate, stream);
                } else if (capability === "sampleSize"){
                    addTableRow(capability, capabilities.audio[capability], settings.audio[capability], setSampleSize, stream);
                } else {
                    console.error( "Your device is able to use the capability : " + capability + ", but this not managed by this tutorial ");
                }
            });
        }
    }

    function addTableRow(name, rules, actualValue, func, stream){

        console.log('addTableRow name =', name);
        console.log('addTableRow rules =', rules);
        console.log('addTableRow actualValue =', actualValue);

        let tr = document.createElement("tr");
        let tdName = document.createElement("td");
        let tdActualValue = document.createElement("td");
        let tdFunc = document.createElement("td");

        tdName.innerHTML = name;
        tdActualValue.id = name + "Value" + '-' + stream.streamId;

        if (actualValue === undefined) {
            tdActualValue.innerHTML = "'N/A'";
        } else {
            tdActualValue.innerHTML = actualValue;
        }

        if (typeof(actualValue) === undefined) {

            console.error("capacity :" + name + "can't be used");
            tdFunc.innerHTML = 'N/A';

        } else if (typeof(actualValue) === "number") {

            if (rules.min === rules.max) {
                //In case there is only one possible value
                tdFunc.innerHTML = rules.min;
            } else {

                let inputRange = document.createElement("input");
                inputRange.type = "range";
                inputRange.id = name + '-' + stream.streamId;
                inputRange.min = rules.min;
                inputRange.max = rules.max;
                inputRange.step = rules.step ? rules.step : 1;
                inputRange.value = actualValue;

                if (name==="aspectRatio") {
                    inputRange.max = 10;
                    inputRange.step = 0.01;
                }
                if (name==="latency") {
                    inputRange.step = 0.01;
                }
                inputRange.addEventListener("change", function(e){
                    func(e.target.value, true, name, stream);
                })
                tdFunc.appendChild(inputRange)
            }

        } else if ( (typeof(actualValue) === "string") || ((typeof(actualValue) === "boolean") && (name !== "torch")) ) {

            let select = document.createElement("select");
            select.id = name + '-' + stream.streamId;

            if (typeof(rules) === 'string') {
                console.log("rules :", rules);
                tdFunc.innerHTML = 'N/A';
            } else {
                rules.forEach(function(rule){
                    let opt = document.createElement("option");
                    opt.text = rule;
                    opt.value = rule;
                    select.appendChild(opt);
                });
                select.value = actualValue;
                select.addEventListener("change", function(e){
                    func(e.target.value, true, name, stream);
                })
                tdFunc.appendChild(select);
            }

        } else if (name === "torch") {

            let checkbox = document.createElement("input");
            checkbox.id = name + '-' + stream.streamId;
            checkbox.type = "checkbox";
            checkbox.checked = actualValue;
            checkbox.addEventListener("change", function(e){
                let checked = document.getElementById(name + '-' + stream.streamId).checked;
                func(checked, true, name, stream);
            })
            tdFunc.appendChild(checkbox);

        } else {
            console.error(name, typeof(actualValue));
        }
        
        tr.appendChild(tdName);
        tr.appendChild(tdActualValue);
        tr.appendChild(tdFunc);
        document.getElementById('tblbody-' + stream.streamId).appendChild(tr);
    }

    function setWidth(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video: {
                width : value
            },
        }
        stream.applyConstraints(constraintToApply).then(function() {
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setHeight(value, update, name, stream){
        let constraintToApply = {
            audio: {},
            video: {
                height : value
            },
        }
        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setAspectRatio(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video: {
                aspectRatio : value
            },
        }
        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFrameRate(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video: {
                frameRate : value
            },
        }
        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFacingMode(value, update, name, stream){
        console.error("Need to be changed with a new Stream creation not with applyConstraint");
    }

    function setResizeMode(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video: {
                resizeMode : value
            },
        }
        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setZoom(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {zoom: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setIso(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {iso: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFocusDistance(value, update, name, stream){
        let constraintToApply = {
            audio: {},
            video:{advanced: [ {focusDistance: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureTime(value, update, name, stream){
        let constraintToApply = {
            audio: {},
            video:{advanced: [ {exposureTime: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureCompensation(value, update, name, stream){
        let constraintToApply = {
            audio: {},
            video:{advanced: [ {exposureCompensation: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setWhiteBalanceMode(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {whiteBalanceMode: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setFocusMode(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {focusMode: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setExposureMode(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {exposureMode: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setColorTemperature(value, update, name, stream){

        let constraintToApply = {
            audio: {},
            video:{advanced: [ {colorTemperature: value} ]}
        }

        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setTorch(value, update, name, stream){

        console.log("setTorch value : ", value);

        let constraintToApply = {
            audio: {},
            video:{advanced: [
                {
                    torch: value,
                }
            ]}
        }
        stream.applyConstraints(constraintToApply).then(function(){    
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
    }

    function setDeviceId(value, update, name, stream){
        console.error("TODO setDeviceId value : ", value);
    }

    function setGroupId(value, update, name, stream){
        console.error("TODO setGroupId value : ", value);
    }

    function setAutoGainControl(value, update, name, stream){

        console.error("setAutoGainControl to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964 

/*
        var isTrueSet = (value === 'true');
        let constraintToApply = {
            audio: {
                autoGainControl : isTrueSet
            },
            video: {}
        }
        //console.error("constraintToApply :", constraintToApply);

        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
*/
    }
    
    function setChannelCount(value, update, name, stream){
        console.error("setChannelCount to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    }
    
    function setEchoCancellation(value, update, name, stream){

        console.error("setEchoCancellation to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
/*
        var isTrueSet = (value === 'true');
        let constraintToApply = {
            audio: {
                advanced: [{ echoCancellation: isTrueSet}],
            },
            video: {
            }
        }
        //console.error("constraintToApply :", constraintToApply);

        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
*/
    }
    
    function setNoiseSuppression(value, update, name, stream){

        console.error("setNoiseSuppression to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
/*
        var isTrueSet = (value === 'true');
        let constraintToApply = {
            audio: {
                noiseSuppression : isTrueSet
                //advanced: [{ noiseSuppression: isTrueSet}],
                //advanced: [{ width: 1920, height: 1280 }, { aspectRatio: 1.333 }],
            },
            video: {
            }
        }
        //console.error("constraintToApply :", constraintToApply);

        stream.applyConstraints(constraintToApply).then(function(){
            if(update){
                updateSettings(stream);
            }
        }).catch(function(error){
            console.log("Error : ", error);
        })
*/
    }
    
    function setLatency(value, update, name, stream){
        console.error("setLatency to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    }
    
    function setSampleRate(value, update, name, stream){
        console.error("setSampleRate to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    }
    
    function setSampleSize(value, update, name, stream){
        console.error("setSampleSize to be managed:", value);
        //Check https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    }

    function updateSettings(stream){

        console.log("updateSettings ")

        stream.getSettings()
        .then(function(result){

            settings = result;
        
            Object.keys(settings.audio).forEach(function(set){
                
                try {
                    document.getElementById(set + "Value"+ '-' + stream.streamId).innerHTML = settings.audio[set];
                    document.getElementById(set + '-' + stream.streamId).value = settings.audio[set];
                } catch (error) {
                    console.error("updateSettings : Error in catch :" + error);
                    console.error("updateSettings : settings.video[set] :" + settings.audio[set]);
                    console.error("updateSettings : settings:", settings);
                }
            });

            Object.keys(settings.video).forEach(function(set){
        
                try {
                    document.getElementById(set + "Value"+ '-' + stream.streamId).innerHTML = settings.video[set];
                    document.getElementById(set + '-' + stream.streamId).value = settings.video[set];
                } catch (error) {
                    console.error("updateSettings : Error in catch :" + error);
                    console.error("updateSettings : settings.video[set] :" + settings.video[set]);
                    console.error("updateSettings : settings:", settings);
                }
            })    

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

        document.getElementById('takePhoto').addEventListener('click', function(e){
            localStream.takePhoto().then(function(blob){
                document.getElementById('photos').appendChild(blob)
            });
        })

        // Join conference
        joinConference(conferenceName);
    });
});