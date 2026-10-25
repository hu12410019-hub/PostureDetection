const params =
    new URLSearchParams(window.location.search);

const exercise =
    params.get("exercise");


const exercises = {

    squat: {

        title: "Squat",

        icon: "🏋️",

        difficulty: "Beginner",

        description:
            "Learn the correct squat technique and improve your lower-body movement.",

        muscles:
            "Quadriceps • Glutes • Hamstrings",

        checks: [

            "Squat depth",

            "Knee angle",

            "Back position",

            "Knee alignment",

            "Movement consistency"

        ]

    },


    pushup: {

        title: "Push Up",

        icon: "💪",

        difficulty: "Beginner",

        description:
            "Improve your push-up technique and upper-body movement.",

        muscles:
            "Chest • Shoulders • Triceps",

        checks: [

            "Elbow angle",

            "Body alignment",

            "Back position",

            "Push-up depth",

            "Movement consistency"

        ]

    },


    "bicep-curl": {

        title: "Bicep Curl",

        icon: "💪",

        difficulty: "Beginner",

        description:
            "Analyze your arm movement and improve your bicep curl technique.",

        muscles:
            "Biceps • Forearms",

        checks: [

            "Elbow position",

            "Arm angle",

            "Upper-body movement",

            "Curl range",

            "Movement consistency"

        ]

    },


    lunges: {

        title: "Lunges",

        icon: "🦵",

        difficulty: "Beginner",

        description:
            "Improve your balance and lower-body movement with proper lunges.",

        muscles:
            "Quadriceps • Glutes • Hamstrings",

        checks: [

            "Knee angle",

            "Body balance",

            "Back position",

            "Lunge depth",

            "Leg alignment"

        ]

    },


    "shoulder-press": {

        title: "Shoulder Press",

        icon: "🏋️",

        difficulty: "Intermediate",

        description:
            "Analyze your shoulder and arm movement during the shoulder press.",

        muscles:
            "Shoulders • Triceps",

        checks: [

            "Elbow position",

            "Arm movement",

            "Back position",

            "Range of motion",

            "Movement consistency"

        ]

    },


    plank: {

        title: "Plank",

        icon: "🧘",

        difficulty: "Beginner",

        description:
            "Maintain correct body alignment while holding the plank position.",

        muscles:
            "Core • Shoulders • Glutes",

        checks: [

            "Body alignment",

            "Hip position",

            "Back position",

            "Shoulder position",

            "Holding stability"

        ]

    }

};


if (exercises[exercise]) {

    const data =
        exercises[exercise];


    document.getElementById(
        "exerciseTitle"
    ).innerText = data.title;


    document.getElementById(
        "exerciseIcon"
    ).innerText = data.icon;


    document.getElementById(
        "difficulty"
    ).innerText = data.difficulty;


    document.getElementById(
        "exerciseDescription"
    ).innerText = data.description;


    document.getElementById(
        "targetMuscles"
    ).innerText = data.muscles;


    const checkList =
        document.getElementById("aiChecks");


    checkList.innerHTML = "";


    data.checks.forEach(check => {

        const li =
            document.createElement("li");

        li.innerText = check;

        checkList.appendChild(li);

    });

}


function startExercise() {

    window.location.href =
        "workout.html?exercise=" + exercise;

}