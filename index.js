const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto');


// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});


// Tilføjer user til db
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

const getUserByUsername = (userName) => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from users where userName=(?)',
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

const md5sum = crypto.createHash('md5');
const salt = 'Some salt for the hash';

const hashPassword = (password) => {
  return md5sum.update(password + salt).digest('hex');
}





app.use(
    session({
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);

app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("/dashboard");
    } else {
        return res.sendFile("login.html", { root: path.join(__dirname, "public") });
    }
});


app.get("/logout", (req, res) => {
    req.session.destroy((err) => {});
    return res.send("Thank you! Visit again");
});

  
app.get("/dashboard", (req, res) => {
  if (req.session.loggedIn) {
    res.setHeader("Content-Type", "text/html");
    res.write("Welcome " + req.session.username + " to your dashboard");
    res.write('<a href="/logout">Logout</a>');
    return res.end();
  } else {
    return res.redirect("/");
  }
});



app.post("/authenticate", bodyParser.urlencoded(), async (req, res) => {
  
  
  // Opgave 1
  // Programmer så at brugeren kan logge ind med sit brugernavn og password

  // Henter vi brugeren ud fra databasen
  // const user = await getUserByUsername('test')
  // console.log({user});


  // Hint: Her skal vi tjekke om brugeren findes i databasen og om passwordet er korrekt
  if (req.body.username == "test" && req.body.password == "password") {
      req.session.loggedIn = true;
      req.session.username = req.body.username;
      console.log(req.session);
      res.redirect("/dashboard");
  } else {
      // Sender en error 401 (unauthorized) til klienten
      return  res.sendStatus(401);
  }
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

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  addUserToDatabase(req.body.username, req.body.password);
  res.redirect('/');
})  
  



app.listen(port, () => {
  console.log("Website is running");
});
