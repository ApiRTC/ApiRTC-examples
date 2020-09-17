$(function () {
    'use strict';

    apiRTC.setLogLevel(10);

    var localStream = null;
    var remoteStream = null;
    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var ua = null;
    var currentCall = null;
    var fileTransferInvitation = null;

    // User actions

    $('#callButton').on('click', function (e) {
        e.preventDefault();
        console.log('Click call');
        var callUserId = $('#callUserId').val();
        if (callUserId) {
            call(callUserId);
        }
    });

    $('#hangUpButton').on('click', function (e) {
        e.preventDefault();
        console.log('Click hang up button');
        hangUp();
    });

    $('#sendFileButton').on('click', function (e) {
        e.preventDefault();
        console.log('Click send file');
        sendFile();
    });

    $('#cancelSendFileButton').on('click', function (e) {
        e.preventDefault();
        console.log('Click cancel send file');
        cancelSendFile();
    });

    updateCallUIState('offline');

    register();

    //

    function register() {

        ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
        });

        ua.register({
            cloudUrl: cloudUrl
        }).then(function (session) {
            console.log('User registered successfully');
            connectedSession = session;
            setSessionListeners(connectedSession);
            updateCallUIState('ready');
        });
    }

    function call(userId) {
        var contact = connectedSession.getOrCreateContact(userId);
        currentCall = contact.call();
        if (currentCall === null) {
            console.warn('Cannot establish the call');
            return;
        }
        setCallListeners(currentCall);
        updateCallUIState('call');
    }

    function setSessionListeners(session) {
        session.on('incomingCall', function (invitation) {
            console.log('incomingCall');
            invitation.accept()
                .then(function (call) {
                    currentCall = call;
                    setCallListeners(currentCall);
                    updateCallUIState('call');
                });
        });

        session.on('fileTransferInvitation', function (invitation) {
            console.log('fileTransferInvitation');
            
            invitation.on('statusChange', function (newStatus) {
                console.log('fileTransferInvitation statusChange :', newStatus);
                // To learn about constants look at https://dev.apirtc.com/reference/Constants.html
                if (newStatus.status === apiRTC.INVITATION_STATUS_ENDED || newStatus.status === apiRTC.INVITATION_STATUS_CANCELLED) {
                    updateTransferUIState('ready');
                }
            });
            invitation.on('progress', function (progress) {
                console.debug('fileTransferProgress :', progress);
                document.querySelector('#sendFileProgressLabel').innerHTML = progress.percentage + '%'; 
            });

            updateTransferUIState('transfer');

            invitation.accept()
                .then(function (fileObj) {
                    console.log('File transfer completed with obj:', fileObj);
                    updateTransferUIState('ready');
                    createDownloadLink(fileObj.file, fileObj.name);
                }).catch(function (error) {
                    console.error('invitation.accept error :', error);
                });
        });
    }

    function setCallListeners(call) {
        call
            .on('localStreamAvailable', function (stream) {
                console.log('Local stream ready');
                localStream = stream;
                localStream.addInDiv('localStream', 'local-media', {}, true);
            })
            .on('streamAdded', function (stream) {
                console.log('Remote stream added');
                remoteStream = stream;
                remoteStream.addInDiv('remoteStream', 'remote-media' + stream.getId(), {}, true);
            })
            .on('hangup', function () {
                updateCallUIState('ready');
            }); 
    }

    function hangUp() {
        cancelSendFile();
        currentCall.hangUp();
        updateCallUIState('ready');
    }

    //

    function sendFile() {
        if (!currentCall) {
            console.error('sendFile No current call');
            return;
        }

        var contact = currentCall.getContact();

        if (!contact) {
            console.error('sendFile No contact');
            return;
        }

        var file = $('#fileToSend')[0].files[0];

        if (file === undefined) {
            console.error('sendFile Need to select file');
            return;
        }

        console.log('sendFile file.name :', file.name);
        console.log('sendFile file.type :', file.type);

        contact.on('fileTransferProgress', function (info, transferInformation) {
            console.debug('fileTransferProgress fileInfo :', info);
            console.debug('fileTransferProgress transferInformation :', info.transferInformation);
            document.querySelector('#sendFileProgressLabel').innerHTML = info.transferInformation.percentage + '%';
        });

        var fileInfo = {
            name: file.name,
            type: file.type
        };

        fileTransferInvitation = contact.sendFile(fileInfo, file);
        console.log('fileTransferInvitation :', fileTransferInvitation);

        fileTransferInvitation
            .on('statusChange', function (statusChangeInfo) {
                console.log('statusChange :', statusChangeInfo.status);
                // To learn about constants look at https://dev.apirtc.com/reference/Constants.html
                if (statusChangeInfo.status === apiRTC.INVITATION_STATUS_ENDED) {
                    fileTransferInvitation = null;
                    updateTransferUIState('ready');
                }
            });

        updateTransferUIState('transfer');
    }

    function cancelSendFile() {
        console.log('Cancel file sending');
        if (fileTransferInvitation) {
            fileTransferInvitation.cancel();
            fileTransferInvitation = null;
        }
    }

    function updateCallUIState(state) {
        console.log('Call state updated:', state);
        var connectingLabel = document.querySelector('#connectingLabel');
        var yourIdLabel = document.querySelector('#yourIdLabel');
        var callForm = document.querySelector('#callForm');
        var hangUpButon = document.querySelector('#hangUpButton');
        var streams = document.querySelector('#streams');
        var localStream = document.querySelector('#localStream');
        var remoteStream = document.querySelector('#remoteStream');
        switch (state) {
            case 'offline':
                connectingLabel.style.display = 'block';
                yourIdLabel.style.display = 'none';
                callForm.style.display = 'none';
                hangUpButon.style.display = 'none';
                localStream.innerHTML = '';
                remoteStream.innerHTML = '';
                updateTransferUIState('default');
                break;
            case 'ready':
                connectingLabel.style.display = 'none';
                yourIdLabel.innerHTML = 'Your id: ' + connectedSession.getId();
                yourIdLabel.style.display = 'block';
                callForm.style.display = 'inline-block';
                hangUpButon.style.display = 'none';
                streams.style.display = 'none';
                localStream.innerHTML = '';
                remoteStream.innerHTML = '';
                updateTransferUIState('default');
                break;
            case 'call':
                callForm.style.display = 'none';
                hangUpButon.style.display = 'inline-block';
                streams.style.display = 'inline-block';
                updateTransferUIState('ready');
                break;
            default:
                break;
        }
    }

    function updateTransferUIState(state) {
        console.log('Transfer state updated:', state);
        var sendFileForm = document.querySelector('#sendFileForm');
        var sendFileProgressLabel = document.querySelector('#sendFileProgressLabel');
        var cancelSendFileButton = document.querySelector('#cancelSendFileButton');
        switch (state) {
            case 'default':
                sendFileForm.style.display = 'none';
                sendFileProgressLabel.style.display = 'none';
                cancelSendFileButton.style.display = 'none';
                break;
            case 'ready':
                sendFileForm.style.display = 'inline-block';
                sendFileProgressLabel.style.display = 'none';
                cancelSendFileButton.style.display = 'none';
                break;
            case 'transfer':
                sendFileForm.style.display = 'none';
                sendFileProgressLabel.style.display = 'inline-block';
                cancelSendFileButton.style.display = fileTransferInvitation ? 'inline-block' : 'none';
                break;
            default:
                break;
        }
    }

    function createDownloadLink(fileUrl, fileName) {
        var downloadDiv = null,
            text = null;

        downloadDiv = document.querySelector('a#downloadLink');

        if (fileUrl instanceof Blob) {
            downloadDiv.href = (window.URL || window.webkitURL).createObjectURL(fileUrl);
        } else {
            downloadDiv.href = fileUrl;
        }
        downloadDiv.innerHTML = '';
        downloadDiv.download = fileName;
        text = 'Click to download \'' + fileName; // + '\' (' + file.size + ' bytes)';
        downloadDiv.appendChild(document.createTextNode(text));
        downloadDiv.style.display = 'block';
        downloadDiv.style.color = 'white';
    }
});
