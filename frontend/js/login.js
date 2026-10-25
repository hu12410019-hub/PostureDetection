// =========================================================
// GYMGUARD - LOGIN
// =========================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

const loginMessage =
    document.getElementById(
        "loginMessage"
    );


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const password =
            document.getElementById(
                "password"
            ).value;


        loginMessage.innerText =
            "Logging in...";

        loginMessage.className =
            "auth-message";


        try {

            const response =
                await fetch(
                    "/api/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                loginMessage.innerText =
                    data.message ||
                    "Login failed.";

                loginMessage.className =
                    "auth-message error";

                return;

            }


            loginMessage.innerText =
                "Login successful.";

            loginMessage.className =
                "auth-message success";


            setTimeout(
                function () {

                    window.location.href =
                        "exercises.html";

                },
                500
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            loginMessage.innerText =
                "Cannot connect to server.";

            loginMessage.className =
                "auth-message error";

        }

    }
);