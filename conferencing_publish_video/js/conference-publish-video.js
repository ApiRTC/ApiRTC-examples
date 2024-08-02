$(() => {
    'use strict';

    apiRTC.setLogLevel(10);

    let cloudUrl = 'https://cloud.apizee.com';
    let connectedSession = null;
    let connectedConversation = null;
    let localStream = null;
    let ua = null;
    let videoStream = null;

    function joinConference(name) {

        //==============================
        // 1/ CREATE USER AGENT
        //==============================
        ua = new apiRTC.UserAgent({
            uri: 'apzkey:myDemoApiKey'
        });

        //==============================
        // 2/ REGISTER
        //==============================
        ua.register({
            cloudUrl: cloudUrl
        }).then((session) => {
            connectedSession = session;

            //==============================
            // 3/ CREATE CONVERSATION
            //==============================
            connectedConversation = connectedSession.getConversation(name);

            //==========================================================
            // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
            //==========================================================
            connectedConversation.on('streamListChanged', (streamInfo) => {

                console.log('streamListChanged :', streamInfo);

                if (streamInfo.listEventType === 'added') {
                    if (streamInfo.isRemote === true) {
                        connectedConversation.subscribeToMedia(streamInfo.streamId)
                            .then((stream) => {
                                console.log('subscribeToMedia success');
                            }).catch((err) => {
                                console.error('subscribeToMedia error', err);
                            });
                    }
                }
            });

            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM WAS ADDED/REMOVED FROM THE CONVERSATION
            //=====================================================
            connectedConversation.on('streamAdded', (stream) => {
                stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
            }).on('streamRemoved', (stream) => {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
            });

            //==============================
            // 5/ CREATE LOCAL STREAM
            //==============================
            let createStreamOptions = {};
            createStreamOptions.constraints = {
                audio: true,
                video: true
            };

            ua.createStream(createStreamOptions)
                .then((stream) => {

                    console.log('Stream created :', stream);
                    localStream = stream;

                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {}, true);

                    //==============================
                    // 6/ JOIN CONVERSATION
                    //==============================
                    connectedConversation.join()
                        .then((response) => {

                            console.log('Conversation join response :', response);

                            //==============================
                            // 7/ PUBLISH OWN STREAM
                            //==============================
                            connectedConversation.publish(localStream);

                            updateUIState('conference');

                        }).catch((err) => {
                            console.error('Conversation join error :', err);
                        });

                }).catch((err) => {
                    console.error('Create stream error :', err);
                });
        });
    }

    function updateUIState(state) {
        console.log('Update UI state', state);
        switch (state) {
            case 'initial':
                document.querySelector('#publishing-video').style.display = 'none';
                break;
            case 'conference':
                document.querySelector('#publishing-video').style.display = 'block';
                break;
            default:
                break;
        }
    }

    //==============================
    // CREATE CONFERENCE
    //==============================
    $('#create').on('submit', (e) => {
        e.preventDefault();

        // Get conference name
        let conferenceName = document.querySelector('#conference-name').value;

        document.querySelector('#create').style.display = 'none';
        document.querySelector('#conference').style.display = 'inline-block';
        document.querySelector('#title').innerHTML = 'You are in conference: ' + conferenceName;

        // Join conference
        joinConference(conferenceName);
    });

    //==============================
    // PUBLISH VIDEO
    //==============================
    $('#publish-video').on('submit', (e) => {
        e.preventDefault();

        console.log('Publish video');

        let file = $('#video-file').prop('files')[0];

        if (file === undefined || file === null) {
            console.error('File attachment error');
            return;
        }

        let videoElement = document.querySelector('#video-source');
        videoElement.onloadeddata = () => {
            // Note that video handling should be applied after data loaded
            let mediaStream = videoElement.captureStream(30);
            ua.createStreamFromMediaStream(mediaStream)
                .then((stream) => {
                    videoStream = stream;
                    connectedConversation.publish(stream);
                })
                .catch((err) => {
                    console.error('Create stream error', err);
                });
        };

        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = (e) => {
            let buffer = e.target.result;
            let videoBlob = new Blob([new Uint8Array(buffer)], { type: 'video/mp4' });
            let url = window.URL.createObjectURL(videoBlob);
            videoElement.src = url;
        };
    });

    $('#unpublishing-video').on('click', (e) => {
        console.debug("unpublishing-video");
        connectedConversation.unpublish(videoStream);
    });
});