//load posts for feed page
const postFeed = document.getElementById("post-feed");

if (postFeed) {
    loadPosts();
}

async function loadPosts() {

    const response = await fetch("/api/posts");

    if (!response.ok) {
        postFeed.innerText = "Error loading posts";
        return;
    }

    const posts = await response.json();

    let text = "";

    for (let i = 0; i < posts.length; i++) {
        text += posts[i].content + " (" + posts[i].username + ")\n";
    }

    postFeed.innerText = text;
}

//dynamically load profile posts based on username in URL. example: /profile.html?username=alice
//also loads username to show on profile page
const userPostFeed = document.getElementById("user-post-feed");
const profileUsername = document.getElementById("username");

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

	//load username
	if(profileUsername) {
		profileUsername.innerText = "@" + username;
	}

	//load user posts
	if(userPostFeed) {
		const response = await fetch(`/api/users/${username}/posts`);

		if (!response.ok) {
			userPostFeed.innerText = "Error loading posts";
			return;
		}

		const userPosts = await response.json();
		let text = "";
		for (let i = 0; i < userPosts.length; i++) {
			text += userPosts[i].content + " ("+ userPosts[i].username + ")\n";
		}
		userPostFeed.innerText = text;
	}
}
loadProfile();

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
			body: JSON.stringify({ content })
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


//---------REGISTER, LOGIN, LOGOUT----------------

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

	//POST to register endpoint
	const response = await fetch("/api/register", {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username, email, password })
	});

	const result = await response.json();

	if (!response.ok) {
		alert("Registration failed: " + result.message);
		return;
	}

	//Registration success, redirect to feed
	document.location = "index.html";
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
