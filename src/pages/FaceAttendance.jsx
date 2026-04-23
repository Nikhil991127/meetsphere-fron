/**
 * FACE ATTENDANCE — host-triggered, manual scan
 *
 * HOW TO INTEGRATE INTO VideoMeet.jsx:
 * ─────────────────────────────────────
 * 1. Import at top of VideoMeet.jsx:
 *      import { useParams } from 'react-router-dom';
 *      import { useFaceAttendance, AttendancePanel } from './FaceAttendance';
 *      import PeopleIcon from '@mui/icons-material/People';
 *
 * 2. Inside VideoMeetComponent(), before the return:
 *      const { url: meetingCode } = useParams();
 *      const {
 *        attendanceList, scanning, showAttendance,
 *        setShowAttendance, takeAttendance, newMarked,
 *      } = useFaceAttendance(localVideoRef, connections, meetingCode);
 *
 * 3. Add button to the control bar (after SummarizeIcon):
 *      <div style={{ position: 'relative' }}>
 *        <ControlBtn onClick={takeAttendance} active={scanning} title="Take attendance">
 *          <PeopleIcon fontSize="small" />
 *        </ControlBtn>
 *        {newMarked > 0 && <span style={styles.badge}>{newMarked}</span>}
 *      </div>
 *
 * 4. Add panel to JSX (after summaryModal):
 *      {showAttendance && (
 *        <AttendancePanel
 *          list={attendanceList}
 *          meetingCode={meetingCode}
 *          onClose={() => setShowAttendance(false)}
 *        />
 *      )}
 *
 * 5. Call markLeave in handleEndCall BEFORE window.location.href:
 *      await markUserLeave(meetingCode, username);
 */

import React, { useState, useCallback, useRef } from "react";
import server from "../environment";

const MODEL_URL   = "/models";
let   faceApiReady = false;

async function loadFaceApi() {
    if (faceApiReady) return;
    if (!window.faceapi) throw new Error("face-api.js not loaded. See setup instructions.");
    await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    faceApiReady = true;
}

// Capture a face descriptor from a video element
async function captureDescriptor(videoEl) {
    if (!videoEl || videoEl.readyState < 2) return null;
    const det = await window.faceapi
        .detectSingleFace(videoEl, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    return det ? Array.from(det.descriptor) : null;
}

/* ─── Hook ──────────────────────────────────────────────────── */
export function useFaceAttendance(localVideoRef, connectionsRef, meetingCode) {
    const [attendanceList,  setAttendanceList]  = useState([]);
    const [scanning,        setScanning]        = useState(false);
    const [showAttendance,  setShowAttendance]  = useState(false);
    const [newMarked,       setNewMarked]       = useState(0);
    const [scanStatus,      setScanStatus]      = useState(""); // feedback message
    const remoteVideoRefs = useRef({});  // socketId → <video> element — set by RemoteVideo

    // Called by host clicking "Take Attendance"
    const takeAttendance = useCallback(async () => {
        if (scanning || !meetingCode) return;
        setScanning(true);
        setScanStatus("Detecting faces…");

        try {
            await loadFaceApi();

            const descriptors = [];

            // 1. Capture local user's face
            const localDesc = await captureDescriptor(localVideoRef.current);
            if (localDesc) descriptors.push({ socketId: "local", descriptor: localDesc });

            // 2. Capture each remote participant's video frame
            // remoteVideoRefs is populated by RemoteVideo components calling registerVideoRef()
            for (const [socketId, videoEl] of Object.entries(remoteVideoRefs.current)) {
                const desc = await captureDescriptor(videoEl);
                if (desc) descriptors.push({ socketId, descriptor: desc });
            }

            if (descriptors.length === 0) {
                setScanStatus("No faces detected — ensure cameras are on.");
                setScanning(false);
                return;
            }

            setScanStatus(`Scanning ${descriptors.length} participant(s)…`);

            const res  = await fetch(`${server}/api/v1/ai/attendance/scan`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    hostToken:   localStorage.getItem("token"),
                    meetingCode,
                    descriptors,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const recognised = data.results.filter(r => r.recognized).length;
            setAttendanceList(data.records || []);
            setNewMarked(recognised);
            setShowAttendance(true);
            setScanStatus(`Done — ${recognised} of ${descriptors.length} recognised.`);
        } catch (e) {
            setScanStatus(`Scan failed: ${e.message}`);
        } finally {
            setScanning(false);
        }
    }, [scanning, meetingCode, localVideoRef]);

    // Call this from handleEndCall to record leave time
    const markUserLeave = useCallback(async (code, username) => {
        if (!code || !username) return;
        try {
            await fetch(`${server}/api/v1/ai/attendance/leave`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ meetingCode: code, username }),
            });
        } catch { /* silent */ }
    }, []);

    // Manual mark — host types a name
    const manualMark = useCallback(async (username) => {
        if (!meetingCode || !username.trim()) return;
        try {
            const res  = await fetch(`${server}/api/v1/ai/attendance/manual`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    hostToken: localStorage.getItem("token"),
                    meetingCode,
                    username:  username.trim(),
                }),
            });
            const data = await res.json();
            if (data.records) setAttendanceList(data.records);
        } catch { /* silent */ }
    }, [meetingCode]);

    // RemoteVideo components call this to register their <video> element
    const registerVideoRef = useCallback((socketId, el) => {
        if (el) remoteVideoRefs.current[socketId] = el;
        else    delete remoteVideoRefs.current[socketId];
    }, []);

    return {
        attendanceList,
        scanning,
        showAttendance,
        setShowAttendance,
        newMarked,
        scanStatus,
        takeAttendance,
        markUserLeave,
        manualMark,
        registerVideoRef,
    };
}

