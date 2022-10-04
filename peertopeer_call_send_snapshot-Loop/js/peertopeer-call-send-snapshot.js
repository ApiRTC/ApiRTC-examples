
$(() => {
    'use strict';

    apiRTC.setLogLevel(0);

    let localStream = null,
        remoteStream = null,
        cloudUrl = 'https://cloud.apizee.com',
        connectedSession = null,
        ua = null,
        currentCall = null,
        dataChannel = null,
        intervalId = 0;

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

    $('#startDataChannelButton').on('click', (e) => {
        e.preventDefault();
        console.log('startDataChannelButton');
        let contact = currentCall.getContact();
        dataChannel = contact.startDataChannel();
        dataChannel.on('opened', () => {
            console.log('#### Datachannel is opened');

            let takeLocalSnapshotButton = document.querySelector('#takeLocalSnapshot');
            takeLocalSnapshotButton.style.display = 'inline-block';

            let takeLocalSnapshotLoopStartButton = document.querySelector('#takeLocalSnapshotLoopStart');
            takeLocalSnapshotLoopStartButton.style.display = 'inline-block';

            let takeLocalSnapshotLoopStopButton = document.querySelector('#takeLocalSnapshotLoopStop');
            takeLocalSnapshotLoopStopButton.style.display = 'inline-block';

        });
        dataChannel.on('closed', () => {
            console.log('#### Datachannel is closed');

            let takeLocalSnapshotButton = document.querySelector('#takeLocalSnapshot');
            takeLocalSnapshotButton.style.display = 'none';

            let takeLocalSnapshotLoopStartButton = document.querySelector('#takeLocalSnapshotLoopStart');
            takeLocalSnapshotLoopStartButton.style.display = 'none';

            let takeLocalSnapshotLoopStopButton = document.querySelector('#takeLocalSnapshotLoopStop');
            takeLocalSnapshotLoopStopButton.style.display = 'none';

        });
        dataChannel.on('ended', () => {
            console.log('#### Datachannel is ended');

            let takeLocalSnapshotButton = document.querySelector('#takeLocalSnapshot');
            takeLocalSnapshotButton.style.display = 'none';

            let takeLocalSnapshotLoopStartButton = document.querySelector('#takeLocalSnapshotLoopStart');
            takeLocalSnapshotLoopStartButton.style.display = 'none';

            let takeLocalSnapshotLoopStopButton = document.querySelector('#takeLocalSnapshotLoopStop');
            takeLocalSnapshotLoopStopButton.style.display = 'none';

        });
    });

    $('#stopDataChannelButton').on('click', (e) => {
        e.preventDefault();
        console.log('stopDataChannelButton');

        if (dataChannel) {
            dataChannel.close();
            dataChannel = null;
        }
    });

    $('#takeLocalSnapshot').on('click', (e) => {
        e.preventDefault();
        console.log('Click takeLocalSnapshot button');
        takeLocalSnapshot({ render: true, send: true });
    });

    $('#takeLocalSnapshotLoopStart').on('click', (e) => {
        e.preventDefault();
        console.log('Click takeLocalSnapshotLoopStart button');

        intervalId = setInterval(function () {
            takeLocalSnapshot({ render: true, send: true });;
        }, 500);
    });

    $('#takeLocalSnapshotLoopStop').on('click', (e) => {
        e.preventDefault();
        console.log('Click takeLocalSnapshotLoopStop button');
        clearInterval(intervalId);
    });

    updateUIState('offline');

    register();


    function register() {

        ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
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
                        //console.log('Data received', data);
                        enableSnapshotProgressUI(false);
                        renderImageData(data.data);
                    })
                    .on('transferProgress', (progress) => {
                        //console.log('Data transfer progress:', progress);
                        let snapshotProgress = document.querySelector('#snapshotProgress span');
                        snapshotProgress.innerHTML = progress.percentage;
                    });
                });
        })
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
        //console.log('takeLocalSnapshot', options);
        let bufferCanvas = document.querySelector("#bufferCanvas");
        let video = document.querySelector("#localStream video");
        bufferCanvas.getContext('2d').drawImage(video, 0, 0);

        // Show snapshot
        if (options.render !== undefined && options.render) {
            //console.log('Render local snapshot');
            let renderCanvas = document.querySelector("#renderCanvas");
            renderCanvas.getContext('2d').drawImage(bufferCanvas, 0, 0);
        }

        // Send snapshot to the opponent
        if (options.send !== undefined && options.send) {
            //console.log('Send snapshot');

            let base64 = bufferCanvas.toDataURL('image/jpeg');
            dataChannel.sendData(base64)
                .then((info) => {
                    console.log('Snapshot data sent', info);
                })
                .catch((err) => {
                    console.error('Snapshot data sending error', err);
                });

        }
    }

    function renderImageData(data) {
        //console.log('Render image data');
        let renderCanvas = document.querySelector('#renderCanvas');
        var image = new Image();
        image.onload = () => {
            renderCanvas.getContext('2d').drawImage(image, 0, 0);
        };
        image.src = data;
    }

    function updateUIState(state) {
        //console.log('Call state updated:', state);
        let connectingLabel = document.querySelector('#connectingLabel'),
        yourIdLabel = document.querySelector('#yourIdLabel'),
        callForm = document.querySelector('#callForm'),
        hangUpButon = document.querySelector('#hangUpButton'),
        startDataChannelButton = document.querySelector('#startDataChannelButton'),
        stopDataChannelButton = document.querySelector('#stopDataChannelButton'),
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
                startDataChannelButton.style.display = 'none';
                stopDataChannelButton.style.display = 'none';
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
                startDataChannelButton.style.display = 'none';
                stopDataChannelButton.style.display = 'none';
                streams.style.display = 'none';
                localStream.innerHTML = '';
                remoteStream.innerHTML = '';
                snapshot.style.display = 'none';
                break;
            case 'call':
                callForm.style.display = 'none';
                hangUpButon.style.display = 'inline-block';
                startDataChannelButton.style.display = 'inline-block';
                stopDataChannelButton.style.display = 'inline-block';
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
