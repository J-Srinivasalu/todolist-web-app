require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const userCon = mongoose.createConnection(
  "mongodb+srv://admin-dead:"+process.env.USERKEY+"@cluster0.lpmd15i.mongodb.net/userDB",
  { useNewUrlParser: true }
);
const listCon = mongoose.createConnection(
  "mongodb+srv://admin-dead:"+process.env.USERKEY+"@cluster0.lpmd15i.mongodb.net/todolistDB"
);

// user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);

//user model
const User = userCon.model("User", userSchema);

//item schema
const itemSchema = {
  name: String,
};

// item model
const Item = listCon.model("Item", itemSchema);

//List schema
const listSchema = {
  name: String,
  items: [itemSchema],
};

// List Model
const List = listCon.model("List", listSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
  res.redirect("/list");
});

/**  User Auth Start **/
app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/logout", function (req, res) {
  req.logout(function (err) {
    if (!err) res.redirect("/login");
  });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/list");
      });
    }
  });
});

app.post("/register", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.register({ username: username }, password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/list");
      });
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register");
});
/**  User Auth end **/

/** List  CRUD start **/
const list = [];

//Read from list db - if new user create new list collection
app.get("/list", function (req, res) {
  if (req.isAuthenticated()) {
    const username = req.user.username;
    const name = username.substring(0, username.indexOf("@"));
    const listTitle = name + "'s List";

    List.findOne({ name: username }, function (err, foundList) {
      if (!err) {
        if (!foundList) {
          // Create new list
          const list = new List({
            name: username,
            items: [],
          });
          list.save();
          res.redirect("/list");
        } else {
          // Show existing list

          res.render("list", {
            listTitle: listTitle,
            newListItems: foundList.items
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Insert item to list
app.post("/insert", function (req, res) {
  const username = req.user.username;
  const itemName = req.body.newItem;
  const item = new Item({
    name: itemName,
  });

  List.findOne({ name: username }, function (err, foundList) {
    foundList.items.push(item);
    foundList.save();
    res.redirect("/list");
  });
});

// Deleting item from list
app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const username = req.user.username;

  List.findOneAndUpdate(
    { name: username },
    { $pull: { items: { _id: checkedItemId } } },
    function (err, foundList) {
      if (!err) {
        res.redirect("/list");
      }
    }
  );

});

//Updating item

// app.post("/update", function(req, res) {
//     console.log(req.body.item);
//     const itemId = req.body.item._id;
//     req.session.updateItem = req.body.item.name;
//     console.log(req.session.updateItem);

//     const username = req.user.username;
//     List.findOneAndUpdate(
//         { name: username }, {$pull : { items: { id: itemId}}},
//         function(err, foundList) {
//             if(!err){
//                 res.redirect("/list");
//             }
//         }
//     );
// });

/** List  CRUD end **/
let port = process.env.PORT;

if(port == null || port == ""){
  port = 3000;
}
app.listen(port, function () {
  console.log("Server started at port 3000");
});
