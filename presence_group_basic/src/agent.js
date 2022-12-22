var apiKey = "myDemoApiKey";

var connectedSession = undefined;

/**
 * Update the HTML DOM with the actualized list of contacts in the Customer group
 * @returns void
 */
function updateConnectedUsersListUI() {
  var htmlContent = "";

  connectedSession.getContactsArray("Customer").forEach((contact) => {
    htmlContent += "<li>" + contact.getUsername() + "</li>";
  });

  document.getElementById("connected-customer-list").innerHTML = htmlContent;

  return;
}

//Declare the useragent
var userAgent = new apiRTC.UserAgent({
  uri: "apiKey:" + apiKey
});

//Register the user agent
userAgent
  .register({
    cloudUrl: "https://cloud.apizee.com"
  })
  .then((session) => {
    console.log("UserAgent registered : " + session.getUsername());

    //Save the current session to use it afterward
    connectedSession = session;

    //Update the HTML Dom with the username
    document.getElementById("username").innerHTML = connectedSession.getUsername();

    //Subscribe to all the event thrown when there is some upadtes in the group "Customer"
    connectedSession.subscribeToGroup("Customer");

    //Watch the `contactListUpdate` event
    connectedSession.on("contactListUpdate", (updatedContacts) => {

      //Example to show how to go through the `joinedGroup` and `leftGroup` arrays
      // Mind that a a third attribute updatedContacts.userDataChanged as an array of Contacts
      for (const group of Object.keys(updatedContacts.joinedGroup)) {
        
        for (const contact of updatedContacts.joinedGroup[group]) {
        
          console.log("Joined " + group + ": " + contact.getUsername());
        
        }
      }
      for (const group of Object.keys(updatedContacts.leftGroup)) {
        
        for (const contact of updatedContacts.leftGroup[group]) {
        
          console.log("Left " + group + ": " + contact.getUsername());
        
        }
      }
    
      updateConnectedUsersListUI();
    });

    updateConnectedUsersListUI();
  })
  .catch((err) => {
    console.log("Error User Agent : " + JSON.stringify(err));
  });
