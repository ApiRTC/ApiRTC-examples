
'use strict';
var connectedSession = null;

//TODO manage several simultaneous transfer

var fileTransferInvitation = null;

apiRTC.setLogLevel(10);

function createDownloadLink(fileUrl, fileName) {
    var downloadDiv = null,
        text = null;

    downloadDiv = document.querySelector('a#downloadLink');

    if (fileUrl instanceof Blob) {
        downloadDiv.href = (window.URL || window.webkitURL).createObjectURL(fileUrl);
    } else {
        downloadDiv.href = fileUrl;
    }
    downloadDiv.innerHTML = ""; //Cleaning downloadDiv
    downloadDiv.download = fileName;
    text = 'Click to download \'' + fileName; // + '\' (' + file.size + ' bytes)';
    downloadDiv.appendChild(document.createTextNode(text));
    downloadDiv.style.display = 'block';
    downloadDiv.style.color = 'white';
}

function cancelFile(invitationId) {
    console.log("cancelFile :", invitationId);
    fileTransferInvitation.cancel();
}

function sendFile(userId) {
    var contact = connectedSession.getContact(userId);

    if (contact !== null) {

        var file = $('#contactFileToSend')[0].files[0];

        if (file === undefined) {
            console.error("You need to select a file");
            return;
        }

        console.log("sendFile file.name :", file.name);
        console.log("sendFile file.type :", file.type);

        contact.on('fileTransferProgress', (info, transferInformation) => {

            console.debug("fileTransferProgress info.fileInfo :", info.fileInfo);
            console.debug("fileTransferProgress info.transferInformation :", info.transferInformation);

            if(info.transferInformation.percentage === 0 || info.transferInformation.percentage === 100) {
                $( "#progressbar" ).hide();
            } else {
                $( "#progressbar" ).show();
            }
            $( "#progressbar" ).progressbar({
                value: info.transferInformation.percentage
            });
        });

        var fileInfo = {
            name: file.name,
            type: file.type
        };

        fileTransferInvitation = contact.sendFile(fileInfo, file);
        console.debug("fileTransferInvitation :", fileTransferInvitation);

        if (fileTransferInvitation) {
            fileTransferInvitation
                .on('statusChange', (statusChangeInfo) => {
                    console.debug('statusChange :', statusChangeInfo.status);

                    if(statusChangeInfo.status === apiRTC.INVITATION_STATUS_ENDED) {
                        console.debug('status ended');
                        //Removing progress bar when ended
                        $("#progressbar").hide();
                        $("#cancel_" + statusChangeInfo.id).remove();
                    }
                });

    //TODO add fileTransferInvitation in table

            var cancelEl = document.getElementById('cancelList');

            var liEl = document.createElement('li');
            var labelEl = document.createElement('span');
            //labelEl.innerHTML = user.getUsername();
            //labelEl.innerHTML = user.getId();
            labelEl.className = 'label';
            liEl.appendChild(labelEl);
            liEl.setAttribute('id', 'cancel_' + fileTransferInvitation.getId());

            var cancelSendFileButton = document.createElement('input');
            cancelSendFileButton.className = 'cancelFileButton btn green';
            cancelSendFileButton.setAttribute('type', 'button');
            cancelSendFileButton.setAttribute('value', 'Cancel file');
            cancelSendFileButton.setAttribute('onclick', 'cancelFile(' + fileTransferInvitation.getId() + ')');
            liEl.appendChild(cancelSendFileButton);
            cancelEl.appendChild(liEl);
        } else {
            console.error("Error on sendFile");
        }
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
            if (user.isOnline()) {
                var liEl = document.createElement('li');
                var labelEl = document.createElement('span');
                //labelEl.innerHTML = user.getUsername();
                labelEl.innerHTML = user.getId();
                labelEl.className = 'label';
                liEl.appendChild(labelEl);

                var sendFileButton = document.createElement('input');
                sendFileButton.className = 'sendFileButton btn green';
                sendFileButton.setAttribute('user-id', user.getId());
                sendFileButton.setAttribute('type', 'button');
                sendFileButton.setAttribute('value', 'Send file');
                sendFileButton.setAttribute('onclick', 'sendFile(' + user.getId() + ')');
                liEl.appendChild(sendFileButton);

                userListEl.appendChild(liEl);
            }
        }
    }
}

//==============================
// CREATE USER AGENT
//==============================
var apiKey = '#INSERT_YOUR_API_KEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)

var ua = new apiRTC.UserAgent({
    uri: 'apiKey:'  + apiKey
});

console.log('register');
//==============================
// REGISTER
//==============================

var registerInformation = {};

ua.register(registerInformation).then(function(session) {
    // Save session
    connectedSession = session;

    connectedSession
        .on("contactListUpdate", function (updatedContacts) { //display a list of connected users
            console.log("MAIN - contactListUpdate", updatedContacts);
            renderUserList();
        })
        .on('fileTransferInvitation', function (invitation) {

            console.log("invitation :", invitation);
            invitation
                .on('statusChange', (newStatus) => {
                    console.debug('statusChange :', newStatus);

                    if(newStatus === apiRTC.INVITATION_STATUS_ENDED || newStatus === apiRTC.INVITATION_STATUS_CANCELLED) {
                        console.debug('status ended');
                        //Removing progress bar when ended
                        $("#progressbar").hide();

                        $("#invitationDialog").dialog("close");
                    }
                });

            $("#invitationSender").text(invitation.sender.getUsername());
            $("#invitationDialog").dialog({
                resizable: false,
                height: "auto",
                width: 400,
                modal: true,
                buttons: {
                    Accept: function () {

                        invitation.on('progress', (progress) => {
                                $('#file-transfer-progress').attr("style", 'width: ' + progress.percentage + '%');

                                if(progress.percentage === 0 || progress.percentage === 100) {
                                    $( "#progressbar" ).hide();
                                } else {
                                    $( "#progressbar" ).show();
                                }
                                $( "#progressbar" ).progressbar({
                                    value: progress.percentage
                                });
                            });

                        invitation.accept()
                            .then((fileObj) => {
                                $('#file-transfer-result-wrapper').show();

                                console.log("name :", fileObj.name);
                                console.log("type :", fileObj.type);

                                createDownloadLink(fileObj.file, fileObj.name);

                                if (fileObj.type === 'image/png' || fileObj.type === 'image/jpeg' || fileObj.type === 'image/gif') {

                                    console.log("Received file is an image, displaying in HTML");

                                    var urlCreator = window.URL || window.webkitURL;
                                    var imageUrl = urlCreator.createObjectURL(fileObj.file);

                                    $('#file-transfer-result').attr("src", imageUrl);
                                    $('#received-file-name').html(fileObj.name);
                                    $('#received-file-type').html(fileObj.type);
                                }
                            }).catch(function (error) {
                                console.error('invitation.accept error :', error);
                            });

                        $(this).dialog("close");
                    },
                    Decline: function () {
                        invitation.decline();
                        $(this).dialog("close");
                    }
                }
            });
        });

    // Display user number
    document.getElementById('my-number').innerHTML = 'Your number is ' + connectedSession.id;
}).catch(function(error) {
    // error
    console.error('User agent registration failed', error);
});
