const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();

app.use(express.json());

//enable sessions
app.use(session({
	secret: ,
	resave: false, //should session be saved again on every request 
	saveUninitialized: false, //no session if no log in
	cookie: { maxAge: 24 * 60 * 60 * 1000 } //cookie age
}));

//user storage
let users = [];

//posts storage
let posts = [];


//-------------POST FUNCTIONS----------------

//create post
app.post("/api/posts", (req, res) => {

    //must be logged in
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: "Post content required" });
    }

    const post = {
        id: posts.length + 1,
        username: req.session.user.username,
        content: content,
        createdAt: new Date() //will eventually be location
    };

    posts.push(post);

    res.json({
        message: "Post created",
        post: post
    });
});

//get all posts
app.get("/api/posts", (req, res) => {
    res.json(posts);
});

//get posts for specific user
app.get("/api/users/:username/posts", (req, res) => {
    const username = req.params.username;
    const userPosts = posts.filter(p => p.username === username);
    res.json(userPosts);
});


//-------------USER FUNCTIONS----------------

//get session info
app.get("/api/session", (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}
	res.json({ user: req.session.user });
});

//protect profile and index pages
app.get("/profile.html", (req, res) => {
	if (!req.session.user) {
		return res.redirect("/login.html");
	}
	res.sendFile("/var/www/myconet-html/profile.html");
});

app.get("/", (req, res) => {
        if (!req.session.user) {
                return res.redirect("/login.html");
        }
        res.sendFile("/var/www/myconet-html/index.html");
});

app.get("/index.html", (req, res) => {
        if (!req.session.user) {
                return res.redirect("/login.html");
        }
        res.sendFile("/var/www/myconet-html/index.html");
});

//register
app.post("/api/register", async (req, res) => {

	const { username, email, password } = req.body;

	//check if user already exists
	const existingUser = users.find(u => u.username === username);
	const existingEmail = users.find(u => u.email === email);

	if (existingUser) {
		return res.status(400).json({ message: "User already exists" });
	}
	if (existingEmail) {
		return res.status(400).json({ message: "Email already in use" });
	}

	//hash the password with 10 salt rounds
	const hashedPassword = await bcrypt.hash(password, 10);

	//assemble user
	const user = {
		id: users.length + 1,
		username: username,
		email: email,
		password: hashedPassword
	};

	//push it into user storage
	users.push(user);

	//log in after registering
	req.session.user = {
		id: user.id,
		username: user.username,
		email: user.email
	};

	res.json({
		message: "User registered",
		user: req.session.user
	});

});

//login
app.post("/api/login", async (req, res) => {

	const { email, password } = req.body;

	//find email
	const user = users.find(u => u.email === email);

	//if not email, invalid
	if (!user) {
		return res.status(401).json({ message: "Invalid credentials" });
	}
	
	//find password and compare 
	const password_match = await bcrypt.compare(password, user.password);

	//if not password, invalid
	if (!password_match) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	//store user in session
	req.session.user = {
		id: user.id,
		username: user.username,
		email: user.email
	};

	res.json({ message: "Login successful", user: req.session.user });

});

//logout
app.post("/api/logout", (req, res) => {

	req.session.destroy(err => {

	if (err) {
		return res.status(500).json({ message: "Logout failed" });
	}

	res.clearCookie("connect.sid");
	res.json({ message: "Logged out" });

	});

});


//start server
app.listen(3001, '0.0.0.0', () => {
	console.log("MycoNet API running on port 3001");
});
