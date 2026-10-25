import os
# =========================================================
# GYMGUARD BACKEND
# Flask + SQLite
# =========================================================

from flask import (
    Flask,
    request,
    jsonify,
    session,
    send_from_directory
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from pathlib import Path
from datetime import datetime
import sqlite3


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"

DATABASE_PATH = Path(__file__).resolve().parent / "gymguard.db"


# =========================================================
# FLASK APP
# =========================================================

app = Flask(
    __name__,
    static_folder=None
)


app.secret_key = os.environ.get("SECRET_KEY", "local-development-only-change-me")


# =========================================================
# DATABASE
# =========================================================

def get_db():

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = sqlite3.Row

    return connection


# =========================================================
# INITIALIZE DATABASE
# =========================================================

def init_database():

    connection = get_db()

    cursor = connection.cursor()


    # -----------------------------------------------------
    # USERS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT NOT NULL UNIQUE,

            password TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
    """)


    # -----------------------------------------------------
    # WORKOUTS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workouts (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            exercise TEXT NOT NULL,

            exercise_name TEXT,

            reps INTEGER DEFAULT 0,

            duration_seconds INTEGER DEFAULT 0,

            calories INTEGER DEFAULT 0,

            feedback TEXT,

            workout_date TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)

        )
    """)


    connection.commit()

    connection.close()


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register():

    data = request.get_json(
        silent=True
    )


    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request."
        }), 400


    name = (
        data.get("name")
        or data.get("fullName")
        or ""
    ).strip()


    email = (
        data.get("email")
        or ""
    ).strip().lower()


    password = (
        data.get("password")
        or ""
    )


    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not name:

        return jsonify({
            "success": False,
            "message": "Full name is required."
        }), 400


    if not email:

        return jsonify({
            "success": False,
            "message": "Email is required."
        }), 400


    if len(password) < 6:

        return jsonify({
            "success": False,
            "message":
                "Password must be at least 6 characters."
        }), 400


    connection = get_db()

    cursor = connection.cursor()


    # -----------------------------------------------------
    # CHECK EXISTING USER
    # -----------------------------------------------------

    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    )


    existing_user = cursor.fetchone()


    if existing_user:

        connection.close()

        return jsonify({
            "success": False,
            "message":
                "An account with this email already exists."
        }), 409


    # -----------------------------------------------------
    # HASH PASSWORD
    # -----------------------------------------------------

    password_hash = generate_password_hash(
        password
    )


    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------

    cursor.execute(
        """
        INSERT INTO users
        (
            name,
            email,
            password
        )

        VALUES (?, ?, ?)
        """,

        (
            name,
            email,
            password_hash
        )
    )


    connection.commit()

    user_id = cursor.lastrowid

    connection.close()


    # -----------------------------------------------------
    # CREATE SESSION
    # -----------------------------------------------------

    session["user_id"] = user_id

    session["user_name"] = name

    session["user_email"] = email


    return jsonify({

        "success": True,

        "message":
            "Account created successfully.",

        "user": {

            "id": user_id,

            "name": name,

            "email": email

        }

    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login():

    data = request.get_json(
        silent=True
    )


    if not data:

        return jsonify({
            "success": False,
            "message": "Invalid request."
        }), 400


    email = (
        data.get("email")
        or ""
    ).strip().lower()


    password = (
        data.get("password")
        or ""
    )


    if not email or not password:

        return jsonify({
            "success": False,
            "message":
                "Email and password are required."
        }), 400


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            name,
            email,
            password

        FROM users

        WHERE email = ?
        """,

        (email,)
    )


    user = cursor.fetchone()


    connection.close()


    if not user:

        return jsonify({
            "success": False,
            "message":
                "Invalid email or password."
        }), 401


    # -----------------------------------------------------
    # CHECK PASSWORD
    # -----------------------------------------------------

    if not check_password_hash(
        user["password"],
        password
    ):

        return jsonify({
            "success": False,
            "message":
                "Invalid email or password."
        }), 401


    # -----------------------------------------------------
    # CREATE SESSION
    # -----------------------------------------------------

    session["user_id"] = user["id"]

    session["user_name"] = user["name"]

    session["user_email"] = user["email"]


    return jsonify({

        "success": True,

        "message":
            "Login successful.",

        "user": {

            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"]

        }

    })


# =========================================================
# CURRENT USER
# =========================================================

@app.route(
    "/api/me",
    methods=["GET"]
)
def current_user():

    user_id = session.get(
        "user_id"
    )


    if not user_id:

        return jsonify({

            "loggedIn": False

        })


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            name,
            email

        FROM users

        WHERE id = ?
        """,

        (user_id,)
    )


    user = cursor.fetchone()


    connection.close()


    if not user:

        session.clear()

        return jsonify({

            "loggedIn": False

        })


    return jsonify({

        "loggedIn": True,

        "user": {

            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"]

        }

    })


# =========================================================
# LOGOUT
# =========================================================

@app.route(
    "/api/logout",
    methods=["POST"]
)
def logout():

    session.clear()


    return jsonify({

        "success": True,

        "message":
            "Logged out successfully."

    })


# =========================================================
# SAVE WORKOUT
# =========================================================

@app.route(
    "/api/workouts",
    methods=["POST"]
)
def save_workout():

    user_id = session.get(
        "user_id"
    )


    if not user_id:

        return jsonify({

            "success": False,

            "message":
                "Login required."

        }), 401


    data = request.get_json(
        silent=True
    )


    if not data:

        return jsonify({

            "success": False,

            "message":
                "Invalid workout data."

        }), 400


    exercise = (
        data.get("exercise")
        or "unknown"
    )


    exercise_name = (
        data.get("exerciseName")
        or exercise
    )


    try:

        reps = int(
            data.get("reps") or 0
        )

    except (TypeError, ValueError):

        reps = 0


    try:

        duration = int(
            data.get("durationSeconds")
            or data.get("duration")
            or 0
        )

    except (TypeError, ValueError):

        duration = 0


    try:

        calories = int(
            data.get("calories")
            or 0
        )

    except (TypeError, ValueError):

        calories = 0


    feedback = (
        data.get("feedback")
        or ""
    )


    workout_date = (
        data.get("workoutDate")
        or data.get("date")
        or datetime.now().isoformat()
    )


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        INSERT INTO workouts
        (
            user_id,
            exercise,
            exercise_name,
            reps,
            duration_seconds,
            calories,
            feedback,
            workout_date
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,

        (
            user_id,
            exercise,
            exercise_name,
            reps,
            duration,
            calories,
            feedback,
            workout_date
        )
    )


    connection.commit()

    workout_id = cursor.lastrowid

    connection.close()


    return jsonify({

        "success": True,

        "message":
            "Workout saved successfully.",

        "workoutId":
            workout_id

    })


# =========================================================
# GET USER WORKOUTS
# =========================================================

@app.route(
    "/api/workouts",
    methods=["GET"]
)
def get_workouts():

    user_id = session.get(
        "user_id"
    )


    if not user_id:

        return jsonify({

            "success": False,

            "message":
                "Login required."

        }), 401


    connection = get_db()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT

            id,

            exercise,

            exercise_name,

            reps,

            duration_seconds,

            calories,

            feedback,

            workout_date,

            created_at

        FROM workouts

        WHERE user_id = ?

        ORDER BY workout_date DESC
        """,

        (user_id,)
    )


    rows = cursor.fetchall()


    connection.close()


    workouts = []


    for row in rows:

        workouts.append({

            "id":
                row["id"],

            "exercise":
                row["exercise"],

            "exerciseName":
                row["exercise_name"],

            "reps":
                row["reps"],

            "durationSeconds":
                row["duration_seconds"],

            "duration":
                row["duration_seconds"],

            "calories":
                row["calories"],

            "feedback":
                row["feedback"],

            "workoutDate":
                row["workout_date"],

            "date":
                row["workout_date"],

            "createdAt":
                row["created_at"],

            "timestamp":
                row["workout_date"]

        })


    return jsonify({

        "success": True,

        "workouts":
            workouts

    })


# =========================================================
# HOME / FRONTEND
# =========================================================

@app.route("/")
def home():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# =========================================================
# FRONTEND FILES
# =========================================================

@app.route(
    "/<path:path>"
)
def frontend_files(path):

    requested_file =FRONTEND_DIR / path


    if requested_file.is_file():

        return send_from_directory(
            FRONTEND_DIR,
            path
        )


    return (
        "GymGuard page not found",
        404
    )


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    init_database()


    print()
    print("======================================")
    print("       GYMGUARD BACKEND SERVER")
    print("======================================")
    print()

    print(
        "Server:"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print()

    print(
        "Database:"
    )

    print(
        str(DATABASE_PATH)
    )

    print()


    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )