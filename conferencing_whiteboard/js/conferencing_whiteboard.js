
'use strict';
var cloudUrl = 'https://cloud.apizee.com';
var connectedSession = null;
var whiteBoardClient = null;
var connectedConversation = null;
var ua = null;

apiRTC.setLogLevel(10);

//==============================
// 1/ CREATE USER AGENT
//==============================
ua = new apiRTC.UserAgent({
    uri: 'apzkey:myDemoApiKey'
});

function showOfflineWhiteboardArea() {
    document.getElementById('offlineWhiteboard').style.display = 'block';
}
function hideOfflineWhiteboardArea() {
    document.getElementById('offlineWhiteboard').style.display = 'none';
}
function showOnlineWhiteboardArea() {
    document.getElementById('onlineWhiteboard').style.display = 'block';
}
function hideOnlineWhiteboardArea() {
    document.getElementById('onlineWhiteboard').style.display = 'none';
}
function showWhiteboardFctArea() {
    document.getElementById('whiteboardFct').style.display = 'block';
}
function hideWhiteboardFctArea() {
    document.getElementById('whiteboardFct').style.display = 'none';
}
function setSessionListeners(){
     connectedSession.on("rawData",  function (e) {
	    console.log('receiveData',e);
            if(e.content && typeof e.content.event!=="undefined" && e.content.event){
		switch(e.content.event){
                    case 'conv_new_background':
                        if(typeof e.content.value!=="undefined" && e.content.value){
                            $("#paper").css('background','url('+e.content.value+') no-repeat');
                        }
                        break;
	            default:
                        console.log("receive event not catch :", e);
		        break;
	        }
	   }
        });
}
function setConversationListeners() {

    console.log("setConversationListeners");

    connectedConversation
        .on("newWhiteboardSession", function () {
            console.log("newWhiteboardSession in client page");
            connectedConversation.startNewWhiteboardSession('paper');
            whiteBoardClient = ua.getWhiteboardClient();
            whiteBoardClient.setUserCursorColor();
            whiteBoardClient.setFocusOnDrawing(true);
            showWhiteboardFctArea();
        })
        .on("whiteboardRoomMemberUpdate", function (e) {
            console.log("whiteboardRoomMemberUpdate roomId :", e.roomId);
            console.log("whiteboardRoomMemberUpdate status :", e.status);
            console.log("whiteboardRoomMemberUpdate status :", e.contacts);
        })
}

function joinConference(name) {

    //==============================
    // 2/ REGISTER
    //==============================
    ua.register({
        cloudUrl: cloudUrl
    }).then(function(session) {

        hideOfflineWhiteboardArea();
        showOnlineWhiteboardArea();

        // Save session
        connectedSession = session;
	setSessionListeners();
        //==============================
        // 3/ CREATE CONVERSATION
        //==============================
        connectedConversation = connectedSession.getConversation(name);

        setConversationListeners();
	
        //==============================
        // 6/ JOIN CONVERSATION
        //==============================
        connectedConversation.join()
            .then(function(response) {
                console.error('Conversation joined');
            }).catch(function (err) {
                console.error('Conversation join error', err);
            });
    });
};

//==============================
// CREATE CONFERENCE
//==============================
$('#create').on('submit', function(e) {
    e.preventDefault();
    // Get conference name
    var conferenceName = document.getElementById('conference-name').value;
    // Join conference
    joinConference(conferenceName);
});

//==============================
// WHITEBOARD START / STOP BUTTONS
//==============================

//==== OFFLINE MODE

// Click on startWhiteboard button
$('#startOfflineWhiteboard').on('click', function() {
    console.log('startOfflineWhiteboard');
    ua.startWhiteboard('paper');
    //Getting whiteboardClient in order to be able to set UI parameters
    whiteBoardClient = ua.getWhiteboardClient();
    whiteBoardClient.setFocusOnDrawing(true);
    showWhiteboardFctArea();
});
// Click on stopWhiteboard button
$('#stopOfflineWhiteboard').on('click', function() {
    console.log('stopOfflineWhiteboard');
    ua.stopWhiteboard();
    hideWhiteboardFctArea();
});

//==== ON CONVERSATION MODE

$('#startOnlineWhiteboard').on('click', function() {
    console.log('startOnlineWhiteboard');
    connectedConversation.startNewWhiteboardSession('paper');
    //Getting whiteboardClient in order to be able to set UI parameters
    whiteBoardClient = ua.getWhiteboardClient();
    whiteBoardClient.setFocusOnDrawing(true);
    showWhiteboardFctArea();
});
$('#stopOnlineWhiteboard').on('click', function() {
    console.log('stopOnlineWhiteboard');
    connectedConversation.stopNewWhiteboardSession();
    hideWhiteboardFctArea();
});

//==============================
// WHITEBOARD FUNCTIONS
//==============================
$('#touchScreen').on('click', function() {
    console.log('touchScreen');
    whiteBoardClient.toggleTouchScreen();
});
$('#clearPaper').on('click', function() {
    console.log('clearPaper');
    whiteBoardClient.deleteHistory();
});
$('#drawingTool').change(function(){
    whiteBoardClient.setDrawingTool($('#drawingTool').val());
});
$('#brushSize').change(function(){
    whiteBoardClient.setBrushSize($('#brushSize').val());
});
$('#brushColor').change(function(){
    whiteBoardClient.setBrushColor($('#brushColor').val());
});
$('#textInputScale').change(function(){
    whiteBoardClient.setScale($('#textInputScale').val());
});
$('#textInputOffsetX').change(function(){
    whiteBoardClient.setOffset($('#textInputOffsetX').val(), $('#textInputOffsetY').val());
});
$('#textInputOffsetY').change(function(){
    whiteBoardClient.setOffset($('#textInputOffsetX').val(), $('#textInputOffsetY').val());
});
$('#textInputButton').click(function(){
    whiteBoardClient.printSharedText($('#textInputX').val(), $('#textInputY').val(), $('#textInput').val(), 20);
});
$('#undo').click(function(){
    console.log('undo');
    whiteBoardClient.undo();
});
$('#redo').click(function(){
    console.log('redo');
    whiteBoardClient.redo();
});
$('#changeBackground').click(function(){
    if($('#backgroundImage').val()!==""){
	connectedConversation.sendRawData({
            event: 'conv_new_background',
            value: $('#backgroundImage').val() ,
        });
	$("#paper").css('background','url('+$('#backgroundImage').val()+') no-repeat');

   }else{
	alert('No background set');
  }
});
