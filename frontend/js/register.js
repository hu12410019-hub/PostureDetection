// =========================================================
// GYMGUARD - REGISTER
// =========================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );

const registerMessage =
    document.getElementById(
        "registerMessage"
    );


registerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            document.getElementById(
                "name"
            ).value.trim();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const password =
            document.getElementById(
                "password"
            ).value;


        registerMessage.innerText =
            "Creating account...";

        registerMessage.className =
            "auth-message";


        try {

            const response =
                await fetch(
                    "/api/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            name,
                            email,
                            password
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                registerMessage.innerText =
                    data.message ||
                    "Registration failed.";

                registerMessage.className =
                    "auth-message error";

                return;

            }


            registerMessage.innerText =
                "Account created successfully.";

            registerMessage.className =
                "auth-message success";


            setTimeout(
                function () {

                    window.location.href =
                        "exercises.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            registerMessage.innerText =
                "Cannot connect to server.";

            registerMessage.className =
                "auth-message error";

        }

    }
);