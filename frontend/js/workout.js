// =========================================================
// GYMGUARD - WORKOUT PAGE
// Exercise Information
// Workout Timer
// Rep Saving
// Progress Saving
// =========================================================


// =========================================================
// GET EXERCISE FROM URL
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );


const exercise =
    (
        params.get("exercise")
        ||
        "squat"
    ).toLowerCase();


// =========================================================
// EXERCISE INFORMATION
// =========================================================

const exercises = {

    squat: {

        title: "Squat",

        description:
            "A lower-body exercise that mainly targets the quadriceps, glutes and hamstrings.",

        instructions: [

            "Stand with your feet approximately shoulder-width apart.",

            "Keep your chest up and back in a neutral position.",

            "Bend your knees and lower your hips.",

            "Keep your knees aligned with your feet.",

            "Push through your feet and return to the standing position."

        ]

    },


    pushup: {

        title: "Push Up",

        description:
            "An upper-body exercise that mainly targets the chest, shoulders and triceps.",

        instructions: [

            "Place your hands slightly wider than your shoulders.",

            "Keep your body in a straight line.",

            "Lower your chest toward the floor.",

            "Keep your elbows controlled.",

            "Push your body back to the starting position."

        ]

    },


    "bicep-curl": {

        title: "Bicep Curl",

        description:
            "An arm exercise that mainly targets the biceps and helps improve controlled elbow movement.",

        instructions: [

            "Stand upright with your arms beside your body.",

            "Keep your elbows close to your body.",

            "Curl your forearms upward.",

            "Avoid swinging your upper body.",

            "Slowly lower your arms back down."

        ]

    },


    lunges: {

        title: "Lunges",

        description:
            "A lower-body exercise that works the quadriceps, glutes and hamstrings while challenging balance.",

        instructions: [

            "Stand upright with your feet together.",

            "Take one step forward.",

            "Lower your body while keeping your torso controlled.",

            "Keep your front knee aligned with your foot.",

            "Push back to the starting position."

        ]

    },


    "shoulder-press": {

        title: "Shoulder Press",

        description:
            "An upper-body exercise that mainly targets the shoulders and triceps.",

        instructions: [

            "Start with your hands near shoulder level.",

            "Keep your back stable.",

            "Press your hands upward.",

            "Avoid excessive back movement.",

            "Slowly return to the starting position."

        ]

    },


    plank: {

        title: "Plank",

        description:
            "A core exercise that focuses on maintaining a stable and aligned body position.",

        instructions: [

            "Place your forearms or hands on the floor.",

            "Keep your body in a straight line.",

            "Keep your hips controlled.",

            "Keep your core engaged.",

            "Hold the position without excessive movement."

        ]

    }

};


// =========================================================
// DISPLAY EXERCISE INFORMATION
// =========================================================

const exerciseData =
    exercises[exercise]
    ||
    exercises.squat;


const exerciseTitle =
    document.getElementById(
        "exerciseTitle"
    );


const exerciseDescription =
    document.getElementById(
        "exerciseDescription"
    );


const instructionList =
    document.getElementById(
        "instructions"
    );


if (exerciseTitle) {

    exerciseTitle.innerText =
        exerciseData.title;

}


if (exerciseDescription) {

    exerciseDescription.innerText =
        exerciseData.description;

}


if (instructionList) {

    instructionList.innerHTML = "";


    exerciseData.instructions.forEach(
        instruction => {

            const li =
                document.createElement(
                    "li"
                );


            li.innerText =
                instruction;


            instructionList.appendChild(
                li
            );

        }
    );

}


// =========================================================
// WORKOUT SESSION
// =========================================================

let workoutStartedAt =
    null;


let workoutFinished =
    false;


// =========================================================
// START TIMER
// =========================================================

function startWorkoutTimer() {

    if (
        workoutStartedAt !== null
        ||
        workoutFinished
    ) {

        return;

    }


    workoutStartedAt =
        Date.now();


    console.log(
        "GymGuard workout timer started."
    );

}


// =========================================================
// GET DURATION
// =========================================================

function getWorkoutDurationSeconds() {

    if (
        workoutStartedAt === null
    ) {

        return 0;

    }


    return Math.max(

        1,

        Math.floor(

            (
                Date.now()
                -
                workoutStartedAt
            )
            /
            1000

        )

    );

}


// =========================================================
// GET CURRENT REPS
// IMPORTANT:
// Reads the SAME rep count shown by MediaPipe.
// =========================================================

