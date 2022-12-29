$(function() {
    'use strict';

    apiRTC.setLogLevel(10);
    var qosStats = {};
    var localStream = null;


    function joinConference(name) {
        var cloudUrl = 'https://cloud.apizee.com';
        var connectedSession = null;
        var connectedConversation = null;
        //var localStream = null;

        //==============================
        // CREATE USER AGENT
        //==============================
        var ua = new apiRTC.UserAgent({
            uri: 'apiKey:myDemoApiKey'
        });

        //==============================
        // REGISTER
        //==============================
        ua.register({
            cloudUrl: cloudUrl
        }).then(function(session) {
            // Save session
            connectedSession = session;

            //Call Stats monitoring is supported on Chrome and Firefox and will be added soon on Safari
            if ((apiCC.browser === 'Chrome') || (apiCC.browser === 'Firefox')) {
                ua.enableCallStatsMonitoring(true, { interval: 1000 });
                ua.enableActiveSpeakerDetecting(true, { threshold: 50 });
            }

            connectedSession
                .on("contactListUpdate", function(updatedContacts) { //display a list of connected users
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
                            .then(function() {
                                console.log('subscribeToMedia success');
                            }).catch(function(err) {
                                console.error('subscribeToMedia error', err);
                            });
                    }
                }
            });

            //=====================================================
            // BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
            //=====================================================
            connectedConversation
                .on('streamAdded', function(stream) {

                    // Subscribed Stream is available for display
                    // Get remote media container
                    var container = document.getElementById('remote-container');

                    // Create container for QoS stats elements
                    var rcontainer = document.createElement('div');
                    rcontainer.className = "remote-elt";
                    rcontainer.id = 'container' + stream.streamId;
                    container.appendChild(rcontainer)
                    rcontainer.style.position = 'relative';

                    stream.addInDiv('container' + stream.streamId, 'remote-media-' + stream.streamId, {}, false);

                    addMonitoringElements(rcontainer.id, 'remote-qosInfo-container', stream.streamId, stream.callId, 'remote');
                    addActiveSpeakerMessage(rcontainer.id, stream.streamId);

                    // Create statistics vector for each added stream
                    if (!qosStats[stream.callId]) {
                        qosStats[stream.callId] = {
                            'mosRV': "NoStream", // Received video quality
                            'mosRS': "NoStream", // Received audio quality
                            'videoRBR': 0, // Received video bit rate
                            'audioRBR': 0, // Received audio bit rate
                            'videoRFR': 0, // Received video frame rate
                            'videoRPL': 0, // Received video packet loss rate
                            'audioRPL': 0, // Received audio packet loss rate
                            'videoRHeight': 0, // Received video height
                            'videoRWidth': 0, // Received video width
                            'transportType': 'ND', // Transport type
                        };
                    }

                }).on('streamRemoved', function(stream) {
                    console.log('connectedConversation streamRemoved');
                    //document.getElementById('remote-media-' + stream.streamId).remove();
                    stream.removeFromDiv('container' + stream.streamId, 'remote-media-' + stream.streamId);
                    releaseMonitoringElements(stream);
                    removeActiveSpeakerMessage(stream.streamId);

                    var remoteContainerId = 'container' + stream.streamId;
                    $('#' + remoteContainerId).remove();
                });

            //==========================================================
            // ADD EVENT LISTENER : WHEN CALL STATS ARE RECEIVED
            //==========================================================
            connectedConversation.on('callStatsUpdate', function(callStats) {


                console.debug('callStats :', callStats);

                //reception QoS statistics

                if (callStats.stats.videoReceived || callStats.stats.audioReceived) {
                    if (callStats.stats.videoReceived) {
                        qosStats[callStats.callId].videoRBR = Math.round(callStats.stats.videoReceived.bitsReceivedPerSecond / 1000); //Kbps
                        qosStats[callStats.callId].videoRFR = callStats.stats.videoReceived.framesDecodedPerSecond;
                        qosStats[callStats.callId].videoRPL = callStats.stats.videoReceived.packetsLostRatio;
                        qosStats[callStats.callId].videoRHeight = callStats.stats.videoReceived.height;
                        qosStats[callStats.callId].videoRWidth = callStats.stats.videoReceived.width;
                    }
                    if (callStats.stats.audioReceived) {
                        qosStats[callStats.callId].audioRBR = Math.round(callStats.stats.audioReceived.bitsReceivedPerSecond / 1000); //Kbps
                        qosStats[callStats.callId].audioRPL = callStats.stats.audioReceived.packetsLostRatio;
                    }
                    qosStats[callStats.callId].mosRV = callStats.stats.quality.mosV;
                    qosStats[callStats.callId].mosRS = callStats.stats.quality.mosS;
                    displayRemoteQosStats(callStats.callId);
                }
                //send QoS statistics
                if (callStats.stats.videoSent || callStats.stats.audioSent) {
                    if (callStats.stats.videoSent) {
                        qosStats[0].videoSBR = Math.round(callStats.stats.videoSent.bitsSentPerSecond / 1000); //Kbps
                        qosStats[0].videoSFR = callStats.stats.videoSent.framesEncodedPerSecond;
                        qosStats[0].videoSPL = callStats.stats.videoSent.packetLossRatio;
                        qosStats[0].videoSHeight = callStats.stats.videoSent.height;
                        qosStats[0].videoSWidth = callStats.stats.videoSent.width;
                    }
                    if (callStats.stats.audioSent) {
                        qosStats[0].audioSBR = Math.round(callStats.stats.audioSent.bitsSentPerSecond / 1000);
                        qosStats[0].audioSPL = callStats.stats.audioSent.packetLossRatio;
                    }
                    qosStats[0].mosSV = callStats.stats.quality.mosSV;
                    qosStats[0].mosSS = callStats.stats.quality.mosSS;
                    displayLocalQosStats(0);
                }
            });

            //=======================================================================================
            // ADD EVENT LISTENER : WHEN AUDIO STREAM AMPLITUDE CHANGED INDICATING SPEAKING EVENTS
            //======================================================================================
            connectedConversation.on('audioAmplitude', function(amplitudeInfo) {
                if (amplitudeInfo.callId !== null) {
                    var speakerMsgDiv = document.getElementById('activeSpeaker-' + amplitudeInfo.callId);
                } else {
                    var speakerMsgDiv = document.getElementById('activeSpeaker-0');
                }
                if (speakerMsgDiv) {
                    if (amplitudeInfo.descriptor.isSpeaking) {
                        speakerMsgDiv.innerHTML = "Speaking";
                    } else {
                        speakerMsgDiv.innerHTML = "Stopped Speaking";
                    }
                }
            });

            //==============================
            // CREATE LOCAL STREAM
            //==============================
            var createStreamOptions = {};
            createStreamOptions.constraints = {
                audio: true,
                video: true
            };

            apiRTC.addEventListener("selectedICECandidate", selectedICECandidateHandler);

            ua.createStream(createStreamOptions)
                .then(function(stream) {

                    console.debug('createStream :', stream);

                    // Save local stream
                    localStream = stream;

                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {}, true);

                    // Get media container
                    var container = document.getElementById('local-container');
                    // Add Qos stats elements to local container
                    addMonitoringElements('local-container', 'local-qosInfo-container', 0, 0, 'local');
                    addActiveSpeakerMessage('local-container', 0);

                    // Create statistics vector for the local stream
                    if (!qosStats[0]) {
                        qosStats[0] = {
                            'mosSV': "NoStream", // Sent video quality
                            'mosSS': "NoStream", // Sent audio quality
                            'videoSBR': 0, // Sent video bit rate
                            'audioSBR': 0, // Sent audio bit rate
                            'videoSPL': 0, // Sent video packet loss rate
                            'audioSPL': 0, // Sent audio packet loss rate
                            'videoSFR': 0, // Sent video frame rate
                            'videoSHeight': 0, // Sent video height
                            'videoSWidth': 0, // Sent video width
                            'transportType': 'ND', // Transport type
                        };
                    }
                    //==============================
                    // JOIN CONVERSATION
                    //==============================
                    connectedConversation.join()
                        .then(function() {
                            //==============================
                            // PUBLISH OWN STREAM
                            //==============================

                            connectedConversation.publish(localStream)
                                .then(function() {
                                    console.debug('publish ok');
                                }).catch(function(err) {
                                    console.error('publish error :', err);
                                });

                        }).catch(function(err) {
                            console.error('join conversation error', err);
                        });

                }).catch(function(err) {
                    console.error('create stream error', err);
                });
        });
    }

    function addMonitoringElements(divID, qosInfoDivId, streamID, callId, description) {
        // add monotoring logo to enable or not showing the QoS statistics
        var container = document.getElementById(divID);
        var logoDiv = document.createElement('div');
        container.appendChild(logoDiv);
        logoDiv.id = 'logo-' + streamID;
        logoDiv.className = 'qos-logo'

        var img = document.createElement('img');
        img.src = "../main/images/QoSLogo.svg";
        logoDiv.appendChild(img);

        // add QoS info div containning the statistics
        var infoContainer = document.createElement('div');
        infoContainer.id = description + '-qosInfo-' + callId;
        infoContainer.className = 'qos-infos';
        container.appendChild(infoContainer);

        logoDiv.addEventListener("mouseover", function() { displayQosInfo(this) }, false);
        logoDiv.addEventListener("mouseout", function() { removeQosInfo(this) }, false);
    }

    // Function to remove QoS statistics elements
    function releaseMonitoringElements(stream) {
        console.log("releaseMonitoringElements callId :" + stream.callId)

        var QoSLogoId = 'logo-' + stream.streamId;
        $('#' + QoSLogoId).remove();

        var remoteQosInfoDivId = 'remote-qosInfo-' + stream.callId;
        $('#' + remoteQosInfoDivId).remove();
    }

    function addActiveSpeakerMessage(divID, streamId) {
        // add active speaker message
        var container = document.getElementById(divID);
        var speakerMsgDiv = document.createElement('div');
        container.appendChild(speakerMsgDiv);
        speakerMsgDiv.id = 'activeSpeaker-' + streamId;
        speakerMsgDiv.className = 'activeSpeaker';
        speakerMsgDiv.style.color = 'white';
    }

    function removeActiveSpeakerMessage(streamId) {
        var activeSpeakerMessageId = 'activeSpeaker-' + streamId;
        $('#' + activeSpeakerMessageId).remove();
    }

    function selectedICECandidateHandler(e) {
        if (qosStats[e.detail.callId] !== undefined) {
            qosStats[e.detail.callId].transportType = e.detail.transportType;
        }
    }
    //=====================================================
    // DISPLAY LOCAL QOS STATS ON THE MONITORINGS ELEMENTS
    //=====================================================
    function displayLocalQosStats(callId) {
        // display local QoS stats
        // Remove old stats
        var lQosInfo = document.getElementById("local-qosInfo-" + callId);
        while (lQosInfo.firstChild) {
            lQosInfo.removeChild(lQosInfo.firstChild);
        }
        // Add new stats
        var id = 'local-qosInfo-' + callId;
        var qosDiv = d3.select('#' + id).append("div");
        var statsDiv = qosDiv.append('div');
        if (qosStats[callId].mosSV === "Muted") {
            statsDiv.append('p').append('em').text('Video stream Muted');
        } else if (qosStats[callId].mosSV === "NoStream") {
            statsDiv.append('p').append('em').text('No video stream');
        } else {
            if (qosStats[callId].mosSV >= 4) {
                statsDiv.append('p').append('em').text('Video quality: Excellent  ');
            } else if (qosStats[callId].mosSV >= 3) {
                statsDiv.append('p').append('em').text('Video quality: Good  ');
            } else if (qosStats[callId].mosSV >= 2) {
                statsDiv.append('p').append('em').text('Video quality: Adequate  ');
            } else {
                statsDiv.append('p').append('em').text('Video quality: Inadequate  ');
            }
            statsDiv.append('p').append('em').text('Video bit rate:  ' + qosStats[callId].videoSBR + ' Kbps');
            statsDiv.append('p').append('em').text('Frame rate:  ' + qosStats[callId].videoSFR);
            statsDiv.append('p').append('em').text('Video packet loss:  ' + qosStats[callId].videoSPL.toFixed(2) + '%');
            statsDiv.append('p').append('em').text('Resolution:  ' + qosStats[callId].videoSWidth + '×' + qosStats[callId].videoSHeight);
        }
        if (qosStats[callId].mosSS === "Muted") {
            statsDiv.append('p').append('em').text('Audio stream muted');
        } else if (qosStats[callId].mosSS === "NoStream") {
            statsDiv.append('p').append('em').text('No audio stream');
        } else {
            if (qosStats[callId].mosSS >= 4) {
                statsDiv.append('p').append('em').text('Audio quality: Excellent  ');
            } else if (qosStats[callId].mosSS >= 3) {
                statsDiv.append('p').append('em').text('Audio quality: Good  ');
            } else if (qosStats[callId].mosSS >= 2) {
                statsDiv.append('p').append('em').text('Audio quality: Adequate  ');
            } else {
                statsDiv.append('p').append('em').text('Audio quality: Inadequate  ');
            }
            statsDiv.append('p').append('em').text('Audio bit rate:  ' + qosStats[callId].audioSBR + ' Kbps');
            statsDiv.append('p').append('em').text('Audio packet loss:  ' + qosStats[callId].audioSPL.toFixed(2) + '%');
        }
    }

    //=====================================================
    // DISPLAY REMOTE QOS STATS ON THE MONITORINGS ELEMENTS
    //=====================================================
    function displayRemoteQosStats(callId) {

        //display remote QoS stats
        // Remove old stats
        var rQosInfo = document.getElementById("remote-qosInfo-" + callId);

        if (rQosInfo === null ||  rQosInfo === undefined) {
            console.warn("remote-qosInfo element is not present for callId : ", callId);
            return;
        }

        while (rQosInfo.firstChild) {
            rQosInfo.removeChild(rQosInfo.firstChild);
        }
        // Add new stats
        var id = 'remote-qosInfo-' + callId;
        var qosDiv = d3.select('#' + id).append("div");
        var statsDiv = qosDiv.append('div');
        // Video stream is received
        if (qosStats[callId].mosRV === "Muted") {
            statsDiv.append('p').append('em').text('Video stream muted');
        } else if (qosStats[callId].mosRV === "NoStream") {
            statsDiv.append('p').append('em').text('No video stream');
        } else {
            // Video Statistics
            if (qosStats[callId].mosRV >= 4) {
                statsDiv.append('p').append('em').text('Video quality: Excellent  ');
            } else if (qosStats[callId].mosRV >= 3) {
                statsDiv.append('p').append('em').text('Video quality: Good  ');
            } else if (qosStats[callId].mosRV >= 2) {
                statsDiv.append('p').append('em').text('Video quality: Adequate  ');
            } else {
                statsDiv.append('p').append('em').text('Video quality: Inadequate  ');
            }
            statsDiv.append('p').append('em').text('Video bit rate:  ' + qosStats[callId].videoRBR + ' Kbps');
            statsDiv.append('p').append('em').text('Frame rate:  ' + qosStats[callId].videoRFR);

            if (qosStats[callId].videoRPL !== undefined) {
                statsDiv.append('p').append('em').text('Video packet loss:  ' + qosStats[callId].videoRPL.toFixed(2) + ' %');
            }
            statsDiv.append('p').append('em').text('Resolution:  ' + qosStats[callId].videoRWidth + '×' + qosStats[callId].videoRHeight);
        }

        // Audio stream is received
        if (qosStats[callId].mosRS === "Muted") {
            statsDiv.append('p').append('em').text('Audio stream muted');
        } else if (qosStats[callId].mosRS === "NoStream") {
            statsDiv.append('p').append('em').text('No audio stream');
        } else {
            if (qosStats[callId].mosRS >= 4) {
                statsDiv.append('p').append('em').text('Audio quality: Excellent  ');
            } else if (qosStats[callId].mosRS >= 3) {
                statsDiv.append('p').append('em').text('Audio quality: Good  ');
            } else if (qosStats[callId].mosRS >= 2) {
                statsDiv.append('p').append('em').text('Audio quality: Adequate  ');
            } else {
                statsDiv.append('p').append('em').text('Audio quality: Inadequate  ');
            }
            statsDiv.append('p').append('em').text('Audio bit rate:  ' + qosStats[callId].audioRBR + ' Kbps');

            if (qosStats[callId].audioRPL !== undefined) {
                statsDiv.append('p').append('em').text('Audio packet loss:  ' + qosStats[callId].audioRPL.toFixed(2) + ' %');
            }
            statsDiv.append('p').append('em').text('Transport type:  ' + qosStats[callId].transportType);
        }
    }

    function displayQosInfo(logoDivElt) {
        var qosInfosDiv = logoDivElt.parentNode.getElementsByClassName('qos-infos');
        var qosInfo = qosInfosDiv[0];
        qosInfo.style.display = 'block';
    }

    function removeQosInfo(logoDivElt) {
        var qosInfosDiv = logoDivElt.parentNode.getElementsByClassName('qos-infos');
        var qosInfo = qosInfosDiv[0];
        qosInfo.style.display = 'none';
    }

    //==============================
    // CREATE CONFERENCE
    //==============================
    $('#create').on('submit', function(e) {
        e.preventDefault();

        // Get conference name
        var conferenceName = document.getElementById('conference-name').value;

        document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'block';
        document.getElementById('title').style.display = 'none';
        document.getElementById('conference-title').innerHTML = 'You are in conference: ' + conferenceName;

        document.getElementById('callActions').style.display = 'block';

        // Join conference
        joinConference(conferenceName);
    });

    //==============================
    // CALL ACTIONS
    //==============================
    //muteAudio from call
    $('#muteAudio').on('click', function() {
        console.log('MAIN - Click muteAudio');
        localStream.muteAudio();
    });
    //unMuteAudio from call
    $('#unMuteAudio').on('click', function() {
        console.log('MAIN - Click unMuteAudio');
        localStream.unmuteAudio();
    });
    //muteVideo from call
    $('#muteVideo').on('click', function() {
        console.log('MAIN - Click muteVideo');
        localStream.muteVideo();
    });
    //unMuteVideo from call
    $('#unMuteVideo').on('click', function() {
        console.log('MAIN - Click unMuteVideo');
        localStream.unmuteVideo();
    });
});