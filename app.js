const multer = require('multer');
const path = require('path');
const { sequelize, User, Post, Reply, Like } = require("./models");
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

//profile picture uploads folder
const storage = multer.diskStorage({
    destination: '/var/www/myconet-api/profilePictures',
    filename: function(req, file, cb) {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
app.use('/profilePictures', express.static('/var/www/myconet-api/profilePictures'));

//-------------POST FUNCTIONS----------------

//create post
app.post("/api/posts", async (req, res) => {

    //must be logged in
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const { content, location } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ message: "Post content required" });
    }

    if (!location || location.lat == null || location.long == null) {
        return res.status(400).json({ message: "Location required" });
    }

    try {
        const user = await User.findOne({
            where: { username: req.session.user.username }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //create post in db
        const post = await Post.create({
            content: content.trim(),
            locationLat: location.lat,
            locationLong: location.long,
            UserId: user.id
        });

        res.json({
            message: "Post created",
            post
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
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
app.get("/api/posts", async (req, res) => {
    const { lat, long } = req.query;

    if (!lat || !long) {
        return res.status(400).json({ message: "Location required" });
    }

    const userLat = parseFloat(lat);
    const userLong = parseFloat(long);

    try {
        const posts = await Post.findAll({
            include: [
                { model: User },     //author
                { 
                    model: Reply,    //replies
                    include: [{ model: User }] //so reply.User.username works
                }, 
                {
                    model: User,
                    as: "Likers",    //likes
                    attributes: ["id"]
                },
				{				
                    model: Post,
                    as: "Reblogs",	//reblogs
                    attributes: ["id"]
                },
                {
                    model: Post,
                    as: "OriginalPost",
                    include: [{ model: User }] //gets the username of the user the post is reblogged from
                }
            ],
            order: [["createdAt", "DESC"]] 	//most recent at top of page
        });

        //filter nearby posts using Haversine Formula function
        const nearbyPosts = posts.filter(p => {
            if (!p.locationLat || !p.locationLong) return false;

            const distance = latLongToMiles(
                userLat,
                userLong,
                p.locationLat,
                p.locationLong
            );

            return distance <= 5;
        });

        //assemble posts
        const formatted = nearbyPosts.map(p => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt,
            User: {
                username: p.User?.username,
                profilePic: p.User.profilePic
            },

            replies: p.Replies || [],
            likes: p.Likers || [],
            reblogs: p.Reblogs || [],
            rebloggedFrom: p.OriginalPost ? p.OriginalPost.User.username : null,
            rebloggedTime: p.OriginalPost ? p.OriginalPost.createdAt : null,
			locationLat: p.locationLat,
            locationLong: p.locationLong,
            rebloggedFrom: p.OriginalPost?.User?.username || null
        }));

        res.json(formatted);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//get posts for specific user
app.get("/api/users/:username/posts", async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: [
                { 
                    model: User,     //author
                    where: { username: req.params.username }
                },
                { 
                    model: Reply,    //replies
                    include: [{ model: User }] //so reply.User.username works
                },
                {
                    model: User,     //likes
                    as: "Likers",
                    attributes: ["id"]
                },
				{				
                    model: Post,
                    as: "Reblogs",   //reblogs
                    attributes: ["id"]
                },
                {
                    model: Post,
                    as: "OriginalPost",
                    include: [{ model: User }] //gets the username of the user the post is reblogged from
                }
            ],
            order: [["createdAt", "DESC"]]	//most recent at top of page
        });

        //assemble posts
        const formatted = posts.map(p => ({
            id: p.id,
            content: p.content,
            createdAt: p.createdAt,
            User: {
                username: p.User?.username,
                profilePic: p.User.profilePic
            },
            replies: p.Replies || [],
            likes: p.Likers || [],
			reblogs: p.Reblogs || [],
            rebloggedFrom: p.OriginalPost ? p.OriginalPost.User.username : null,
            rebloggedTime: p.OriginalPost ? p.OriginalPost.createdAt : null,
            locationLat: p.locationLat,
            locationLong: p.locationLong,
            rebloggedFrom: p.OriginalPost?.User?.username || null
        }));

        res.json(formatted);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//-------------POST INTERACTIONS----------------

//like/unlike post
app.post("/api/posts/:id/like", async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}
	try {
        const post = await Post.findByPk(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
		
		const user = await User.findByPk(req.session.user.id);

        //"Liker" for check and "Likers" for add/remove
        const alreadyLiked = await post.hasLiker(user); 

        if (alreadyLiked) {
            await post.removeLiker(user);
        } else {
            await post.addLiker(user);
        }

        //get the updated list using the alias in db (length read in fetcher.js)
        const updatedLikes = await post.getLikers({ attributes: ['id'] });

        res.json({
            likes: updatedLikes
        });

    } catch (err) {
        console.error("Like error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

//reply to post
app.post("/api/posts/:id/reply", async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

 const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ message: "Reply content required" });
    }

    try {
        const post = await Post.findByPk(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const user = await User.findOne({
            where: { username: req.session.user.username }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //create reply in db
        const reply = await Reply.create({
            content: content.trim(),
            PostId: post.id,
            UserId: user.id
        });

        //return updated replies
        const replies = await Reply.findAll({
            where: { PostId: post.id },
            include: [{ model: User }],
            order: [["createdAt", "DESC"]]
        });

        res.json({ replies });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//reblog/unreblog post
app.post("/api/posts/:id/reblog", async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

	try {
        const originalPost = await Post.findByPk(req.params.id);

        if (!originalPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        const user = await User.findOne({
            where: { username: req.session.user.username }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //check if user already reblogged post
        const existingReblog = await Post.findOne({
            where: {
                UserId: user.id,
                rebloggedFromId: originalPost.id
            }
        });

        //unreblog
        if (existingReblog) {
            await existingReblog.destroy();
        } else {

            //reblog
            await Post.create({
                content: originalPost.content,
                locationLat: originalPost.locationLat,
                locationLong: originalPost.locationLong,
                UserId: user.id,
                rebloggedFromId: originalPost.id
            });
        }

        //get the updated list of reblogs to send to frontend (length read in fetcher.js)
        const updatedReblogs = await Post.findAll({ 
            where: { rebloggedFromId: originalPost.id } 
        });

        res.json({
            reblogged: !existingReblog,
            reblogs: updatedReblogs
        });

    } catch (err) {
        console.error("Reblog error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

//-------------USER FUNCTIONS----------------

//get username and profile picture
app.get('/api/users/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { username: req.params.username },
            attributes: ['username', 'profilePic'] // ONLY send public info, NEVER the password
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//get session info
app.get("/api/session", async (req, res) => {

	if (!req.session.user) {
		return res.status(401).json({ message: "Not logged in" });
	}

	const user = await User.findByPk(req.session.user.id);

	if (!user) {
		return res.status(401).json({ message: "User no longer exists" });
	}

	res.json({
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
            profilePic: user.profilePic
		}
	});
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
app.post("/api/register", upload.single('profilePic'), async (req, res) => {

	const { username, email, password, locationLat, locationLong } = req.body;

    if (!username || !email || !password || !locationLat || !locationLong) {
        return res.status(400).json({ message: "Missing a field." });
    }

	try {

		//check existing user/email in db
		const existingUser = await User.findOne({ where: { username } });
		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}

		const existingEmail = await User.findOne({ where: { email } });
		if (existingEmail) {
			return res.status(400).json({ message: "Email already in use" });
		}

		//hash password
		const hashedPassword = await bcrypt.hash(password, 10);

        //link uploaded file name to profilePictures folder

		//create user in db
		const user = await User.create({
			username,
			email,
			password: hashedPassword,
			locationLat: locationLat,
			locationLong: locationLong,
            profilePic: req.file ? req.file.filename : null
		});

		//store session
		req.session.user = {
			id: user.id,
			username: user.username,
			email: user.email,
            profilePic: user.profilePic
		};

		res.json({
			message: "User registered",
			user: req.session.user
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
});

//login
app.post("/api/login", async (req, res) => {

	const { email, password } = req.body;

	try {

		//find user in db
		const user = await User.findOne({ where: { email } });

		if (!user) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		//compare password
		const password_match = await bcrypt.compare(password, user.password);

		if (!password_match) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		//store session
		req.session.user = {
			id: user.id,
			username: user.username,
			email: user.email,
            profilePic: user.profilePic
		};

		res.json({
			message: "Login successful",
			user: req.session.user
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
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

//------ sync database & run server ------
sequelize.sync().then(() => {
    console.log("Database synced");

	app.listen(3001, '0.0.0.0', () => {
		console.log("MycoNet API running on port 3001");
	});

}).catch(err => {
    console.error("Error syncing database:", err);
});

