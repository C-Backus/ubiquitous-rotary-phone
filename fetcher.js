//get user location
function getLocation() {

	return new Promise((resolve, reject) => {

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    long: position.coords.longitude
                });
            },
            (error) => reject(error)
        );
    });
}

//---------ASSEMBLE POST AND POSTS INTERACTIONS---------

//generic function to render posts to a given container, used for both feed and profile pages
function assemblePosts(container, posts) {

	container.innerText = "";

	//post framework
	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];

		//main container
		const article = document.createElement("article");
		article.classList.add("post");

		//post header
		const header = document.createElement("header");
		header.classList.add("post-header");

		//profile picture and username		
		const figure = document.createElement("figure");
		const profilePic = document.createElement("img");
		
		profilePic.src = "profile.png";
		profilePic.classList.add("profile-pic");
		
		const figcaption = document.createElement("figcaption");
		
		const username = document.createElement("strong");
		username.classList.add("post-username");
		username.innerText = "@" + post.username;

		//is reblog?
		if (post.rebloggedFrom) {
			const reblogInfo = document.createElement("div");
			reblogInfo.classList.add("reblog-info");
			reblogInfo.innerText = "\uD83D\uDD01 Reblogged from ";

			const originalUser = document.createElement("strong");
			originalUser.classList.add("post-username");
			originalUser.innerText = "@" + post.rebloggedFrom;

			originalUser.style.cursor = "pointer";
			originalUser.onclick = () => { window.location.href = `profile.html?username=${post.rebloggedFrom}`;};
			
			reblogInfo.appendChild(originalUser);
			header.appendChild(reblogInfo);
		}

		//go to user profile when username clicked and make cursor a pointer to show it's clickable
		username.style.cursor = "pointer";
		username.onclick = () => { window.location.href = `profile.html?username=${post.username}`;};

		//assemble header
		figcaption.appendChild(username);
		figure.appendChild(profilePic);
		figure.appendChild(figcaption);
		//only add profile picture and username to header if not a reblog
		if(!post.rebloggedFrom) {
			header.appendChild(figure);	
		}

		//post interactions
		const footer = document.createElement("footer");
		footer.classList.add("post-actions");

		//like post
		const likeButton = document.createElement("button");
		likeButton.classList.add("like-button");
		likeButton.innerText = "\u2764\uFE0F " + post.likes.length;

		likeButton.onclick = async function() {
			const response = await fetch(`/api/posts/${post.id}/like`, {
				method: "POST",
				credentials: "include"
			});

			const result = await response.json();

			if (!response.ok) {
				alert("Error liking post: " + result.message);
				return;
			}

			//update like count on button
			likeButton.innerText = "\u2764\uFE0F " + (result.likes?.length || 0);
		}

		//reply to post
		const replyButton = document.createElement("button");
		replyButton.classList.add("reply-button");
		replyButton.innerText = "\uD83D\uDCAC " + post.replies.length;

		replyButton.onclick = async function() {
			//for simplicity, just prompt for reply content. in a real app, would want a nicer UI for this
			const content = prompt("Enter your reply:");

			if (!content || !content.trim()) {
				alert("Reply content required");
				return;
			}

			const response = await fetch(`/api/posts/${post.id}/reply`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content })
			});

			const result = await response.json();

			if (!response.ok) {
				alert("Error replying to post: " + result.message);
				return;
			}

			//update reply count on button
			replyButton.innerText = "\uD83D\uDCAC " + (result.replies?.length || 0);
			loadPosts();
		}

		//reblog post
		const reblogButton = document.createElement("button");
		reblogButton.classList.add("reblog-button");
		reblogButton.innerText = "\uD83D\uDD01 " + post.reblogs.length;

		reblogButton.onclick = async function() {
			const response = await fetch(`/api/posts/${post.id}/reblog`, {
				method: "POST",
				credentials: "include"
			});

			const result = await response.json();

			if (!response.ok) {
				alert("Error reblogging post: " + result.message);
				return;
			}

			//update reblog count on button
			reblogButton.innerText = "\uD83D\uDD01 " + (result.reblogs?.length || 0);
			loadPosts();
		}

		footer.appendChild(likeButton);
		footer.appendChild(replyButton);
		footer.appendChild(reblogButton);

		//post body
		const text = document.createElement("p");
		text.classList.add("post-text");
		text.innerText = post.content;

		//assemble post
		article.appendChild(header);
		article.appendChild(text);
		article.appendChild(footer);

		//if there are replies, add them in a section under the post
		if (post.replies.length > 0) {
			const repliesSection = document.createElement("section");
			repliesSection.classList.add("replies-section");

			post.replies.forEach(reply => {
				const replyArticle = document.createElement("article");
				replyArticle.classList.add("reply");

				const replyHeader = document.createElement("header");
				const user = document.createElement("strong");
				user.innerText = "@" + reply.username;
				replyHeader.appendChild(user);

				const replyText = document.createElement("p");
				replyText.innerText = reply.content;

				replyArticle.appendChild(replyHeader);
				replyArticle.appendChild(replyText);
				

				repliesSection.appendChild(replyArticle);
			});

			article.appendChild(repliesSection);
		}

		//add post to feed
		container.appendChild(article);

	}
}


