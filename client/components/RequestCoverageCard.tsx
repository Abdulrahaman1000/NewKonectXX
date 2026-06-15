import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "react-i18next";
import { MapPin, Loader2, X, Send, CheckCircle2, AlertCircle } from "lucide-react";
import apiClient from "@/api/client";

// Always-visible "Request coverage" banner for the hotspot page. Shows whether
// or not hotspots are listed (e.g. when the only nearby hotspot is too far).
// Lets a user file a coverage request pinned to their GPS location (+ optional
// area/note). Feeds the admin Coverage Demand dashboard.
export default function RequestCoverageCard() {
  const { theme } = useApp();
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = () => {
    setGeoError(null);
    setCoords(null);
    if (!("geolocation" in navigator)) {
      setGeoError(t("enduser.hotspot.requestCoverage.noGeo", { defaultValue: "Location isn't available on this device." }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError(t("enduser.hotspot.requestCoverage.geoDenied", { defaultValue: "We couldn't get your location. Please allow location access and try again." }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const openModal = () => {
    setOpen(true);
    setDone(false);
    setError(null);
    setLabel("");
    setNote("");
    getLocation();
  };

  const closeModal = () => {
    if (submitting) return;
    setOpen(false);
  };

  const submit = async () => {
    if (!coords) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/enduser/hotspot-requests", {
        lat: coords.lat,
        lng: coords.lng,
        label: label.trim() || undefined,
        note: note.trim() || undefined,
      });
      setDone(true);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        setError(t("enduser.hotspot.requestCoverage.dup", { defaultValue: "You've already requested coverage for this spot." }));
      } else {
        setError(e?.response?.data?.message || t("enduser.hotspot.requestCoverage.failed", { defaultValue: "Couldn't send your request. Please try again." }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? "bg-[#2a2b2d] border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900"
  }`;

  return (
    <>
      {/* Always-visible banner */}
      <div className={`mb-6 rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        isDark ? "bg-[#333436] border-gray-800" : "bg-white border-gray-100"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("enduser.hotspot.requestCoverage.bannerTitle", { defaultValue: "Don't see coverage near you?" })}
            </div>
            <div className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("enduser.hotspot.requestCoverage.bannerSub", { defaultValue: "Tell us where you need Wi-Fi and we'll consider it for our next rollout." })}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm whitespace-nowrap shadow-md transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <MapPin className="w-4 h-4" />
          {t("enduser.hotspot.requestCoverage.cta", { defaultValue: "Request coverage" })}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border ${isDark ? "bg-[#1f2023] border-gray-800" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-gray-800" : "border-gray-200"}`}>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("enduser.hotspot.requestCoverage.title", { defaultValue: "Request coverage" })}
              </h3>
              <button onClick={closeModal} className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              {done ? (
                <div className="text-center py-6">
                  <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
                    <CheckCircle2 className={`w-7 h-7 ${isDark ? "text-green-400" : "text-green-600"}`} />
                  </div>
                  <p className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {t("enduser.hotspot.requestCoverage.doneTitle", { defaultValue: "Request sent" })}
                  </p>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {t("enduser.hotspot.requestCoverage.doneBody", { defaultValue: "Thanks — we use these to decide where to set up next." })}
                  </p>
                  <button onClick={() => setOpen(false)} className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm">
                    {t("enduser.hotspot.requestCoverage.doneClose", { defaultValue: "Done" })}
                  </button>
                </div>
              ) : (
                <>
                  <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {t("enduser.hotspot.requestCoverage.body", { defaultValue: "Send your location and we'll consider it for our next rollout." })}
                  </p>

                  <div className={`rounded-xl p-3 mb-4 flex items-center gap-3 ${isDark ? "bg-[#2a2b2d]" : "bg-gray-50"}`}>
                    <MapPin className={`w-5 h-5 flex-shrink-0 ${coords ? "text-green-500" : isDark ? "text-gray-400" : "text-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      {locating ? (
                        <span className={`text-sm flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          <Loader2 className="w-4 h-4 animate-spin" /> {t("enduser.hotspot.requestCoverage.locating", { defaultValue: "Getting your location…" })}
                        </span>
                      ) : coords ? (
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {t("enduser.hotspot.requestCoverage.located", { defaultValue: "Location captured" })} · <span className="font-mono text-xs">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                        </span>
                      ) : (
                        <span className={`text-sm ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                          {geoError || t("enduser.hotspot.requestCoverage.noLocation", { defaultValue: "Location needed" })}
                        </span>
                      )}
                    </div>
                    {!locating && !coords && (
                      <button onClick={getLocation} className="text-sm font-semibold text-blue-600 hover:underline whitespace-nowrap">
                        {t("enduser.hotspot.requestCoverage.retry", { defaultValue: "Try again" })}
                      </button>
                    )}
                  </div>

                  <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {t("enduser.hotspot.requestCoverage.areaLabel", { defaultValue: "Area (optional)" })}
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={200}
                    placeholder={t("enduser.hotspot.requestCoverage.areaPlaceholder", { defaultValue: "e.g. near Shoprite, Lekki" })}
                    className={`${inputCls} mb-4`}
                  />

                  <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {t("enduser.hotspot.requestCoverage.noteLabel", { defaultValue: "Note (optional)" })}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder={t("enduser.hotspot.requestCoverage.notePlaceholder", { defaultValue: "Anything else we should know?" })}
                    className={`${inputCls} resize-none`}
                  />

                  {error && (
                    <div className={`mt-3 text-sm flex items-center gap-2 ${isDark ? "text-red-400" : "text-red-600"}`}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={closeModal}
                      disabled={submitting}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors disabled:opacity-50 ${
                        isDark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("enduser.hotspot.requestCoverage.cancel", { defaultValue: "Cancel" })}
                    </button>
                    <button
                      onClick={submit}
                      disabled={!coords || submitting}
                      className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {t("enduser.hotspot.requestCoverage.submit", { defaultValue: "Send request" })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
