import json
import numpy as np


INPUT_FILE = "squat_reference.json"
OUTPUT_FILE = "squat_reference_profile.json"


# =========================================================
# SETTINGS
# =========================================================

# These are initial detection values for our project.
# Later we can improve them using the actual reference video.

UP_THRESHOLD = 160
DOWN_THRESHOLD = 90


# =========================================================
# LOAD REFERENCE DATA
# =========================================================

with open(INPUT_FILE, "r") as file:
    data = json.load(file)


frames = data["frames"]


print("--------------------------------------")
print("GYMGUARD SQUAT PHASE ANALYZER")
print("--------------------------------------")
print()

print(
    "Frames available:",
    len(frames)
)

print()


# =========================================================
# EXTRACT KNEE ANGLES
# =========================================================

knee_angles = [
    frame["knee_angle"]
    for frame in frames
]


# =========================================================
# FIND LOWEST KNEE ANGLE
# =========================================================

lowest_angle = min(knee_angles)

lowest_index = knee_angles.index(
    lowest_angle
)


# =========================================================
# FIND FIRST UP POSITION
# =========================================================

up_start = None

for i, angle in enumerate(knee_angles):

    if angle >= UP_THRESHOLD:

        up_start = i
        break


# =========================================================
# FIND DOWN POSITION
# =========================================================

down_index = None

for i in range(
    up_start if up_start is not None else 0,
    len(knee_angles)
):

    if knee_angles[i] <= DOWN_THRESHOLD:

        down_index = i
        break


# =========================================================
# FIND RETURN TO UP
# =========================================================

up_return = None

if down_index is not None:

    for i in range(
        down_index,
        len(knee_angles)
    ):

        if knee_angles[i] >= UP_THRESHOLD:

            up_return = i
            break


# =========================================================
# DISPLAY
# =========================================================

print("Reference movement:")
print()


if up_start is not None:

    print(
        "UP starts at frame:",
        frames[up_start]["frame"]
    )

else:

    print(
        "UP start not detected"
    )


if down_index is not None:

    print(
        "DOWN detected at frame:",
        frames[down_index]["frame"]
    )

else:

    print(
        "DOWN position not detected"
    )


if up_return is not None:

    print(
        "UP return at frame:",
        frames[up_return]["frame"]
    )

else:

    print(
        "UP return not detected"
    )


print()

print(
    "Lowest knee angle:",
    round(lowest_angle, 2)
)


# =========================================================
# CREATE PROFILE
# =========================================================

profile = {

    "exercise": "squat",

    "reference_video": data["source_video"],

    "movement": {

        "up_threshold": UP_THRESHOLD,

        "down_threshold": DOWN_THRESHOLD,

        "lowest_knee_angle": round(
            lowest_angle,
            2
        )
    },

    "phases": {

        "start": "UP",

        "middle": "DOWN",

        "end": "UP"
    },

    "reference_frames": {

        "up_start": (
            frames[up_start]["frame"]
            if up_start is not None
            else None
        ),

        "down": (
            frames[down_index]["frame"]
            if down_index is not None
            else None
        ),

        "up_return": (
            frames[up_return]["frame"]
            if up_return is not None
            else None
        )
    },

    "angle_profile": {

        "knee_min": data["knee"]["min"],

        "knee_max": data["knee"]["max"],

        "hip_min": data["hip"]["min"],

        "hip_max": data["hip"]["max"],

        "torso_min": data["torso"]["min"],

        "torso_max": data["torso"]["max"]
    }
}


# =========================================================
# SAVE
# =========================================================

with open(
    OUTPUT_FILE,
    "w"
) as file:

    json.dump(
        profile,
        file,
        indent=4
    )


# =========================================================
# RESULT
# =========================================================

print()
print("--------------------------------------")
print("PHASE ANALYSIS COMPLETE")
print("--------------------------------------")

print()

print(
    "Saved profile:"
)

print(
    OUTPUT_FILE
)

print()

print("Movement sequence:")

print(
    "UP → DOWN → UP"
)