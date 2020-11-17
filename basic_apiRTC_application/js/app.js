var API_KEY = 'myDemoApiKey';

var userAgent = new apiRTC.UserAgent({ uri: 'apzkey:' + API_KEY });

userAgent.register().then(function(session) {
    var conversation = session.getConversation('quickstart');

    // subscribe to remote stream
    conversation.on('streamListChanged', function(streamInfo) {
        if (streamInfo.listEventType === 'added' && streamInfo.isRemote === true) {
            conversation.subscribeToMedia(streamInfo.streamId).then(function (stream) {
                console.log('Successfully subscribed to remote stream: ', stream);
            }).catch(function (err) {
                console.error('Failed to subscribe to remote stream: ', err);
            });
        }
    });

    conversation.on('streamAdded', function(stream) {
        stream.addInDiv('remote', 'remote-media', { width: '100%', height: '100%' },  false);
    });

    conversation.on('streamRemoved', function(stream) {
        stream.removeFromDiv('remote', 'remote-media');
    });



    // publish local stream

    var streamOptions = {
        constraints: {
            audio: true,
            video: true
        }
    };

    userAgent.createStream(streamOptions).then(function(stream) {
        stream.addInDiv('local', 'local-media', { width: '100%', height: '100%' }, true);
        conversation.join().then(function() {
            conversation.publish(stream);
        });
    });
});