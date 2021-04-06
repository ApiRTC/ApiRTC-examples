'use strict';

apiRTC.setLogLevel(10);
var localStream = null,
    screensharingStream = null,
    connectedConversation = null,
    publishedStream = null;

function subscribeToUserStream(userId, streamId, mediaType) {

    console.log("subscribeToUserStream  streamId:", streamId);
    console.log("subscribeToUserStream :", mediaType);

    var subscribeOptions = {
        audioOnly: mediaType === 'AUDIOONLY' ? true : false,
        videoOnly: mediaType === 'VIDEOONLY' ? true : false
    }

    connectedConversation.subscribeToStream(streamId, subscribeOptions)
        .then(function(stream) {
            console.log('subscribeToStream success');
        }).catch(function(err) {
            console.error('subscribeToStream error', err);
        });

    $("#" + streamId).remove();
    $("#" + streamId + '_audio').remove();
    $("#" + streamId + '_videoonly').remove();

    $("#stream_" + streamId).append('<li class="collection-item" id=' + streamId + '><div>' + 'Stream for userId:' + userId + '<button type="submit" onclick="unsubscribeStream(' + userId + ',' + streamId + ')" class="secondary-content"><i class="material-icons">Unsubscribe</i></button></div></li>');
}

function unsubscribeStream(userId, streamId) {
    console.log("unsubscribeStream :", streamId);
    console.log("unsubscribeStream, userId:", userId);

    connectedConversation.unsubscribeToStream(streamId);

    var mediaType = 'VIDEO',
        streamInfo = connectedConversation.getStreamInfo(streamId);

    console.log("connectedConversation.getStreamInfo :", streamInfo);

    if (streamInfo !== undefined) {

        $("#" + streamId).remove();

        if (streamInfo.hasAudio && streamInfo.hasVideo) {
            $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe</i></button></div></li>');
        }
        if (streamInfo.hasAudio) {
            mediaType = 'AUDIOONLY';
            $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '_audio' + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe Audio Only</i></button></div></li>');
        }
        if (streamInfo.hasVideo) {
            mediaType = 'VIDEOONLY';
            $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '_videoonly' + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe Video Only</i></button></div></li>');
        }
    }
}

function unpublishStream() {
    console.log("unpublishStream");

    connectedConversation.unpublish(publishedStreams);
    publishedStream = null;

    var audioOnly = false,
        videoOnly = false;

    $("#publishStatus").replaceWith('<div class="collection-header" id=publishStatus>Status : Your stream is not published</div>');

    $("#publish").replaceWith('<li class="collection-item" id=publish><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ');" class="secondary-content"><i class="material-icons">Publish</i></button></div></li>');
    audioOnly = true;
    $("#streamPub").append('<li class="collection-item" id=publishAudio><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ');" class="secondary-content"><i class="material-icons">Publish Audio Only</i></button></div></li>');
    audioOnly = false;
    videoOnly = true;
    console.log("videoOnly in joinMCUSessionAnswerHandler:", videoOnly);
    $("#streamPub").append('<li class="collection-item" id=publishVideoOnly><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ',' + videoOnly + ');" class="secondary-content"><i class="material-icons">Publish Video Only</i></button></div></li>');
}

function publishStream(audioOnly, videoOnly) {

    console.log("publishStream audioOnly:" + audioOnly);
    console.log("publishStream videoOnly:" + videoOnly);

    if (videoOnly === undefined) {
        videoOnly = false;
    }

    var publishOptions = {
        audioOnly: audioOnly,
        videoOnly: videoOnly
    }

    connectedConversation.publish(localStream, publishOptions)
        .then(function(stream) {

            publishedStream = stream;
            console.log("publish success:" + stream);

            $("#publish").replaceWith('<li class="collection-item" id=publish><div>' + 'My Stream :' + '<button type="submit" onclick="unpublishStream(' + stream.getId() + ');" class="secondary-content"><i class="material-icons">Unpublish</i></button></div></li>');
            $("#publishAudio").remove();
            $("#publishVideoOnly").remove();
            $("#publishStatus").replaceWith('<div class="collection-header" id=publishStatus>Status : Your stream is published. AudioOnly : ' + audioOnly + ' , VideoOnly :' + videoOnly + '</div>');

        }).catch(function(err) {
            console.error('Conversation publish error', err);
        });
}

