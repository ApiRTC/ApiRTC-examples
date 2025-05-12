'use strict';
apiRTC.setLogLevel(10);

var localStream = null,
    screensharingStream = null,
    connectedConversation = null,
    checkboxModeration = document.getElementById("moderation_checkbox"),
    checkboxModerator = document.getElementById("moderator_checkbox"),
    connectedSession = null,
    ua = null;
/*
checkboxModeration.onchange = function (e) {
    console.debug("checkboxModeration onchange :", e);
    console.debug("checkboxModeration.checked:", checkboxModeration.checked);
};
checkboxModerator.onchange = function (e) {
    console.debug("checkboxModerator onchange :", e);
    console.debug("checkboxModerator.checked:", checkboxModerator.checked);
};
*/

//MODERATION
function acceptUserInConference(contactId) {
    let contact = connectedSession.getContact(contactId);
    console.error("acceptUserInConference userId :", contactId);
    // Accept the user in the conference
    connectedConversation.allowEntry(contact);
    $("#contact_" + contact.getId()).remove();

    $("#roomUsersList").append('<div id=contactInRoom_' + contactId + '></div>');
    // Display eject the contact in the room
    $("#contactInRoom_" + contactId).append('<div>' +
        'UserId :' + contactId + '<button type="submit" onclick="ejectUserFromConference(' + contactId +
            ')" class="secondary-content"><i class="material-icons">Eject</i></button></div>');
}

function refuseUserInConference(contactId) {
    let contact = connectedSession.getContact(contactId);
    console.error("refuseUserInConference userId :", contactId);
    // Refuse the user in the conference
    connectedConversation.denyEntry(contact);
    $("#contact_" + contact.getId()).remove();
}

function ejectUserFromConference(contactId) {
    let contact = connectedSession.getContact(contactId);
    console.error("refuseUserInConference userId :", contactId);

    connectedConversation.eject(contact, { reason: 'You have been ejected by moderator' })
        .then(() => {
            console.log('Contact ejected :', contactId);
        }).catch((error) => {
            console.error('eject error', error);
        });

    $("#contactInRoom_" + contactId).remove();
}

let contactJoinedWaitingRoomListener = (contact) => {
//function contactJoinedWaitingRoomListener (contact) {
    // A candidate joined the waiting room.
    // Store it into a list and display it in the DOM
    // ...
    console.error('contactJoinedWaitingRoom', contact);

    if (contact === null || contact === undefined) {
        console.error('contactJoinedWaitingRoom contact is null or undefined');
        return;
    } 

    // Display the contact in the waiting room
    if ($("#contact_" + contact.getId()).length > 0) {
        console.error('contactJoinedWaitingRoom contact already exists in the list');
        return;
    }

    $("#moderatedUsersList").append('<div id=contact_' + contact.getId() + '></div>');
    // Display buttons to accept / refuse the contact in the waiting room
    $("#contact_" + contact.getId()).append('<div>' +
        'UserId :' + contact.getId() + '<button type="submit" onclick="acceptUserInConference(' + contact.getId() +
            ')" class="secondary-content"><i class="material-icons">Accept</i></button><button type="submit" onclick="refuseUserInConference(' + contact.getId() +
            ')" class="secondary-content"><i class="material-icons">Refuse</i></button></div>');
};

let contactLeftWaitingRoomListener = (contact) => {
    // A candidate left the waiting room.
    // Remove the contact from the waiting room
    console.error('contactLeftWaitingRoom event for contact with Id :', contact.getId());
    $("#contact_" + contact.getId()).remove();
}

let participantEjectedListener = (data) => {
    // A participant has been ejected from the conference
    console.error('participantEjected event :', data);
    if (data.self) {
        // local user was ejected,
        leaveConversation();
    } else {
        console.error('participantEjected event for contact with Id :', data.contact.getId());
    }
}
//MODERATION

let streamListChangedListener = (streamInfo) => {

    console.log("streamListChanged :", streamInfo);

    var subscribeOptions = {
        //audioOnly : true,
        //videoOnly : true
    };

    if (streamInfo.listEventType === 'added') {
        if (streamInfo.isRemote === true) {

            connectedConversation.subscribeToMedia(streamInfo.streamId, subscribeOptions)
                .then(function(stream) {
                    console.log('subscribeToMedia success');
                }).catch(function(err) {
                    console.error('subscribeToMedia error', err);
                });
        }
    }
}

let streamAddedListener = (stream) => {
    // A new stream is added to the conversation
    // Display it in the DOM
    stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
    /*
                    // Subscribed Stream is available for display
                    // Get remote media container
                    var container = document.getElementById('remote-container');
                    // Create media element
                    var mediaElement = document.createElement('video');
                    mediaElement.id = 'remote-media-' + stream.streamId;
                    mediaElement.autoplay = true;
                    mediaElement.muted = false;
                    // Add media element to media container
                    container.appendChild(mediaElement);
                    // Attach stream
                    stream.attachToElement(mediaElement);
    */

}

let streamRemovedListener = (stream) => {
    stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
    /*
                    document.getElementById('remote-media-' + stream.streamId).remove();
    */
}

let conversationErrorListener = (errorInfo) => {
    console.error("connectedConversation error streamInfo :", errorInfo.streamInfo);
    console.error("connectedConversation error errorCode :", errorInfo.errorCode);
    console.error("connectedConversation error errorInfo :", errorInfo.errorInfo);
}