//---------LOAD PROFILE, CREATE POST, LOAD POSTS---------

async function loadPosts() {

    const location = await getLocation();
	const response = await fetch(`/api/posts?lat=${location.lat}&long=${location.long}`,
		{ credentials: "include" }
	);

    if (!response.ok) {
        postFeed.innerText = "Error loading posts";
        return;
    }

    const posts = await response.json();
	assemblePosts(postFeed, posts);
}

//dynamically load profile posts based on username in URL, also load username to show on profile page
//example: /profile.html?username=alice
const userPostFeed = document.getElementById("user-post-feed");
const summaryUsername = document.getElementById("summary-username");
const headerUsername = document.getElementById("header-username");

async function loadProfile() {

	let username = null;
    const urlParams = new URLSearchParams(window.location.search);

	//if username in URL, load that user's posts. else, load posts for logged in user
	if (urlParams.has("username")) {
		username = urlParams.get("username");
	}
	else {
		const sessionResponse = await fetch("/api/session", { credentials: "include" });
		if (!sessionResponse.ok) {
			userPostFeed.innerText = "Error loading user session";
			return;
		}
		const sessionData = await sessionResponse.json();
		username = sessionData.user.username;
	}

	//load username in title only on profile page
	if (window.location.pathname === "/profile.html") {
		document.title = "@" + username + " | MycoNet \u{1F344}";
	}

	//load summary username
	if(summaryUsername) {
		summaryUsername.innerText = "@" + username;
	}
	//load header username
	if(headerUsername) {
		headerUsername.innerText = "@" + username;
	}

	//load user posts
	if(userPostFeed) {
		const response = await fetch(`/api/users/${username}/posts`);

		if (!response.ok) {
			userPostFeed.innerText = "Error loading posts";
			return;
		}

		//call generic assemblePosts function to create posts for this user
		const posts = await response.json();
		assemblePosts(userPostFeed, posts);
	}
}
if (window.location.pathname === "/profile.html") {
	loadProfile();
}

//create post form submission
const postForm = document.querySelector(".create-post form");
const postInput = document.getElementById("post-input");
const charCount = document.getElementById("char-count");

if (postInput && charCount) {
	postInput.addEventListener("input", function() {
		charCount.innerText = postInput.value.length + " / 160";
	});
}

if (postForm) {
	postForm.addEventListener("submit", async function(event) {
		event.preventDefault();

		const location = await getLocation();

		const content = postInput.value;

		//no whitespace posts
		if (!content.trim()) {
			alert("Post content required");
			return;
		}

		const response = await fetch("/api/posts", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content, location })
		});

		const result = await response.json();

		if (!response.ok) {
			alert("Error creating post: " + result.message);
			return;
		}

			postInput.value = "";
			charCount.innerText = "0 / 160";

		//reload posts
		if (typeof loadPosts === "function") {
			loadPosts();
		}
	});
}


//---------REGISTER, LOGIN, LOGOUT--------

//wanted to do it this style -> document.getElementById("registerForm").addEventListener("submit", async function(event), 
//but would get 405 errors when clicking register. therefore, continued this style below for all functions
//register page form submission
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
	event.preventDefault();

	const username = document.getElementById("username").value;
	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	const confirmPassword = document.getElementById("confirm-password").value;

	//check if passwords match
	if (password !== confirmPassword) {
		alert("Passwords do not match");
		return;
	}

	try{
		const location = await getLocation();
		
		//POST to register endpoint
		const response = await fetch("/api/register", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, email, password, location })
		});

		const result = await response.json();

		if (!response.ok) {
			alert("Registration failed: " + result.message);
			return;
		}

		//Registration success, redirect to feed
		document.location = "index.html";
	}
	catch(error) {
		alert("Error: Location is required to register");
		console.error("Error getting location:", error);
	}
});
}

//login page form submission
const loginForm = document.getElementById("loginForm");
if (loginForm) {
	loginForm.addEventListener("submit", async function(event) {
		event.preventDefault();

		const email = document.getElementById("email").value;
		const password = document.getElementById("password").value;

		const response = await fetch("/api/login", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password })
		});

		const result = await response.json();

		if (!response.ok) {
			alert("Login failed: " + result.message);
			return;
		}

        	//login success
		document.location = "index.html";
	});
}

//logout button listener
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
	logoutButton.addEventListener("click", async function() {
		event.preventDefault();

		const response = await fetch("/api/logout", {
			method: "POST",
			credentials: "include",
		});

	        if (!response.ok) {
        	    alert("Logout failed");
	            return;
	        }

	        document.location = "login.html";
    });
}

//load posts for feed page
const postFeed = document.getElementById("post-feed");

if (postFeed) {
	loadPosts();
}
