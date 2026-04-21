// client/src/components/common/StatusPicker.jsx

import { useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import StatusDot from "./StatusDot";

const OPTIONS = ["Online", "Away", "On Leave", "Offline"];

const COLORS = {
  Online: "#22c55e",
  Away: "#f59e0b",
  "On Leave": "#7c6dfa",
  Offline: "#6b7280",
};

export default function StatusPicker() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Fallback to Offline if the backend hasn't initialized the field yet
  const currentStatus = user?.status || "Offline";

  const changeStatus = async (status, leaveUntil = null) => {
    setSaving(true);
    try {
      const body = { status };
      if (leaveUntil) body.leaveUntil = leaveUntil;
      
      const { data } = await api.patch("/status", body);
      
      // Update global AuthContext state
      setUser((prev) => ({
        ...prev,
        status: data.status,
        leaveUntil: data.leaveUntil,
      }));

      // Update localStorage so the status persists on refresh
      const stored = JSON.parse(localStorage.getItem('tf_user') || '{}');
      localStorage.setItem('tf_user', JSON.stringify({ 
        ...stored, 
        status: data.status, 
        leaveUntil: data.leaveUntil 
      }));

      toast(`Status set to ${data.status}`);
      setOpen(false);
      setShowLeave(false);
      setLeaveDate("");
    } catch (e) {
      toast(e.response?.data?.message || "Could not update status", "err");
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = (status) => {
    if (status === "On Leave") {
      setShowLeave(true);
      return;
    }
    changeStatus(status);
  };

  const handleLeaveSubmit = () => {
    if (!leaveDate) return toast("Please select a return date", "err");
    if (new Date(leaveDate) <= new Date())
      return toast("Date must be in the future", "err");
    changeStatus("On Leave", leaveDate);
  };

  const isOnLeave = currentStatus === "On Leave";
  const leaveExpiry = user?.leaveUntil
    ? new Date(user.leaveUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setShowLeave(false);
        }}
        className="status-picker-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          color: "var(--text-1)",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.2s ease"
        }}
      >
        <StatusDot status={currentStatus} size={8} style={{ border: "none" }} />
        <span style={{ textTransform: 'capitalize' }}>{currentStatus}</span>
        <span style={{ fontSize: 8, opacity: 0.4 }}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <>
          <div
            className="dropdown-backdrop"
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
            onClick={() => {
              setOpen(false);
              setShowLeave(false);
            }}
          />
          <div
            className="dropdown-menu animate-popIn"
            style={{
              position: "absolute",
              bottom: "120%",
              left: 0,
              zIndex: 99,
              background: "var(--bg-2, #1e1e2e)",
              border: "1px solid var(--border, rgba(255,255,255,0.1))",
              borderRadius: 12,
              padding: 8,
              minWidth: 210,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {isOnLeave && leaveExpiry && (
              <div style={{
                  fontSize: 10,
                  color: "#7c6dfa",
                  padding: "8px 12px",
                  background: "rgba(124,109,250,0.08)",
                  borderRadius: 6,
                  marginBottom: 8,
                  fontWeight: 500
                }}>
                🏖 On leave until {leaveExpiry}
              </div>
            )}

            {!showLeave ? (
              OPTIONS.map((opt) => {
                const isSelected = currentStatus === opt;
                const locked = isOnLeave && opt !== "On Leave";
                
                return (
                  <button
                    key={opt}
                    disabled={locked || saving}
                    onClick={() => !locked && handleSelect(opt)}
                    className="dropdown-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
                      color: locked ? "var(--text-3)" : "var(--text-1)",
                      cursor: locked ? "not-allowed" : "pointer",
                      fontSize: 13,
                      textAlign: "left",
                      opacity: locked ? 0.4 : 1,
                      transition: "background 0.2s ease"
                    }}
                  >
                    <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: COLORS[opt], flexShrink: 0,
                      }}
                    />
                    {opt}
                    {isSelected && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--accent)" }}>●</span>}
                    {locked && <span style={{ marginLeft: "auto", fontSize: 10 }}>🔒</span>}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: "8px" }}>
                <label style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 8, display: 'block' }}>
                  Expected Return Date
                </label>
                <input
                  type="date"
                  className="input"
                  value={leaveDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  style={{ marginBottom: 12, width: '100%' }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowLeave(false)} style={{ flex: 1 }}>
                    Back
                  </button>
                  <button className="btn btn-primary btn-xs" onClick={handleLeaveSubmit} disabled={saving} style={{ flex: 2 }}>
                    {saving ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}