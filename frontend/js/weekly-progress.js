// =========================================================
// GYMGUARD - WEEKLY PROGRESS
// DATABASE VERSION
// =========================================================


// =========================================================
// FORMAT DURATION
// =========================================================

function formatDuration(seconds) {

    seconds =
        Number(seconds) || 0;


    seconds =
        Math.max(
            0,
            Math.floor(seconds)
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const remainingSeconds =
        seconds % 60;


    if (hours > 0) {

        return (

            String(hours)
                .padStart(2, "0")

            +

            ":"

            +

            String(minutes)
                .padStart(2, "0")

            +

            ":"

            +

            String(remainingSeconds)
                .padStart(2, "0")

        );

    }


    return (

        String(minutes)
            .padStart(2, "0")

        +

        ":"

        +

        String(remainingSeconds)
            .padStart(2, "0")

    );

}


// =========================================================
// GET WORKOUTS FROM DATABASE
// =========================================================

async function getWorkouts() {

    try {

        const response =
            await fetch(
                "/api/workouts",
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin"

                }
            );


        if (
            response.status === 401
        ) {

            window.location.href =
                "login.html";


            return [];

        }


        const data =
            await response.json();


        if (
            !data.success
        ) {

            console.error(
                "Unable to load workouts:",
                data
            );


            return [];

        }


        return Array.isArray(
            data.workouts
        )
            ? data.workouts
            : [];


    } catch (error) {

        console.error(
            "Weekly progress error:",
            error
        );


        return [];

    }

}


// =========================================================
// DATE
// =========================================================

function getWorkoutDate(
    workout
) {

    return new Date(

        workout.workoutDate
        ||

        workout.timestamp
        ||

        workout.date

    );

}


// =========================================================
// START OF WEEK
// MONDAY
// =========================================================

