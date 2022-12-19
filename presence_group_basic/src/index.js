var apiKey = "myDemoApiKey";

var connectedSession = null;

var userAgent = new apiRTC.UserAgent({
  uri: "apiKey:" + apiKey
});

userAgent
  .register({
    cloudUrl: "https://cloud.apizee.com"
  })
  .then((session) => {
    console.log("UserAgent registered : " + session.getUsername());
    connectedSession = session;

    connectedSession.joinGroup("Customer");

    console.log(
      connectedSession.getUsername() +
        " connected to groups: " +
        connectedSession.getPresenceGroup()
    );

    document.getElementById("username").innerHTML = connectedSession.getUsername();
    
  })
  .catch((err) => {
    console.log("Error User Agent : " + JSON.stringify(err));
  });
