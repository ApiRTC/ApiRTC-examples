$(() => {
    'use strict';

    apiRTC.setLogLevel(10);

    let cloudUrl = 'https://cloud.apizee.com';
    let connectedSession = null;
    let connectedConversation = null;
    let localStream = null;
    let ua = null;

    function joinConference(name) {

        //==============================
        // 1/ CREATE USER AGENT
        //==============================
        apiKey = '#INSERT_YOUR_APIKEY_HERE#'; // -->  Get your API Key at https://cloud.apirtc.com/enterprise/api (free account required)
        var ua = new apiRTC.UserAgent({
            uri: 'apiKey:' + apiKey
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

            connectedConversation.on('contactJoined', (contact) => {
                console.log('Contact that has joined :', contact);
                renderUserList();
            }).on('contactLeft', (contact) => {
                console.log('Contact that has left :', contact);
                renderUserList();
            });

            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : CHAT MESSAGE 
            //=====================================================
            connectedConversation.on('message', (msg) => {
                console.log('Chat message :', msg);
                // Add chat message
                $('#message-list').append('<li><b>' + msg.sender.getId() + '</b> : ' + msg.content + '</li>');
            });

            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : FILE TRANSFER EVENTS 
            //=====================================================
            connectedConversation.on('transferBegun', () => {
                $('#transfer-progress').text('0%');
            });
            connectedConversation.on('transferProgress', (progress) => {
                $('#transfer-progress').text(progress.percentage + '%');
            });
            connectedConversation.on('transferEnded', () => {
                $('#transfer-progress').text('completed');
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

                            renderUserList();
                            updateUIState('conference');

                        }).catch((err) => {
                            console.error('Conversation join error :', err);
                        });

                }).catch((err) => {
                    console.error('Create stream error :', err);
                });
        });
    }

    function sendMessageToConversation(message) {
        if (message !== '') {
            $('#typing-area').val('');
            $('#message-list').append('<li><b>Me</b> : ' + message + '</li>');
            connectedConversation.sendMessage(message);
        }
    }

    function renderUserList() {
        let contacts = connectedConversation.getContacts();
        $('#active-users').empty();
        $('#active-users').append('<li><b>Active users</b></li>');
        let keys = Object.keys(contacts);
        $('#active-users').append('<li><b>Me:</b> ' + connectedSession.getId() + '</li>');
        for (let i = 0; i < keys.length; i++) {
            $('#active-users').append('<li>' + contacts[keys[i]].getId() + '</li>');
        }
    }

    function updateUIState(state) {
        console.log('Update UI state', state);
        switch (state) {
            case 'initial':
                document.querySelector('#chat').style.display = 'none';
                document.querySelector('#file-transfer').style.display = 'none';
                break;
            case 'conference':
                document.querySelector('#chat').style.display = 'block';
                document.querySelector('#file-transfer').style.display = 'block';
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
    // SEND CHAT MESSAGE TO ACTIVE CONVERSATION
    //==============================
    $('#send-message').on('click', () => {
        sendMessageToConversation($('#typing-area').val().toString());
    });

    $('#typing-area').keypress((e) => {
        if (e.which == 13) {
            sendMessageToConversation($('#typing-area').val().toString());
            return false;
        }
    });

    //==============================
    // FILE TRANSFER
    //==============================
    $('#file-transfer').on('submit', (e) => {
        e.preventDefault();

        let file = $('#file').prop('files')[0];

        if (file === undefined || file === null) {
            console.error('File attachament error');
            return;
        }

        connectedConversation.pushData({ 'file': file })
            .then((cloudMediaInfo) => {
                console.log('File uploaded :', cloudMediaInfo);
                // Send file link message to the chat
                sendMessageToConversation('New file uploaded: <a href="' + cloudMediaInfo.url + '" target="_blank"><b>OPEN FILE</b></a>');
            })
            .catch((err) => {
                console.log('File uploading error :', err);
            });
    });
});