
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
//const encrypt = require('mongoose-encryption');
//const md5 = require('md5');
// const bcrypt = require('bcrypt');

// const saltRounds = 10;

const session = require('express-session');
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');

const GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "our little sectet",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, enryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

 

app.get("/", function(req, res){
    res.render('home');
});

app.get('/auth/google', 
    passport.authenticate("google", { scope: ['profile'] }));


app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

app.get("/login", function(req, res){
    res.render('login');
});

app.get("/register", function(req, res){
    res.render('register');
});

app.get("/logout", function(req, res){
    res.redirect("/");
});

app.get("/secrets", function(req,res){
    if(req.isAuthenticated()){
        User.find({"secret": {$ne : null}}, function (err, foundUsers){
            if(foundUsers){
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        })
    } else{
        res.redirect('/login');
    }
});

app.get("/logut", function(req, res){
    req.logout();
    res.redirect("/");
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render('submit');
    } else{
        res.redirect('/login');
    }
});

app.post("/submit", function(req, res){
    const submittetSecret = req.body.secret;

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        } else{
            if(foundUser){
                foundUser.secret = submittetSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    })
});


app.post("/register", function(req, res){

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    //     const newUSer = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    
    //     newUSer.save(function(err){
    //         if(err){
    //             console.log(err);
    //         }else{
    //             res.render("secrets");
    //         }
    //     });
    // });

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});

app.post("/login", function(req, res){
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne(
    //     {username: username},
    //     function(err, user){
    //         if(err){
    //             console.log(err);
    //         } else if(user){
    //             bcrypt.compare(password, user.password, function(err, result){
    //                 if(result === true){
    //                     res.render('secret');
    //                 }
    //             });
    //         } else {res.send("no user found");}
    //     });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else{
            passport.authenticate("local")(req, res, function(){
                res.redirect('/secrets');
            })
        }
    });

});


app.listen(8080, function(){
    console.log("server start on port 8080");
});