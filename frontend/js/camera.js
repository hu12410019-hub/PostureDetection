
"use strict";

// =========================================================
// GYMGUARD CAMERA MANAGER
// Works with MediaPipe pose.js
// =========================================================

let cameraStream = null;
let cameraStarting = false;

const cameraVideo = document.getElementById("camera");
const cameraMessage = document.getElementById("cameraMessage");

// =========================================================
// CAMERA MESSAGE
// =========================================================

function showCameraMessage(message) {
    if (!cameraMessage) return;

    cameraMessage.innerText = message;
    cameraMessage.style.display = "flex";
}

function hideCameraMessage() {
    if (cameraMessage) {
        cameraMessage.style.display = "none";
    }
}

// =========================================================
// START CAMERA
// =========================================================

async function startCamera() {
    if (cameraStarting) return;

    if (!cameraVideo) {
        console.error("GymGuard: #camera video element not found.");
        return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        showCameraMessage(
            "Camera unavailable. Use localhost or HTTPS."
        );
        console.error(
            "getUserMedia is unavailable. Open the page through localhost or HTTPS."
        );
        return;
    }

    // Reuse an already-running camera stream.
    if (
        cameraStream &&
        cameraStream.getVideoTracks().some(
            track => track.readyState === "live"
        )
    ) {
        try {
            await cameraVideo.play();
            hideCameraMessage();
            return;
        } catch (error) {
            console.error("Could not resume camera video:", error);
        }
    }

    cameraStarting = true;
    showCameraMessage("Starting camera...");

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            },
            audio: false
        });

        cameraVideo.srcObject = cameraStream;
        cameraVideo.muted = true;
        cameraVideo.playsInline = true;

        await new Promise((resolve, reject) => {
            if (
                cameraVideo.readyState >= 1 &&
                cameraVideo.videoWidth > 0
            ) {
                resolve();
                return;
            }

            const onLoaded = () => {
                cleanup();
                resolve();
            };

            const onError = () => {
                cleanup();
                reject(new Error("Video metadata failed to load."));
            };

            const cleanup = () => {
                cameraVideo.removeEventListener(
                    "loadedmetadata",
                    onLoaded
                );
                cameraVideo.removeEventListener("error", onError);
            };

            cameraVideo.addEventListener(
                "loadedmetadata",
                onLoaded,
                { once: true }
            );

            cameraVideo.addEventListener(
                "error",
                onError,
                { once: true }
            );
        });

        await cameraVideo.play();
        hideCameraMessage();

        // Notify workout timer if available.
        if (typeof window.startWorkoutTimer === "function") {
            window.startWorkoutTimer();
        }

        console.log(
            "GymGuard camera started:",
            cameraVideo.videoWidth,
            "x",
            cameraVideo.videoHeight
        );

    } catch (error) {
        console.error("GymGuard camera error:", error);

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }

        cameraVideo.srcObject = null;

        if (error.name === "NotAllowedError") {
            showCameraMessage(
                "Camera permission denied. Allow camera access in your browser."
            );
        } else if (error.name === "NotFoundError") {
            showCameraMessage("No camera was found.");
        } else if (error.name === "NotReadableError") {
            showCameraMessage(
                "Camera is busy. Close other apps using it and retry."
            );
        } else {
            showCameraMessage("Unable to start camera. Check the Console.");
        }

    } finally {
        cameraStarting = false;
    }
}

// =========================================================
// STOP CAMERA
// =========================================================

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
    }

    showCameraMessage("Camera is off");

    console.log("GymGuard camera stopped.");
}

// =========================================================
// CLEANUP IF THE PAGE IS CLOSED
// =========================================================

window.addEventListener("pagehide", () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
});

// =========================================================
// GLOBAL FUNCTIONS FOR HTML BUTTONS
// =========================================================

window.startCamera = startCamera;
window.stopCamera = stopCamera;
