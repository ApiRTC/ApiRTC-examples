// token = apzkey:

let localStreamDOM = document.getElementsByClassName("local_stream")[0];
let message_displayer = document.getElementsByClassName("conversation")[0];

//all input
let input_streamName = document.getElementsByClassName("streamName")[0];
let input_background_url = document.getElementById("url_back");
let invite_input = document.getElementsByClassName("invite")[0];
let input_message = document.getElementsByClassName("input_message")[0];


//btn stream options
let btn_audio = document.getElementById("audio");
let btn_video = document.getElementById("video");
let btn_bgImage = document.getElementById("bg-image");
let btn_invite = document.getElementsByClassName("inviteBtn")[0];
let btn_startStream = document.getElementsByClassName("startStream")[0];
let btn_shareScreen = document.getElementById("shareScreen");
let btn_askToDownload = document.getElementById("askToDownload");

//global var
let conversation;
let local_stream;
let remote_stream;
let stream_blur;
let stream_background;
let stream_session;
//let user_Token = 'apzkey:API_KEY_HERE';
let user_Token = 'apzkey:myDemoApiKey';



let message_count = 0;
let localScreenShare;
let remoteScreenShare;
let allContact;
let video_screen;
let DOMVideoScreen;
let audioInput = [];

let otherScreenWidthDimension;
let otherScreenHeightDimension;

//check
let stream_blur_check = false;
let stream_video_enable = true;
let stream_audio_enable = true;
let stream_background_enable = false;


apiRTC.setLogLevel(10);


//Create user agent
let userAgent = new apiRTC.UserAgent();

btn_askToDownload.disabled = true;
btn_shareScreen.disabled = true;

btn_startStream.addEventListener("click", () => {
    confName = input_streamName.value;
    stream(confName);
    btn_startStream.disabled = true;
});

btn_shareScreen.addEventListener("click", () => {
    shareScreen();
});

btn_askToDownload.addEventListener("click", () => {
    //askToDownload2(); //WORK with listener
    contact = getDefaultContact();
    if (contact != -1) {
        console.log("Application en cours d'envoi... " + contact.getId());
        contact.sendRemoteControlInvitation(stream_session.getId(), conversation)
            .then(() => {
                console.log("envoyé");
            })
            .catch((err) => {
                console.log("L'app n'a pas été envoyé");
                console.log(err);
            });
    }

});


/*
*
*
*
*
*
*register puis crée un stream local puis conversation
*/

function stream(confName) {
    //Register
    userAgent.register({
        uri: user_Token,
        //ccs : "ccs.apizee.sav"
    }).then((session) => {
        //conversation
        stream_session = session
        conversation = session.getOrCreateConversation(confName, {
            meshModeEnabled: true,
            meshOnlyEnabled: true
        });

        conversation.join().then(() => {

            apiRTC.Stream.createStreamFromUserMedia().then((localStream) => {
                local_stream = localStream;
                localStream.attachToElement(localStreamDOM);

                //published Stream 
                conversation.publish(localStream).then((publishedLocalStream) => {
                    btn_askToDownload.disabled = false;
                    btn_shareScreen.disabled = false;
                    remote_stream = publishedLocalStream;


                    //MAJ des contacts de la conversation 
                    allContact = conversation.getContacts();
                    allContact = Object.values(allContact);

                }).catch(error => {
                    console.error("publish error", error)
                });
            });

        }).catch(error => {
            console.error("join error", error)
        });


        //subscribe to stream
        conversation.on('streamListChanged', streamInfo => {
            if (streamInfo.listEventType === 'added') {
                conversation.subscribeToStream(streamInfo.streamId);
            }

        });

        conversation.on('streamAdded', remoteStream => {
            remoteStream.addInDiv('remote-streams', 'remote-stream-' + remoteStream.getId(), {}, false);
            //get la video dans la conf
            if (getStreamVideo(remoteStream)) {
                video_screen = remoteStream;
                //ID de la video get elemnt dOM pour demarrer la console
                DOMVideoScreen = document.getElementById("remote-stream-" + remoteStream.streamId);
                DOMVideoScreen.setAttribute("width", "100%")
                //DOMVideoScreen.style.cursor = "none"
                //DOMVideoScreen.setAttribute("height", "50%")
            }
        });
        conversation.on("streamRemoved", remoteStream => {
            remoteStream.removeFromDiv('remote-streams', 'remote-stream-' + remoteStream.getId());
        });

        conversation.on("contactJoined", () => {
            console.log("Contact list changed");
            allContact = conversation.getContacts();
            allContact = Object.values(allContact);
        });

        session.on('remoteControlInvitation', (ask) => {
            let senderContact = apiRTC.Session.getActiveSession().getOrCreateContact(ask.sender);
            let dialog = confirm("Demande de prise à distance de : " + senderContact.getUsername());
            if (dialog == true) {
                ask.accept()
                    .then(() => {
                        alert("La prise de contrôle à distance va commencer");
                    });
            } else {
                ask.decline();
            }
        });

        session.on('remoteControlInvitation', (ask) => {
            ask.accept();
        });

    });


}



function shareScreen() {
    if (conversation) {
        const displayMediaStreamConstraints = {
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        }

        apiRTC.Stream.createScreensharingStream(displayMediaStreamConstraints)
            .then((localShareScreen) => {
                //conversation.getScreenResolution();

                localScreenShare = localShareScreen;
                //shareScreen.attachToElement(document.getElementsByClassName("test")[0]);
                conversation.publish(localScreenShare)
                    .then((remoteShareScreen) => {
                        remoteScreenShare = remoteShareScreen;
                        //btn_askToDownload.disabled = false;
                        //btn_shareScreen.disabled = true;
                    });
            });
    }
}


function getStreamVideo(stream) {

    //remplaçable par return stream.isScreensharing()
    if (stream.isScreensharing()) {
        return true;
    }
    return false;

}

function getDefaultContact() {
    let defaultContact = null;

    //need a contact
    if (conversation) {
        allContact = conversation.getContacts();
        allContact = Object.values(allContact);

        if (allContact) {
            defaultContact = allContact[0];
            if (defaultContact) {
                return defaultContact;
                //run contact.sendRemoteConnectionApp 
            } else {
                console.log("Vous êtes seul dans la conversation");
                return -1;
            }
        }

    }
    return defaultContact;
}