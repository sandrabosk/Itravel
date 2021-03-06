const express    = require ('express');
const bcrypt     = require('bcryptjs');
const passport   = require('passport');
const ensure     = require('connect-ensure-login');
const multer     = require('multer');
const path       = require('path');
const User       = require('../models/user-model.js');

const authRoutes = express.Router();

// handle image upload
const myUploader = multer({
  dest:path.join( __dirname, '../public/uploads')
 });

//receiving and processing form
authRoutes.post('/signup', 
    ensure.ensureNotLoggedIn('/'), 
    myUploader.single('userPhoto'), 
    (req, res, next)=>{
      const signupUsername = req.body.signupUsername;
      const signupPassword = req.body.signupPassword;

      User.findOne(
        { username: signupUsername },
        { username:1},
        (err, foundUser) => {
          if (err){
            next(err);
            return;
          }

          //don't let user register if the username is taken
          if (foundUser){
            req.flash('error', 'Username taken! Please choose a different one.');
            res.redirect('/');
            return;
          }
          // we are good to go, time to save the user.
          //encrypt the password
          const salt = bcrypt.genSaltSync(10); //signupPassword is the one user provided
          const hashPass = bcrypt.hashSync(signupPassword, salt);


          //create theUser (I chose this way just because I wanted to have saved different ways, since on class we used: const theUser = new User({ here goes all the fields }); )
          const theUser = new User();
          theUser.name = req.body.signupName;
          theUser.username = req.body.signupUsername;
          theUser.encryptedPassword = hashPass;
          theUser.location = req.body.userCountry;
          theUser.profession = req.body.userProfession;
          theUser.email = req.body.userEmail;
          theUser.favPlace = req.body.userFavPlace;
          if(req.file !== undefined){
            theUser.photo = `/uploads/${req.file.filename}`;
          }
          //save theUser
          theUser.save((err)=>{
            if (err){
              next(err);
              return;
            }
            //we put messages right before we redirect and it will be displayed after the redirect
            req.flash(
              //1sta rg -> the name  or the key if the message, not the message itself
              // 'successfulSignup', ---> no need for this so we dont have to make duplicates on our home page
              'success',
              //2nd arg --> the actual message
              'Welocome! You have registered successfully.'
            );
            //redirect to homepage if save is successful
            res.redirect('/');
          });
        }
      );
});
                                             // local as in "localStrategy", our method of logging in
                                              //  |
authRoutes.post('/login',                     //  |
    ensure.ensureNotLoggedIn('/'),            //  |
    passport.authenticate('local',  //<------------
  {
    successRedirect:'/',
    successFlash: true,     //req.flash('success')
    failureRedirect: '/',
    failureFlash: true      //req.flash('success')
  })
);

authRoutes.get('/logout', (req, res, next)=>{
  // method provided by Passport
  //     ^
  //     |
  req.logout();
  req.flash('success', 'Thank you and happy travelling! We are waiting for new stories!');
  res.redirect('/');
});
                                                        //facebook as in 'FbStrategy'
                                                        //  |
authRoutes.get('/auth/facebook',passport.authenticate('facebook'));
//                      |
// Link to this address to log un with facebook

// Where facebook goes after the user has accepted/rejected:
  //callbackURL:'/auth/facebook/callback'
                      // |
authRoutes.get('/auth/facebook/callback', passport.authenticate('facebook',{
  successRedirect: '/',
  failureRedirect:'/'
}));


//these are the two routes for GOOGLE
authRoutes.get('/auth/google', passport.authenticate('google',{
  scope: ['https://www.googleapis.com/auth/plus.login',
          'https://www.googleapis.com/auth/plus.profile.emails.read']
}));
authRoutes.get('/auth/google/callback', passport.authenticate('google',{
  successRedirect: '/',
  failureRedirect:'/'
}));

module.exports = authRoutes;
