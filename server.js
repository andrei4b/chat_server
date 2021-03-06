"use strict";
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// latest 10 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
  // Not important for us. We're writing WebSocket server,
  // not HTTP server
});

server.listen(process.env.PORT || webSocketsServerPort, function() {
  console.log((new Date()) + " Server is listening on port "
      + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info 
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin '
      + request.origin + '.');
  // accept connection - you should check 'request.origin' to
  // make sure that client is connecting from your website
  // (http://en.wikipedia.org/wiki/Same_origin_policy)
  var connection = request.accept(null, request.origin); 

  // we need to know client index to remove them on 'close' event
  var client, index;
  var userName = false;
  
  console.log((new Date()) + ' Connection accepted.');

  // user sent some message
  connection.on('message', function(message) {
    if (message.type === 'utf8') { // accept only text
    // first message sent by user is their name
     if (userName === false) {
        // remember user name
        userName = message.utf8Data;
        client = { userName: userName, connection: connection };
        index = clients.push(client) - 1;

        // send back chat history
		if (history.length > 0) {
		  	var personal_history = [];
		  	for(var i = 0; i < history.length; i++) {
		  		if(history[i].author == userName || history[i].destination == userName)
		  			personal_history.push(history[i]);
		  	}
		    connection.sendUTF(
		        JSON.stringify({ type: 'history', data: personal_history } ));
		}

        /*for (var i=0; i < clients.length; i++) {
        	if(clients[i] != connection)
          		clients[i].sendUTF(JSON.stringify({type: "notification_message", data: userName + " joined the group."}));
        }*/
        
        console.log((new Date()) + ' User is known as: ' + userName);

      } else { // log and broadcast the message
        console.log((new Date()) + ' Received Message from '
                    + userName + ': ' + message.utf8Data);

        var jsonChatMessage = JSON.parse(message.utf8Data);
        
        // we want to keep history of all sent messages
        var obj = 
        {
          text: htmlEntities(jsonChatMessage.text),
          time: jsonChatMessage.time,//(new Date()).getTime(),
          author: jsonChatMessage.author,
          destination: jsonChatMessage.destination
        };

        console.log("converted json fields: " + obj.text + " " + obj.time + " " + obj.author + " " + obj.destination);

        history.push(obj);
        history = history.slice(-10);

        var obj_array = [];
        
        obj_array.push(obj);

        var json = JSON.stringify({ type:'message', data: obj_array});

        for (var i=0; i < clients.length; i++) {
        	if(clients[i].userName == obj.destination)
          		clients[i].connection.sendUTF(json);
        }

        obj_array.pop();
      }
    }
  });
  // user disconnected
  connection.on('close', function(connection) {
    if (userName !== false) {
      console.log((new Date()) + " Peer "
          + connection.remoteAddress + " disconnected.");
      // remove user from the list of connected clients
      clients.splice(index, 1);
    }
  });
});