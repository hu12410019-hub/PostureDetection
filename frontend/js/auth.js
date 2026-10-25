// =========================================================
// GYMGUARD - AUTHENTICATION
// =========================================================

async function getCurrentUser() {

    try {

        const response = await fetch(
            "/api/me",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (!data.loggedIn) {
            return null;
        }

        return data.user;

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        return null;
    }
}


// =========================================================
// PROTECT PAGE
// =========================================================

async function requireLogin() {

    const user = await getCurrentUser();

    if (!user) {

        window.location.href =
            "login.html";

        return null;
    }

    addUserControls(user);

    return user;
}


// =========================================================
// USER CONTROLS
// =========================================================

function addUserControls(user) {

    const nav =
        document.querySelector("header nav");

    if (!nav) {
        return;
    }


    // Avoid duplicate controls
    if (
        document.getElementById(
            "gymguardUserControls"
        )
    ) {
        return;
    }


    const container =
        document.createElement("div");

    container.id =
        "gymguardUserControls";

    container.className =
        "gymguard-user-controls";


    const userName =
        document.createElement("span");

    userName.className =
        "gymguard-user-name";

    userName.innerText =
        "Hi, " + user.name;


    const logoutButton =
        document.createElement("button");

    logoutButton.type =
        "button";

    logoutButton.className =
        "gymguard-logout";

    logoutButton.innerText =
        "Logout";


    logoutButton.addEventListener(
        "click",
        logoutUser
    );


    container.appendChild(
        userName
    );

    container.appendChild(
        logoutButton
    );


    nav.appendChild(
        container
    );
}


// =========================================================
// LOGOUT
// =========================================================

async function logoutUser() {

    try {

        const response =
            await fetch(
                "/api/logout",
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );


        if (response.ok) {

            window.location.href =
                "login.html";

            return;
        }


        alert(
            "Unable to logout. Please try again."
        );


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Cannot connect to server."
        );
    }
}