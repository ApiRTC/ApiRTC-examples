$(() => {
    'use strict';

    apiRTC.setLogLevel(10);

    let localStream = null,
        remoteStream = null,
        cloudUrl = 'https://cloud.apizee.com',
        connectedSession = null,
        ua = null,
        currentCall = null,
        dataChannel = null;

    // User actions

    $('#callButton').on('click', (e) => {
        e.preventDefault();
        console.log('Click call');
        let callUserId = $('#callUserId').val();
        if (callUserId) {
            call(callUserId);
        }
    });

    $('#hangUpButton').on('click', (e) => {
        e.preventDefault();
        console.log('Click hang up button');
        hangUp();
    });

    $('#sendFileButton').on('click', (e) => {
        e.preventDefault();
        console.log('Click send file');
        sendFile();
    });

    $('#cancelSendFileButton').on('click', (e) => {
        e.preventDefault();
        console.log('Click cancel send file');
        cancelSendFile();
    });

    $('#takeLocalSnapshot').on('click', (e) => {
        e.preventDefault();
        console.log('Click takeLocalSnapshot button');
        takeLocalSnapshot({ render: true });
    });

    $('#takeRemoteSnapshot').on('click', (e) => {
        e.preventDefault();
        console.log('Click takeRemoteSnapshot button');
        requestRemoteSnapshot();
    });

    updateUIState('offline');

    register();

    // Register user

    function register() {

        var apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)
        ua = new apiRTC.UserAgent({
            uri: 'apiKey:' + apiKey
        });

        ua.register({
            cloudUrl: cloudUrl
        }).then((session) => {
            console.log('User registered successfully');
            connectedSession = session;
            setSessionListeners(connectedSession);
            updateUIState('ready');
        });
    }

    // Call

    function call(userId) {
        let contact = connectedSession.getOrCreateContact(userId);
        currentCall = contact.call();
        if (currentCall === null) {
            console.warn('Cannot establish the call');
            return;
        }
        setCallListeners(currentCall);
        updateUIState('call');
    }

    function setSessionListeners(session) {
        session.on('incomingCall', (invitation) => {
            console.log('incomingCall');
            invitation.accept()
                .then((call) => {
                    currentCall = call;
                    setCallListeners(currentCall);
                    updateUIState('call');
                });
        })
        .on('dataChannelInvitation', (invitation) => {
            console.log('dataChannelInvitation', invitation);
            invitation.accept()
                .then((channel) => {
                    console.log('Data channel accepted:', channel);
                    dataChannel = channel;
                    dataChannel.on('dataReceived', (data) => {
                        console.log('Data received', data);
                        enableSnapshotProgressUI(false);
                        renderImageData(data.data);
                    })
                    .on('transferProgress', (progress) => {
                        console.log('Data transfer progress:', progress);
                        let snapshotProgress = document.querySelector('#snapshotProgress span');
                        snapshotProgress.innerHTML = progress.percentage;
                    });
                });
        })
        .on('contactMessage', (message) => {
            if (message.content === 'ask_snapshot') {
                console.log('Snapshot request message:', message);
                takeLocalSnapshot({ send: true });
            }
        });
    }

    function setCallListeners(call) {
        call
            .on('localStreamAvailable', (stream) => {
                console.log('Local stream ready');
                localStream = stream;
                localStream.addInDiv('localStream', 'local-media', {}, true);
            })
            .on('streamAdded', (stream) => {
                console.log('Remote stream added');
                remoteStream = stream;
                remoteStream.addInDiv('remoteStream', 'remote-media' + stream.getId(), {}, true);
            })
            .on('hangup', () => {
                updateUIState('ready');
            });
    }

    function hangUp() {
        if (dataChannel) {
            dataChannel.close();
            dataChannel = null;
        }
        currentCall.hangUp();
        updateUIState('ready');
    }

    // Snapshot handlers

    function takeLocalSnapshot(options) {
        console.log('takeLocalSnapshot', options);
        let bufferCanvas = document.querySelector("#bufferCanvas");
        let video = document.querySelector("#localStream video");
        bufferCanvas.getContext('2d').drawImage(video, 0, 0);

        // Show snapshot
        if (options.render !== undefined && options.render) {
            console.log('Render local snapshot');
            let renderCanvas = document.querySelector("#renderCanvas");
            renderCanvas.getContext('2d').drawImage(bufferCanvas, 0, 0);
        }

        // Send snapshot to the opponent
        if (options.send !== undefined && options.send) {
            console.log('Send snapshot');
            let contact = currentCall.getContact();
            dataChannel = contact.startDataChannel();
            dataChannel.on('opened', () => {
                // Do not need this `setTimeout` workaround if you use apiRTC from 4.4.0 version, in the version below 4.4.0 there is an issue: `opened` channel state is set later than corresponding event fired
                setTimeout(() => {
                    let base64 = bufferCanvas.toDataURL('image/jpeg');
                    dataChannel.sendData(base64)
                        .then((info) => {
                            console.log('Snapshot data sent', info);
                        })
                        .catch((err) => {
                            console.error('Snapshot data sending error', err);
                        });
                }, 100);
            });
        }
    }

    function requestRemoteSnapshot() {
        currentCall.getContact().sendMessage('ask_snapshot')
            .then((id) => {
                console.log('ask_snapshot message sent', id);
                enableSnapshotProgressUI(true);
            })
            .catch((err) => {
                console.error('Message sending error:', err);
            });
    }

    function renderImageData(data) {
        console.log('Render image data');
        let renderCanvas = document.querySelector('#renderCanvas');
        var image = new Image();
        image.onload = () => {
            renderCanvas.getContext('2d').drawImage(image, 0, 0);
        };
        image.src = data;
    }

    // UI

    function updateUIState(state) {
        console.log('Call state updated:', state);
        let connectingLabel = document.querySelector('#connectingLabel'),
        yourIdLabel = document.querySelector('#yourIdLabel'),
        callForm = document.querySelector('#callForm'),
        hangUpButon = document.querySelector('#hangUpButton'),
        streams = document.querySelector('#streams'),
        localStream = document.querySelector('#localStream'),
        remoteStream = document.querySelector('#remoteStream'),
        snapshot = document.querySelector('#snapshot');
        switch (state) {
            case 'offline':
                connectingLabel.style.display = 'block';
                yourIdLabel.style.display = 'none';
                callForm.style.display = 'none';
                hangUpButon.style.display = 'none';
                localStream.innerHTML = '';
                remoteStream.innerHTML = '';
                snapshot.style.display = 'none';
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
                snapshot.style.display = 'none';
                break;
            case 'call':
                callForm.style.display = 'none';
                hangUpButon.style.display = 'inline-block';
                streams.style.display = 'inline-block';
                snapshot.style.display = 'block';
                break;
            default:
                break;
        }
        enableSnapshotProgressUI(false);
    }

    function enableSnapshotProgressUI(state) {
        let progress = document.querySelector('#snapshotProgress');
        switch (state) {
            case false:
                progress.style.display = 'none';
                break;
            case true:
                progress.style.display = 'block';
                break;
            default:
                break;
        }
    }
});
