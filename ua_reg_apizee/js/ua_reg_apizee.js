$(function() {
    //'use strict';
    var connectedSession = null;
    var ua = null;

    apiRTC.setLogLevel(10);

    //==============================
    // CREATE USER AGENT
    //==============================

    $('#createUA').on('click', function() {
        console.log('createUA');

        // Get login
        var login = document.getElementById('login').value;
        console.log('login :', login);

        if (ua) {
            delete ua;
        }
        //LOGIN
        ua = new apiRTC.UserAgent({
            uri: login
        });

    });

    $('#register').on('click', function() {
        console.log('register');

        if (!ua) {
            console.log('UA is not created');
            return;
        }

        // Get password
        var password = document.getElementById('password').value;
        console.log('password :', password);

        //==============================
        // REGISTER
        //==============================

        var registerInformation = {};
        registerInformation.cloudFetchRetries = 3;
        registerInformation.cloudFetchRetryDelay = 2000;
//PASSWORD
        registerInformation.password = password;

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

        if (!ua) {
            console.log('UA is not created');
            return;
        }

        ua.unregister();
        document.getElementById('my-number').innerHTML = '';
    });
});