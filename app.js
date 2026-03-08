const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();


app.use(express.json());

//enable sessions
app.use(session({
	secret: '', //needs to be longer more random string
	resave: false, //should session be saved again on every request 
	saveUninitialized: false, //no session if no log in
	cookie: { maxAge: 24 * 60 * 60 * 1000 } //cookie age
}));

//user storage
let users = [];

//register
app.post("/api/register", async (req, res) => {

	const { username, email, password } = req.body;

	//check if user already exists
	const existingUser = users.find(u => u.username === username);

	if (existingUser) {
		return res.status(400).json({ message: "User already exists" });
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

	res.json({ message: "Logged out" });

	});

});

//start server
app.listen(3001, '0.0.0.0', () => {
  console.log("MycoNet API running on port 3001");
});
