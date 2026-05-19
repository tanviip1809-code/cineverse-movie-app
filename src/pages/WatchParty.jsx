// src/pages/WatchParty.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, addDoc, onSnapshot, orderBy, query,
    getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

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

function Spinner({ sm = false }) {
    return (
        <div className={`${sm ? "w-4 h-4 border-2" : "w-8 h-8 border-4"} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WatchParty() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, userProfile, loading: authLoading } = useAuth();

    const uid = user?.uid ?? null;
    const displayName = userProfile?.username || user?.displayName || user?.email?.split("@")[0] || "Guest";
    const photoURL = userProfile?.photoURL || user?.photoURL || "";

    // ── State ─────────────────────────────────────────────────────────────────
    const [room, setRoom] = useState(null);
    const [members, setMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [pageLoading, setPageLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const localTimeRef = useRef(0);
    const chatEndRef = useRef(null);
    const unsubRoomRef = useRef(null);
    const unsubMembersRef = useRef(null);
    const unsubChatRef = useRef(null);

    // ── KEY FIX REFS ──────────────────────────────────────────────────────────
    // hasLeftRef   → prevents double-cleanup calls
    // hasJoinedRef → gates cleanup/deletion; only true after successful join
    // joinCalledRef → prevents joinRoom() running twice in React Strict Mode
    const hasLeftRef = useRef(false);
    const hasJoinedRef = useRef(false);
    const joinCalledRef = useRef(false);

    const isHost = room?.hostUid === uid;

    // ─────────────────────────────────────────────────────────────────────────
    // CLEANUP ALL LISTENERS
    // ─────────────────────────────────────────────────────────────────────────
    const cleanupListeners = useCallback(() => {
        unsubRoomRef.current?.();
        unsubMembersRef.current?.();
        unsubChatRef.current?.();
        unsubRoomRef.current = null;
        unsubMembersRef.current = null;
        unsubChatRef.current = null;
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // LEAVE ROOM
    // ─────────────────────────────────────────────────────────────────────────
    const handleLeaveRoom = useCallback(async (silent = false) => {
        if (hasLeftRef.current || !uid) return;
        hasLeftRef.current = true;

        cleanupListeners();

        const memberRef = doc(db, "rooms", roomId, "members", uid);
        const roomRef = doc(db, "rooms", roomId);

        try {
            if (!silent) setIsLeaving(true);

            // ── Guard: verify user actually has a member doc ──────────────────
            // Prevents deleting room for someone who never fully joined
            const memberCheck = await getDoc(memberRef);
            if (!memberCheck.exists()) {
                if (!silent) {
                    toast.success("Left room successfully");
                    navigate("/");
                }
                return;
            }

            // ── Get current members (excluding self) ──────────────────────────
            const membersSnap = await getDocs(collection(db, "rooms", roomId, "members"));
            const otherMembers = membersSnap.docs
                .map(d => d.data())
                .filter(m => m.uid !== uid);

            // ── Get current room to check host ────────────────────────────────
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) {
                // Room already gone — just navigate
                if (!silent) {
                    toast.success("Left room");
                    navigate("/");
                }
                return;
            }

            const leavingIsHost = roomSnap.data()?.hostUid === uid;

            if (leavingIsHost) {
                if (otherMembers.length > 0) {
                    // Transfer host to the next member
                    const newHost = otherMembers[0];
                    await updateDoc(roomRef, { hostUid: newHost.uid });
                    if (!silent) toast(`👑 ${newHost.displayName} is now the host`, { icon: "🎬" });
                } else {
                    // No one else — delete the room
                    await deleteDoc(roomRef);
                }
            }

            // Remove own member doc
            await deleteDoc(memberRef);

            if (!silent) {
                toast.success("Left room successfully");
                navigate("/");
            }
        } catch (err) {
            console.error("[WatchParty] leaveRoom error:", err);
            hasLeftRef.current = false; // allow retry
            if (!silent) {
                setIsLeaving(false);
                toast.error("Failed to leave room. Please try again.");
            }
        }
    }, [uid, roomId, cleanupListeners, navigate]);

    // ─────────────────────────────────────────────────────────────────────────
    // JOIN ROOM on mount
    // joinCalledRef ensures this runs only ONCE even in React 18 Strict Mode
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid || joinCalledRef.current) return;
        joinCalledRef.current = true;

        async function joinRoom() {
            try {
                // Refresh auth token before any Firestore write
                await user.getIdToken(true);

                const roomRef = doc(db, "rooms", roomId);
                const snap = await getDoc(roomRef);

                if (!snap.exists()) {
                    toast.error("Room not found.");
                    navigate("/");
                    return;
                }

                // Write / refresh member presence
                const memberRef = doc(db, "rooms", roomId, "members", uid);
                await setDoc(memberRef, {
                    uid,
                    displayName,
                    photoURL,
                    joinedAt: serverTimestamp(),
                }, { merge: true });

                // ✅ Mark as successfully joined — enables cleanup & room-deleted detection
                hasJoinedRef.current = true;
                setPageLoading(false);

            } catch (err) {
                console.error("[WatchParty] joinRoom error:", err);
                toast.error(err?.message ?? "Failed to join room.");
                setPageLoading(false);
                joinCalledRef.current = false; // allow retry on next mount
            }
        }

        joinRoom();

        // Best-effort cleanup on hard browser close/refresh (no redirect possible)
        const handleBeforeUnload = () => {
            if (!hasJoinedRef.current || hasLeftRef.current || !user?.uid) return;
            hasLeftRef.current = true;
            deleteDoc(doc(db, "rooms", roomId, "members", user.uid));
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);

            // ── KEY FIX: Only silently leave if user actually joined ──────────
            // Without this guard, React Strict Mode's double-mount triggers
            // handleLeaveRoom before join completes, deleting the room.
            if (hasJoinedRef.current && !hasLeftRef.current) {
                handleLeaveRoom(true);
            }
        };
    }, [uid, roomId]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to room doc
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;

        const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
            if (!snap.exists()) {
                // ── KEY FIX: Only redirect if user has fully joined ───────────
                // Prevents false redirect during initial Firestore propagation
                if (hasJoinedRef.current && !hasLeftRef.current) {
                    toast("The room was closed by the host.", { icon: "🚪" });
                    navigate("/");
                }
                return;
            }
            setRoom(snap.data());
        });

        unsubRoomRef.current = unsub;
        return unsub;
    }, [uid, roomId]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to members
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        const unsub = onSnapshot(collection(db, "rooms", roomId, "members"), (snap) => {
            setMembers(snap.docs.map(d => d.data()));
        });
        unsubMembersRef.current = unsub;
        return unsub;
    }, [uid, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // SUBSCRIBE to chat messages
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        const q = query(
            collection(db, "rooms", roomId, "messages"),
            orderBy("timestamp", "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubChatRef.current = unsub;
        return unsub;
    }, [uid, roomId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ─────────────────────────────────────────────────────────────────────────
    // HOST PROMOTION — runs when members list changes
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!room || members.length === 0 || !hasJoinedRef.current) return;
        const hostStillPresent = members.some(m => m.uid === room.hostUid);
        if (!hostStillPresent) {
            const newHost = members[0];
            updateDoc(doc(db, "rooms", roomId), { hostUid: newHost.uid });
            toast(`👑 ${newHost.displayName} is now the host`, { icon: "🎬" });
        }
    }, [members, room, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // LOCAL TIMER — host tracks playback position
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isHost || !room) return;
        if (room.isPlaying) {
            const lag = room.syncedAt ? (Date.now() - room.syncedAt) / 1000 : 0;
            localTimeRef.current = (room.currentTime ?? 0) + lag;
            const interval = setInterval(() => { localTimeRef.current += 0.5; }, 500);
            return () => clearInterval(interval);
        } else {
            localTimeRef.current = room.currentTime ?? 0;
        }
    }, [room?.isPlaying, room?.syncedAt]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // HOST CONTROLS
    // ─────────────────────────────────────────────────────────────────────────
    const hostPlay = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: true, currentTime: localTimeRef.current, syncedAt: Date.now(),
        });
    }, [isHost, roomId]);

    const hostPause = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: false, currentTime: localTimeRef.current, syncedAt: Date.now(),
        });
    }, [isHost, roomId]);

    const hostSync = useCallback(() => {
        if (!isHost) return;
        updateDoc(doc(db, "rooms", roomId), {
            isPlaying: true, currentTime: localTimeRef.current, syncedAt: Date.now(),
        });
        toast.success("Synced all viewers!");
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
            uid, displayName, photoURL, text, timestamp: serverTimestamp(),
        });
    }, [chatInput, uid, displayName, photoURL, roomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // COPY INVITE LINK
    // ─────────────────────────────────────────────────────────────────────────
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Room link copied!");
        setTimeout(() => setCopied(false), 2500);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LOADING STATE
    // ─────────────────────────────────────────────────────────────────────────
    if (authLoading || pageLoading || !room) {
        return (
            <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
                <Spinner />
                <p className="text-gray-400 text-sm animate-pulse">
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
            <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-black/60 border-b border-white/[0.06] backdrop-blur gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2 sm:px-2.5 py-1 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                    </span>
                    <h1 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[130px] sm:max-w-[240px] lg:max-w-none">
                        {room.movieTitle || "Watch Party"}
                    </h1>
                    <span className="text-gray-600 text-xs hidden md:inline shrink-0">
                        Room: <span className="text-gray-400 font-mono">{roomId.slice(0, 8)}…</span>
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Member avatars — desktop only */}
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

                    {/* Mobile: member count */}
                    <span className="sm:hidden text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                        👥 {members.length}
                    </span>

                    {/* Mobile: chat toggle */}
                    <button
                        onClick={() => setShowChat(v => !v)}
                        className="lg:hidden px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:text-white transition"
                    >
                        💬
                    </button>

                    <button
                        onClick={copyLink}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] sm:text-xs font-medium hover:bg-indigo-600/30 transition"
                    >
                        {copied ? "✓" : "🔗"}
                        <span className="hidden sm:inline">{copied ? "Copied!" : "Invite"}</span>
                    </button>

                    {/* Leave button */}
                    <button
                        onClick={() => handleLeaveRoom(false)}
                        disabled={isLeaving}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] sm:text-xs font-medium hover:bg-red-600/30 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLeaving ? (
                            <><Spinner sm /><span className="hidden sm:inline">Leaving…</span></>
                        ) : (
                            <><span>←</span><span className="hidden sm:inline">Leave</span></>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Main layout ──────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

                {/* ── LEFT: Video + controls ─────────────────────────────── */}
                <div className="flex-1 flex flex-col bg-black min-h-[35vh] sm:min-h-[45vh] lg:min-h-0">
                    <div className="relative flex-1 bg-black">
                        {room.trailerKey ? (
                            <iframe
                                key={room.syncedAt}
                                src={`https://www.youtube.com/embed/${room.trailerKey}?autoplay=${room.isPlaying ? 1 : 0}&start=${Math.floor(room.currentTime || 0)}&rel=0&modestbranding=1&enablejsapi=0`}
                                title="Watch Party Player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full min-h-[35vh] sm:min-h-[45vh] lg:min-h-0 border-0"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500">
                                <span className="text-5xl">🎬</span>
                                <p className="text-sm text-center px-4">No trailer available for this movie.</p>
                            </div>
                        )}
                        {!isHost && (
                            <div className="absolute top-3 left-3 text-[11px] text-gray-400 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full">
                                👁 Synced to host
                            </div>
                        )}
                    </div>

                    {/* Host controls */}
                    {isHost && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 bg-[#0d0d14] border-t border-white/[0.05]">
                            <span className="text-[10px] sm:text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-semibold shrink-0">
                                👑 HOST
                            </span>
                            <button onClick={hostPlay} className="px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium transition">
                                ▶ Play
                            </button>
                            <button onClick={hostPause} className="px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium transition">
                                ⏸ Pause
                            </button>
                            <button onClick={hostSync} className="px-3 sm:px-4 py-2 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-300 text-xs sm:text-sm font-medium transition">
                                ⟳ Sync All
                            </button>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Members + Chat ──────────────────────────────── */}
                <div className={`
                    w-full lg:w-[320px] flex flex-col border-l border-white/[0.06] bg-[#0a0a12]
                    lg:relative lg:flex
                    ${showChat
                        ? "fixed inset-x-0 bottom-0 z-40 max-h-[70vh] flex flex-col border-t border-white/10 rounded-t-2xl shadow-2xl"
                        : "hidden lg:flex"
                    }
                `}>
                    {/* Mobile close button */}
                    {showChat && (
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] lg:hidden">
                            <span className="text-xs text-gray-400 font-medium">Chat & Members</span>
                            <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
                        </div>
                    )}

                    {/* Members list */}
                    <div className="px-4 py-3 border-b border-white/[0.05]">
                        <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">
                            In this room ({members.length})
                        </p>
                        <div className="flex flex-col gap-2 max-h-28 overflow-y-auto">
                            {members.map(m => (
                                <div key={m.uid} className="flex items-center gap-2.5">
                                    <Avatar name={m.displayName} photo={m.photoURL} size={26} />
                                    <span className="text-[13px] text-gray-300 truncate">{m.displayName}</span>
                                    {m.uid === room.hostUid && (
                                        <span className="ml-auto text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-bold shrink-0">HOST</span>
                                    )}
                                    {m.uid === uid && m.uid !== room.hostUid && (
                                        <span className="ml-auto text-[10px] text-gray-600 shrink-0">(you)</span>
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
                    <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-white/[0.05] bg-[#0a0a12]">
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
