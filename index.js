const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require("bcrypt")
const socketIO = require("socket.io")
const https = require("https");
const fs = require('fs');

// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
  db.run('create table if not exists messages (messageId integer primary key, username text not null, message text not null)');
});

const secureServer = https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.cert')
  }, app);

// Adds user to db
const addUserToDatabase = (username, password) => {
  db.run(
    'insert into users (username, password) values (?, ?)', 
    [username, password], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const addMessageToDatabase = (username, message) => {
  db.run(
    'insert into messages (username, message) values (?, ?)', 
    [username, message], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const getUserByUsername = (userName) => {
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from users where username=(?)',
      [userName], 
      (err, rows) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        return resolve(rows);
      }
    );
  })
}

const getAllMessages = () => {
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from messages',
      [], 
      (err, rows) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        return resolve(rows);
      }
    );
  })
}

async function hashPassword(plaintextPassword) {
    const hash = await bcrypt.hash(plaintextPassword, 10);
    return hash;
}

  // compare password
async function comparePassword(plaintextPassword, hash) {
    const result = await bcrypt.compare(plaintextPassword, hash);
    return result;
}

app.use(express.static(__dirname + '/public'))

app.use(
    session({
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);

app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("/chatroom");
    } else {
        return res.sendFile("login.html", { root: path.join(__dirname, "public") });
    }
});

app.get("/chatroom", (req, res) => {
  if (req.session.loggedIn) {
    return res.sendFile("chatroom.html", { root: path.join(__dirname, "public") });
  } else {
    return res.redirect("/");
  }
});



app.post("/authenticate", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username);

  if (!user.length) {
    return res.send('No user found, please sign up');
  }

  const hashedPassword = user[0].password;

  const isCorrectPassword = await comparePassword(req.body.password, hashedPassword);

  if (isCorrectPassword) {
    req.session.loggedIn = true;
    req.session.username = req.body.username;
    res.redirect("/");
  } else {
    // Sendes an error 401 (unauthorized) to client
    res.sendStatus(401);
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {});
  return res.send("Thank you! Visit again");
});

app.get("/signup", (req, res) => {
  if (req.session.loggedIn) {
      return res.redirect("/dashboard");
  } else {
      return res.sendFile("signup.html", { root: path.join(__dirname, "public") });
  }
});

app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  // Here want to have hashes password and messenges
  const hashedPassword = await hashPassword(req.body.password);
  addUserToDatabase(req.body.username, hashedPassword);
  res.redirect('/');
})  


const { Server } = require("socket.io");
const io = new Server(secureServer);

secureServer.listen(port, () => {
  console.log('listening on :', port);
});

io.on("connection", function (socket) { 
  socket.on("join", async function (username) {
    const allMessages = await getAllMessages();
    socket.emit('messages', allMessages);
    socket.broadcast.emit("message", { username: 'global', text: username + " joined the chat!" }); 
  });

  socket.on("message", function (message) {
    addMessageToDatabase(message.username, message.text);
		io.sockets.emit("message", message); 
  });
});
