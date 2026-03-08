
//wanted to do it this style -> document.getElementById("registerForm").addEventListener("submit", async function(event) , but would get 405 errors when clicking register. therefore, continued this style below for all functions
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

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const response = await fetch("/api/login", {
            method: "POST",
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
const logoutButton = document.getElementById("logoutBtn");
if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        const response = await fetch("/api/logout", { method: "POST" });
        if (!response.ok) {
            alert("Logout failed");
            return;
        }
        document.location = "login.html";
    });
}
