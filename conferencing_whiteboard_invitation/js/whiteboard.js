
'use strict';
var cloudUrl = 'https://cloud.apizee.com';
var connectedSession = null;
var localStream = null;
var call = null;
var contact = null;
var whiteBoardClient = null;
var connectedConversation = null;

function showCallArea() {
    document.getElementById('start-call').style.display = 'none';
    document.getElementById('call').style.display = 'inline-block';
    document.getElementById('title').innerHTML = 'You are currently in a video call';
}
function hideCallArea() {
    document.getElementById('start-call').style.display = 'inline-block';
    document.getElementById('call').style.display = 'none';
    document.getElementById('title').innerHTML = 'Video call demo';
}
function showOfflineWhiteboardArea() {
    document.getElementById('offlineWhiteboard').style.display = 'inline-block';
}
function hideOfflineWhiteboardArea() {
    document.getElementById('offlineWhiteboard').style.display = 'none';
}
function showOnlineWhiteboardArea() {
    document.getElementById('onlineWhiteboard').style.display = 'inline-block';
}
function hideOnlineWhiteboardArea() {
    document.getElementById('onlineWhiteboard').style.display = 'none';
}
function showWhiteboardFctArea() {
    document.getElementById('whiteboardFct').style.display = 'inline-block';
}
function hideWhiteboardFctArea() {
    document.getElementById('whiteboardFct').style.display = 'none';
}
function manageInvite(contact) {
    var invitation = contact.inviteTo(connectedConversation);

    //when contact answer to invitation
    invitation.onResponse(function (status) {
        if (status === apiRTC.INVITATION_STATUS_ACCEPTED) { //join when other contact accepted invitation

            console.warn('Invitation accepted! ');
            showOnlineWhiteboardArea();

        } else {
            console.warn('Invitation declined! ');
        }
    });
}

function setConversationListeners() {

    console.log("setConversationListeners");

    connectedConversation
        .on("newWhiteboardSession", function () {
            console.log("newWhiteboardSession in client page");
            connectedConversation.startNewWhiteboardSession('paper');
            whiteBoardClient = ua.getWhiteboardClient();
            //whiteBoardClient.setCanvas('paper');
            //whiteBoardClient.setUserCursorColor('#07a3b2');
            //whiteBoardClient.setUserCursorColor('invisible');
            whiteBoardClient.setUserCursorColor();
            whiteBoardClient.setFocusOnDrawing(true);
            showWhiteboardFctArea();
        })
        .on("whiteboardRoomMemberUpdate", function (e) {
            console.log("whiteboardRoomMemberUpdate roomId :", e.roomId);
            console.log("whiteboardRoomMemberUpdate status :", e.status);
            console.log("whiteboardRoomMemberUpdate status :", e.contacts);
        });
}

function inviteContact(userId) {
    var contact = connectedSession.getContact(userId);

    if (contact !== null) {
        if (connectedConversation === null) {
            connectedConversation = connectedSession.getConversation((Date.now() + '-' + userId));
        }
        if (connectedConversation.isJoined() ){
            manageInvite(contact);
        } else {
            connectedConversation.join({session: connectedSession}).then(function () {
                console.warn('Conversation joigned');
                manageInvite(contact);
            });
        }
        setConversationListeners();
    }
}

//renders the connected user list
function renderUserList() {
    if (connectedSession !== null) {
        var contactList = connectedSession.getContacts();
        var userListEl = document.getElementById('contactList');
        userListEl.innerHTML = '';
        for (var key of Object.keys(contactList)) {
            var user = contactList[key];
            console.warn('user :', user);
            if (user.isOnline()) {
                var liEl = document.createElement('li');
                var labelEl = document.createElement('span');
                //labelEl.innerHTML = user.getUsername();
                labelEl.innerHTML = 'Contact : ' + user.getId() + ' ';
                labelEl.className = 'label';
                liEl.appendChild(labelEl);

                var inputEl = document.createElement('input');
                inputEl.className = 'callButton btn green';
                inputEl.setAttribute('user-id', user.getId());
                inputEl.setAttribute('type', 'button');
                inputEl.setAttribute('value', 'Invite to conversation');
                inputEl.setAttribute('onclick', 'inviteContact(' + user.getId() + ')' );
                liEl.appendChild(inputEl);
                userListEl.appendChild(liEl);
            }
        }
    }
}

