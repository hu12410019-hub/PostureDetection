// =========================================================
// GYMGUARD - MONTHLY PROGRESS
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
// GET WORKOUTS
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
                "Unable to load monthly workouts:",
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
            "Monthly progress error:",
            error
        );


        return [];

    }

}


// =========================================================
// WORKOUT DATE
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
// LOAD MONTH
// =========================================================

async function loadMonthlyProgress() {

    const workouts =
        await getWorkouts();


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        today.getMonth();


    const monthly =
        workouts.filter(
            workout => {

                const date =
                    getWorkoutDate(
                        workout
                    );


                return (

                    date.getFullYear()
                    ===
                    year

                    &&

                    date.getMonth()
                    ===
                    month

                );

            }
        );


    let reps = 0;

    let duration = 0;


    const workoutDays =
        new Set();


    monthly.forEach(
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


            const date =
                getWorkoutDate(
                    workout
                );


            workoutDays.add(
                dateKey(
                    date
                )
            );

        }
    );


    // -----------------------------------------------------
    // UPDATE STATS
    // -----------------------------------------------------

    const monthlyDays =
        document.getElementById(
            "monthlyDays"
        );


    const monthlyWorkouts =
        document.getElementById(
            "monthlyWorkouts"
        );


    const monthlyReps =
        document.getElementById(
            "monthlyReps"
        );


    const monthlyDuration =
        document.getElementById(
            "monthlyDuration"
        );


    if (monthlyDays) {

        monthlyDays.innerText =
            workoutDays.size;

    }


    if (monthlyWorkouts) {

        monthlyWorkouts.innerText =
            monthly.length;

    }


    if (monthlyReps) {

        monthlyReps.innerText =
            reps.toLocaleString(
                "en-IN"
            );

    }


    if (monthlyDuration) {

        monthlyDuration.innerText =
            formatDuration(
                duration
            );

    }


    // -----------------------------------------------------
    // MONTH TITLE
    // -----------------------------------------------------

    const monthlyTitle =
        document.getElementById(
            "monthlyTitle"
        );


    if (monthlyTitle) {

        monthlyTitle.innerText =
            today.toLocaleDateString(
                "en-IN",
                {
                    month: "long",
                    year: "numeric"
                }
            );

    }


    createMonthlyChart(
        monthly,
        today
    );

}


// =========================================================
// MONTHLY CHART
// =========================================================

function createMonthlyChart(
    workouts,
    currentDate
) {

    const chart =
        document.getElementById(
            "monthlyChart"
        );


    if (!chart) {

        return;

    }


    chart.innerHTML = "";


    const year =
        currentDate.getFullYear();


    const month =
        currentDate.getMonth();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const dailyReps = [];

    const dailyWorkouts = [];


    // -----------------------------------------------------
    // CALCULATE MONTHLY DATA
    // -----------------------------------------------------

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
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
    // SUMMARY
    // -----------------------------------------------------

    const summary =
        document.createElement(
            "div"
        );


    summary.className =
        "chart-summary";


    const totalReps =
        dailyReps.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        );


    const workoutDays =
        dailyWorkouts.filter(
            value =>
                value > 0
        ).length;


    summary.innerHTML = `

        <div>
            <strong>${workoutDays}</strong>
            <span>active days</span>
        </div>

        <div>
            <strong>${workouts.length}</strong>
            <span>workouts</span>
        </div>

        <div>
            <strong>${totalReps}</strong>
            <span>total reps</span>
        </div>

    `;


    chart.appendChild(
        summary
    );


    // -----------------------------------------------------
    // CHART AREA
    // -----------------------------------------------------

    const chartArea =
        document.createElement(
            "div"
        );


    chartArea.className =
        "monthly-chart-area";


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const column =
            document.createElement(
                "div"
            );


        column.className =
            "chart-column";


        // -------------------------------------------------
        // VALUE
        // -------------------------------------------------

        const value =
            document.createElement(
                "div"
            );


        value.className =
            "chart-value";


        value.innerText =
            dailyReps[day - 1];


        // -------------------------------------------------
        // BAR
        // -------------------------------------------------

        const bar =
            document.createElement(
                "div"
            );


        bar.className =
            "chart-bar";


        let height;


        if (
            dailyReps[day - 1] === 0
        ) {

            height = 8;

        } else {

            height = Math.max(

                12,

                (
                    dailyReps[day - 1]
                    /
                    maxReps
                ) * 180

            );

        }


        bar.style.height =
            height + "px";


        // -------------------------------------------------
        // LABEL
        // -------------------------------------------------

        const label =
            document.createElement(
                "div"
            );


        label.className =
            "chart-label";


        label.innerText =
            day;


        // -------------------------------------------------
        // WORKOUT COUNT
        // -------------------------------------------------

        const workoutCount =
            document.createElement(
                "small"
            );


        workoutCount.className =
            "chart-workout-count";


        workoutCount.innerText =

            dailyWorkouts[day - 1] === 0

                ? "Rest"

                :

                dailyWorkouts[day - 1] === 1

                    ? "1 workout"

                    :

                    dailyWorkouts[day - 1]
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

loadMonthlyProgress();