$(function() {
    'use strict';
    var connectedSession = null;

    apiRTC.setLogLevel(10);

    //==============================
    // CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
        uri: 'apzkey:myDemoApiKey'
    });

    $('#register').on('click', function() {
        console.log('register');
        //==============================
        // REGISTER
        //==============================

        // Get userId
        var userId = document.getElementById('userId').value;
        console.log('userId :', userId);

        var registerInformation = {};
        //if (userId !== "") {
        console.log('setting userId');
        registerInformation.id = userId;
        registerInformation.cloudFetchRetries = 3;
        registerInformation.cloudFetchRetryDelay = 2000;

        ua.register(registerInformation).then(function(session) {
            // Save session
            connectedSession = session;
            // Display user number
            document.getElementById('my-number').innerHTML = 'Your number is ' + connectedSession.id;
        }).catch(function(error) {
            // error
            console.error('User agent registration failed', error);
        });
    });

    $('#unregister').on('click', function() {
        console.log('unregister');
        ua.unregister();
        document.getElementById('my-number').innerHTML = '';
    });
});