function register() {
    //==============================
    // REGISTER
    //==============================

    apiRTC.setLogLevel(10);

    ua.register({
        cloudUrl: cloudUrl
    }).then(function(session) {

        // Save session
        connectedSession = session;

        connectedSession
            .on("contactListUpdate", function (updatedContacts) { //display a list of connected users
                console.log("MAIN - contactListUpdate", updatedContacts);
                renderUserList();
            })
            .on("conversationInvitation", function (invitation) { //When client receives an invitation from another user
                console.warn("Invitation received from " + invitation.sender.getId());

                $("#invitationSender").text(invitation.sender.getUsername());
                $("#invitationDialog").dialog({
                    resizable: false,
                    height: "auto",
                    width: 400,
                    modal: true,
                    buttons: {
                        Accept: function () {

                            connectedConversation = invitation.getConversation();
                            setConversationListeners();

                            invitation.accept()
                                .then(function(conversation) {
                                    showOnlineWhiteboardArea();
                                }).catch(function(error) {
                                    // error
                                    console.error('Error on invitation accept :', error);
                                });
                            $(this).dialog("close");
                        },
                        Decline: function () {
                            invitation.decline();
                            $(this).dialog("close");
                        }
                    }
                });
            })
            .on('conversationJoinRequest', function(request) {
                console.warn("conversationJoinRequest");
            });

        // Display user number
        document.getElementById('my-number').innerHTML = 'Your number is ' + connectedSession.id;

    }).catch(function(error) {
        // error
        console.error('User agent registration failed', error);
    });
}

function unregister() {
    console.log('unregister');
    //==============================
    // UNREGISTER
    //==============================
    ua.unregister().then(function() {
        console.log('unregister success');
        hideOnlineWhiteboardArea();
    }).catch(function(error) {
        // error
        console.error('User agent unregistration failed', error);
    });
}

//==============================
// CREATE USER AGENT
//==============================
var ua = new apiRTC.UserAgent({
    uri: 'apzkey:myDemoApiKey',
});

// Click on register button
$('#register').on('click', function() {
    console.log('register');
    register();
    hideOfflineWhiteboardArea();
});
// Click on unregister button
$('#unregister').on('click', function() {
    unregister();
    showOfflineWhiteboardArea();
});

//==============================
// WHITEBOARD START / STOP BUTTONS
//==============================

//==== OFFLINE MODE

// Click on startWhiteboard button
$('#startOfflineWhiteboard').on('click', function() {
    console.log('startOfflineWhiteboard');

    //ua.startWhiteboard('paper', 'invisible');
    //ua.startWhiteboard('paper', '#07a3b2');
    ua.startWhiteboard('paper');

    //Getting whiteboardClient in order to be able to set UI parameters
    whiteBoardClient = ua.getWhiteboardClient();
    whiteBoardClient.setFocusOnDrawing(true);
    showWhiteboardFctArea();
});
// Click on stopWhiteboard button
$('#stopOfflineWhiteboard').on('click', function() {
    console.log('stopOfflineWhiteboard');
    ua.stopWhiteboard();
    hideWhiteboardFctArea();
});

//==== ON CONVERSATION MODE

$('#startOnlineWhiteboard').on('click', function() {
    console.log('startOnlineWhiteboard');
    connectedConversation.startNewWhiteboardSession('paper');
    //connectedConversation.startNewWhiteboardSession('paper', '#07a3b2');
    //connectedConversation.startNewWhiteboardSession('paper', 'invisible');

    //Getting whiteboardClient in order to be able to set UI parameters
    whiteBoardClient = ua.getWhiteboardClient();
    whiteBoardClient.setFocusOnDrawing(true);
    showWhiteboardFctArea();
});
$('#stopOnlineWhiteboard').on('click', function() {
    console.log('stopOnlineWhiteboard');
    connectedConversation.stopNewWhiteboardSession();
    hideWhiteboardFctArea();
});

//==============================
// WHITEBOARD FUNCTIONS
//==============================
$('#touchScreen').on('click', function() {
    console.log('touchScreen');
    whiteBoardClient.toggleTouchScreen();
});

$('#setReadOnlyTrue').on('click', function() {
    console.log('setReadOnlyTrue');
    whiteBoardClient.setReadOnly(true);
});
$('#setReadOnlyFalse').on('click', function() {
    console.log('setReadOnlyFalse');
    whiteBoardClient.setReadOnly(false);
});

$('#clearPaper').on('click', function() {
    console.log('clearPaper');
    whiteBoardClient.deleteHistory();
});
$('#drawingTool').change(function(){
    whiteBoardClient.setDrawingTool($('#drawingTool').val());
});
$('#brushSize').change(function(){
    whiteBoardClient.setBrushSize($('#brushSize').val());
});
$('#brushColor').change(function(){
    whiteBoardClient.setBrushColor($('#brushColor').val());
});
$('#textInputScale').change(function(){
    whiteBoardClient.setScale($('#textInputScale').val());
});
$('#textInputOffsetX').change(function(){
    whiteBoardClient.setOffset($('#textInputOffsetX').val(), $('#textInputOffsetY').val());
});
$('#textInputOffsetY').change(function(){
    whiteBoardClient.setOffset($('#textInputOffsetX').val(), $('#textInputOffsetY').val());
});
$('#textInputButton').click(function(){
    whiteBoardClient.printSharedText($('#textInputX').val(), $('#textInputY').val(), $('#textInput').val(), 20);
});
$('#undo').click(function(){
    console.log('undo');
    whiteBoardClient.undo();
});
$('#redo').click(function(){
    console.log('redo');
    whiteBoardClient.redo();
});