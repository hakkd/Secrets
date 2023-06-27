//jshint esversion:6
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "My little secret",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
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
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login"}),
    (req, res) => {
        res.redirect("/secrets");
    });

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {
        const newUser = new User({
            username: req.body.username,
            password: req.body.password
        })
        req.login(newUser, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    });

app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post(async (req, res) => {
        User.register({username: req.body.username}, req.body.password)
            .then(() => {
                const authenticate = passport.authenticate("local");
                authenticate(req, res, () => {
                    res.redirect("/secrets");
                });
            })
            .catch((err) => {
                console.log(err);
                res.redirect("/register");
            });
    });

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne:null}})
        .then((foundUsers) => {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        })
        .catch((err) => {console.log(err)});
});

app.route("/submit")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post((req, res) => {
        const submittedSecret = req.body.secret;

        console.log(req.user);
        
        User.findById(req.user.id)
            .then((user) => {
                if (user) {
                    user.secret = submittedSecret;
                    user.save()
                        .then(() => {
                            res.redirect("/secrets");
                        });
                }
            })
            .catch((error) => {console.log(error)});
    });

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.listen(3000, () => {console.log("listening on port 3000");});