let API_KEY = 'myDemoApiKey';

let userAgent = new apiRTC.UserAgent({ uri: 'apiKey:' + API_KEY });
let conversation = undefined;

userAgent.register({
    cloudUrl: 'https://cloud.apirtc.com'
}).then((session) => {

    //Prepare connection to conversation
    conversation = session.getOrCreateConversation('quickstart_conversation');

    //Any time the streamListChanged is triggered
    conversation.on('streamListChanged', (streamInfo) => {

        // when a new stream is added AND the added stream is not 
        if (streamInfo.listEventType === 'added' && streamInfo.isRemote === true) {

            //Subscribe to the new stream's events (triggered by the conversation object)
            conversation.subscribeToMedia(streamInfo.streamId).then((stream) => {
                console.log("Subscribed to " + stream.streamId)
            })
        }
    });

    //Any time a (subscribed) stream is added to the conversation
    conversation.on('streamAdded', (stream) => {
        
        //Add a video element in the 'remote' div element,  with the streamId in its id attribute
        stream.addInDiv('remote', 'remote-media-' + stream.streamId, {}, false);
    
    });

    //Any time a (subscribed) stream is removed from the conversation
    conversation.on('streamRemoved', (stream) => {
        
        //Remove a video element with the streamId in its id attribute
        stream.removeFromDiv('remote', 'remote-media-' + stream.streamId);
    });

    // Define the way the local stream will be configured
    let streamOptions = {
        constraints: {
            audio: true,
            video: true
        }
    };

    //Get the stream for the local camera
    userAgent.createStream(streamOptions).then(function (stream) {

        //Display the stream (audio+video) in the <video> element with id 'local'
        stream.attachToElement(document.getElementById('local'));

        //Join the conversation
        conversation.join().then(() => {

            //Publish the local stream in the conversation
            conversation.publish(stream);
        });
    });
});

