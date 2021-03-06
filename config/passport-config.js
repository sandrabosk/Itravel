//here we are putting all passport files from app.js
const passport      = require('passport');
const User          = require('../models/user-model.js');
const FbStrategy    = require('passport-facebook').Strategy;
const GoogleStrategy= require("passport-google-oauth").OAuth2Strategy;
const LocalStrategy = require('passport-local').Strategy;
//the same as:
//const passportLocal= require('passport-local');
//const LocalStrategy = passportLocal.Strategy;
const bcrypt        = require('bcryptjs');

//determines WHAT TO PUT in the session (what to put in the box)
  //called when you log in
passport.serializeUser((user, cb)=>{
  //cb==> callback
  cb ( null, user._id );
});

//where to get the rest of the user's information (given what's in the box)
  //called on every request AFTER you log in
passport.deserializeUser((userId, cb) => {
  //query the database with the ID from the box
  User.findById(userId, (err, theUser) => {
    if (err){
      cb(err);
      return;
    }
    //sending the user's information to passport
    cb(null, theUser);
  });
});

passport.use(new FbStrategy(
  {
    clientID: process.env.FB_APP_ID,                        // your Facebook client id
    clientSecret:process.env.FB_APP_SECRET,                 //your facebook client secret
    callbackURL:'/auth/facebook/callback'
  },                    //|
                        //|
        //address for a route in our app
  (accessToken, refreshToken, profile, done)=>{
      console.log('FACEBOOK PROFILE: ', profile);

      User.findOne({facebookId: profile.id}, (err,foundUser) => {
        if(err){
          done(err);
          return;
        }
        //if user is already registered, just log them in
        if(foundUser){
          done(null, foundUser);
          return;
        }
        //register the user if they are not registered
        const theUser = new User({
          facebookId: profile.id,
          name: profile.displayName
        });
        theUser.save((err)=> {
          if (err){
            done(err);
            return;
          }
          //this logs in the newly registered user
          done(null, theUser);
        });
      });
  }
));

//accessToken -> fake stuff that facebook gives to out app and we can cancel it as a user whenever we dont want to use the app
//refreshToken -> its purpose is to renew the token since accessToken has an expiration date

passport.use(new GoogleStrategy(
  {
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done)=>{
    console.log('Google PROFILE: ', profile);

    User.findOne({googleID: profile.id}, (err, foundUser) =>{
      if(err){
        done(err);
        return;
      }

      //if user is already registered, just log them in
      if(foundUser){
        done(null, foundUser);
        return;
      }

      //register the user if they are not registered
      const theUser = new User({
        googleID: profile.id,
        name:profile.displayName
      });

      //if the name is empty save the email
      if(!theUser.name){
        theUser.name = profile.emails[0].value;
      }

      theUser.save((err)=>{
        if(err){
          done(err);
          return;
        }

        //this logs in the newly registered user
        done(null, theUser);
      });
    });
  }
));

//PASSPORT GOES THROUGH THIS:
    //1. our form
    //2. LocalStrategy callback
    //3. (if successful) passport.serializeUser()

passport.use(new LocalStrategy(
  //1st arg - > options to customize LocalStrategy
    {
        //<input name = "loginUsername">
      usernameField: 'loginUsername',
        //<input name = "loginPassword">
      passwordField: 'loginPassword'
    },

  //2nd arg - > callback for the logic that validates the login
  ( loginUsername, loginPassword, next )=>{
    User.findOne({ username: loginUsername }, (err, theUser)=>{
        //tell passport if there was an error (nothing we can do)
        if (err){
          next(err);
          return;
        }
        //tell passport if there's no user with given username
        if (!theUser){ //!theUser ==> user does not exist
                    // false means "Log in failed"
                    //  |
          next(null, false, { message: 'Username is not correct.' });
          return; //            |
                  //            V
                  //        message -> req.flash ('error')
        }
            // here we compare password that user typed in with the one that is saved in the DB (the encryptedPassword)
            //tell passport if the passwords don't match
        if (!bcrypt.compareSync(loginPassword, theUser.encryptedPassword)){
              // false in 2nd arg means "log in failed"
          next(null, false, { message: 'Password is not correct.'});
          return;
        }
        theUser.logInCount+=1;
        theUser.save((err, theUser)=>{
        //null means login didn't fail
        next(null, theUser);
      });
    });
  }
));
