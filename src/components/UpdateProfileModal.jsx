// src/components/UpdateProfileModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    updateProfile,
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// SMART VALIDATION RULES
//
// Case 1 – Only username / photo changed   → NO re-auth, direct Firestore write
// Case 2 – Email changed                  → re-auth required
// Case 3 – Password changed               → re-auth required
// Case 4 – Email + Password both changed  → single re-auth, then both updates
// ─────────────────────────────────────────────────────────────────────────────

export default function UpdateProfileModal({ onClose }) {
    const { user, userProfile, refreshProfile } = useAuth();

    // ── Form state (prefilled from existing profile) ──────────────────────
    const [username,        setUsername]        = useState(userProfile?.username || user?.displayName || "");
    const [email,           setEmail]           = useState(userProfile?.email    || user?.email       || "");
    const [photoURL,        setPhotoURL]        = useState(userProfile?.photoURL || user?.photoURL    || "");
    const [photoPreview,    setPhotoPreview]    = useState(userProfile?.photoURL || user?.photoURL    || "");
    const [wantsNewPw,      setWantsNewPw]      = useState(false);   // toggle password section
    const [newPassword,     setNewPassword]     = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [loading,         setLoading]         = useState(false);
    const [photoUploading,  setPhotoUploading]  = useState(false);  // photo-only upload spinner
    const [uploadProgress,  setUploadProgress]  = useState(0);       // 0-100 percent
    const [showCurPw,       setShowCurPw]       = useState(false);
    const [showNewPw,       setShowNewPw]       = useState(false);

    const backdropRef = useRef(null);

    // ── Derived change flags ────────────────────────────────────────────────
    const liveUser        = auth.currentUser;                          // always fresh
    const originalUsername = userProfile?.username || user?.displayName || "";
    const originalPhotoURL = userProfile?.photoURL || user?.photoURL   || "";
    const usernameChanged  = username.trim() !== originalUsername.trim();
    const emailChanged     = email.trim()    !== (liveUser?.email ?? "");
    const passwordChanged  = wantsNewPw && newPassword.trim().length > 0;
    const photoChanged     = photoURL !== originalPhotoURL;            // set by handleFileChange
    const needsReauth      = emailChanged || passwordChanged;

    // Save is disabled when:
    const saveDisabled =
        loading
        || photoUploading
        || !username.trim()
        || (needsReauth && !currentPassword.trim())
        || (wantsNewPw  && newPassword.trim().length < 6);

    // ── Close on Escape ───────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    // ── Backdrop click ───────────────────────────────────────────────────
    const onBackdrop = (e) => { if (e.target === backdropRef.current) onClose(); };

    // ── Optimized: instant preview + parallel persist ─────────────────────
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ── 1. Type validation ────────────────────────────────────────────────
        const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
        if (!file.type.startsWith("image/") || !ACCEPTED.includes(file.type)) {
            toast.error("Please select a valid image (JPEG, PNG, or WebP).");
            return;
        }

        // ── 2. Soft 10 MB warning — never blocks ──────────────────────────────
        if (file.size > 10 * 1024 * 1024) {
            toast("Large image — compressing automatically…", { icon: "⚠️" });
        }

        // ── 3. INSTANT preview — user sees photo before any async work ────────
        const objectURL = URL.createObjectURL(file);
        setPhotoPreview(objectURL);          // ← no await, fires synchronously
        setPhotoUploading(true);

        try {
            // ── 4. Decode image for canvas ────────────────────────────────────
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload  = () => resolve(image);
                image.onerror = () => reject(new Error("Could not read image file."));
                image.src = objectURL;
            });

            // ── 5. Resize to max 350 px wide — minimum payload ───────────────
            const MAX_W  = 350;
            const scale  = img.width > MAX_W ? MAX_W / img.width : 1;
            const canvas = document.createElement("canvas");
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

            // ── 6. JPEG @ 0.60 quality — targets ~15–50 KB ───────────────────
            const blob = await new Promise((resolve, reject) =>
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error("Compression failed."))),
                    "image/jpeg",
                    0.60
                )
            );

            // ── 7. uploadBytesResumable — non-blocking, progress-tracked ──────
            const liveUid = auth.currentUser?.uid;
            if (!liveUid) throw new Error("Not signed in.");
            const storageRef = ref(storage, `users/${liveUid}/profile.jpg`);
            setUploadProgress(0);

            await new Promise((resolve, reject) => {
                const task = uploadBytesResumable(
                    storageRef, blob, { contentType: "image/jpeg" }
                );

                // 8-second timeout safety net
                const timer = setTimeout(() => {
                    task.cancel();
                    reject(new Error("TIMEOUT"));
                }, 8000);

                task.on(
                    "state_changed",
                    // progress snapshot → live percentage
                    (snap) => {
                        const pct = Math.round(
                            (snap.bytesTransferred / snap.totalBytes) * 100
                        );
                        setUploadProgress(pct);
                    },
                    // error
                    (err) => { clearTimeout(timer); reject(err); },
                    // complete
                    () => { clearTimeout(timer); resolve(); }
                );
            });

            // ── 8. Get URL + persist Auth & Firestore IN PARALLEL ────────────
            const downloadURL = await getDownloadURL(storageRef);

            await Promise.all([
                updateProfile(auth.currentUser, { photoURL: downloadURL }),
                setDoc(
                    doc(db, "users", liveUid),
                    { photoURL: downloadURL },
                    { merge: true }
                ),
            ]);

            // ── 9. Cache URL; keep objectURL as preview (no flicker) ─────────
            setPhotoURL(downloadURL);
            setTimeout(() => URL.revokeObjectURL(objectURL), 10_000); // deferred
            refreshProfile();

            toast.success("Photo uploaded! 🎉");
        } catch (err) {
            console.error("Photo upload error:", err);
            URL.revokeObjectURL(objectURL);

            if (err?.message === "TIMEOUT") {
                toast(
                    (t) => (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            Upload is slow.&nbsp;
                            <button
                                style={{ fontWeight: 600, color: "#818cf8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                onClick={() => { toast.dismiss(t.id); handleFileChange(e); }}
                            >
                                Retry
                            </button>
                        </span>
                    ),
                    { duration: 6000, icon: "⏱️" }
                );
            } else {
                toast.error(friendlyStorageError(err));
            }
            // Restore previous photo on any failure
            setPhotoPreview(userProfile?.photoURL || user?.photoURL || "");
            setPhotoURL(userProfile?.photoURL    || user?.photoURL || "");
        } finally {
            setPhotoUploading(false);
        }
    };

    // ── URL input → live preview ─────────────────────────────────────────
    const handleURLChange = (v) => {
        setPhotoURL(v);
        setPhotoPreview(v);
    };

    // ── Centralised friendly-error helpers ───────────────────────────────
    const AUTH_ERRORS = {
        "auth/invalid-credential":     "Incorrect current password. Please try again.",
        "auth/wrong-password":         "Incorrect current password. Please try again.",
        "auth/requires-recent-login":  "Session expired — please log out and log back in.",
        "auth/too-many-requests":      "Too many attempts. Wait a moment and retry.",
        "auth/email-already-in-use":   "That email is already linked to another account.",
        "auth/invalid-email":          "The email address is not valid.",
        "auth/weak-password":          "Password must be at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your connection and retry.",
        "auth/user-token-expired":     "Session expired — please log out and log back in.",
        "auth/operation-not-allowed":  "This operation is not allowed. Contact support.",
    };
    const friendlyAuthError  = (err) => AUTH_ERRORS[err?.code] ?? "Something went wrong. Please try again.";
    const friendlyStorageError = (err) => {
        if (err?.code === "storage/unauthorized")       return "You don't have permission to upload photos.";
        if (err?.code === "storage/canceled")           return "Upload was cancelled.";
        if (err?.code === "storage/quota-exceeded")     return "Storage quota exceeded. Contact support.";
        if (err?.code === "storage/retry-limit-exceeded") return "Upload failed — check your connection and retry.";
        return "Photo upload failed. Please try again.";
    };

    // ── Main save handler — per-field operations with individual try/catch ─
    const handleSave = async () => {
        if (!username.trim()) { toast.error("Username cannot be empty.");             return; }
        if (!liveUser)         { toast.error("Not signed in. Please log in again.");  return; }
        if (needsReauth && !currentPassword.trim()) {
            toast.error("Enter your current password to update email or password.");
            return;
        }
        if (!usernameChanged && !emailChanged && !passwordChanged && !photoChanged) {
            toast("No changes to save.", { icon: "ℹ️" });
            return;
        }

        setLoading(true);
        let anySuccess = false;
        let fatalError = null;          // reauth failure stops everything

        try {
            // ── STEP 1: Re-authenticate (required before email / password change)
            if (needsReauth) {
                const credential = EmailAuthProvider.credential(
                    liveUser.email,
                    currentPassword.trim()
                );
                await reauthenticateWithCredential(liveUser, credential);
            }
        } catch (err) {
            console.error("Reauth error:", err?.code, err?.message);
            toast.error(friendlyAuthError(err));
            setLoading(false);
            return;                     // cannot proceed without valid credential
        }

        // ── STEP 2: Password update ─────────────────────────────────────────
        if (passwordChanged) {
            try {
                await updatePassword(liveUser, newPassword.trim());
                toast.success("Password updated.");
                anySuccess = true;
            } catch (err) {
                console.error("Password update error:", err?.code, err?.message);
                toast.error(friendlyAuthError(err));
                fatalError = err;
            }
        }

        // ── STEP 3: Email update ────────────────────────────────────────────
        if (emailChanged && !fatalError) {
            try {
                await updateEmail(liveUser, email.trim());
                toast.success("Email updated.");
                anySuccess = true;
            } catch (err) {
                console.error("Email update error:", err?.code, err?.message);
                toast.error(friendlyAuthError(err));
                fatalError = err;
            }
        }

        // ── STEP 4: Username / displayName update ───────────────────────────
        if (usernameChanged && !fatalError) {
            try {
                await updateProfile(liveUser, { displayName: username.trim() });
                toast.success("Username updated.");
                anySuccess = true;
            } catch (err) {
                console.error("Username update error:", err?.code, err?.message);
                toast.error(friendlyAuthError(err));
            }
        }

        // ── STEP 5: Persist everything to Firestore (always, if no fatal err)
        if (!fatalError) {
            try {
                await setDoc(
                    doc(db, "users", liveUser.uid),
                    {
                        username: username.trim(),
                        email:    email.trim() || liveUser.email,
                        photoURL: photoURL     || null,
                    },
                    { merge: true }
                );
            } catch (err) {
                console.error("Firestore persist error:", err?.code, err?.message);
                // Firestore errors are internal — don't expose to user if other
                // operations already succeeded; silently log only.
            }
        }

        // ── STEP 6: Sync context so Navbar / Dropdown update instantly ───────
        if (!fatalError) {
            refreshProfile();
        }

        if (anySuccess) onClose();
        setLoading(false);
    };

    // ─────────────────────────────────────────────────────────────────────
    // JSX — rendered via Portal directly on document.body
    // ─────────────────────────────────────────────────────────────────────
    const modal = (
        <div
            ref={backdropRef}
            onClick={onBackdrop}
            style={{
                position:       "fixed",
                inset:          0,
                zIndex:         1000,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                padding:        "16px",
                background:     "rgba(0,0,0,0.80)",
                backdropFilter: "blur(12px)",
            }}
        >
            {/* ── Card ─────────────────────────────────────────────────── */}
            <div
                style={{
                    width:        "100%",
                    maxWidth:     "460px",
                    maxHeight:    "90vh",
                    display:      "flex",
                    flexDirection:"column",
                    animation:    "modalPop 0.22s cubic-bezier(0.16,1,0.3,1) both",
                }}
                className="bg-[#0d0d10] border border-white/[0.07] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.04)]"
            >

                    {/* ── Header ── */}
                    <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-white/[0.05]">
                        <div>
                            <h2 className="text-white font-bold text-[17px] tracking-tight">Update Profile</h2>
                            <p className="text-gray-600 text-[12px] mt-0.5">Changes save directly to Firebase</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.10] text-gray-400 hover:text-white transition-colors"
                        >
                            <XIcon />
                        </button>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="px-7 py-5 space-y-5 overflow-y-auto flex-1">

                        {/* Photo preview + inputs */}
                        <div className="space-y-3">
                            <Label icon={<CameraIcon />} text="Profile Photo" />

                            {/* Preview ring */}
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 shrink-0">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 ring-2 ring-white/[0.08] overflow-hidden flex items-center justify-center">
                                        {photoPreview ? (
                                            <img
                                                src={photoPreview}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                        ) : (
                                            <span className="text-white text-2xl font-bold">
                                                {username.trim()[0]?.toUpperCase() ?? "?"}
                                            </span>
                                        )}
                                    </div>
                                    {/* Upload progress overlay */}
                                    {photoUploading && (
                                        <div className="absolute inset-0 rounded-full bg-black/65 flex flex-col items-center justify-center gap-0.5">
                                            <svg className="w-4 h-4 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            {uploadProgress > 0 && (
                                                <span style={{ fontSize: 9, fontWeight: 700, color: "#a5b4fc", lineHeight: 1 }}>
                                                    {uploadProgress}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    {/* File upload */}
                                    <label
                                        className={`flex items-center gap-2 cursor-pointer w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[12px] transition-all duration-150 ${
                                            photoUploading
                                                ? "opacity-50 cursor-not-allowed text-gray-600 border-white/[0.04]"
                                                : "text-gray-400 hover:text-white hover:border-white/[0.14]"
                                        }`}
                                    >
                                        {photoUploading ? (
                                            <>
                                                <svg className="w-3.5 h-3.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Preparing…"}
                                            </>
                                        ) : (
                                            <>
                                                <UploadIcon />
                                                Upload from device
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            disabled={photoUploading}
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    {/* URL */}
                                    <input
                                        type="url"
                                        value={typeof photoURL === "string" && photoURL.startsWith("data:") ? "" : photoURL}
                                        onChange={(e) => handleURLChange(e.target.value)}
                                        placeholder="Or paste image URL…"
                                        className={INPUT}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Username */}
                        <Field label="Username" icon={<UserIcon />}>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Display name"
                                className={INPUT}
                            />
                        </Field>

                        {/* Email */}
                        <Field label="Email" icon={<MailIcon />}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className={INPUT}
                            />
                        </Field>

                        {/* ── Password section ── */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => { setWantsNewPw((v) => !v); setNewPassword(""); }}
                                className="flex items-center gap-2 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <LockIcon />
                                {wantsNewPw ? "Cancel password change" : "Change password"}
                            </button>

                            {wantsNewPw && (
                                <Field label="New Password" icon={<LockIcon />} hint="Minimum 6 characters">
                                    <PasswordInput
                                        value={newPassword}
                                        onChange={setNewPassword}
                                        show={showNewPw}
                                        toggle={() => setShowNewPw((v) => !v)}
                                        placeholder="New password"
                                    />
                                </Field>
                            )}
                        </div>

                        {/* ── Current password (shown only when needed) ── */}
                        {needsReauth && (
                            <Field
                                label="Current Password"
                                icon={<ShieldIcon />}
                                hint="Required to change email or password"
                            >
                                <PasswordInput
                                    value={currentPassword}
                                    onChange={setCurrentPassword}
                                    show={showCurPw}
                                    toggle={() => setShowCurPw((v) => !v)}
                                    placeholder="Confirm current password"
                                />
                            </Field>
                        )}

                        {/* Hint: what's required */}
                        {needsReauth && !currentPassword.trim() && (
                            <p className="text-[11px] text-amber-500/80 flex items-center gap-1.5">
                                <span>⚠</span>
                                Current password is required to save these changes.
                            </p>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex gap-3 px-7 pb-6 pt-4 border-t border-white/[0.05]">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/[0.14] text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saveDisabled}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[13px] tracking-wide shadow-[0_6px_20px_rgba(99,102,241,0.30)] hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_6px_24px_rgba(99,102,241,0.45)] hover:scale-[1.012] active:scale-[0.988] transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Saving…
                                </>
                            ) : "Save Changes"}
                        </button>
                    </div>
                </div>
        </div>
    );

    return createPortal(modal, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const INPUT =
    "w-full px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white placeholder-gray-600 text-[13px] outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10 transition-all duration-200";

function Label({ icon, text }) {
    return (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            <span className="text-gray-600">{icon}</span>
            {text}
        </p>
    );
}

function Field({ label, icon, hint, children }) {
    return (
        <div className="space-y-1.5">
            <Label icon={icon} text={label} />
            {children}
            {hint && <p className="text-[11px] text-gray-600 pl-0.5">{hint}</p>}
        </div>
    );
}

function PasswordInput({ value, onChange, show, toggle, placeholder }) {
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={INPUT + " pr-10"}
            />
            <button
                type="button"
                onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
                {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons (inline SVG — no extra dependencies)
// ─────────────────────────────────────────────────────────────────────────────

function XIcon() {
    return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function UserIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function MailIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}
function LockIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function ShieldIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function CameraIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
}
function UploadIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
function EyeIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOffIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
