$(function() {
    'use strict';

    apiRTC.setLogLevel(10);

    var cloudUrl = 'https://cloud.apizee.com';
    var connectedSession = null;
    var connectedConversation = null;
    var localStream = null;
    var ua = null;

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
        }).then(function(session) {
            // Save session
            connectedSession = session;

            connectedSession
                .on("contactListUpdate", function(updatedContacts) { //display a list of connected users
                    console.log("MAIN - contactListUpdate", updatedContacts);
                    if (connectedConversation !== null) {
                        let contactList = connectedConversation.getContacts();
                        console.info("contactList  connectedConversation.getContacts() :", contactList);
                    }
                });

            connectedSession.on('rawData', data => {
                handleRawData(data);
            })

            //==============================
            // 3/ CREATE CONVERSATION
            //==============================
            connectedConversation = connectedSession.getConversation(name);

            //==========================================================
            // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
            //==========================================================
            connectedConversation.on('streamListChanged', function(streamInfo) {

                console.log("streamListChanged :", streamInfo);

                if (streamInfo.listEventType === 'added') {
                    if (streamInfo.isRemote === true) {

                        connectedConversation.subscribeToMedia(streamInfo.streamId)
                            .then(function(stream) {
                                console.log('subscribeToMedia success');
                            }).catch(function(err) {
                                console.error('subscribeToMedia error', err);
                            });
                    }
                }
            });
            //=====================================================
            // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
            //=====================================================
            connectedConversation.on('streamAdded', function(stream) {
                stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
                /*
                                // Subscribed Stream is available for display
                                // Get remote media container
                                var container = document.getElementById('remote-container');
                                // Create media element
                                var mediaElement = document.createElement('video');
                                mediaElement.id = 'remote-media-' + stream.streamId;
                                mediaElement.autoplay = true;
                                mediaElement.muted = false;
                                // Add media element to media container
                                container.appendChild(mediaElement);
                                // Attach stream
                                stream.attachToElement(mediaElement);
                */
            }).on('streamRemoved', function(stream) {
                stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
                /*
                                document.getElementById('remote-media-' + stream.streamId).remove();
                */
            });

            //==============================
            // 5/ CREATE LOCAL STREAM
            //==============================
            var createStreamOptions = {};
            createStreamOptions.constraints = {
                audio: true,
                video: true
            };

            ua.createStream(createStreamOptions)
                .then(function(stream) {

                    console.log('createStream :', stream);

                    // Save local stream
                    localStream = stream;
                    stream.removeFromDiv('local-container', 'local-media');
                    stream.addInDiv('local-container', 'local-media', {}, true);
                    /*
                                        // Get media container
                                        var container = document.getElementById('local-container');
                    
                                        // Create media element
                                        var mediaElement = document.createElement('video');
                                        mediaElement.id = 'local-media';
                                        mediaElement.autoplay = true;
                                        mediaElement.muted = true;
                    
                                        // Add media element to media container
                                        container.appendChild(mediaElement);
                    
                                        // Attach stream
                                        localStream.attachToElement(mediaElement);
                    */

                    //==============================
                    // 6/ JOIN CONVERSATION
                    //==============================
                    connectedConversation.join()
                        .then(function(response) {
                            //==============================
                            // 7/ PUBLISH OWN STREAM
                            //==============================
                            connectedConversation.publish(localStream);
                        }).catch(function(err) {
                            console.error('Conversation join error', err);
                        });

                }).catch(function(err) {
                    console.error('create stream error', err);
                });
        });
    }

    //==============================
    // CREATE CONFERENCE
    //==============================
    $('#create').on('submit', function(e) {
        e.preventDefault();

        // Get conference name
        var conferenceName = document.getElementById('conference-name').value;

        document.getElementById('create').style.display = 'none';
        document.getElementById('conference').style.display = 'inline-block';
        document.getElementById('title').innerHTML = 'You are in conference: ' + conferenceName;

        // Join conference
        joinConference(conferenceName);
    });

    //==============================
    // BLE Cardio tracker
    //==============================

    const bleButton = document.getElementById('ble-button');
    bleButton.addEventListener('pointerup', event => {
        navigator.bluetooth
            .requestDevice({ filters: [{ services: ['heart_rate'] }] })
            .then(device => {
                console.log('BLE device: ', device);
                return device.gatt.connect();
            })
            .then(server => {
                console.log('BLE server: ', server);
                return server.getPrimaryService('heart_rate');
            })
            .then(service => {
                console.log('BLE service: ', service);
                return service.getCharacteristic(
                    'heart_rate_measurement'
                );
            })
            .then(characteristic => {
                console.log('BLE characteristic: ', characteristic);
                return characteristic.startNotifications();
            })
            .then(characteristic => {
                characteristic.addEventListener(
                    'characteristicvaluechanged',
                    handleCharacteristicValueChanged
                );
                console.log('BLE notifications have been started.');
            })
            .catch(error => {
                console.log('BLE error: ', error.name, error.message);
            });
    });

    async function handleCharacteristicValueChanged(event) {
        const value = event.target.value;
        console.log('BLE received value: ', value);
        const parsedValue = parseHeartRate(value)
        console.log('BLE parsed value: ', parsedValue);

        // Send data to opponents
        let contacts = connectedConversation.getContacts();
        if (contacts) {
            for (var contactId in contacts) {
                console.log('BLE send ble data to opponent: ', contactId);
                try {
                    await connectedSession.sendRawData(contacts[contactId], {
                        event: 'bleCardioData',
                        data: parsedValue,
                        userId: ua.userId.toString()
                    });
                } catch (error) {
                    console.error(error);
                }
            }
        }

        // Handle html
        const bleLocal = document.getElementById('ble-local');
        if (!bleLocal) {
            console.warn('No bleLocal element');
            return;
        }
        if (bleLocal.style.display !== 'block') {
            bleLocal.style.display = 'block';
        }

        const heartRate = document.getElementById('ble-local-heart-rate');
        if (heartRate) {
            heartRate.innerHTML = parsedValue.heartRate.toString();
        }

        const heartBeatsDetection = document.getElementById('ble-local-heartbeats-detection');
        if (heartBeatsDetection) {
            heartBeatsDetection.innerHTML = parsedValue.contactDetected ? 'detected' : 'not detected';
        }
    }

    function parseHeartRate(value) {
        // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
        value = value.buffer ? value : new DataView(value);
        let flags = value.getUint8(0);
        let rate16Bits = flags & 0x1;
        let result = {};
        let index = 1;
        if (rate16Bits) {
            result.heartRate = value.getUint16(
                index,
                true
            );
            index += 2;
        } else {
            result.heartRate = value.getUint8(index);
            index += 1;
        }
        let contactDetected = flags & 0x2;
        let contactSensorPresent = flags & 0x4;
        if (contactSensorPresent) {
            result.contactDetected = !!contactDetected;
        }
        let energyPresent = flags & 0x8;
        if (energyPresent) {
            result.energyExpended = value.getUint16(
                index,
                true
            );
            index += 2;
        }
        let rrIntervalPresent = flags & 0x10;
        if (rrIntervalPresent) {
            let rrIntervals = [];
            for (; index + 1 < value.byteLength; index += 2) {
                rrIntervals.push(
                    value.getUint16(index, true)
                );
            }
            result.rrIntervals = rrIntervals;
        }
        return result;
    }

    //==============================
    // Raw data handler
    //==============================

    function handleRawData(data) {
        if (!data.content) {
            return;
        }

        if (data.content.event === 'bleCardioData') {

            const bleData = data.content.data;
            if (!bleData) {
                console.warn('BLE data is null');
                return;
            }

            const bleRemote = document.getElementById('ble-remote');
            if (!bleRemote) {
                console.warn('No bleRemote element');
                return;
            }
            if (bleRemote.style.display !== 'block') {
                bleRemote.style.display = 'block';
            }

            const heartRate = document.getElementById('ble-remote-heart-rate');
            if (heartRate) {
                heartRate.innerHTML = bleData.heartRate.toString();
            }

            const heartBeatsDetection = document.getElementById('ble-remote-heartbeats-detection');
            if (heartBeatsDetection) {
                heartBeatsDetection.innerHTML = bleData.contactDetected ? 'detected' : 'not detected';
            }
        }
    }
});