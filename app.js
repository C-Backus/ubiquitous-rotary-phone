const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();

app.use(express.json());

//enable sessions
app.use(session({
	secret: 'myconet-secret', //**DO NOT PUSH TO GITHUB WITH THIS STRING PRESENT**
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

	//need location
	if (!req.body.location) {
		return res.status(400).json({ message: "Location required" });
	}

    const { content, location } = req.body;

    if (!content) {
        return res.status(400).json({ message: "Post content required" });
    }

    const post = {
		//main post info
        id: posts.length + 1,
        username: req.session.user.username,
        content: content,
        location: location,
        createdAt: new Date(),

		//post interactions
		likes: [],
		replies: [],
		reblogs: []
    };

    posts.push(post);

    res.json({
        message: "Post created",
        post: post
    });
});

//convert lat long location to a 5 mile radius using Haversine Formula
function latLongToMiles(lat1, lon1, lat2, lon2) {
	
	const R = 3958.8; //radius of Earth in miles
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = 
		Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

//get all posts
app.get("/api/posts", (req, res) => {
	const { lat, long } = req.query;

	if (!lat || !long) {
		return res.status(400).json({ message: "Location required" });
	}

	const userLat = parseFloat(lat);
	const userLong = parseFloat(long);

	const nearbyPosts = posts.filter(p => {
        if (!p.location) return false;

        const distance = latLongToMiles(
            userLat,
            userLong,
            p.location.lat,
            p.location.long
        );

        return distance <= 5;
    });

    res.json(nearbyPosts);
});

//get posts for specific user
app.get("/api/users/:username/posts", (req, res) => {
    const username = req.params.username;
    const userPosts = posts.filter(p => p.username === username);
    res.json(userPosts);
});

//-------------POST INTERACTIONS----------------

//like/unlike post
app.post("/api/posts/:id/like", (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

	const postId = parseInt(req.params.id);
	const post = posts.find(p => p.id === postId);

	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	const userId = req.session.user.id;

	//toggleable like: if user already liked, remove like. else, add like
	if (post.likes.includes(userId)) {
		post.likes = post.likes.filter(id => id !== userId);
	} else {
		post.likes.push(userId);
	}

	res.json({ likes: post.likes });
});

//reply to post
app.post("/api/posts/:id/reply", (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

	const postId = parseInt(req.params.id);
	const post = posts.find(p => p.id === postId);

	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	const reply = {
		id: post.replies.length + 1,
		username: req.session.user.username,
		content: req.body.content,
		createdAt: new Date()
	};

	post.replies.push(reply);

	res.json({ replies: post.replies });
});

//reblog/unreblog post
app.post("/api/posts/:id/reblog", (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

	const postId = parseInt(req.params.id);
	const post = posts.find(p => p.id === postId);

	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}
	
	const userId = req.session.user.id;

	//toggleable reblog: if user already reblogged, remove reblog. else, add reblog
	if (post.reblogs.includes(userId)) {
		post.reblogs = post.reblogs.filter(id => id !== userId);

		for (let i = posts.length - 1; i >= 0; i--) {
			if (posts[i].originalPostId === post.id && posts[i].userId === userId) {
				posts.splice(i, 1);
				
			}
		}
	} else {
		post.reblogs.push(userId);
		
		posts.push({
			...post,
			id: posts.length + 1,
			username: req.session.user.username,
			userId: userId,
			originalPostId: post.id,
			rebloggedFrom: post.username,
			createdAt: new Date()
		});
		
	}
	res.json({ reblogs: post.reblogs });
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

	const { username, email, password, location } = req.body;

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
		password: hashedPassword,
		location: location
	};

	//push it into user storage
	users.push(user);

	//log in after registering
	req.session.user = {
		id: user.id,
		username: user.username,
		email: user.email,
		location: user.location
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
