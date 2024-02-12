const express = require("express");
const axios = require("axios");
const path = require("path");
const { client, connectToDatabase } = require('../db/db.js');
const API_KEY = "94b07001ec1f4be8df8aa962a94b7dad";
const router = express.Router();
router.use(express.json());
const bcrypt = require('bcrypt');
const session = require("express-session");


router.use(session({
    secret: 'my_secret_key', 
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, 
    }
}));


router.get("/admin", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        await connectToDatabase();
        const users = await client.db("users").collection("users").find().toArray();
        res.render(path.join(__dirname, '..', 'public', 'admin.ejs'), { users: users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/admin/create", async (req, res) => {
    try {
        await connectToDatabase();
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.db("users").collection("users").insertOne({
            username,
            email,
            password: hashedPassword
        });
        res.redirect("/admin");
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/admin/update/:id", async (req, res) => {
    try {
        await connectToDatabase();
        const id = req.params.id;
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.db("users").collection("users").updateOne(
            { _id: ObjectId(id) },
            { $set: { username, email, password: hashedPassword } }
        );
        res.redirect("/admin");
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/admin/delete/:id", async (req, res) => {
    try {
        await connectToDatabase();
        const id = req.params.id;
        await client.db("users").collection("users").deleteOne({ _id: ObjectId(id) });
        res.redirect("/admin");
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/signup", function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

router.get("/login", function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});


router.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

router.get("/ping", function(req, res){
    res.status(200); 
    res.send("pong"); 
});

router.get("/weather/:city", function(req, res){
    const city = req.params.city;
    const lang = req.query.lang || 'en'; 
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=${lang}`;

    axios.get(url)
        .then(response => {
            res.status(200).json(response.data);
        })
        .catch(error => {
            if (error.response) {
                res.status(error.response.status).send(error.response.data);
            } else if (error.request) {
                res.status(500).send({ message: "No response received from the weather service" });
            } else {
                res.status(500).send({ message: "Error in making request to the weather service" });
            }
    });
});

router.get("/wallet/:address", function(req, res){
    const address = req.params.address;
    const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/full?limit=5`;

    axios.get(url)
        .then(response => {
            res.status(200).json(response.data);
        })
        .catch(error => {
            if (error.response) {
                res.status(error.response.status).send(error.response.data);
            } else if (error.request) {
                res.status(500).send({ message: "No response received from the balance service" });
            } else {
                res.status(500).send({ message: "Error in making request to the balance service" });
            }
    });
});

router.get("/BTC/price", function(req, res){
    const url = 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD';

    axios.get(url)
        .then(response => {
            res.status(200).json(response.data);
        })
        .catch(error => {
            if (error.response) {
                res.status(error.response.status).send(error.response.data);
            } else if (error.request) {
                res.status(500).send({ message: "No response received from the BTC price service" });
            } else {
                res.status(500).send({ message: "Error in making request to the BTC price service" });
            }
    });
});
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;


        if (!username || !email || !password) {
            return res.status(400).send({ success: false, message: "Missing required fields" });
        }

      
        await connectToDatabase();

        const hashedPassword = await bcrypt.hash(password, 10);

        
        await client.db("users").collection("users").insertOne({
            username,
            email,
            password: hashedPassword
        });

        res.status(200).send({ success: true, redirectUrl: "/" });
 
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send({ success: false, message: "Error registering user" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

    
        await connectToDatabase();

        console.log("Searching for user:", username); 
        const user = await client
            .db("users")
            .collection("users")
            .findOne({ username });

        console.log("Found user:", user); 

        if (!user) {
            return res.status(401).send({ success: false, message: "User not found" });
        }

        
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).send({ success: false, message: "Incorrect password" });
        }

      
        req.session.user = user;

       
        res.status(200).send({ success: true, redirectUrl: "/" });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).send({ success: false, message: "Internal Server Error" });
    }
});
 
module.exports = router;