/* ─── Attendance Panel ──────────────────────────────────────── */
export function AttendancePanel({ list, meetingCode, onClose, onManualMark, scanStatus }) {
    const [manualInput, setManualInput] = React.useState("");

    const downloadCSV = () => {
        const header = "Name,Join Time,Leave Time,Duration (min),Confidence,Marked By\n";
        const rows   = list.map(r => [
            r.username,
            new Date(r.joinTime).toLocaleString(),
            r.leaveTime ? new Date(r.leaveTime).toLocaleString() : "In meeting",
            r.duration  != null ? r.duration : "—",
            r.confidence + "%",
            r.markedBy,
        ].join(",")).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: `attendance_${meetingCode}_${new Date().toISOString().slice(0,10)}.csv` });
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleManual = (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        onManualMark(manualInput);
        setManualInput("");
    };

    return (
        <div style={p.panel}>
            {/* Header */}
            <div style={p.header}>
                <span style={p.title}>Attendance — {meetingCode}</span>
                <div style={{ display: "flex", gap: 8 }}>
                    <button style={p.csvBtn} onClick={downloadCSV}>↓ CSV</button>
                    <button style={p.closeBtn} onClick={onClose}>✕</button>
                </div>
            </div>

            {/* Scan status */}
            {scanStatus ? <div style={p.status}>{scanStatus}</div> : null}

            {/* List */}
            <div style={p.list}>
                {list.length === 0
                    ? <p style={p.empty}>No attendance yet. Click "Take Attendance" to scan.</p>
                    : list.map((r, i) => (
                        <div key={i} style={p.row}>
                            <div style={p.avatar}>{r.username[0].toUpperCase()}</div>
                            <div style={p.info}>
                                <span style={p.name}>{r.username}</span>
                                <span style={p.meta}>
                                    {new Date(r.joinTime).toLocaleTimeString()}
                                    {r.duration != null ? ` · ${r.duration} min` : " · in meeting"}
                                </span>
                            </div>
                            <span style={{
                                ...p.badge,
                                background: r.markedBy === "face" ? "rgba(74,222,128,0.15)" : "rgba(250,204,21,0.15)",
                                color:      r.markedBy === "face" ? "#4ade80" : "#facc15",
                            }}>
                                {r.markedBy === "face" ? `${r.confidence}%` : "manual"}
                            </span>
                        </div>
                    ))
                }
            </div>

            {/* Manual mark input */}
            <form onSubmit={handleManual} style={p.manualRow}>
                <input
                    style={p.manualInput}
                    placeholder="Mark absent person manually…"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                />
                <button type="submit" style={p.manualBtn}>Add</button>
            </form>
        </div>
    );
}

const p = {
    panel:      { position: "absolute", top: 16, left: 16, width: 310, maxHeight: "65vh", background: "rgba(14,14,14,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, display: "flex", flexDirection: "column", zIndex: 30, overflow: "hidden", fontFamily: '"DM Sans","Segoe UI",sans-serif' },
    header:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 },
    title:      { color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" },
    csvBtn:     { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
    closeBtn:   { background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 15, padding: "2px 4px" },
    status:     { padding: "8px 16px", fontSize: 12, color: "#60a5fa", background: "rgba(96,165,250,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 },
    list:       { overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 },
    empty:      { color: "rgba(255,255,255,0.28)", fontSize: 12, textAlign: "center", padding: "24px 0", lineHeight: 1.7, margin: 0 },
    row:        { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 10 },
    avatar:     { width: 30, height: 30, borderRadius: "50%", background: "rgba(167,139,250,0.18)", color: "#c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 },
    info:       { flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
    name:       { color: "#fff", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    meta:       { color: "rgba(255,255,255,0.32)", fontSize: 11 },
    badge:      { padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 },
    manualRow:  { display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 },
    manualInput:{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#fff", outline: "none" },
    manualBtn:  { background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};