function joinConference(name) {

    var cloudUrl = 'https://cloud.apizee.com';

    //==============================
    // 1/ CREATE USER AGENT
    //==============================
    ua = new apiRTC.UserAgent({
        uri: 'apzkey:myDemoApiKey'
    });

    var registerInformation = {};
    registerInformation.cloudUrl = cloudUrl;

    //==============================
    // 2/ REGISTER
    //==============================
    ua.register(registerInformation).then(function(session) {
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
        // 3/ CREATE CONVERSATION
        //==============================

        //ua.enableMeshRoomMode(true); //Activate Mesh room mode

        // Create conversation
        if(checkboxModeration.checked) {
            console.error("Moderation is activated");
        } else {
            console.error("Moderation is NOT activated");
        }
        if(checkboxModerator.checked) {
            console.error("User is activated as moderator");
        } else {
            console.error("User is not a moderator");
        }

//MODERATION
        let conversationOptions = {
            //meshModeEnabled: true,
            moderationEnabled: checkboxModeration.checked,
            moderator: checkboxModerator.checked
        };
//MODERATION

        connectedConversation = connectedSession.getOrCreateConversation(name, conversationOptions);

        //==========================================================
        // 4/ ADD EVENTS LISTENERS ON CONVERSATION
        //==========================================================
        connectedConversation.on('streamListChanged', streamListChangedListener);
        connectedConversation.on('streamAdded', streamAddedListener);
        connectedConversation.on('streamRemoved', streamRemovedListener);
        connectedConversation.on('error', conversationErrorListener);

//MODERATION
        connectedConversation.on('contactJoinedWaitingRoom', contactJoinedWaitingRoomListener);
        connectedConversation.on('contactLeftWaitingRoom', contactLeftWaitingRoomListener);
        connectedConversation.on('participantEjected', participantEjectedListener);
//MODERATION

        //==============================
        // 5/ CREATE LOCAL STREAM
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
                /*
                                    // Get media container
                                    var container = document.getElementById('local-container');

                                    // Create media element
                                    var mediaElement = document.createElement('video');
                                    mediaElement.id = 'local-media';
                                    mediaElement.autoplay = true;
                                    mediaElement.muted = true;

                                    // Add media element to media container
                                    container.appendChild(mediaElement);

                                    // Attach stream
                                    localStream.attachToElement(mediaElement);
                */

                //==============================
                // 6/ JOIN CONVERSATION
                //==============================
                connectedConversation.join()
                    .then(function(response) {
                        //==============================
                        // 7/ PUBLISH OWN STREAM
                        //==============================
                        connectedConversation.publish(localStream);
                    }).catch(function(err) {
                        console.error('Conversation join error : ', err);
                        leaveConversation();
                    });

            }).catch(function(err) {
                console.error('create stream error', err);
            });
    });
}

function removeEventListeners() {

    console.error("removeListener");

    connectedConversation.removeListener('streamAdded', streamAddedListener);
    connectedConversation.removeListener('streamRemoved', streamRemovedListener);
    connectedConversation.removeListener('streamListChanged', streamListChangedListener);
    connectedConversation.removeListener('error', conversationErrorListener);
//MODERATION
    connectedConversation.removeListener('contactJoinedWaitingRoom', contactJoinedWaitingRoomListener);
    connectedConversation.removeListener('contactLeftWaitingRoom',contactLeftWaitingRoomListener);
    connectedConversation.removeListener('participantEjected', participantEjectedListener);
//MODERATION
}

function leaveConversation() {
    if (connectedConversation !== null) {
        removeEventListeners();
        connectedConversation.leave().then(function() {
            console.log('leave success');
        }).catch(function(err) {
            console.error('leave error', err);
        });
        connectedConversation = null;
    }
    if (localStream !== null) {
        localStream.release();
        localStream = null;
    }
    if (screensharingStream !== null) {
        screensharingStream.release();
        screensharingStream = null;
    }
    document.getElementById('create').style.display = 'inline-block';
    document.getElementById('conference').style.display = 'none';
    document.getElementById('callActions').style.display = 'none';

    ua.unregister()
        .then(function() {
            console.log('unregister success');
        })
        .catch(function(err) {
            console.error('unregister error', err);
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
// CALL ACTIONS
//==============================
//muteAudio from call
$('#muteAudio').on('click', function() {
    console.log('MAIN - Click muteAudio');
    localStream.disableAudio();
});
//unMuteAudio from call
$('#unMuteAudio').on('click', function() {
    console.log('MAIN - Click unMuteAudio');
    localStream.enableAudio();
});
//muteVideo from call
$('#muteVideo').on('click', function() {
    console.log('MAIN - Click muteVideo');
    localStream.disableVideo();
});
//unMuteVideo from call
$('#unMuteVideo').on('click', function() {
    console.log('MAIN - Click unMuteVideo');
    localStream.enableVideo();
});

//==============================
// SCREENSHARING FEATURE
//==============================
$('#toggle-screensharing').on('click', function() {
    if (screensharingStream === null) {

        const displayMediaStreamConstraints = {
            video: {
                cursor: "always",
                displaySurface: "monitor"
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

//Leave Conversation from call
$('#leaveConversation').on('click', function() {
    console.log('MAIN - Click leaveConversation');
    leaveConversation();
});
