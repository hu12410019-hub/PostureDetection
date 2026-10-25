// =========================================================
// GYMGUARD - DATABASE WORKOUT API
// =========================================================
//
// This file connects the existing workout system
// to the Flask + SQLite backend.
//
// IMPORTANT:
// It does NOT change MediaPipe.
// It does NOT change pose detection.
// It does NOT change rep counting.
// It does NOT change the camera.
// =========================================================


// =========================================================
// GET CURRENT EXERCISE
// =========================================================

function getDatabaseExercise() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get("exercise")
        ||
        "squat"
    ).toLowerCase();

}


// =========================================================
// GET EXERCISE NAME
// =========================================================

function getDatabaseExerciseName() {

    const title =
        document.getElementById(
            "exerciseTitle"
        );


    if (title) {

        return title.innerText.trim();

    }


    return getDatabaseExercise();

}


// =========================================================
// GET REPS
// =========================================================

function getDatabaseReps() {

    const repElement =
        document.getElementById(
            "repCount"
        );


    if (!repElement) {

        return 0;

    }


    return (
        Number.parseInt(
            repElement.innerText,
            10
        )
        ||
        0
    );

}


// =========================================================
// GET DURATION
// =========================================================

function getDatabaseDuration() {

    // Use existing workout function
    // if your current project provides it.

    if (
        typeof getWorkoutDurationSeconds
        ===
        "function"
    ) {

        const value =
            Number(
                getWorkoutDurationSeconds()
            );


        if (
            Number.isFinite(value)
        ) {

            return Math.max(
                0,
                Math.floor(value)
            );

        }

    }


    // Some versions of the project
    // use this function.

    if (
        typeof getGymGuardWorkoutDuration
        ===
        "function"
    ) {

        const value =
            Number(
                getGymGuardWorkoutDuration()
            );


        if (
            Number.isFinite(value)
        ) {

            return Math.max(
                0,
                Math.floor(value)
            );

        }

    }


    return 0;

}


// =========================================================
// CALORIES
// =========================================================

function getDatabaseCalories(
    durationSeconds
) {

    return Math.max(

        1,

        Math.round(
            (
                durationSeconds / 60
            ) * 5
        )

    );

}


// =========================================================
// AI FEEDBACK
// =========================================================

function getDatabaseFeedback() {

    const feedback =
        document.getElementById(
            "aiFeedback"
        );


    if (!feedback) {

        return "";

    }


    return feedback.innerText.trim();

}


// =========================================================
// SAVE WORKOUT TO DATABASE
// =========================================================

async function saveWorkoutToDatabase() {

    try {

        const durationSeconds =
            getDatabaseDuration();


        const reps =
            getDatabaseReps();


        const exercise =
            getDatabaseExercise();


        const exerciseName =
            getDatabaseExerciseName();


        const calories =
            getDatabaseCalories(
                durationSeconds
            );


        const feedback =
            getDatabaseFeedback();


        const workoutDate =
            new Date().toISOString();


        console.log(
            "Saving workout to database..."
        );


        console.log({

            exercise,

            exerciseName,

            reps,

            durationSeconds,

            calories,

            feedback

        });


        const response =
            await fetch(
                "/api/workouts",
                {

                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            exercise:
                                exercise,

                            exerciseName:
                                exerciseName,

                            reps:
                                reps,

                            durationSeconds:
                                durationSeconds,

                            calories:
                                calories,

                            feedback:
                                feedback,

                            workoutDate:
                                workoutDate

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            console.error(
                "Workout database error:",
                data
            );


            return false;

        }


        if (!data.success) {

            console.error(
                "Workout was not saved:",
                data
            );


            return false;

        }


        console.log(
            "Workout saved successfully."
        );


        console.log(
            "Database workout ID:",
            data.workoutId
        );


        return true;


    } catch (error) {

        console.error(
            "Cannot save workout:",
            error
        );


        return false;

    }

}


// =========================================================
// WRAP EXISTING FINISH WORKOUT
// =========================================================
//
// This allows us to keep the existing
// finishWorkout() function.
//
// We save to SQLite FIRST.
// Then the existing function continues.
//
// =========================================================

function connectWorkoutDatabase() {

    if (
        typeof window.finishWorkout
        !==
        "function"
    ) {

        console.warn(
            "finishWorkout() was not found."
        );


        return;

    }


    if (
        window.__gymGuardFinishWrapped
    ) {

        return;

    }


    const originalFinishWorkout =
        window.finishWorkout;


    window.finishWorkout =
        async function () {

            if (
                window.__gymGuardDatabaseSaved
            ) {

                return originalFinishWorkout();

            }


            window.__gymGuardDatabaseSaved =
                true;


            await saveWorkoutToDatabase();


            // Continue with the original
            // working GymGuard logic.

            return originalFinishWorkout();

        };


    window.__gymGuardFinishWrapped =
        true;


    console.log(
        "GymGuard database workout system connected."
    );

}


// =========================================================
// WAIT FOR EXISTING WORKOUT CODE
// =========================================================

function initializeWorkoutDatabase() {

    connectWorkoutDatabase();


    // If workout.js loads slightly later,
    // check again.

    if (
        typeof window.finishWorkout
        !==
        "function"
    ) {

        setTimeout(
            initializeWorkoutDatabase,
            100
        );

    }

}


// =========================================================
// START
// =========================================================

initializeWorkoutDatabase();


// =========================================================
// EXPORT
// =========================================================

window.saveWorkoutToDatabase =
    saveWorkoutToDatabase;