function getStartOfWeek(
    date
) {

    const result =
        new Date(
            date
        );


    const day =
        result.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    result.setDate(
        result.getDate()
        +
        difference
    );


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


// =========================================================
// DATE KEY
// =========================================================

function dateKey(
    date
) {

    return (

        date.getFullYear()

        +

        "-"

        +

        String(
            date.getMonth() + 1
        ).padStart(2, "0")

        +

        "-"

        +

        String(
            date.getDate()
        ).padStart(2, "0")

    );

}


// =========================================================
// LOAD WEEK
// =========================================================

async function loadWeeklyProgress() {

    const workouts =
        await getWorkouts();


    const today =
        new Date();


    const start =
        getStartOfWeek(
            today
        );


    const end =
        new Date(
            start
        );


    end.setDate(
        end.getDate()
        +
        7
    );


    const weekly =
        workouts.filter(
            workout => {

                const date =
                    getWorkoutDate(
                        workout
                    );


                return (

                    date >= start

                    &&

                    date < end

                );

            }
        );


    let reps = 0;

    let duration = 0;

    let calories = 0;


    weekly.forEach(
        workout => {

            reps +=
                Number(
                    workout.reps
                ) || 0;


            duration +=
                Number(
                    workout.durationSeconds
                    ??
                    workout.duration
                ) || 0;


            calories +=
                Number(
                    workout.calories
                ) || 0;

        }
    );


    // -----------------------------------------------------
    // UPDATE STATS
    // -----------------------------------------------------

    const weeklyWorkouts =
        document.getElementById(
            "weeklyWorkouts"
        );


    const weeklyReps =
        document.getElementById(
            "weeklyReps"
        );


    const weeklyDuration =
        document.getElementById(
            "weeklyDuration"
        );


    const weeklyCalories =
        document.getElementById(
            "weeklyCalories"
        );


    if (weeklyWorkouts) {

        weeklyWorkouts.innerText =
            weekly.length;

    }


    if (weeklyReps) {

        weeklyReps.innerText =
            reps.toLocaleString(
                "en-IN"
            );

    }


    if (weeklyDuration) {

        weeklyDuration.innerText =
            formatDuration(
                duration
            );

    }


    if (weeklyCalories) {

        weeklyCalories.innerText =
            calories;

    }


    // -----------------------------------------------------
    // WEEK RANGE
    // -----------------------------------------------------

    const weekEnd =
        new Date(
            start
        );


    weekEnd.setDate(
        weekEnd.getDate()
        +
        6
    );


    const weeklyRange =
        document.getElementById(
            "weeklyRange"
        );


    if (weeklyRange) {

        weeklyRange.innerText =

            start.toLocaleDateString(
                "en-IN",
                {
                    day: "numeric",
                    month: "short"
                }
            )

            +

            " - "

            +

            weekEnd.toLocaleDateString(
                "en-IN",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    createWeeklyChart(
        weekly,
        start
    );

}


// =========================================================
// WEEKLY CHART
// =========================================================

function createWeeklyChart(
    workouts,
    start
) {

    const chart =
        document.getElementById(
            "weeklyChart"
        );


    if (!chart) {

        return;

    }


    chart.innerHTML = "";


    const names = [

        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"

    ];


    const dailyReps = [];


    const dailyWorkouts = [];


    // -----------------------------------------------------
    // CALCULATE DAILY DATA
    // -----------------------------------------------------

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const date =
            new Date(
                start
            );


        date.setDate(
            date.getDate()
            +
            i
        );


        const key =
            dateKey(
                date
            );


        const dayWorkouts =
            workouts.filter(
                workout => {

                    return (

                        dateKey(
                            getWorkoutDate(
                                workout
                            )
                        )

                        ===

                        key

                    );

                }
            );


        const reps =
            dayWorkouts.reduce(
                (
                    total,
                    workout
                ) => {

                    return (

                        total

                        +

                        (
                            Number(
                                workout.reps
                            )
                            ||
                            0
                        )

                    );

                },
                0
            );


        dailyReps.push(
            reps
        );


        dailyWorkouts.push(
            dayWorkouts.length
        );

    }


    const maxReps =
        Math.max(
            ...dailyReps,
            1
        );


    // -----------------------------------------------------
    // CHART WRAPPER
    // -----------------------------------------------------

    const chartTitle =
        document.createElement(
            "div"
        );


    chartTitle.className =
        "chart-summary";


    chartTitle.innerHTML = `

        <div>
            <strong>${workouts.length}</strong>
            <span>workouts this week</span>
        </div>

        <div>
            <strong>${dailyReps.reduce(
                (a, b) => a + b,
                0
            )}</strong>
            <span>total reps</span>
        </div>

    `;


    chart.appendChild(
        chartTitle
    );


    // -----------------------------------------------------
    // CHART
    // -----------------------------------------------------

    const chartArea =
        document.createElement(
            "div"
        );


    chartArea.className =
        "weekly-chart-area";


    for (
        let i = 0;
        i < 7;
        i++
    ) {

        const column =
            document.createElement(
                "div"
            );


        column.className =
            "chart-column";


        // Value

        const value =
            document.createElement(
                "div"
            );


        value.className =
            "chart-value";


        value.innerText =
            dailyReps[i];


        // Bar

        const bar =
            document.createElement(
                "div"
            );


        bar.className =
            "chart-bar";


        const height =
            dailyReps[i] === 0

                ? 8

                :

                Math.max(
                    12,
                    (
                        dailyReps[i]
                        /
                        maxReps
                    ) * 180
                );


        bar.style.height =
            height + "px";


        // Label

        const label =
            document.createElement(
                "div"
            );


        label.className =
            "chart-label";


        label.innerText =
            names[i];


        // Workout count

        const workoutCount =
            document.createElement(
                "small"
            );


        workoutCount.className =
            "chart-workout-count";


        workoutCount.innerText =

            dailyWorkouts[i] === 1

                ? "1 workout"

                :

                dailyWorkouts[i]
                +
                " workouts";


        column.appendChild(
            value
        );


        column.appendChild(
            bar
        );


        column.appendChild(
            label
        );


        column.appendChild(
            workoutCount
        );


        chartArea.appendChild(
            column
        );

    }


    chart.appendChild(
        chartArea
    );

}


// =========================================================
// DAILY BUTTON
// =========================================================

function goToDaily() {

    window.location.href =
        "result.html";

}


// =========================================================
// INITIAL LOAD
// =========================================================

loadWeeklyProgress();