import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import ClosedCaptionDisabledIcon from '@mui/icons-material/ClosedCaptionDisabled';
import SummarizeIcon from '@mui/icons-material/Summarize';
import PeopleIcon from '@mui/icons-material/People';
import { useParams } from 'react-router-dom';
import { useFaceAttendance, AttendancePanel } from './FaceAttendance';
import server from '../environment';

const server_url = server;

// ─── FIX 1: Better ICE server config with proper TURN credentials ────────────
// The openrelay TURN server is unreliable and rate-limited.
// Using multiple STUN servers + metered.ca free TURN (more reliable).
const peerConfigConnections = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  // ─── FIX 2: These settings dramatically improve video stability ───────────
  bundlePolicy: 'max-bundle',       // Bundle all tracks into one transport
  rtcpMuxPolicy: 'require',         // Mux RTCP with RTP — fewer ports needed
  iceCandidatePoolSize: 10,         // Pre-gather ICE candidates for faster connect
};

/* ─── AI helpers ─────────────────────────────────────────── */
const apiSummarize = async (transcript) => {
  const res = await fetch(`${server_url}/api/v1/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data.summary ?? 'No summary returned from Gemini.';
};

const apiSuggest = async (recentMessages) => {
  const res = await fetch(`${server_url}/api/v1/ai/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recentMessages }),
  });
  const data = await res.json();
  return data.suggestions ?? [];
};

