// =========================================================
// GYMGUARD - DAILY RESULT / PROGRESS
// =========================================================


// =========================================================
// STORAGE
// =========================================================

const STORAGE_KEY =
    "gymguardWorkouts";


// =========================================================
// GET WORKOUTS
// =========================================================

let workoutsCache = [];

function getWorkouts() {
    return workoutsCache;
}

async function loadServerWorkouts() {
    try {
        const response = await fetch("/api/workouts", {
            method: "GET",
            credentials: "same-origin"
        });

        if (response.status === 401) {
            workoutsCache = [];
            loadDailyProgress();
            renderCalendar();
            console.warn("Please log in to view your workout history.");
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load workouts from the server.");
        }

        const data = await response.json();

        workoutsCache = (data.workouts || []).map(workout => ({
            ...workout,
            date: workout.workoutDate || workout.date,
            timestamp: workout.workoutDate || workout.timestamp,
            duration: workout.durationSeconds ?? workout.duration ?? 0
        }));

        loadDailyProgress();
        renderCalendar();

    } catch (error) {
        console.error("Server workout loading error:", error);
        workoutsCache = [];
        loadDailyProgress();
        renderCalendar();
    }
}


// =========================================================
// DATE KEY
// =========================================================

function dateKey(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
    date
) {

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


// =========================================================
// FORMAT TIME
// =========================================================

function formatTime(
    date
) {

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// =========================================================
// FORMAT DURATION
// =========================================================

function formatDuration(
    seconds
) {

    seconds =
        Number(seconds) || 0;


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    return (
        String(minutes)
            .padStart(2, "0")
        +
        ":"
        +
        String(remaining)
            .padStart(2, "0")
    );

}


// =========================================================
// SELECTED DATE
// =========================================================

let selectedDate =
    new Date();


let calendarDate =
    new Date();


// =========================================================
// LOAD DAILY PROGRESS
// =========================================================

function loadDailyProgress() {

    const workouts =
        getWorkouts();


    const selectedKey =
        dateKey(
            selectedDate
        );


    const daily =
        workouts.filter(
            workout => {

                if (
                    !workout.date
                ) {

                    return false;

                }


                const workoutDate =
                    new Date(
                        workout.timestamp
                        ||
                        workout.date
                    );


                return (
                    dateKey(
                        workoutDate
                    )
                    ===
                    selectedKey
                );

            }
        );


    let reps = 0;

    let duration = 0;

    let calories = 0;


    daily.forEach(
        workout => {

            reps +=
                Number(
                    workout.reps
                ) || 0;


            duration +=
                Number(
                    workout.duration
                    ??
                    workout.durationSeconds
                ) || 0;


            calories +=
                Number(
                    workout.calories
                ) || 0;

        }
    );


    document.getElementById(
        "dailyWorkouts"
    ).innerText =
        daily.length;


    document.getElementById(
        "dailyReps"
    ).innerText =
        reps;


    document.getElementById(
        "dailyDuration"
    ).innerText =
        formatDuration(
            duration
        );


    document.getElementById(
        "dailyCalories"
    ).innerText =
        calories;


    const today =
        new Date();


    const label =
        document.getElementById(
            "selectedDateLabel"
        );


    if (
        dateKey(
            selectedDate
        )
        ===
        dateKey(
            today
        )
    ) {

        label.innerText =
            "Today";

    } else {

        label.innerText =
            formatDate(
                selectedDate
            );

    }


    displayDailyWorkouts(
        daily
    );

}


// =========================================================
// DISPLAY WORKOUTS
// =========================================================

function displayDailyWorkouts(
    workouts
) {

    const container =
        document.getElementById(
            "dailyWorkoutList"
        );


    if (
        !workouts.length
    ) {

        container.innerHTML = `

            <div class="empty-progress">

                <div class="empty-icon">
                    🏋️
                </div>

                No workout recorded
                for this day.

            </div>

        `;


        return;

    }


    container.innerHTML =
        workouts
            .slice()
            .reverse()
            .map(
                workout => {

                    const workoutDate =
                        new Date(
                            workout.timestamp
                            ||
                            workout.date
                        );


                    const exerciseName =
                        workout.exerciseName
                        ||
                        formatExerciseName(
                            workout.exercise
                        );


                    const duration =
                        Number(
                            workout.duration
                            ??
                            workout.durationSeconds
                        )
                        || 0;


                    return `

                        <div
                            class="workout-history-item">

                            <div>

                                <strong>
                                    ${exerciseName}
                                </strong>

                                <span>
                                    ${formatTime(
                                        workoutDate
                                    )}
                                </span>

                            </div>


                            <div>

                                <strong>
                                    ${
                                        Number(
                                            workout.reps
                                        ) || 0
                                    }
                                    reps
                                </strong>

                                <span>
                                    ${formatDuration(
                                        duration
                                    )}
                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =========================================================
// EXERCISE NAME
// =========================================================

function formatExerciseName(
    exercise
) {

    if (!exercise) {

        return "Workout";

    }


    return exercise
        .split("-")
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
                +
                word.slice(1)
        )
        .join(" ");

}


// =========================================================
// CALENDAR
// =========================================================

function renderCalendar() {

    const year =
        calendarDate.getFullYear();


    const month =
        calendarDate.getMonth();


    document.getElementById(
        "calendarMonth"
    ).innerText =
        calendarDate.toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric"
            }
        );


    const grid =
        document.getElementById(
            "calendarGrid"
        );


    grid.innerHTML =
        "";


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    let startingDay =
        firstDay.getDay();


    // Monday first

    startingDay =
        startingDay === 0
            ? 6
            : startingDay - 1;


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const workouts =
        getWorkouts();


    // Empty cells

    for (
        let i = 0;
        i < startingDay;
        i++
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "calendar-empty";


        grid.appendChild(
            empty
        );

    }


    // Days

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const current =
            new Date(
                year,
                month,
                day
            );


        const key =
            dateKey(
                current
            );


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "calendar-day";


        button.innerText =
            day;


        const hasWorkout =
            workouts.some(
                workout => {

                    const workoutDate =
                        new Date(
                            workout.timestamp
                            ||
                            workout.date
                        );


                    return (
                        dateKey(
                            workoutDate
                        )
                        ===
                        key
                    );

                }
            );


        if (
            hasWorkout
        ) {

            button.classList.add(
                "has-workout"
            );

        }


        if (
            key ===
            dateKey(
                selectedDate
            )
        ) {

            button.classList.add(
                "selected"
            );

        }


        button.addEventListener(
            "click",
            () => {

                selectedDate =
                    new Date(
                        year,
                        month,
                        day
                    );


                calendarPanel.hidden =
                    true;


                loadDailyProgress();


                renderCalendar();

            }
        );


        grid.appendChild(
            button
        );

    }

}


// =========================================================
// CALENDAR ELEMENTS
// =========================================================

const calendarBtn =
    document.getElementById(
        "calendarBtn"
    );


const calendarPanel =
    document.getElementById(
        "calendarPanel"
    );


calendarBtn.addEventListener(
    "click",
    () => {

        calendarPanel.hidden =
            !calendarPanel.hidden;


        if (
            !calendarPanel.hidden
        ) {

            renderCalendar();

        }

    }
);


// =========================================================
// PREVIOUS MONTH
// =========================================================

document.getElementById(
    "prevMonth"
).addEventListener(
    "click",
    () => {

        calendarDate.setMonth(
            calendarDate.getMonth()
            -
            1
        );


        renderCalendar();

    }
);


// =========================================================
// NEXT MONTH
// =========================================================

document.getElementById(
    "nextMonth"
).addEventListener(
    "click",
    () => {

        calendarDate.setMonth(
            calendarDate.getMonth()
            +
            1
        );


        renderCalendar();

    }
);


// =========================================================
// WEEKLY PAGE
// =========================================================

document.getElementById(
    "weeklyBtn"
).addEventListener(
    "click",
    () => {

        window.location.href =
            "weekly-progress.html";

    }
);


// =========================================================
// MONTHLY PAGE
// =========================================================

document.getElementById(
    "monthlyBtn"
).addEventListener(
    "click",
    () => {

        window.location.href =
            "monthly-progress.html";

    }
);


// =========================================================
// INITIAL LOAD
// =========================================================

loadServerWorkouts();