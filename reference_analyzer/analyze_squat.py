import cv2
import mediapipe as mp
import numpy as np
import json
import os


# =========================================================
# SETTINGS
# =========================================================

VIDEO_PATH = "../reference_videos/squats.mp4"
MODEL_PATH = "pose_landmarker.task"
OUTPUT_PATH = "squat_reference.json"


# =========================================================
# MEDIAPIPE TASKS
# =========================================================

BaseOptions = mp.tasks.BaseOptions
VisionRunningMode = mp.tasks.vision.RunningMode
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions


options = PoseLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),
    running_mode=VisionRunningMode.VIDEO,
    num_poses=1,
    min_pose_detection_confidence=0.5,
    min_pose_presence_confidence=0.5,
    min_tracking_confidence=0.5
)


# =========================================================
# ANGLE FUNCTION
# =========================================================

def calculate_angle(a, b, c):

    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = (
        np.arctan2(c[1] - b[1], c[0] - b[0])
        -
        np.arctan2(a[1] - b[1], a[0] - b[0])
    )

    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180:
        angle = 360 - angle

    return float(angle)


# =========================================================
# REFERENCE VIDEO
# =========================================================

video_path_absolute = os.path.abspath(VIDEO_PATH)

print("--------------------------------------")
print("GYMGUARD REFERENCE ANALYZER")
print("--------------------------------------")
print("Video:", video_path_absolute)
print()


video = cv2.VideoCapture(VIDEO_PATH)


if not video.isOpened():

    print("ERROR: Could not open reference video.")
    print()
    print("Expected video:")
    print(video_path_absolute)

    exit()


fps = video.get(cv2.CAP_PROP_FPS)

if fps <= 0:
    fps = 30


total_frames = int(
    video.get(cv2.CAP_PROP_FRAME_COUNT)
)


print("FPS:", fps)
print("Total video frames:", total_frames)
print()
print("Analyzing reference video...")
print()


# =========================================================
# STORAGE
# =========================================================

frames = []

frame_number = 0


# =========================================================
# POSE LANDMARKER
# =========================================================

with PoseLandmarker.create_from_options(options) as landmarker:

    while True:

        success, frame = video.read()

        if not success:
            break


        frame_number += 1


        # -------------------------------------------------
        # Convert OpenCV BGR → RGB
        # -------------------------------------------------

        rgb_frame = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )


        # -------------------------------------------------
        # MediaPipe Image
        # -------------------------------------------------

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )


        # -------------------------------------------------
        # Timestamp
        # -------------------------------------------------

        timestamp_ms = int(
            (frame_number / fps) * 1000
        )


        # -------------------------------------------------
        # Detect pose
        # -------------------------------------------------

        result = landmarker.detect_for_video(
            mp_image,
            timestamp_ms
        )


        # -------------------------------------------------
        # Check pose
        # -------------------------------------------------

        if not result.pose_landmarks:
            continue


        landmarks = result.pose_landmarks[0]


        # -------------------------------------------------
        # MediaPipe landmark indexes
        #
        # RIGHT_SHOULDER = 12
        # RIGHT_HIP      = 24
        # RIGHT_KNEE     = 26
        # RIGHT_ANKLE    = 28
        # -------------------------------------------------

        shoulder = landmarks[12]
        hip = landmarks[24]
        knee = landmarks[26]
        ankle = landmarks[28]


        # -------------------------------------------------
        # Visibility / presence check
        # -------------------------------------------------

        if (
            shoulder.visibility < 0.5
            or hip.visibility < 0.5
            or knee.visibility < 0.5
            or ankle.visibility < 0.5
        ):
            continue


        # -------------------------------------------------
        # Coordinates
        # -------------------------------------------------

        shoulder_point = [
            shoulder.x,
            shoulder.y
        ]

        hip_point = [
            hip.x,
            hip.y
        ]

        knee_point = [
            knee.x,
            knee.y
        ]

        ankle_point = [
            ankle.x,
            ankle.y
        ]


        # -------------------------------------------------
        # KNEE ANGLE
        # -------------------------------------------------

        knee_angle = calculate_angle(
            hip_point,
            knee_point,
            ankle_point
        )


        # -------------------------------------------------
        # HIP ANGLE
        # -------------------------------------------------

        hip_angle = calculate_angle(
            shoulder_point,
            hip_point,
            knee_point
        )


        # -------------------------------------------------
        # TORSO ANGLE
        # -------------------------------------------------

        dx = shoulder.x - hip.x
        dy = shoulder.y - hip.y

        torso_angle = (
            np.arctan2(
                abs(dx),
                abs(dy)
            )
            * 180.0
            / np.pi
        )


        # -------------------------------------------------
        # SAVE FRAME DATA
        # -------------------------------------------------

        frame_data = {

            "frame": frame_number,

            "time": round(
                frame_number / fps,
                3
            ),

            "knee_angle": round(
                knee_angle,
                2
            ),

            "hip_angle": round(
                hip_angle,
                2
            ),

            "torso_angle": round(
                float(torso_angle),
                2
            )
        }


        frames.append(frame_data)


video.release()


# =========================================================
# CHECK RESULT
# =========================================================

if len(frames) == 0:

    print()
    print("ERROR: No usable pose frames detected.")
    print("Check whether the person is clearly visible")
    print("in the reference video.")

    exit()


# =========================================================
# EXTRACT ANGLES
# =========================================================

knee_angles = [
    frame["knee_angle"]
    for frame in frames
]

hip_angles = [
    frame["hip_angle"]
    for frame in frames
]

torso_angles = [
    frame["torso_angle"]
    for frame in frames
]


# =========================================================
# CREATE REFERENCE PROFILE
# =========================================================

reference_profile = {

    "exercise": "squat",

    "source_video": "squats.mp4",

    "fps": fps,

    "total_frames": total_frames,

    "frames_analyzed": len(frames),


    "knee": {

        "min": round(
            min(knee_angles),
            2
        ),

        "max": round(
            max(knee_angles),
            2
        ),

        "average": round(
            float(np.mean(knee_angles)),
            2
        )
    },


    "hip": {

        "min": round(
            min(hip_angles),
            2
        ),

        "max": round(
            max(hip_angles),
            2
        ),

        "average": round(
            float(np.mean(hip_angles)),
            2
        )
    },


    "torso": {

        "min": round(
            min(torso_angles),
            2
        ),

        "max": round(
            max(torso_angles),
            2
        ),

        "average": round(
            float(np.mean(torso_angles)),
            2
        )
    },


    "frames": frames
}


# =========================================================
# SAVE JSON
# =========================================================

with open(
    OUTPUT_PATH,
    "w"
) as file:

    json.dump(
        reference_profile,
        file,
        indent=4
    )


# =========================================================
# FINAL RESULT
# =========================================================

print()
print("--------------------------------------")
print("REFERENCE ANALYSIS COMPLETE")
print("--------------------------------------")

print(
    "Frames analyzed:",
    len(frames)
)

print()

print(
    "Knee angle:",
    reference_profile["knee"]["min"],
    "to",
    reference_profile["knee"]["max"]
)

print(
    "Hip angle:",
    reference_profile["hip"]["min"],
    "to",
    reference_profile["hip"]["max"]
)

print(
    "Torso angle:",
    reference_profile["torso"]["min"],
    "to",
    reference_profile["torso"]["max"]
)

print()

print("Reference profile saved to:")

print(
    os.path.abspath(OUTPUT_PATH)
)