function joinConference(name) {
    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;

    $("#text").hide();

    //==============================
    // CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
        uri: 'apzkey:myDemoApiKey'
    });

    //==============================
    // REGISTER
    //==============================
    ua.register({
        cloudUrl: cloudUrl
    }).then(function(session) {
        // Save session
        connectedSession = session;

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

            var mediaType = 'VIDEO';

            if (streamInfo.listEventType === 'added') {
                if (streamInfo.isRemote === true) {
                    $("#remoteStreamList").append('<div id=stream_' + streamInfo.streamId + '></div>');
                } else {
                    console.log("my own stream is available on MCU");
                    $("#localStreamList").append('<div id=stream_' + streamInfo.streamId + '></div>');
                }

                $("#stream_" + streamInfo.streamId).append('<div class="collection-item" id=streamStatus' + streamInfo.streamId + '><div>  This stream has Audio : ' + streamInfo.hasAudio + ' , has Video : ' + streamInfo.hasVideo + ' , is screenSharing : ' + streamInfo.isScreensharing + '</div></div>');
                if (streamInfo.hasAudio && streamInfo.hasVideo) {
                    $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe</i></button></div></li>');
                }
                if (streamInfo.hasAudio) {
                    mediaType = 'AUDIOONLY';
                    $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '_audio' + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe Audio Only</i></button></div></li>');
                }
                if (streamInfo.hasVideo) {
                    mediaType = 'VIDEOONLY';
                    $("#stream_" + streamInfo.streamId).append('<li class="collection-item" id=' + streamInfo.streamId + '_videoonly' + '><div>' + 'Stream for userId:' + streamInfo.contact.getId() + '<button type="submit" onclick="subscribeToUserStream(' + streamInfo.contact.getId() + ',' + streamInfo.streamId + ',' + "'" + mediaType + "'" + ')" class="secondary-content"><i class="material-icons">Subscribe Video Only</i></button></div></li>');
                }

            } else if (streamInfo.listEventType === 'removed') {

                $("#streamStatus" + streamInfo.streamId).remove();
                $("#" + streamInfo.streamId).remove();
                $("#" + streamInfo.streamId + '_audio').remove();
                $("#" + streamInfo.streamId + '_videoonly').remove();
            }
        });
        //=====================================================
        // ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
        //=====================================================
        connectedConversation.on('streamAdded', function(stream) {
            stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
        }).on('streamRemoved', function(stream) {
            stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
        });

        connectedConversation.on('error', function(errorInfo) {
            console.error("connectedConversation error streamInfo :", errorInfo.streamInfo);
            console.error("connectedConversation error errorCode :", errorInfo.errorCode);
            console.error("connectedConversation error errorInfo :", errorInfo.errorInfo);
        });

        //==============================
        // CREATE LOCAL STREAM
        //==============================
        var createStreamOptions = {};
        createStreamOptions.constraints = {
            audio: true,
            video: true
        };

        ua.createStream(createStreamOptions)
            .then(function(stream) {

                console.log('createStream :', stream);

                // Save local stream
                localStream = stream;
                stream.removeFromDiv('local-container', 'local-media');
                stream.addInDiv('local-container', 'local-media', {}, true);

                //==============================
                // JOIN CONVERSATION
                //==============================
                connectedConversation.join()
                    .then(function(response) {

                        $("#streamsList").append('<div class="collection-header" id=localStreamList><h5>Manage my stream :</h5></div>');
                        $("#streamsList").append('<div class="collection-header" id=remoteStreamList><h5>List of available streams in room :</h5></div>');

                        //==============================
                        // ADD PUBLISH BUTTONS
                        //==============================
                        var audioOnly = false;
                        var videoOnly = false;

                        console.log("audioOnly in joinMCUSessionAnswerHandler:", audioOnly);

                        $("#localStreamList").append('<div id=streamPub></div>');

                        $("#streamPub").append('<div class="collection-header" id=publishStatus>Status : Your stream is not published</div>');

                        $("#streamPub").append('<li class="collection-item" id=publish><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ');" class="secondary-content"><i class="material-icons">Publish</i></button></div></li>');
                        audioOnly = true;
                        console.log("audioOnly in joinMCUSessionAnswerHandler:", audioOnly);
                        $("#streamPub").append('<li class="collection-item" id=publishAudio><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ');" class="secondary-content"><i class="material-icons">Publish Audio Only</i></button></div></li>');
                        audioOnly = false;
                        videoOnly = true;
                        console.log("videoOnly in joinMCUSessionAnswerHandler:", videoOnly);
                        $("#streamPub").append('<li class="collection-item" id=publishVideoOnly><div>' + 'My Stream :' + '<button type="submit" onclick="publishStream(' + audioOnly + ',' + videoOnly + ');" class="secondary-content"><i class="material-icons">Publish Video Only</i></button></div></li>');

                    }).catch(function(err) {
                        console.error('Conversation join error', err);
                    });

            }).catch(function(err) {
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
    document.getElementById('callActions').style.display = 'block';
    // Join conference
    joinConference(conferenceName);
});

//==============================
// LOCAL STREAM ACTIONS
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

//==============================
// SCREENSHARING FEATURE
//==============================
$('#toggle-screensharing').on('click', function() {
    if (screensharingStream === null) {

        const displayMediaStreamConstraints = {
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        };

        apiRTC.Stream.createDisplayMediaStream(displayMediaStreamConstraints, false)
            .then(function(stream) {

                stream.on('stopped', function() {
                    //Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
                    console.log("stopped event on stream");
                    var elem = document.getElementById('local-screensharing');
                    if (elem !== null) {
                        elem.remove();
                    }
                    screensharingStream = null;
                });

                screensharingStream = stream;
                connectedConversation.publish(screensharingStream);
                // Get media container
                var container = document.getElementById('local-container');

                // Create media element
                var mediaElement = document.createElement('video');
                mediaElement.id = 'local-screensharing';
                mediaElement.autoplay = true;
                mediaElement.muted = true;

                // Add media element to media container
                container.appendChild(mediaElement);

                // Attach stream
                screensharingStream.attachToElement(mediaElement);

            })
            .catch(function(err) {
                console.error('Could not create screensharing stream :', err);
            });
    } else {
        connectedConversation.unpublish(screensharingStream);
        screensharingStream.release();
        screensharingStream = null;
        var elem = document.getElementById('local-screensharing');
        if (elem !== null) {
            elem.remove();
        }
    }
});