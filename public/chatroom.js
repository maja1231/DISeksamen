$(document).ready(function () {
    var socket = io('https://localhost:3000', {secure: true});
    
    var username = prompt("What is your name?");
    socket.emit('join', username);
    
  
    // Listens for form submission
    $("#chat-form").on('submit', function(e){
        e.preventDefault();
        var message = $(".msg-textbox").val();
        socket.emit('message', {username, text: message})
        $(".msg-textbox").val("");
    })
  
    // adds HTML message to chat
    const addMessageToChat = (message) => {
        var newMessage;
        if (message.username == "global") {
            newMessage = `<h3 class="global-msg">${message.text}</h3>`
        } else {
            newMessage = `<div id="message-box">
                                    <i><b>${message.username}</b></i>
                                    <div id="message">
                                     ${message.text}
                                    </div>
                                </div>`    
        }
        $('#messages-container').append(newMessage);
    }
  
  
    // On receiving one message
    socket.on('message', function(message){
      console.log('message: ', message)
      addMessageToChat(message);
    })
  
  
    // on receiving a list of messages
    socket.on('messages', function(messages) {
      messages.forEach(message => {
          addMessageToChat({
              username: message.username,
              text: message.message
          });
      })
    })
  })
  