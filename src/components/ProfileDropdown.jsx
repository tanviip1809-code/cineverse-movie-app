// src/components/ProfileDropdown.jsx
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import UpdateProfileModal from "./UpdateProfileModal";

export default function ProfileDropdown() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const wrapperRef = useRef(null);

    // Prefer Firestore values → fall back to Firebase Auth object
    const displayName =
        userProfile?.username ||
        user?.displayName ||
        user?.email?.split("@")[0] ||
        "User";
    const displayEmail = userProfile?.email || user?.email || "";
    const photoURL     = userProfile?.photoURL || user?.photoURL || "";
    const initial      = displayName.trim()[0]?.toUpperCase() ?? "?";

    // ── Close on outside click ────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = async () => {
        setOpen(false);
        try {
            await signOut(auth);
            navigate("/login");
        } catch (err) {
            console.error("Logout:", err);
        }
    };

    return (
        <>
            <div ref={wrapperRef} className="relative">

                {/* ── Avatar trigger ──────────────────────────────────── */}
                <button
                    id="profile-avatar-btn"
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-2.5 group select-none focus:outline-none"
                >
                    <Avatar photoURL={photoURL} initial={initial} size={32} ring />
                    <span className="hidden sm:block text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors duration-150 max-w-[120px] truncate">
                        {displayName}
                    </span>
                    {/* Chevron */}
                    <svg
                        viewBox="0 0 24 24"
                        className={`hidden sm:block w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
                        fill="none" stroke="currentColor" strokeWidth="2"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>

                {/* ── Dropdown panel ───────────────────────────────────── */}
                {open && (
                    <div className="absolute right-0 top-[calc(100%+12px)] w-[240px] bg-[#0f0f11] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden z-[60] animate-dropdownSlide">

                        {/* User info */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
                            <Avatar photoURL={photoURL} initial={initial} size={40} />
                            <div className="min-w-0">
                                <p className="text-white text-[13px] font-semibold truncate">{displayName}</p>
                                <p className="text-gray-500 text-[11px] truncate mt-0.5">{displayEmail}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="py-1.5">
                            <DropItem
                                icon={<ProfileIcon />}
                                label="View Profile"
                                onClick={() => { setOpen(false); navigate("/profile"); }}
                            />
                            <DropItem
                                icon={<EditIcon />}
                                label="Update Profile"
                                onClick={() => { setOpen(false); setShowModal(true); }}
                            />
                        </div>

                        <div className="mx-4 h-px bg-white/[0.05]" />

                        <div className="py-1.5">
                            <DropItem
                                icon={<LogoutIcon />}
                                label="Logout"
                                onClick={handleLogout}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal ─────────────────────────────────────────────── */}
            {showModal && (
                <UpdateProfileModal onClose={() => setShowModal(false)} />
            )}
        </>
    );
}

/* ── Shared avatar circle ── */
function Avatar({ photoURL, initial, size, ring = false }) {
    const dim = `${size}px`;
    return (
        <div
            style={{ width: dim, height: dim }}
            className={`rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center overflow-hidden shrink-0 ${ring ? "ring-2 ring-transparent group-hover:ring-indigo-500/40 transition-all duration-200" : "ring-2 ring-white/[0.08]"}`}
        >
            {photoURL ? (
                <img
                    src={photoURL}
                    alt={initial}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
            ) : (
                <span
                    className="font-bold text-white"
                    style={{ fontSize: `${Math.round(size * 0.42)}px` }}
                >
                    {initial}
                </span>
            )}
        </div>
    );
}

/* ── Single dropdown row ── */
function DropItem({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
        >
            <span className="text-gray-500">{icon}</span>
            {label}
        </button>
    );
}

/* ── Icons ── */
function ProfileIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
function EditIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}
function LogoutIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}
