import { useState } from "react";
import { auth } from "../firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    // ── Forgot Password state ──────────────────────────────────────
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState({ text: "", isError: false });

    const handleSubmit = async () => {
        try {
            if (isSignup) {
                const userCred = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                localStorage.setItem("username", username);

                // ⭐ SAVE USERNAME HERE
                await updateProfile(userCred.user, {
                    displayName: username,
                });

            } else {
                await signInWithEmailAndPassword(auth, email, password);
                const existingUsername = localStorage.getItem("username");
                if (!existingUsername) {
                    localStorage.setItem("username", email.split("@")[0]);
                }
            }


            // ✅ Redirect after login/signup
            navigate("/");

        } catch (err) {
            alert(err.message);
        }
    };

    // ── Handle password reset ─────────────────────────────────────
    const handleResetPassword = async () => {
        if (!email?.trim()) return;
        setResetLoading(true);
        setResetMsg({ text: "", isError: false });
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetMsg({
                text: "Password reset link sent to your email.",
                isError: false,
            });
        } catch (error) {
            setResetMsg({
                text: error?.message ?? "Something went wrong. Try again.",
                isError: true,
            });
        } finally {
            setResetLoading(false);
        }
    };

    // Helper: switch to forgot-password view
    const openForgotPassword = () => {
        setResetMsg({ text: "", isError: false });
        setIsForgotPassword(true);
    };

    // Helper: go back to login view
    const backToLogin = () => {
        setResetMsg({ text: "", isError: false });
        setIsForgotPassword(false);
    };

    // if (isSignup) {
    //     await createUserWithEmailAndPassword(auth, email, password);

    //     localStorage.setItem("username", username);
    // } else {
    //     await signInWithEmailAndPassword(auth, email, password);

    //     const existingUsername = localStorage.getItem("username");

    //     if (!existingUsername) {
    //         localStorage.setItem("username", email.split("@")[0]);
    //     }
    // }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden pt-24 pb-10">

            {/* ── Dark app-consistent background ── */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
            {/* Subtle cinematic poster layer */}
            <div
                className="absolute inset-0 opacity-[0.08] bg-cover bg-center"
                style={{ backgroundImage: "url('https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg')" }}
            />

            {/* Very subtle accent orbs — match app theme */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-900 opacity-[0.12] blur-[140px] -top-32 -left-32 pointer-events-none" />
            <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-900 opacity-[0.10] blur-[120px] -bottom-28 -right-28 pointer-events-none" />

            {/* ── Animated card wrapper ── */}
            <div className="animate-slideUp relative z-10 w-full max-w-[420px] mx-5 sm:mx-auto">

                {/* Glassmorphism card */}
                <div className="relative rounded-2xl overflow-hidden">

                    {/* Card glass surface */}
                    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] px-8 py-10 sm:px-10">

                        {/* ── CineVerse brand ── */}
                        <div className="flex justify-center mb-9">
                            <div className="flex items-center gap-2.5 select-none">
                                {/* Icon mark */}
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.4)] shrink-0">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                        <path d="M3.5 3.5h4v17h-4zm7 0h3.5l5 8.5-5 8.5H10.5l5-8.5z" />
                                    </svg>
                                </div>
                                {/* Wordmark */}
                                <span className="text-white font-bold text-[22px] tracking-[-0.02em]">
                                    Cine<span className="text-indigo-400 font-extrabold">Verse</span>
                                </span>
                            </div>
                        </div>

                        {/* ── Heading ── */}
                        <div className="mb-8 text-center">
                            <h1 className="text-[28px] font-bold text-white tracking-tight leading-tight">
                                {isSignup ? "Create Your Account" : "Welcome Back"}
                            </h1>
                            <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
                                {isSignup
                                    ? "Join CineVerse and explore a universe of films"
                                    : "Sign in to continue your CineVerse experience"}
                            </p>
                        </div>

                        {/* ── Input fields ── */}
                        <div className="space-y-3">

                            {/* Username — signup only */}
                            {isSignup && (
                                <div className="relative group">
                                    {/* Icon */}
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors duration-200 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 text-[13px] outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200"
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Email */}
                            <div className="relative group">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors duration-200 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="20" height="16" x="2" y="4" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 text-[13px] outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors duration-200 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 text-[13px] outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {/* ── Forgot Password? link — login view only ── */}
                            {!isSignup && (
                                <div className="flex justify-end mt-1.5">
                                    <button
                                        type="button"
                                        onClick={openForgotPassword}
                                        className="text-[12px] text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-2 transition-colors duration-150 cursor-pointer bg-transparent border-0 p-0"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════════════
                             FORGOT PASSWORD PANEL — toggled in-place
                        ══════════════════════════════════════════════════════ */}
                        {isForgotPassword ? (
                            <div className="mt-6 animate-fadeIn">

                                {/* Description */}
                                <p className="text-gray-400 text-[13px] text-center mb-5 leading-relaxed">
                                    Enter your email and we&apos;ll send you a link to reset your password.
                                </p>

                                {/* Email input (reuses existing email state) */}
                                <div className="relative group">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors duration-200 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    </span>
                                    <input
                                        id="reset-email"
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 text-[13px] outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200"
                                    />
                                </div>

                                {/* Feedback message */}
                                {resetMsg.text && (
                                    <div
                                        className={`mt-3 px-4 py-2.5 rounded-lg text-[12px] leading-relaxed ${
                                            resetMsg.isError
                                                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                        }`}
                                    >
                                        {resetMsg.isError ? "⚠ " : "✓ "}{resetMsg.text}
                                    </div>
                                )}

                                {/* Send Reset Link button */}
                                <button
                                    id="send-reset-link-btn"
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={!email?.trim() || resetLoading}
                                    className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[13px] tracking-wide shadow-[0_8px_24px_rgba(99,102,241,0.35)] hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_8px_28px_rgba(99,102,241,0.5)] hover:scale-[1.012] active:scale-[0.988] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {resetLoading ? (
                                        <>
                                            {/* Spinner */}
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Sending…
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </button>

                                {/* Back to Login */}
                                <button
                                    id="back-to-login-btn"
                                    type="button"
                                    onClick={backToLogin}
                                    className="mt-4 w-full text-center text-[12px] text-gray-500 hover:text-indigo-400 transition-colors duration-150 cursor-pointer bg-transparent border-0 flex items-center justify-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    Back to Login
                                </button>

                            </div>
                        ) : (
                            <>
                                {/* ── Primary CTA button ── */}
                                <button
                                    onClick={handleSubmit}
                                    className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[13px] tracking-wide shadow-[0_8px_24px_rgba(99,102,241,0.35)] hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_8px_28px_rgba(99,102,241,0.5)] hover:scale-[1.012] active:scale-[0.988] transition-all duration-200"
                                >
                                    {isSignup ? "Create Account" : "Sign In"}
                                </button>

                                {/* ── OR divider ── */}
                                <div className="flex items-center gap-3 my-6">
                                    <div className="flex-1 h-px bg-white/[0.07]" />
                                    <span className="text-gray-700 text-[10px] font-semibold uppercase tracking-[0.18em]">or</span>
                                    <div className="flex-1 h-px bg-white/[0.07]" />
                                </div>

                                {/* ── Toggle login / signup ── */}
                                <p className="text-center text-[13px] text-gray-500">
                                    {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                                    <span
                                        onClick={() => setIsSignup(!isSignup)}
                                        className="text-indigo-400 font-semibold cursor-pointer hover:text-indigo-300 hover:underline underline-offset-2 transition-colors duration-150"
                                    >
                                        {isSignup ? "Sign In" : "Sign Up"}
                                    </span>
                                </p>
                            </>
                        )}

                    </div>
                </div>

                {/* Fine-print below card */}
                <p className="text-center text-gray-700 text-[11px] mt-5 px-4 leading-relaxed">
                    By continuing, you agree to CineVerse&apos;s{" "}
                    <span className="text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
                    {" "}&amp;{" "}
                    <span className="text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>.
                </p>

            </div>
        </div>
    );
}