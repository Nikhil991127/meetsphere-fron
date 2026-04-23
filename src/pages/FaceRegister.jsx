import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

const MODEL_URL = "/models";

export default function FaceRegister() {
    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const navigate  = useNavigate();

    const [status,  setStatus]  = useState("loading");
    const [message, setMessage] = useState("Loading face detection…");
    const [preview, setPreview] = useState(null);
    const [streamRef] = useState({ current: null });

    useEffect(() => {
        (async () => {
            try {
                if (!window.faceapi) throw new Error("face-api.js not loaded — add script tag to index.html");
                await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setStatus("ready");
                setMessage("Centre your face in the oval, then click Register.");
            } catch (e) {
                setStatus("error");
                setMessage(e.message);
            }
        })();
        return () => streamRef.current?.getTracks().forEach(t => t.stop());
    }, []); // eslint-disable-line

    const handleRegister = async () => {
        if (status !== "ready") return;
        setStatus("capturing");
        setMessage("Detecting face…");
        try {
            const video  = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);

            const det = await window.faceapi
                .detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!det) {
                setStatus("ready");
                setMessage("No face detected — make sure your face is well-lit and centred.");
                return;
            }

            setPreview(canvas.toDataURL("image/jpeg", 0.8));

            const res  = await fetch(`${server}/api/v1/ai/face/register`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    token:      localStorage.getItem("token"),
                    descriptor: Array.from(det.descriptor),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            // Stop camera — registration done
            streamRef.current?.getTracks().forEach(t => t.stop());
            setStatus("success");
            setMessage("Registered! You'll be auto-detected in meetings when the host takes attendance.");
        } catch (e) {
            setStatus("error");
            setMessage(`Failed: ${e.message}`);
        }
    };

    const dotColor = { loading: "#facc15", ready: "#4ade80", capturing: "#60a5fa", success: "#4ade80", error: "#f87171" }[status];

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h1 style={s.title}>Register Your Face</h1>
                <p style={s.sub}>One-time setup. Your face data stays on your server — never shared externally.</p>

                <div style={{ ...s.pill, background: dotColor + "20", color: dotColor, border: `1px solid ${dotColor}40` }}>
                    <span style={{ ...s.dot, background: dotColor }} />{message}
                </div>

                <div style={s.videoWrap}>
                    {preview
                        ? <img src={preview} alt="captured" style={s.video} />
                        : <video ref={videoRef} autoPlay muted playsInline style={s.video} />}
                    <div style={s.oval} />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                <div style={s.row}>
                    {status === "success" ? (
                        <button style={s.primary} onClick={() => navigate("/home")}>Go to Home →</button>
                    ) : (
                        <>
                            {preview && (
                                <button style={s.secondary} onClick={() => { setPreview(null); setStatus("ready"); setMessage("Try again."); }}>
                                    Retake
                                </button>
                            )}
                            <button
                                style={{ ...s.primary, opacity: status === "ready" ? 1 : 0.45, cursor: status === "ready" ? "pointer" : "not-allowed" }}
                                onClick={handleRegister}
                                disabled={status !== "ready"}
                            >
                                {status === "capturing" ? "Detecting…" : "Register My Face"}
                            </button>
                        </>
                    )}
                    <button style={s.ghost} onClick={() => navigate("/home")}>Skip</button>
                </div>
            </div>
        </div>
    );
}

const s = {
    page:      { minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: '"DM Sans","Segoe UI",sans-serif' },
    card:      { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 24, padding: 40, maxWidth: 460, width: "100%", display: "flex", flexDirection: "column", gap: 20 },
    title:     { margin: 0, fontSize: 26, fontWeight: 700, color: "#fff" },
    sub:       { margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 },
    pill:      { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, fontSize: 13 },
    dot:       { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
    videoWrap: { position: "relative", borderRadius: 16, overflow: "hidden", background: "#111", aspectRatio: "4/3" },
    video:     { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    oval:      { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", width: "52%", aspectRatio: "3/4", border: "2px dashed rgba(255,255,255,0.35)", borderRadius: "50%", pointerEvents: "none" },
    row:       { display: "flex", gap: 10, flexWrap: "wrap" },
    primary:   { flex: 1, background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    secondary: { background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "13px 18px", fontSize: 14, cursor: "pointer" },
    ghost:     { background: "transparent", color: "rgba(255,255,255,0.35)", border: "none", padding: "13px 6px", fontSize: 13, cursor: "pointer" },
};
