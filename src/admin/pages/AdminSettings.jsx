// src/admin/pages/AdminSettings.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSettings, saveSettings } from "../services/adminSettingsService";
import toast from "react-hot-toast";

function Toggle({ value, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/[0.06] last:border-0">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${value ? "bg-purple-600" : "bg-white/10"}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, icon, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

const LAYOUTS = [
  { id: "default", label: "Default", desc: "Standard grid layout" },
  { id: "featured", label: "Featured Hero", desc: "Large featured movie banner" },
  { id: "compact", label: "Compact", desc: "Dense row layout" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try { await saveSettings(settings); toast.success("Settings saved!"); }
    catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2.5 rounded-xl outline-none focus:border-purple-500/50 placeholder-gray-600 transition";

  return (
    <div className="space-y-5 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm">Configure your CineVerse app settings.</p>
      </motion.div>

      {/* App Identity */}
      <SectionCard title="App Identity" icon="🎬" delay={0.05}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Site Title</label>
            <input className={inputCls} value={settings?.siteTitle || ""} onChange={(e) => set("siteTitle", e.target.value)} placeholder="CineVerse" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Tagline</label>
            <input className={inputCls} value={settings?.siteTagline || ""} onChange={(e) => set("siteTagline", e.target.value)} placeholder="Watch Together, Anywhere" />
          </div>
        </div>
      </SectionCard>

      {/* Feature Toggles */}
      <SectionCard title="Feature Toggles" icon="⚙️" delay={0.1}>
        <Toggle
          value={settings?.bannerEnabled ?? true}
          onChange={(v) => set("bannerEnabled", v)}
          label="Homepage Banner"
          description="Show the featured movie hero banner on the homepage"
        />
        <Toggle
          value={settings?.featuredMoviesEnabled ?? true}
          onChange={(v) => set("featuredMoviesEnabled", v)}
          label="Featured Movies Section"
          description="Display the featured movies row on the homepage"
        />
        <Toggle
          value={settings?.maintenanceMode ?? false}
          onChange={(v) => set("maintenanceMode", v)}
          label="Maintenance Mode"
          description="Show a maintenance message to non-admin users"
        />
      </SectionCard>

      {/* Homepage Layout */}
      <SectionCard title="Homepage Layout" icon="🏠" delay={0.15}>
        <div className="space-y-2">
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => set("homepageLayout", l.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${settings?.homepageLayout === l.id ? "border-purple-500/40 bg-purple-600/15" : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"}`}>
              <div className={`w-3 h-3 rounded-full border-2 shrink-0 transition ${settings?.homepageLayout === l.id ? "border-purple-400 bg-purple-400" : "border-gray-600"}`} />
              <div>
                <p className="text-sm text-white font-medium">{l.label}</p>
                <p className="text-xs text-gray-500">{l.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Theme */}
      <SectionCard title="Theme Color" icon="🎨" delay={0.2}>
        <div className="flex gap-3 flex-wrap">
          {[
            { id: "purple", label: "Purple", from: "from-purple-600", to: "to-pink-600" },
            { id: "blue",   label: "Blue",   from: "from-blue-600",   to: "to-cyan-600" },
            { id: "red",    label: "Red",    from: "from-red-600",    to: "to-orange-600" },
            { id: "green",  label: "Green",  from: "from-emerald-600",to: "to-teal-600" },
          ].map((t) => (
            <button key={t.id} onClick={() => set("primaryColor", t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${settings?.primaryColor === t.id ? "border-white/30 bg-white/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}>
              <span className={`w-4 h-4 rounded-full bg-gradient-to-r ${t.from} ${t.to}`} />
              <span className="text-xs text-gray-300">{t.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-purple-900/30">
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </motion.div>
    </div>
  );
}
