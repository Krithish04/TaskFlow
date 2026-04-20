// client/src/pages/user/MyProjects.jsx
// Employees see only projects they are included in.

import { useState, useEffect } from "react";
import { getProjects } from "../../api/project";
import { useToast } from "../../context/ToastContext";

const STATUS_COLORS = {
  planning: { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1" },
  active:   { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  on_hold:  { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  completed:{ bg: "#F0FDF4", text: "#14532D", dot: "#22C55E" },
};

const STATUS_LABELS = {
  planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed",
};

const Avatar = ({ user, size = 30 }) => (
  <div title={user.name} style={{
    width: size, height: size, borderRadius: "50%",
    background: `hsl(${(user.name.charCodeAt(0) * 40) % 360}, 65%, 55%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 700, fontSize: size * 0.38,
    flexShrink: 0, border: "2px solid #fff", cursor: "default",
  }}>
    {user.name[0].toUpperCase()}
  </div>
);

const Badge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {STATUS_LABELS[status]}
    </span>
  );
};

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data.data))
      .catch(() => addToast("Failed to load your projects", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#888" }}>
      Loading your projects…
    </div>
  );

  if (projects.length === 0) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📂</div>
      <h2 style={{ color: "#333", fontWeight: 700 }}>No Projects Yet</h2>
      <p style={{ color: "#888", fontSize: 15 }}>
        You haven't been assigned to any projects yet. Check back later!
      </p>
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111" }}>My Projects</h1>
        <p style={{ margin: "5px 0 0", color: "#666", fontSize: 14 }}>
          You are part of {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Project List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {projects.map((p) => (
          <ProjectCard
            key={p._id}
            project={p}
            open={expanded === p._id}
            onToggle={() => setExpanded(expanded === p._id ? null : p._id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, open, onToggle }) {
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline) - new Date()) / 86400000)
    : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1.5px solid #F0F0F0",
      boxShadow: open ? "0 4px 20px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.05)",
      overflow: "hidden", transition: "box-shadow 0.2s",
    }}>
      {/* Card Header (always visible) */}
      <div
        onClick={onToggle}
        style={{
          padding: "20px 24px", display: "flex",
          alignItems: "center", gap: 16, cursor: "pointer",
          borderBottom: open ? "1.5px solid #F3F4F6" : "none",
        }}>
        {/* Project icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `hsl(${(project.name.charCodeAt(0) * 55) % 360}, 70%, 92%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>
          📁
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{project.name}</span>
            <Badge status={project.status} />
            {project.teamLeader && (
              <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                You may be leading this
              </span>
            )}
          </div>
          {project.description && (
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {project.description}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {/* Member avatars */}
          <div style={{ display: "flex" }}>
            {project.members.slice(0, 4).map((m, i) => (
              <div key={m._id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                <Avatar user={m} size={28} />
              </div>
            ))}
            {project.members.length > 4 && (
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#E5E7EB",
                fontSize: 10, fontWeight: 700, color: "#555",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginLeft: -8, border: "2px solid #fff",
              }}>
                +{project.members.length - 4}
              </div>
            )}
          </div>
          <span style={{ color: "#9CA3AF", fontSize: 18 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {open && (
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Left: Project info */}
            <div>
              <SectionTitle>Project Details</SectionTitle>
              <InfoRow label="Manager" value={project.projectManager?.name || "—"} />
              <InfoRow
                label="Deadline"
                value={
                  project.deadline
                    ? new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "No deadline"
                }
              />
              {daysLeft !== null && (
                <InfoRow
                  label="Time left"
                  value={
                    daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} days` :
                    daysLeft === 0 ? "Due today" :
                    `${daysLeft} days remaining`
                  }
                  valueColor={daysLeft < 0 ? "#B91C1C" : daysLeft < 7 ? "#C2410C" : "#15803D"}
                />
              )}
              <InfoRow label="Status" value={STATUS_LABELS[project.status]} />
            </div>

            {/* Right: Team */}
            <div>
              <SectionTitle>Your Team</SectionTitle>

              {project.teamLeader ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Avatar user={project.teamLeader} size={34} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{project.teamLeader.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>Team Leader</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                    👑 Leader
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>No team leader assigned.</p>
              )}

              {project.members.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {project.members.map((m) => (
                    <div key={m._id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={m} size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{m.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#aaa" }}>No other members yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
    {children}
  </div>
);

const InfoRow = ({ label, value, valueColor = "#111" }) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
    <span style={{ color: "#888" }}>{label}</span>
    <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
  </div>
);