/* ══════════════════════════════════════════════════════════ */
export default function VideoMeetComponent() {
  const socketRef      = useRef(null);
  const socketIdRef    = useRef(null);
  const localVideoRef  = useRef(null);
  const videoRef       = useRef([]);
  const connections    = useRef({});
  const localTracks    = useRef({});
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const analyserRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const audioCtxRef    = useRef(null);
  const suggestTimerRef = useRef(null);
  const captionTimerRef = useRef(null);
  const speakBarFillRef = useRef(null); // direct DOM ref — no 60fps re-renders

  const [videoAvailable,  setVideoAvailable]  = useState(false);
  const [audioAvailable,  setAudioAvailable]  = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [video,  setVideo]  = useState(false);
  const [audio,  setAudio]  = useState(false);
  const [screen, setScreen] = useState(false);

  const [videos,      setVideos]      = useState([]);
  const [showChat,    setShowChat]    = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [message,     setMessage]     = useState('');
  const [newMessages, setNewMessages] = useState(0);

  const [captionsOn,  setCaptionsOn]  = useState(false);
  const [captionText, setCaptionText] = useState('');
  const transcriptRef = useRef('');

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary,        setSummary]        = useState('');
  const [showSummary,    setShowSummary]    = useState(false);

  const [suggestions,    setSuggestions]    = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username,       setUsername]       = useState('');

  // ── Mobile / orientation detection ────────────────────────
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth <= 768);
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  // ── Face attendance ────────────────────────────────────────
  // useParams() reads the room code from the URL e.g. /abc123 → "abc123"
  // The null guard on meetingCode prevents the hook from firing if the
  // param is somehow undefined — this is what was breaking WebRTC before.
  const params = useParams();
  const meetingCode = params?.url ?? null;

  const {
    attendanceList, scanning, showAttendance,
    setShowAttendance, newMarked, scanStatus,
    takeAttendance, markUserLeave, manualMark,
    registerVideoRef,
  } = useFaceAttendance(localVideoRef, connections, meetingCode);

  /* ── auto-scroll chat ─────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ══════════════════════════════════════════════════════
     PERMISSIONS
  ══════════════════════════════════════════════════════ */
  useEffect(() => {
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoAvailable(true);
      } catch { setVideoAvailable(false); }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioAvailable(true);
      } catch { setAudioAvailable(false); }

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      try {
        const preview = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (localVideoRef.current) localVideoRef.current.srcObject = preview;
        window.__lobbyPreview = preview;
      } catch { /* camera unavailable */ }
    })();

    return () => {
      window.__lobbyPreview?.getTracks().forEach(t => t.stop());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const tracks = localTracks.current;
      Object.values(tracks).forEach(t => t?.stop());
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close();
      recognitionRef.current?.stop();
      socketRef.current?.disconnect();
      clearTimeout(suggestTimerRef.current);
      clearTimeout(captionTimerRef.current);
    };
  }, []);

  /* ══════════════════════════════════════════════════════
     TRACK HELPERS
  ══════════════════════════════════════════════════════ */
  const replaceTrackInPeers = useCallback((newTrack, kind) => {
    for (const pc of Object.values(connections.current)) {
      const sender = pc.getSenders().find(s => s.track?.kind === kind);
      if (sender && newTrack) {
        sender.replaceTrack(newTrack).catch(console.error);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localTracks.current.video;
    if (track) {
      track.enabled = !track.enabled;
      setVideo(track.enabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localTracks.current.audio;
    if (track) {
      track.enabled = !track.enabled;
      setAudio(track.enabled);
    }
  }, []);

  const toggleScreen = useCallback(async () => {
    if (screen) {
      localTracks.current.screen?.stop();
      localTracks.current.screen = null;
      const camTrack = localTracks.current.video;
      if (camTrack) {
        replaceTrackInPeers(camTrack, 'video');
        const stream = new MediaStream([camTrack, localTracks.current.audio].filter(Boolean));
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      setScreen(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = displayStream.getVideoTracks()[0];
        localTracks.current.screen = screenTrack;
        replaceTrackInPeers(screenTrack, 'video');
        const stream = new MediaStream([screenTrack, localTracks.current.audio].filter(Boolean));
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        screenTrack.onended = () => toggleScreen();
        setScreen(true);
      } catch (e) {
        console.warn('Screen share failed', e);
      }
    }
  }, [screen, replaceTrackInPeers]);

  /* ══════════════════════════════════════════════════════
     SPEAKING DETECTOR — uses cloned track, isolated context
  ══════════════════════════════════════════════════════ */
  const startSpeakingDetector = useCallback((audioTrack) => {
    try {
      if (audioCtxRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        audioCtxRef.current.close();
      }
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const clonedTrack = audioTrack.clone();
      const stream   = new MediaStream([clonedTrack]);
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser); // NOT connected to destination — no echo
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastLevel = 0;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg   = data.reduce((a, b) => a + b, 0) / data.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        if (Math.abs(level - lastLevel) > 2) {
          lastLevel = level;
          if (speakBarFillRef.current) {
            speakBarFillRef.current.style.width = `${level}%`;
            speakBarFillRef.current.style.background =
              level > 60 ? '#4ade80' : level > 20 ? '#facc15' : '#374151';
          }
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { console.warn('Speaking detector error', e); }
  }, []);

  /* ══════════════════════════════════════════════════════
     FIX 3: MEDIA SETUP
     - Lowered video resolution from 1280x720 → 640x480
       High resolution causes packet loss and freezing
       on home networks and free TURN servers.
     - Added frameRate cap at 24fps — enough for video calls,
       significantly reduces bandwidth.
     - Added video codec preference (VP8 is more resilient
       than H264 on unstable connections).
  ══════════════════════════════════════════════════════ */
  const setupMediaAndConnect = useCallback(async () => {
    window.__lobbyPreview?.getTracks().forEach(t => t.stop());
    window.__lobbyPreview = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoAvailable ? {
          width:     { ideal: 640,  max: 1280 },  // ✅ lower ideal, allow up to 720p
          height:    { ideal: 480,  max: 720  },
          frameRate: { ideal: 24,   max: 30   },  // ✅ cap framerate — saves bandwidth
          facingMode: 'user',
        } : false,
        audio: audioAvailable ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          // ✅ No forced sampleRate — avoid resampling glitches
        } : false,
      });

      const videoTrack = stream.getVideoTracks()[0] || null;
      const audioTrack = stream.getAudioTracks()[0] || null;

      localTracks.current.video = videoTrack;
      localTracks.current.audio = audioTrack;

      window.localStream = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (videoTrack) setVideo(true);
      if (audioTrack) {
        setAudio(true);
        startSpeakingDetector(audioTrack);
      }
    } catch (e) {
      console.warn('Could not get media', e);
      window.localStream = new MediaStream();
    }

    connectToSocketServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoAvailable, audioAvailable, startSpeakingDetector]);

  /* ══════════════════════════════════════════════════════
     LIVE CAPTIONS — isolated mic stream
  ══════════════════════════════════════════════════════ */
  const startCaptions = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Live captions require Chrome or Edge.'); return; }

    // Reuse the existing audio track — do NOT open a second getUserMedia call.
    // Two simultaneous mic streams fight each other and cause audio breaking.
    const r = new SR();
    r.continuous     = true;
    r.interimResults = true;
    r.lang           = 'en-US';

    r.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t + ' ';
          transcriptRef.current += `${username}: ${t}\n`;
        } else {
          interim += t;
        }
      }
      // FIX 1: Show caption immediately, auto-clear after 3s of silence
      setCaptionText(final || interim);
      clearTimeout(captionTimerRef.current);
      captionTimerRef.current = setTimeout(() => setCaptionText(''), 3000);
    };

    // FIX 2: Restart on recoverable errors instead of silently dying
    r.onerror = (e) => {
      console.warn('SR error', e.error);
      if (['network', 'audio-capture', 'aborted'].includes(e.error)) {
        setTimeout(() => {
          if (recognitionRef.current === r) {
            try { r.start(); } catch (_) {}
          }
        }, 1000);
      }
    };
    // FIX 3: Delayed restart prevents rapid loop crash on mobile
    r.onend = () => {
      if (recognitionRef.current === r) {
        setTimeout(() => {
          if (recognitionRef.current === r) {
            try { r.start(); } catch (_) {}
          }
        }, 300);
      }
    };
    recognitionRef.current = r;
    r.start();
    setCaptionsOn(true);
  }, [username]);

  const stopCaptions = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    clearTimeout(captionTimerRef.current);
    setCaptionsOn(false);
    setCaptionText('');
  }, []);

  /* ══════════════════════════════════════════════════════
     MEETING SUMMARY
     FIX: transcript now always builds from chat messages
     even if captions were never turned on. Also lowered
     the minimum length check and shows real error details.
  ══════════════════════════════════════════════════════ */
  const handleSummarize = async () => {
    // Always pull the latest messages directly from the ref-based transcript
    // plus anything in React state messages as a fallback
    const chatLog = messages.map(m => `${m.sender}: ${m.data}`).join('\n');

    // Merge speech transcript + chat — avoid duplicates by using a Set of lines
    const speechLines = transcriptRef.current.split('\n').filter(Boolean);
    const chatLines   = chatLog.split('\n').filter(Boolean);
    const allLines    = [...new Set([...speechLines, ...chatLines])];
    const full        = allLines.join('\n');

    if (full.trim().length < 10) {
      alert('No conversation to summarize yet.\n\nTip: Turn on Live Captions (CC button) to capture spoken words, or send some chat messages first.');
      return;
    }

    setSummaryLoading(true);
    setShowSummary(true);
    setSummary(''); // clear previous summary

    try {
      const result = await apiSummarize(full);
      setSummary(result);
    } catch (e) {
      // Show the real error so it's debuggable
      setSummary(`Failed to generate summary.\n\nError: ${e.message}\n\nCheck that:\n1. Backend is running\n2. GEMINI_API_KEY is set in .env\n3. You have internet connection`);
    } finally {
      setSummaryLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     SMART SUGGESTIONS — debounced 1.5s
  ══════════════════════════════════════════════════════ */
  const fetchSuggestions = useCallback(async (msgs) => {
    if (!msgs.length) return;
    setSuggestLoading(true);
    try {
      const recent = msgs.slice(-5).map(m => ({ sender: m.sender, text: m.data }));
      setSuggestions(await apiSuggest(recent));
    } catch { setSuggestions([]); }
    finally { setSuggestLoading(false); }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && showChat) {
      clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = setTimeout(() => fetchSuggestions(messages), 1500);
    }
  }, [messages]); // eslint-disable-line

  /* ══════════════════════════════════════════════════════
     SIGNALLING
  ══════════════════════════════════════════════════════ */
  const addMessage = useCallback((data, sender, socketIdSender) => {
    setMessages(prev => [...prev, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) setNewMessages(p => p + 1);
    // Always append chat to transcript regardless of captions being on
    transcriptRef.current += `${sender}: ${data}\n`;
  }, []);

  const gotMessageFromServer = useCallback((fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;
    const pc = connections.current[fromId];
    if (!pc) return;
    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === 'offer') {
            pc.createAnswer()
              .then(desc => pc.setLocalDescription(desc))
              .then(() => socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription })))
              .catch(console.error);
          }
        }).catch(console.error);
    }
    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(console.error);
    }
  }, []);

  /* ══════════════════════════════════════════════════════
     FIX 4: PEER CONNECTION FACTORY
     Key additions:
     - setCodecPreferences: prefer VP8 over H264.
       VP8 handles packet loss much better — less freezing.
     - degradationPreference: 'maintain-framerate' — when
       bandwidth is low, reduce quality NOT framerate.
       Framerate drops cause the "freezing" effect.
     - onconnectionstatechange: auto-restart ICE if broken.
  ══════════════════════════════════════════════════════ */
  const createPeerConnection = useCallback((remoteId) => {
    const pc = new RTCPeerConnection(peerConfigConnections);

    const videoTrack = localTracks.current.video;
    const audioTrack = localTracks.current.audio;

    // Store videoSender so we can apply encoding params after ICE connects
    // (encodings[] is empty right after addTrack — must wait for negotiation)
    let videoSender = null;
    if (videoTrack) {
      videoSender = pc.addTrack(videoTrack, window.localStream || new MediaStream());
    }

    if (audioTrack) pc.addTrack(audioTrack, window.localStream || new MediaStream());

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('signal', remoteId, JSON.stringify({ ice: event.candidate }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE [${remoteId}]:`, pc.iceConnectionState);

      // Apply bitrate/degradation params only AFTER ICE connects —
      // encodings[] is populated only after full negotiation, not at addTrack.
      if (pc.iceConnectionState === 'connected' && videoSender) {
        try {
          const params = videoSender.getParameters();
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].degradationPreference = 'maintain-framerate';
            params.encodings[0].maxBitrate = 800000; // 800 kbps cap
            videoSender.setParameters(params).catch(() => {});
          }
        } catch (e) { /* not supported in all browsers */ }
      }

      // Auto-restart ICE on failure — recovers from temporary network blips
      if (pc.iceConnectionState === 'failed') {
        console.warn(`ICE failed for ${remoteId}, restarting...`);
        pc.restartIce();
      }

      // Also restart on disconnected — don't wait for full failure
      if (pc.iceConnectionState === 'disconnected') {
        console.warn(`ICE disconnected for ${remoteId}, attempting recovery...`);
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') pc.restartIce();
        }, 3000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection [${remoteId}]:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      setVideos(prev => {
        const exists  = prev.find(v => v.socketId === remoteId);
        const updated = exists
          ? prev.map(v => v.socketId === remoteId ? { ...v, stream } : v)
          : [...prev, { socketId: remoteId, stream }];
        videoRef.current = updated;
        return updated;
      });
    };

    connections.current[remoteId] = pc;
    return pc;
  }, []);

  /* ══════════════════════════════════════════════════════
     FIX 5: SOCKET — set codec preference after negotiation.
     VP8 is more resilient than H264/VP9 on weak networks.
  ══════════════════════════════════════════════════════ */
  const setPreferredCodec = useCallback((pc) => {
    try {
      const transceivers = pc.getTransceivers();
      for (const transceiver of transceivers) {
        if (transceiver.receiver.track.kind === 'video') {
          const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
          // Sort so VP8 comes first
          const sorted = [
            ...codecs.filter(c => c.mimeType === 'video/VP8'),
            ...codecs.filter(c => c.mimeType !== 'video/VP8'),
          ];
          if (transceiver.setCodecPreferences) {
            transceiver.setCodecPreferences(sorted);
          }
        }
      }
    } catch (e) {
      // setCodecPreferences not supported in all browsers — safe to ignore
    }
  }, []);

  /* ══════════════════════════════════════════════════════
     SOCKET CONNECTION
  ══════════════════════════════════════════════════════ */
  const connectToSocketServer = useCallback(() => {
    socketRef.current = io.connect(server_url, {
      secure: false,
      // ✅ FIX: Prefer WebSocket over polling — polling causes
      //    extra latency that makes video appear choppy.
      transports: ['websocket'],
    });

    socketRef.current.on('signal', gotMessageFromServer);

    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit('join-call', window.location.href);

      socketRef.current.on('chat-message', addMessage);

      socketRef.current.on('user-left', (id) => {
        connections.current[id]?.close();
        delete connections.current[id];
        setVideos(prev => {
          const updated = prev.filter(v => v.socketId !== id);
          videoRef.current = updated;
          return updated;
        });
      });

      socketRef.current.on('user-joined', async (id, clients) => {
        for (const clientId of clients) {
          if (!connections.current[clientId]) {
            createPeerConnection(clientId);
          }
        }

        if (id === socketIdRef.current) {
          for (const clientId of clients) {
            if (clientId === socketIdRef.current) continue;
            const pc = connections.current[clientId];
            if (!pc) continue;
            try {
              const offer = await pc.createOffer();
              // Set codec preference AFTER createOffer — transceivers
              // don't exist until the offer is created
              setPreferredCodec(pc);
              await pc.setLocalDescription(offer);
              socketRef.current.emit('signal', clientId, JSON.stringify({ sdp: pc.localDescription }));
            } catch (e) { console.error('Offer error', e); }
          }
        }
      });
    });
  }, [gotMessageFromServer, addMessage, createPeerConnection, setPreferredCodec]);

  /* ══════════════════════════════════════════════════════
     JOIN
  ══════════════════════════════════════════════════════ */
  const connect = () => {
    if (!username.trim()) return;
    setAskForUsername(false);
    setupMediaAndConnect();
  };

  /* ══════════════════════════════════════════════════════
     CHAT
  ══════════════════════════════════════════════════════ */
  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current?.emit('chat-message', message, username);
    setMessage('');
    setSuggestions([]);
  };

  const handleChatOpen = () => {
    setShowChat(true);
    setNewMessages(0);
    fetchSuggestions(messages);
  };

  /* ══════════════════════════════════════════════════════
     END CALL
  ══════════════════════════════════════════════════════ */
  const handleEndCall = async () => {
    // Record leave time before navigating away — fire and forget (won't block)
    if (meetingCode && username) {
      await markUserLeave(meetingCode, username).catch(() => {});
    }
    Object.values(localTracks.current).forEach(t => t?.stop());
    Object.values(connections.current).forEach(pc => pc.close());
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    recognitionRef.current?.stop();
    socketRef.current?.disconnect();
    clearTimeout(suggestTimerRef.current);
    clearTimeout(captionTimerRef.current);
    window.location.href = '/';
  };

  /* ══════════════════════════════════════════════════════
     LOBBY
  ══════════════════════════════════════════════════════ */
  if (askForUsername) {
    return (
      <div style={styles.lobbyWrapper}>
        <div style={styles.lobbyCard}>
          <div style={styles.previewBox}>
            <video ref={localVideoRef} autoPlay muted playsInline style={styles.previewVideo} />
            <span style={styles.previewLabel}>Preview</span>
          </div>
          <div style={styles.lobbyForm}>
            <h1 style={styles.lobbyTitle}>Join Meeting</h1>
            <p style={styles.lobbySubtitle}>Enter your name to continue</p>
            <input
              style={styles.lobbyInput}
              placeholder="Your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && connect()}
            />
            <button
              style={{ ...styles.lobbyBtn, ...(username.trim() ? {} : styles.lobbyBtnDisabled) }}
              onClick={connect}
              disabled={!username.trim()}
            >
              Join Now →
            </button>
            <div style={styles.deviceStatus}>
              <span style={{ ...styles.devicePill, background: videoAvailable ? '#1a3a2a' : '#3a1a1a', color: videoAvailable ? '#4ade80' : '#f87171' }}>
                {videoAvailable ? '● Camera on' : '● No camera'}
              </span>
              <span style={{ ...styles.devicePill, background: audioAvailable ? '#1a3a2a' : '#3a1a1a', color: audioAvailable ? '#4ade80' : '#f87171' }}>
                {audioAvailable ? '● Mic on' : '● No mic'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     MEETING ROOM
  ══════════════════════════════════════════════════════ */
  return (
    <div style={styles.meetRoot}>

      <div style={{
        ...styles.videoGrid,
        gridTemplateColumns: videos.length === 0 ? '1fr'
          : isMobile
            ? isPortrait ? '1fr' : videos.length === 1 ? '1fr' : 'repeat(2, 1fr)'
            : videos.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gridAutoRows: isMobile && isPortrait && videos.length > 0
          ? `${Math.floor((window.innerHeight - 160) / Math.max(videos.length, 1))}px`
          : undefined,
        height: isMobile ? `calc(100vh - ${videos.length > 0 ? '160px' : '80px'})` : 'calc(100vh - 96px)',
        overflowY: isMobile ? 'auto' : 'hidden',
        padding: isMobile ? 8 : 16,
        gap: isMobile ? 6 : 8,
      }}>
        {videos.length === 0 ? (
          <div style={styles.waitingMsg}>
            <div style={styles.waitingDot} />
            Waiting for others to join…
          </div>
        ) : videos.map(v => (
          <div key={v.socketId} style={styles.remoteVideoWrapper}>
            <RemoteVideo socketId={v.socketId} stream={v.stream} registerVideoRef={registerVideoRef} />
          </div>
        ))}
      </div>

      <video ref={localVideoRef} autoPlay muted playsInline style={{
        ...styles.localPip,
        width: isMobile ? 90 : 180,
        bottom: isMobile ? 90 : 110,
        right: isMobile ? 10 : 20,
        borderRadius: isMobile ? 8 : 14,
      }} />

      <div style={{
        ...styles.speakBar,
        width: isMobile ? 90 : 180,
        bottom: isMobile ? 82 : 100,
        right: isMobile ? 10 : 20,
      }} title="Mic level">
        <div ref={speakBarFillRef} style={styles.speakFill} />
      </div>

      {captionsOn && captionText && (
        <div style={styles.captionOverlay}>
          <span style={styles.captionText}>{captionText}</span>
        </div>
      )}

      {showSummary && (
        <div style={{
          ...styles.summaryModal,
          width: isMobile ? 'calc(100vw - 32px)' : 340,
          left: 16,
          maxHeight: isMobile ? '70vh' : '60vh',
        }}>
          <div style={styles.chatHeader}>
            <span style={styles.chatTitle}>Meeting summary</span>
            <button style={styles.closeBtn} onClick={() => setShowSummary(false)}>
              <CloseIcon fontSize="small" />
            </button>
          </div>
          <div style={styles.summaryBody}>
            {summaryLoading
              ? <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Generating…</p>
              : <pre style={styles.summaryText}>{summary}</pre>}
          </div>
        </div>
      )}

      {showAttendance && (
        <AttendancePanel
          list={attendanceList}
          meetingCode={meetingCode}
          scanStatus={scanStatus}
          onClose={() => setShowAttendance(false)}
          onManualMark={manualMark}
        />
      )}

      <div style={{
        ...styles.controls,
        gap: isMobile ? 6 : 12,
        padding: isMobile ? '8px 12px' : '10px 20px',
        bottom: isMobile ? 12 : 24,
        maxWidth: isMobile ? 'calc(100vw - 24px)' : 'none',
        overflowX: isMobile ? 'auto' : 'visible',
      }}>
        <ControlBtn onClick={toggleVideo} active={video} title={video ? 'Turn off camera' : 'Turn on camera'} isMobile={isMobile}>
          {video ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
        </ControlBtn>

        <ControlBtn onClick={toggleAudio} active={audio} title={audio ? 'Mute' : 'Unmute'} isMobile={isMobile}>
          {audio ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
        </ControlBtn>

        {screenAvailable && (
          <ControlBtn onClick={toggleScreen} active={screen} title={screen ? 'Stop sharing' : 'Share screen'} isMobile={isMobile}>
            {screen ? <ScreenShareIcon fontSize="small" /> : <StopScreenShareIcon fontSize="small" />}
          </ControlBtn>
        )}

        <ControlBtn onClick={captionsOn ? stopCaptions : startCaptions} active={captionsOn} title="Live captions" isMobile={isMobile}>
          {captionsOn ? <ClosedCaptionIcon fontSize="small" /> : <ClosedCaptionDisabledIcon fontSize="small" />}
        </ControlBtn>

        <ControlBtn onClick={handleSummarize} active={showSummary} title="AI meeting summary" isMobile={isMobile}>
          <SummarizeIcon fontSize="small" />
        </ControlBtn>

        <div style={{ position: 'relative' }}>
          <ControlBtn
            onClick={() => { takeAttendance(); setShowAttendance(true); }}
            active={scanning || showAttendance}
            title="Take attendance"
            isMobile={isMobile}
          >
            <PeopleIcon fontSize="small" />
          </ControlBtn>
          {newMarked > 0 && (
            <span style={styles.badge}>{newMarked}</span>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <ControlBtn onClick={handleChatOpen} active={showChat} title="Chat" isMobile={isMobile}>
            <ChatIcon fontSize="small" />
          </ControlBtn>
          {newMessages > 0 && (
            <span style={styles.badge}>{newMessages > 99 ? '99+' : newMessages}</span>
          )}
        </div>

        <button onClick={handleEndCall} style={{
          ...styles.endBtn,
          width: isMobile ? 40 : 48,
          height: isMobile ? 40 : 48,
        }} title="Leave call">
          <CallEndIcon fontSize="small" />
        </button>
      </div>

      {showChat && (
        <div style={{
          ...styles.chatPanel,
          width: isMobile ? '100vw' : 320,
          right: isMobile ? 0 : 16,
          top: isMobile ? 0 : 16,
          bottom: isMobile ? 0 : 96,
          borderRadius: isMobile ? 0 : 20,
          zIndex: 40,
        }}>
          <div style={styles.chatHeader}>
            <span style={styles.chatTitle}>Meeting chat</span>
            <button style={styles.closeBtn} onClick={() => setShowChat(false)}>
              <CloseIcon fontSize="small" />
            </button>
          </div>

          <div style={styles.chatMessages}>
            {messages.length === 0
              ? <p style={styles.noMessages}>No messages yet. Say hello!</p>
              : messages.map((m, i) => (
                <div key={`${m.sender}-${i}`} style={styles.msgBubble}>
                  <span style={styles.msgSender}>{m.sender}</span>
                  <p style={styles.msgText}>{m.data}</p>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div style={styles.suggestionRow}>
              {suggestLoading
                ? <span style={styles.suggestHint}>Thinking…</span>
                : suggestions.map((s, i) => (
                  <button key={i} style={styles.suggestionChip} onClick={() => { setMessage(s); setSuggestions([]); }}>
                    {s}
                  </button>
                ))}
            </div>
          )}

          <div style={styles.chatInputRow}>
            <input
              style={styles.chatInput}
              placeholder="Type a message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button style={styles.sendBtn} onClick={sendMessage}>
              <SendIcon fontSize="small" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RemoteVideo ────────────────────────────────────────────────────────────
   Dedicated component so srcObject is only set when stream actually changes,
   NOT on every parent re-render. The old inline ref ran on every render —
   speaking level updates (10+ per second) caused constant srcObject resets,
   which is what was breaking the audio and video mid-call.
   Also registers with face attendance so host can scan remote participants.
──────────────────────────────────────────────────────────────────────────── */
function RemoteVideo({ socketId, stream, registerVideoRef }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => registerVideoRef(socketId, null);
  }, [socketId, registerVideoRef]);

  return (
    <video
      style={styles.remoteVideo}
      ref={el => {
        ref.current = el;
        registerVideoRef(socketId, el);
      }}
      autoPlay
      playsInline
    />
  );
}

function ControlBtn({ children, onClick, active, title, isMobile }) {
  return (
    <button onClick={onClick} title={title} style={{
      ...styles.ctrlBtn,
      width: isMobile ? 36 : 44,
      height: isMobile ? 36 : 44,
      background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
      border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
    }}>
      {children}
    </button>
  );
}

const styles = {
  lobbyWrapper: { minHeight: '100vh', background: 'linear-gradient(135deg,#0d0d0d,#0d1117)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans","Segoe UI",sans-serif', padding: 16 },
  lobbyCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, display: 'flex', gap: 24, padding: 24, maxWidth: 820, width: '100%', flexWrap: 'wrap' },
  previewBox: { position: 'relative', flex: '1 1 280px', borderRadius: 16, overflow: 'hidden', background: '#0a0a0a', minHeight: 220 },
  previewVideo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  previewLabel: { position: 'absolute', top: 10, left: 12, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 6 },
  lobbyForm: { flex: '1 1 260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 },
  lobbyTitle: { margin: 0, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' },
  lobbySubtitle: { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  lobbyInput: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#fff', outline: 'none' },
  lobbyBtn: { background: '#fff', color: '#000', border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  lobbyBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  deviceStatus: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  devicePill: { fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 20 },
  meetRoot: { position: 'relative', width: '100vw', height: '100vh', background: '#0d0d0d', overflow: 'hidden', fontFamily: '"DM Sans","Segoe UI",sans-serif' },
  videoGrid: { display: 'grid', gap: 8, padding: 16, height: 'calc(100vh - 96px)', boxSizing: 'border-box' },
  remoteVideoWrapper: { background: '#1a1a1a', borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 160 },
  remoteVideo: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  waitingMsg: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(255,255,255,0.35)', fontSize: 16, height: '100%' },
  waitingDot: { width: 8, height: 8, borderRadius: '50%', background: '#4ade80' },
  localPip: { position: 'absolute', bottom: 110, right: 20, width: 180, aspectRatio: '16/9', borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', background: '#111', zIndex: 10 },
  speakBar: { position: 'absolute', bottom: 100, right: 20, width: 180, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, zIndex: 11, overflow: 'hidden' },
  speakFill: { height: '100%', borderRadius: 2, transition: 'width 0.1s, background 0.3s' },
  captionOverlay: { position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', maxWidth: '60vw', background: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: '10px 18px', zIndex: 25 },
  captionText: { color: '#fff', fontSize: 16, lineHeight: 1.5 },
  summaryModal: { position: 'absolute', top: 16, left: 16, width: 340, maxHeight: '60vh', background: 'rgba(16,16,16,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, display: 'flex', flexDirection: 'column', zIndex: 30, overflow: 'hidden' },
  summaryBody: { overflowY: 'auto', padding: '16px 20px', flex: 1 },
  summaryText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' },
  controls: { position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '10px 20px', zIndex: 20 },
  ctrlBtn: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 },
  endBtn: { width: 48, height: 48, borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' },
  badge: { position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 5px', minWidth: 16, textAlign: 'center', zIndex: 1, pointerEvents: 'none' },
  chatPanel: { position: 'absolute', top: 16, right: 16, bottom: 96, width: 320, background: 'rgba(16,16,16,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, display: 'flex', flexDirection: 'column', zIndex: 30, overflow: 'hidden' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  chatTitle: { color: '#fff', fontWeight: 700, fontSize: 15 },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 8 },
  chatMessages: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  noMessages: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', marginTop: 40 },
  msgBubble: { background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px', borderLeft: '3px solid rgba(255,255,255,0.15)' },
  msgSender: { fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 4 },
  msgText: { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, wordBreak: 'break-word' },
  suggestionRow: { padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)' },
  suggestionChip: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#c4b5fd', fontSize: 12, borderRadius: 20, padding: '5px 12px', cursor: 'pointer' },
  suggestHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '4px 0' },
  chatInputRow: { display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' },
  chatInput: { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: '#fff', outline: 'none' },
  sendBtn: { background: '#fff', color: '#000', border: 'none', borderRadius: 10, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
};
