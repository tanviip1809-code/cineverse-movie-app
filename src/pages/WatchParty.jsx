// src/pages/WatchParty.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, addDoc, onSnapshot, orderBy, query,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ─── constants ────────────────────────────────────────────────────────────────
// (none)

// ─── helpers ──────────────────────────────────────────────────────────────────
function Avatar({ name = "?", photo, size = 32 }) {
    const [err, setErr] = useState(false);
    const initial = name.trim()[0]?.toUpperCase() ?? "?";
    return (
        <div
            title={name}
            style={{ width: size, height: size }}
            className="rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white/10"
        >
            {photo && !err
                ? <img src={photo} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
                : <span className="text-white font-bold" style={{ fontSize: size * 0.42 }}>{initial}</span>
            }
        </div>
    );
}

function Spinner() {
    return (
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WatchParty() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, userProfile, loading: authLoading } = useAuth();

    // ── User identity ──────────────────────────────────────────────────────────
    const uid = user?.uid ?? null;
    const displayName = userProfile?.username || user?.displayName || user?.email?.split("@")[0] || "Guest";
    const photoURL = userProfile?.photoURL || user?.photoURL || "";

    // ── Room state ─────────────────────────────────────────────────────────────
    const [room, setRoom] = useState(null);        // { trailerKey, movieTitle, hostUid, isPlaying, currentTime }
    const [members, setMembers] = useState([]);    // [{ uid, displayName, photoURL }]
    const [messages, setMessages] = useState([]);  // [{ uid, displayName, text, timestamp }]
    const [chatInput, setChatInput] = useState("");
    const [pageLoading, setPageLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // ── YouTube iframe sync key ───────────────────────────────────────────────────
    // Changes when host clicks Sync All — forces iframe reload at new start time
    const localTimeRef = useRef(0);   // host-side elapsed seconds estimate
    const chatEndRef = useRef(null);

    const isHost = room?.hostUid === uid;

    // ─────────────────────────────────────────────────────────────────────────
    // JOIN ROOM on mount
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;   // wait for auth — critical in production
        let left = false;

        async function joinRoom() {
            try {
                // Force-refresh the Firebase ID token before any Firestore write.
                // In production the cached token can be expired → permission denied.
                await user.getIdToken(true);

                console.log("[WatchParty] joinRoom — uid:", user.uid, "roomId:", roomId);

                const roomRef = doc(db, "rooms", roomId);
                const snap = await getDoc(roomRef);
                if (!snap.exists()) {
                    toast.error("Room not found.");
                    navigate("/");
                    return;
                }

                // Write member presence — document ID MUST equal user.uid
                // so Firestore rule (uid == request.auth.uid) passes.
                const memberRef = doc(db, "rooms", roomId, "members", user.uid);
                await setDoc(memberRef, {
                    uid: user.uid, displayName, photoURL,
                    joinedAt: serverTimestamp(),
                }, { merge: true });

                console.log("[WatchParty] member written successfully");
                setPageLoading(false);
            } catch (err) {
                console.error("joinRoom error:", err);
                toast.error(err?.message ?? "Failed to join room.");
                setPageLoading(false);
            }
        }

        joinRoom();

        // LEAVE on unmount / tab close — use user.uid to match the doc path written above
        const handleLeave = () => {
            if (left) return;
            left = true;
            if (!user?.uid) return;
            const memberRef = doc(db, "rooms", roomId, "members", user.uid);
            deleteDoc(memberRef);
        };

        window.addEventListener("beforeunload", handleLeave);
        return () => {
            window.removeEventListener("beforeunload", handleLeave);
            handleLeave();
        };
    }, [uid, roomId]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to room doc (playback state) — wait for auth first
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;  // don't subscribe until auth is confirmed
        const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
            if (!snap.exists()) return;
            setRoom(snap.data());
        });
        return unsub;
    }, [uid, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to members — wait for auth first
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;  // don't subscribe until auth is confirmed
        const unsub = onSnapshot(collection(db, "rooms", roomId, "members"), (snap) => {
            const list = snap.docs.map(d => d.data());
            setMembers(list);
        });
        return unsub;
    }, [uid, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to chat messages — wait for auth first
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;  // don't subscribe until auth is confirmed
        const q = query(
            collection(db, "rooms", roomId, "messages"),
            orderBy("timestamp", "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [uid, roomId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ─────────────────────────────────────────────────────────────────────────
    // HOST PROMOTION: if host leaves, promote next member
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!room || members.length === 0) return;
        const hostStillPresent = members.some(m => m.uid === room.hostUid);
        if (!hostStillPresent && members.length > 0) {
            const newHost = members[0];
            updateDoc(doc(db, "rooms", roomId), { hostUid: newHost.uid });
            toast(`👑 ${newHost.displayName} is now the host`, { icon: "🎬" });
        }
    }, [members, room, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // LOCAL TIMER — host tracks elapsed playback time so Sync All knows
    // the current position without needing the YT IFrame API.
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isHost || !room) return;
        if (room.isPlaying) {
            // Seed the local timer from Firestore state + lag compensation
            const lag = room.syncedAt ? (Date.now() - room.syncedAt) / 1000 : 0;
            localTimeRef.current = (room.currentTime ?? 0) + lag;
            const interval = setInterval(() => { localTimeRef.current += 0.5; }, 500);
            return () => clearInterval(interval);
        } else {
            localTimeRef.current = room.currentTime ?? 0;
        }
    }, [room?.isPlaying, room?.syncedAt]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // HOST CONTROLS — drive playback via Firestore (iframe reloads on sync)
    // ─────────────────────────────────────────────────────────────────────────
    const hostPlay = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: true,
            currentTime: localTimeRef.current,
            syncedAt: Date.now(),
        });
    }, [isHost, roomId]);

    const hostPause = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: false,
            currentTime: localTimeRef.current,
            syncedAt: Date.now(),
        });
    }, [isHost, roomId]);

    // Sync All: force-updates syncedAt → iframe key changes → all clients reload
    const hostSync = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: true,
            currentTime: localTimeRef.current,
            syncedAt: Date.now(),  // changing this key reloads all iframes
        });
        toast.success("Synced all viewers — iframes reloading at same position");
    }, [isHost, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // SEND CHAT MESSAGE
    // ─────────────────────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || !uid) return;
        setChatInput("");
        await addDoc(collection(db, "rooms", roomId, "messages"), {
            uid,
            displayName,
            photoURL,
            text,
            timestamp: serverTimestamp(),
        });
    }, [chatInput, uid, displayName, photoURL, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // COPY LINK
    // ─────────────────────────────────────────────────────────────────────────
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Room link copied!");
        setTimeout(() => setCopied(false), 2500);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LOADING — show spinner while auth resolves OR room data loads
    // ─────────────────────────────────────────────────────────────────────────
    if (authLoading || pageLoading || !room) {
        return (
            <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
                <Spinner />
                <p className="text-gray-400 text-sm">
                    {authLoading ? "Authenticating…" : "Joining watch party…"}
                </p>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#080810] text-white flex flex-col pt-16">

            {/* ── Top bar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/[0.06] backdrop-blur">
                <div className="flex items-center gap-3">
                    {/* Live badge */}
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                    </span>
                    <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-none">
                        {room.movieTitle || "Watch Party"}
                    </h1>
                    <span className="text-gray-600 text-xs hidden sm:inline">
                        Room: <span className="text-gray-400 font-mono">{roomId.slice(0, 8)}…</span>
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Member avatars */}
                    <div className="hidden sm:flex items-center -space-x-2">
                        {members.slice(0, 5).map(m => (
                            <Avatar key={m.uid} name={m.displayName} photo={m.photoURL} size={28} />
                        ))}
                        {members.length > 5 && (
                            <span className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#080810] flex items-center justify-center text-[10px] text-gray-400 font-bold">
                                +{members.length - 5}
                            </span>
                        )}
                    </div>

                    <button
                        onClick={copyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30 transition"
                    >
                        {copied ? "✓ Copied!" : "🔗 Invite"}
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:text-white transition"
                    >
                        ← Leave
                    </button>
                </div>
            </div>

            {/* ── Main layout ──────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

                {/* ── LEFT: Video + controls ─────────────────────────────── */}
                <div className="flex-1 flex flex-col bg-black min-h-[40vh] lg:min-h-0">

                    {/* YouTube embed — plain iframe; key changes on sync to force reload */}
                    <div className="relative flex-1 bg-black">
                        {room.trailerKey ? (
                            <iframe
                                key={room.syncedAt}   // reloads on Sync All
                                src={`https://www.youtube.com/embed/${room.trailerKey}?autoplay=${room.isPlaying ? 1 : 0}&start=${Math.floor(room.currentTime || 0)}&rel=0&modestbranding=1&enablejsapi=0`}
                                title="Watch Party Player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full min-h-[40vh] border-0"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                                <span className="text-5xl">🎬</span>
                                <p>No trailer available for this movie.</p>
                            </div>
                        )}

                        {/* Guest overlay */}
                        {!isHost && (
                            <div className="absolute top-3 left-3 text-[11px] text-gray-400 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full">
                                👁 Synced to host
                            </div>
                        )}
                    </div>

                    {/* Host controls */}
                    {isHost && (
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#0d0d14] border-t border-white/[0.05]">
                            <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-semibold">
                                👑 HOST
                            </span>
                            <button
                                onClick={hostPlay}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition flex items-center gap-1.5"
                            >
                                ▶ Play
                            </button>
                            <button
                                onClick={hostPause}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition flex items-center gap-1.5"
                            >
                                ⏸ Pause
                            </button>
                            <button
                                onClick={hostSync}
                                className="px-4 py-2 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-300 text-sm font-medium transition"
                            >
                                ⟳ Sync All
                            </button>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Members + Chat ──────────────────────────────── */}
                <div className="w-full lg:w-[320px] flex flex-col border-l border-white/[0.06] bg-[#0a0a12]">

                    {/* Members list */}
                    <div className="px-4 py-3 border-b border-white/[0.05]">
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">
                            In this room ({members.length})
                        </p>
                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                            {members.map(m => (
                                <div key={m.uid} className="flex items-center gap-2.5">
                                    <Avatar name={m.displayName} photo={m.photoURL} size={26} />
                                    <span className="text-[13px] text-gray-300 truncate">{m.displayName}</span>
                                    {m.uid === room.hostUid && (
                                        <span className="ml-auto text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-bold">HOST</span>
                                    )}
                                    {m.uid === uid && (
                                        <span className="ml-auto text-[10px] text-gray-600">(you)</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                                <span className="text-3xl">💬</span>
                                <p className="text-xs">No messages yet. Say hi!</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.uid === uid;
                                // Firebase may return a Timestamp object or a plain Date
                                const ts = msg.timestamp?.toDate?.() ?? new Date();
                                const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                                return (
                                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                                        <Avatar name={msg.displayName} photo={msg.photoURL} size={26} />
                                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                                            <span className="text-[10px] text-gray-600 mb-0.5">
                                                {isMe ? "you" : msg.displayName} · {time}
                                            </span>
                                            <p className={`text-[13px] px-3 py-2 rounded-2xl leading-snug break-words
                                                ${isMe
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-white/[0.07] text-gray-200 rounded-bl-none"
                                                }`}>
                                                {msg.text}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat input */}
                    <form onSubmit={sendMessage}
                        className="flex gap-2 p-3 border-t border-white/[0.05] bg-[#0a0a12]">
                        <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Say something…"
                            maxLength={300}
                            className="flex-1 bg-white/[0.05] border border-white/[0.08] text-white text-sm px-3 py-2 rounded-xl outline-none focus:border-indigo-500/50 placeholder-gray-600 transition"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim()}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition"
                        >
                            ↑
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
