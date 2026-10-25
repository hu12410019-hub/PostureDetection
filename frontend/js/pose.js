
"use strict";

// ============================================================
// GYMGUARD - POSE TRACKING AND LIVE FORM COACHING
// Keep existing squat thresholds and squat detection unchanged.
// ============================================================

(() => {
    const pageParams = new URLSearchParams(window.location.search);

    const supportedExercises = [
        "squat",
        "bicep-curl",
        "lunges",
        "shoulder-press",
        "lateral-raise",
        "romanian-deadlift"
    ];

    const requestedExercise = (
        pageParams.get("exercise") || "squat"
    ).toLowerCase();

    const exercise = supportedExercises.includes(requestedExercise)
        ? requestedExercise
        : "squat";

    const video = document.getElementById("camera");
    const canvas = document.getElementById("poseCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;

    const repElement = document.getElementById("repCount");
    const statusElement = document.getElementById("aiStatus");
    const feedbackElement = document.getElementById("aiFeedback");

    const angleElements = {
        shoulder: document.getElementById("shoulderAngle"),
        elbow: document.getElementById("elbowAngle"),
        hip: document.getElementById("hipAngle"),
        knee: document.getElementById("kneeAngle")
    };

    const LABELS = {
        "squat": "Squat",
        "bicep-curl": "Bicep Curl",
        "lunges": "Lunges",
        "shoulder-press": "Shoulder Press",
        "lateral-raise": "Lateral Raise",
        "romanian-deadlift": "Romanian Deadlift"
    };

    // These are practical initial targets, not universal standards.
    // Squat thresholds below remain the same as the existing file.
    const CONFIG = {
        "squat": {
            label: "Squat",
            metric: "knee",
            start: 155,
            bottom: 100
        },
        "bicep-curl": {
            label: "Bicep Curl",
            metric: "elbow",
            extended: 155,
            flexed: 55
        },
        "lunges": {
            label: "Lunges",
            metric: "knee",
            extended: 155,
            flexed: 100
        },
        "shoulder-press": {
            label: "Shoulder Press",
            metric: "elbow",
            bottom: 105,
            top: 155
        },
        "lateral-raise": {
            label: "Lateral Raise",
            metric: "lift",
            bottom: 20,
            top: 65
        },
        "romanian-deadlift": {
            label: "Romanian Deadlift",
            metric: "hip",
            upright: 155,
            hinge: 110
        }
    };

    const MIN_VISIBILITY = 0.55;
    const SMOOTHING_FRAMES = 5;
    const CONFIRM_FRAMES = 4;
    const REP_COOLDOWN_MS = 700;
    const FEEDBACK_COOLDOWN_MS = 2500;

    let pose = null;
    let reps = 0;
    let movementState = "START";
    let pendingState = null;
    let pendingFrames = 0;

    let voiceEnabled = true;
    let processingFrame = false;
    let detecting = false;
    let animationId = null;

    let lastRepTime = 0;
    let lastFeedbackTime = 0;
    let lastVoiceMessage = "";
    let lastVoiceTime = 0;
    let lastSpokenFeedback = "";
    let referenceProfile = null;

    const angleHistory = {
        knee: [],
        hip: [],
        elbow: [],
        shoulder: [],
        torso: [],
        lift: []
    };

    // ----------------------------------------------------------
    // UI
    // ----------------------------------------------------------

    function setStatus(message) {
        if (statusElement) statusElement.textContent = message;
    }

    function setFeedback(message) {
        if (feedbackElement) feedbackElement.textContent = message;
    }

    function updateUI() {
        if (repElement) repElement.textContent = String(reps);
    }

    function formatAngle(value) {
        return Number.isFinite(value)
            ? `${Math.round(value)}°`
            : "--°";
    }

    function updateAngleUI(angles) {
        for (const key of Object.keys(angleElements)) {
            if (angleElements[key]) {
                angleElements[key].textContent =
                    formatAngle(angles[key]);
            }
        }
    }

    // ----------------------------------------------------------
    // Voice coaching
    // ----------------------------------------------------------

    function speak(message, force = false) {
        if (!voiceEnabled || !("speechSynthesis" in window)) return;

        const now = Date.now();

        if (
            !force &&
            (
                message === lastVoiceMessage ||
                now - lastVoiceTime < FEEDBACK_COOLDOWN_MS
            )
        ) {
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);

        lastVoiceMessage = message;
        lastVoiceTime = now;
    }

    function coach(message, announce = false) {
        setFeedback(message);

        const now = Date.now();

        if (
            announce &&
            (
                message !== lastSpokenFeedback ||
                now - lastFeedbackTime >= FEEDBACK_COOLDOWN_MS
            )
        ) {
            speak(message);
            lastSpokenFeedback = message;
            lastFeedbackTime = now;
        }
    }

    function toggleVoice() {
        voiceEnabled = !voiceEnabled;

        const button = document.getElementById("voiceToggle");

        if (button) {
            button.textContent = voiceEnabled
                ? "🔊 Voice ON"
                : "🔇 Voice OFF";
        }

        if (!voiceEnabled && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        } else {
            speak("Voice coaching enabled", true);
        }

        return voiceEnabled;
    }

    // ----------------------------------------------------------
    // Geometry and smoothing
    // ----------------------------------------------------------

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function average(values) {
        if (!values.length) return null;

        return values.reduce((sum, value) => sum + value, 0)
            / values.length;
    }

    function smoothAngle(name, value) {
        if (!Number.isFinite(value)) return null;

        const history = angleHistory[name];

        // Ignore large one-frame jumps caused by noisy landmarks.
        if (
            history.length &&
            Math.abs(value - history[history.length - 1]) > 60
        ) {
            return average(history);
        }

        history.push(value);

        if (history.length > SMOOTHING_FRAMES) {
            history.shift();
        }

        return average(history);
    }

    function calculateAngle(a, b, c) {
        if (!a || !b || !c) return null;

        const abx = a.x - b.x;
        const aby = a.y - b.y;
        const cbx = c.x - b.x;
        const cby = c.y - b.y;

        const dot = abx * cbx + aby * cby;
        const magAB = Math.hypot(abx, aby);
        const magCB = Math.hypot(cbx, cby);

        if (!magAB || !magCB) return null;

        return Math.acos(
            clamp(dot / (magAB * magCB), -1, 1)
        ) * 180 / Math.PI;
    }

    function getBodySide(landmarks) {
        const left = [11, 23, 25, 27];
        const right = [12, 24, 26, 28];

        function visibility(ids) {
            return average(
                ids.map(id => landmarks[id]?.visibility ?? 0)
            ) ?? 0;
        }

        return visibility(right) >= visibility(left)
            ? "right"
            : "left";
    }

    function getIndices(side) {
        return side === "right"
            ? {
                shoulder: 12,
                elbow: 14,
                wrist: 16,
                hip: 24,
                knee: 26,
                ankle: 28
            }
            : {
                shoulder: 11,
                elbow: 13,
                wrist: 15,
                hip: 23,
                knee: 25,
                ankle: 27
            };
    }

    function analyzeLandmarks(landmarks) {
        const side = getBodySide(landmarks);
        const ids = getIndices(side);

        const p = {
            shoulder: landmarks[ids.shoulder],
            elbow: landmarks[ids.elbow],
            wrist: landmarks[ids.wrist],
            hip: landmarks[ids.hip],
            knee: landmarks[ids.knee],
            ankle: landmarks[ids.ankle]
        };

        const upperBodyExercise = [
            "bicep-curl",
            "shoulder-press",
            "lateral-raise"
        ].includes(exercise);

        const required = upperBodyExercise
            ? [p.shoulder, p.elbow, p.wrist]
            : [p.shoulder, p.hip, p.knee, p.ankle];

        if (
            !required.every(point =>
                point &&
                (point.visibility ?? 0) >= MIN_VISIBILITY
            )
        ) {
            setStatus("Body landmarks not fully visible");

            coach(upperBodyExercise
                ? "Keep your shoulders, elbows and wrists in view"
                : "Step back so your hips, knees and ankles are visible"
            );

            return null;
        }

        const raw = {
            knee: calculateAngle(p.hip, p.knee, p.ankle),
            hip: calculateAngle(p.shoulder, p.hip, p.knee),
            elbow: calculateAngle(p.shoulder, p.elbow, p.wrist),
            shoulder: calculateAngle(p.hip, p.shoulder, p.elbow),

            torso: Math.abs(
                Math.atan2(
                    p.shoulder.x - p.hip.x,
                    p.hip.y - p.shoulder.y
                ) * 180 / Math.PI
            )
        };

        const angles = {
            knee: smoothAngle("knee", raw.knee),
            hip: smoothAngle("hip", raw.hip),
            elbow: smoothAngle("elbow", raw.elbow),
            shoulder: smoothAngle("shoulder", raw.shoulder),
            torso: smoothAngle("torso", raw.torso)
        };

        // For lateral raises, estimate upper-arm elevation relative
        // to the torso. A side-on view can make this less reliable.
        const dx = p.elbow.x - p.shoulder.x;
        const dy = p.shoulder.y - p.elbow.y;

        const lift = Math.atan2(
            Math.abs(dy),
            Math.abs(dx) + 0.0001
        ) * 180 / Math.PI;

        angles.lift = smoothAngle("lift", lift);

        updateAngleUI(angles);

        return { p, angles, side };
    }

    // ----------------------------------------------------------
    // Stable state changes
    // ----------------------------------------------------------

    function confirmState(nextState) {
        if (movementState === nextState) {
            pendingState = null;
            pendingFrames = 0;
            return false;
        }

        if (pendingState !== nextState) {
            pendingState = nextState;
            pendingFrames = 1;
            return false;
        }

        pendingFrames += 1;

        if (pendingFrames >= CONFIRM_FRAMES) {
            movementState = nextState;
            pendingState = null;
            pendingFrames = 0;
            return true;
        }

        return false;
    }

    function completeRep(message) {
        const now = Date.now();

        if (now - lastRepTime < REP_COOLDOWN_MS) return;

        reps += 1;
        lastRepTime = now;
        movementState = "START";
        pendingState = null;
        pendingFrames = 0;

        updateUI();
        coach(message, true);
        setStatus("Rep completed");

        console.log(
            `GymGuard: ${LABELS[exercise]} rep ${reps}`
        );
    }

    // ----------------------------------------------------------
    // SQUAT — PRESERVED EXISTING THRESHOLDS AND LOGIC
    // ----------------------------------------------------------

    function detectSquat(data) {
        const knee = data.angles.knee;
        const hip = data.angles.hip;

        if (!Number.isFinite(knee)) return;

        const profile = referenceProfile?.angle_profile || {};

        const up = Number.isFinite(
            referenceProfile?.movement?.up_threshold
        )
            ? referenceProfile.movement.up_threshold
            : 160;

        const down = Number.isFinite(profile.knee_min)
            ? Math.max(70, profile.knee_min + 20)
            : 100;

        if (knee >= up - 8) {
            if (
                movementState === "BOTTOM" ||
                movementState === "RISING"
            ) {
                completeRep(
                    "Good squat! Return to a comfortable standing position."
                );
            } else {
                confirmState("START");
                setStatus("Standing position");
            }

            return;
        }

        if (movementState === "START") {
            confirmState("LOWERING");
            setStatus("Moving down");
            coach("Lower down slowly");
        }

        if (
            knee <= down &&
            (
                movementState === "LOWERING" ||
                movementState === "BOTTOM"
            )
        ) {
            confirmState("BOTTOM");
            setStatus("Bottom position");
            coach("Good depth — push up smoothly");
        } else if (
            movementState === "BOTTOM" &&
            knee > down + 12
        ) {
            confirmState("RISING");
            setStatus("Coming up");
            coach("Push up smoothly");
        } else if (
            movementState === "LOWERING" &&
            Number.isFinite(hip) &&
            data.angles.torso > 45
        ) {
            coach(
                "Keep your torso controlled and your back comfortable"
            );
        }
    }

    // ----------------------------------------------------------
    // BICEP CURL — FULL EXTENSION AND FLEXION REQUIRED
    // ----------------------------------------------------------

    function detectBicepCurl(data) {
        const elbow = data.angles.elbow;
        const p = data.p;

        if (!Number.isFinite(elbow)) return;

        // Require a near-extended starting position. Small arm
        // movements cannot count as a complete curl.
        if (movementState === "START") {
            if (elbow >= 145) {
                confirmState("READY");
                setStatus("Ready — arms extended");
                coach("Curl slowly, keeping your elbows close to your sides");
            } else {
                setStatus("Return to the starting position");
                coach("Straighten your arm before the next rep");
            }
            return;
        }

        if (movementState === "READY" || movementState === "LIFTING") {
            if (elbow <= 60) {
                if (confirmState("TOP")) {
                    setStatus("Curl top reached");
                    coach("Good curl — lower your arm slowly");
                }
            } else if (elbow < 130) {
                confirmState("LIFTING");
                setStatus("Curling up");

                if (elbow > 100) {
                    coach("Curl a little higher");
                }
            } else if (movementState === "LIFTING") {
                setStatus("Curling up");
            }

            return;
        }

        if (movementState === "TOP" || movementState === "LOWERING") {
            if (elbow >= 145) {
                if (
                    movementState === "TOP" ||
                    movementState === "LOWERING"
                ) {
                    completeRep(
                        "Good full curl! Keep your elbows close to your sides."
                    );
                }
            } else if (elbow > 85) {
                confirmState("LOWERING");
                setStatus("Lowering with control");
                coach("Keep lowering slowly");
            } else if (elbow <= 60) {
                setStatus("Top position — lower with control");
            }
        }
    }

    // ----------------------------------------------------------
    // LUNGES — LOWER INTO A LUNGE AND RETURN TO STANDING
    // ----------------------------------------------------------

    function detectLunge(data) {
        const knee = data.angles.knee;

        if (!Number.isFinite(knee)) return;

        if (movementState === "START") {
            if (knee >= 145) {
                confirmState("READY");
                setStatus("Ready to lunge");
                coach("Step into a comfortable lunge");
            } else {
                setStatus("Return to a stable standing position");
                coach("Stand tall before the next rep");
            }
            return;
        }

        if (movementState === "READY" || movementState === "LOWERING") {
            if (knee <= 100) {
                if (confirmState("BOTTOM")) {
                    setStatus("Lunge depth reached");
                    coach("Keep your balance and front knee aligned");
                }
            } else if (knee < 140) {
                confirmState("LOWERING");
                setStatus("Lowering into lunge");
                coach("Lower a little further, if comfortable");
            }

            return;
        }

        if (movementState === "BOTTOM" || movementState === "RISING") {
            if (knee >= 145) {
                completeRep(
                    "Good lunge — return to a stable standing position."
                );
            } else {
                confirmState("RISING");
                setStatus("Returning to standing");
                coach("Push through your feet and stand tall");
            }
        }
    }

    // ----------------------------------------------------------
    // SHOULDER PRESS — BENT ELBOWS TO OVERHEAD EXTENSION
    // ----------------------------------------------------------

    function detectShoulderPress(data) {
        const elbow = data.angles.elbow;
        const shoulder = data.angles.shoulder;

        if (!Number.isFinite(elbow) || !Number.isFinite(shoulder)) {
            return;
        }

        if (movementState === "START") {
            if (elbow <= 115) {
                confirmState("READY");
                setStatus("Ready — weights near shoulders");
                coach("Press upward without arching your back");
            } else {
                setStatus("Bring your arms to the starting position");
                coach("Start with your elbows bent");
            }
            return;
        }

        if (movementState === "READY" || movementState === "PRESSING") {
            if (elbow >= 155 && shoulder >= 115) {
                if (confirmState("TOP")) {
                    setStatus("Press top reached");
                    coach("Good press — lower slowly");
                }
            } else if (elbow > 115) {
                confirmState("PRESSING");
                setStatus("Pressing upward");
                coach("Extend your arms overhead");
            } else {
                setStatus("Pressing upward");
            }

            return;
        }

        if (movementState === "TOP" || movementState === "LOWERING") {
            if (elbow <= 110) {
                completeRep(
                    "Good press! Keep your torso steady and avoid leaning back."
                );
            } else {
                confirmState("LOWERING");
                setStatus("Lowering to shoulder level");
                coach("Lower your elbows toward shoulder level");
            }
        }
    }

    // ----------------------------------------------------------
    // LATERAL RAISE — ARMS DOWN, RAISE OUT TO THE SIDES
    // ----------------------------------------------------------

    function detectLateralRaise(data) {
        const lift = data.angles.lift;

        if (!Number.isFinite(lift)) return;

        if (movementState === "START") {
            if (lift <= 30) {
                confirmState("READY");
                setStatus("Ready — arms by sides");
                coach("Raise your arms out to the sides");
            } else {
                setStatus("Lower your arms to the starting position");
                coach("Begin with your arms by your sides");
            }
            return;
        }

        if (movementState === "READY" || movementState === "RAISING") {
            if (lift >= 65) {
                if (confirmState("TOP")) {
                    setStatus("Raise position reached");
                    coach("Good height — lower slowly");
                }
            } else if (lift > 30) {
                confirmState("RAISING");
                setStatus("Raising arms");
                coach("Raise a little higher, keeping shoulders relaxed");
            }

            return;
        }

        if (movementState === "TOP" || movementState === "LOWERING") {
            if (lift <= 30) {
                completeRep(
                    "Good lateral raise — keep your shoulders relaxed."
                );
            } else {
                confirmState("LOWERING");
                setStatus("Lowering arms");
                coach("Lower your arms slowly");
            }
        }
    }

    // ----------------------------------------------------------
    // ROMANIAN DEADLIFT — HIP HINGE AND RETURN UPRIGHT
    // ----------------------------------------------------------

    function detectRomanianDeadlift(data) {
        const hip = data.angles.hip;

        if (!Number.isFinite(hip)) return;

        if (movementState === "START") {
            if (hip >= 150) {
                confirmState("READY");
                setStatus("Ready — standing tall");
                coach("Push your hips back with a comfortable, neutral back");
            } else {
                setStatus("Return to standing");
                coach("Stand tall before the next rep");
            }
            return;
        }

        if (movementState === "READY" || movementState === "HINGING") {
            if (hip <= 110) {
                if (confirmState("BOTTOM")) {
                    setStatus("Hip hinge reached");
                    coach("Keep your back neutral and drive your hips forward");
                }
            } else if (hip < 145) {
                confirmState("HINGING");
                setStatus("Hinging at hips");
                coach("Push your hips back a little further, if comfortable");
            }

            return;
        }

        if (movementState === "BOTTOM" || movementState === "RISING") {
            if (hip >= 150) {
                completeRep(
                    "Good hinge — stand tall without leaning backward."
                );
            } else {
                confirmState("RISING");
                setStatus("Returning upright");
                coach("Bring your hips forward and stand tall");
            }
        }
    }

    // ----------------------------------------------------------
    // EXERCISE DISPATCH
    // ----------------------------------------------------------

    function processExercise(landmarks) {
        if (!landmarks || landmarks.length < 33) {
            setStatus("Looking for body pose");
            coach("Move into view of the camera");
            return;
        }

        const data = analyzeLandmarks(landmarks);
        if (!data) return;

        switch (exercise) {
            case "squat":
                detectSquat(data);
                break;
            case "bicep-curl":
                detectBicepCurl(data);
                break;
            case "lunges":
                detectLunge(data);
                break;
            case "shoulder-press":
                detectShoulderPress(data);
                break;
            case "lateral-raise":
                detectLateralRaise(data);
                break;
            case "romanian-deadlift":
                detectRomanianDeadlift(data);
                break;
        }

        updateUI();
    }

    // ----------------------------------------------------------
    // DRAW THE POSE SKELETON
    // ----------------------------------------------------------

    function onPoseResults(results) {
        if (!canvas || !ctx || !video) return;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (
            results?.poseLandmarks &&
            typeof drawConnectors === "function" &&
            typeof drawLandmarks === "function" &&
            typeof POSE_CONNECTIONS !== "undefined"
        ) {
            drawConnectors(
                ctx,
                results.poseLandmarks,
                POSE_CONNECTIONS,
                { color: "#00ff88", lineWidth: 4 }
            );

            drawLandmarks(
                ctx,
                results.poseLandmarks,
                {
                    color: "#ffffff",
                    lineWidth: 2,
                    radius: 4
                }
            );

            processExercise(results.poseLandmarks);
        } else {
            setStatus("Pose not detected");
            coach("Make sure your required joints are visible");
        }
    }

    // ----------------------------------------------------------
    // MEDIAPIPE INITIALIZATION
    // ----------------------------------------------------------

    async function loadReferenceProfile() {
        // Optional squat profile; built-in thresholds remain the fallback.
        try {
            const response = await fetch(
                "/reference_analyzer/squat_reference_profile.json"
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            referenceProfile = await response.json();
            console.log("GymGuard squat reference profile loaded.");
        } catch (error) {
            referenceProfile = null;
            console.info("Using built-in squat thresholds.");
        }
    }

    function initializePose() {
        if (typeof Pose === "undefined") {
            setStatus("Pose library failed to load");
            console.error(
                "GymGuard: MediaPipe Pose is unavailable. Check the CDN scripts."
            );
            return;
        }

        try {
            pose = new Pose({
                locateFile: file =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
            });

            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.65
            });

            pose.onResults(onPoseResults);

            console.log("GymGuard Pose initialized:", exercise);
            setStatus(`Ready — ${LABELS[exercise]}`);
            setFeedback("Position yourself so the required joints are visible");

            if (video) {
                video.addEventListener("playing", startDetection);

                if (!video.paused && video.readyState >= 2) {
                    startDetection();
                }
            }

            loadReferenceProfile();
        } catch (error) {
            console.error("GymGuard Pose initialization failed:", error);
            setStatus("Could not initialize pose detector");
        }
    }

    async function detectFrame() {
        if (!detecting) return;

        if (
            pose &&
            video &&
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            !processingFrame
        ) {
            processingFrame = true;

            try {
                await pose.send({ image: video });
            } catch (error) {
                console.error("GymGuard pose detection error:", error);
                setStatus("Pose detection error");
            } finally {
                processingFrame = false;
            }
        }

        if (detecting) {
            animationId = requestAnimationFrame(detectFrame);
        }
    }

    function startDetection() {
        if (detecting || !pose) return;

        detecting = true;
        setStatus(`Tracking — ${LABELS[exercise]}`);
        detectFrame();
    }

    function stopDetection() {
        detecting = false;

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // ----------------------------------------------------------
    // PUBLIC FUNCTIONS USED BY THE REST OF THE WEBSITE
    // ----------------------------------------------------------

    function resetTracking() {
        reps = 0;
        movementState = "START";
        pendingState = null;
        pendingFrames = 0;
        lastRepTime = 0;

        Object.keys(angleHistory).forEach(key => {
            angleHistory[key] = [];
        });

        updateUI();
        setStatus("Ready");
        setFeedback("Tracking reset. Begin when ready.");
    }

    function getGymGuardWorkoutData() {
        return {
            exercise,
            reps,
            status: movementState
        };
    }

    window.startPoseDetection = startDetection;
    window.stopPoseDetection = stopDetection;
    window.resetGymGuardTracking = resetTracking;
    window.toggleVoice = toggleVoice;
    window.getGymGuardWorkoutData = getGymGuardWorkoutData;

    window.addEventListener("pagehide", stopDetection);

    updateUI();
    initializePose();
})();
