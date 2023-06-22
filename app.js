//jshint esversion:6
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username})
        .then((foundUser) => {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password)
                    .then((result) => {
                        if (result === true) {
                            res.render("secrets");
                        }})
                        .catch((error) => {console.log(error);});
                    }
                });
});

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds)
        .then((hash) => {
            const newUser = new User({
                email: req.body.username,
                password: hash,
                });

            newUser.save()
                .then(() => {res.render("secrets")})
                .catch(err => {console.log(err)});
        })
        .catch(err => {console.log(err)});
});


app.listen(3000, () => {console.log("listening on port 3000");});