function getCurrentReps() {

    const repElement =
        document.getElementById(
            "repCount"
        );


    if (!repElement) {

        return 0;

    }


    const text =
        repElement.innerText
        ||
        repElement.textContent
        ||
        "0";


    const reps =
        parseInt(
            text,
            10
        );


    if (
        Number.isNaN(reps)
    ) {

        return 0;

    }


    return Math.max(
        0,
        reps
    );

}


// =========================================================
// GET AI FEEDBACK
// =========================================================

function getCurrentFeedback() {

    const feedback =
        document.getElementById(
            "aiFeedback"
        );


    if (!feedback) {

        return "Workout completed.";

    }


    return (
        feedback.innerText
        ||
        feedback.textContent
        ||
        "Workout completed."
    ).trim();

}


// =========================================================
// CALORIE ESTIMATE
// MVP ONLY
// =========================================================

function estimateCalories(
    durationSeconds
) {

    const minutes =
        durationSeconds / 60;


    return Math.max(

        1,

        Math.round(
            minutes * 5
        )

    );

}


// =========================================================
// GET SAVED WORKOUTS
// ONE STORAGE KEY ONLY
// =========================================================

function getSavedWorkouts() {

    try {

        const data =
            localStorage.getItem(
                "gymguardWorkouts"
            );


        if (!data) {

            return [];

        }


        const workouts =
            JSON.parse(
                data
            );


        if (
            !Array.isArray(
                workouts
            )
        ) {

            return [];

        }


        return workouts;

    } catch (error) {

        console.error(
            "Could not read GymGuard workouts:",
            error
        );


        return [];

    }

}


// =========================================================
// SAVE WORKOUT
// =========================================================

function saveWorkout() {

    const reps =
        getCurrentReps();


    const durationSeconds =
        getWorkoutDurationSeconds();


    const now =
        new Date();


    const workout = {

        id:
            "workout_" +
            Date.now(),

        date:
            now.toISOString()
                .slice(
                    0,
                    10
                ),

        timestamp:
            now.toISOString(),

        exercise:
            exercise,

        exerciseName:
            exerciseData.title,

        reps:
            reps,

        duration:
            durationSeconds,

        durationSeconds:
            durationSeconds,

        calories:
            estimateCalories(
                durationSeconds
            ),

        feedback:
            getCurrentFeedback()

    };


    const workouts =
        getSavedWorkouts();


    workouts.push(
        workout
    );


    localStorage.setItem(

        "gymguardWorkouts",

        JSON.stringify(
            workouts
        )

    );


    localStorage.setItem(

        "gymguardLastWorkout",

        JSON.stringify(
            workout
        )

    );


    console.log(
        "GymGuard workout saved:",
        workout
    );


    return workout;

}


// =========================================================
// FINISH WORKOUT
// =========================================================

function finishWorkout() {

    if (
        workoutFinished
    ) {

        return;

    }


    workoutFinished =
        true;


    const workout =
        saveWorkout();


    // Stop camera

    if (
        typeof window.stopCamera ===
        "function"
    ) {

        window.stopCamera();

    }


    // Save last simple values

    localStorage.setItem(

        "gymguardExercise",

        workout.exercise

    );


    localStorage.setItem(

        "gymguardReps",

        String(
            workout.reps
        )

    );


    localStorage.setItem(

        "gymguardDuration",

        String(
            workout.duration
        )

    );


    // Open result page

    window.location.href =
        "result.html?workout=" +
        encodeURIComponent(
            workout.id
        );

}


// =========================================================
// COMPATIBILITY FUNCTION
// If old HTML calls finishGymGuardWorkout,
// it will still work.
// =========================================================

function finishGymGuardWorkout() {

    finishWorkout();

}


// =========================================================
// START CAMERA WRAPPER
// Starts workout timer when camera actually starts.
// =========================================================

const originalStartCamera =
    window.startCamera;


if (
    typeof originalStartCamera ===
    "function"
) {

    window.startCamera =
        async function () {

            const result =
                await originalStartCamera();


            const camera =
                document.getElementById(
                    "camera"
                );


            if (
                camera &&
                camera.srcObject
            ) {

                startWorkoutTimer();

            }


            return result;

        };

}


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.startWorkoutTimer =
    startWorkoutTimer;


window.finishWorkout =
    finishWorkout;


window.finishGymGuardWorkout =
    finishGymGuardWorkout;


window.getCurrentReps =
    getCurrentReps;


window.getWorkoutDurationSeconds =
    getWorkoutDurationSeconds;