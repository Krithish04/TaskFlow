import { useState, useEffect } from 'react'
import { getProjects, createProject, updateProject, deleteProject } from '../../api/project'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'

const STATUS_LABELS = { planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed' }
const STATUS_TAG    = { planning: 'tag-purple', active: 'tag-teal', on_hold: 'tag-yellow', completed: 'tag-green' }

const Dot = ({ status }) => {
  const colors = { planning: '#7c6dfa', active: '#2de2c8', on_hold: '#f59e0b', completed: '#22c55e' }
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status] || '#888', display: 'inline-block', marginRight: 5 }} />
}

const MiniAvatar = ({ user, size = 28 }) => (
  <div title={user.name} style={{
    width: size, height: size, borderRadius: '50%',
    background: `hsl(${(user.name.charCodeAt(0) * 40) % 360}, 60%, 55%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: size * 0.38,
    flexShrink: 0, border: '2px solid var(--bg-2, #1e1e2e)',
  }}>
    {user.name[0].toUpperCase()}
  </div>
)

// ── Modal ────────────────────────────────────────────────────────────────────
function ProjectModal({ project, employees, onSave, onClose }) {
  // 1. Initialize form from localStorage if it's a NEW project
  const [form, setForm] = useState(() => {
    if (!project) {
      const saved = localStorage.getItem('tf_project_draft')
      if (saved) return JSON.parse(saved)
    }
    return {
      name:        project?.name        || '',
      description: project?.description || '',
      deadline:    project?.deadline    ? project.deadline.slice(0, 10) : '',
      status:      project?.status      || 'active',
      teamLeader:  project?.teamLeader?._id || '',
      members:     project?.members?.map(m => m._id) || [],
    }
  })

  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // 2. Auto-save to localStorage whenever the form changes
  useEffect(() => {
    if (!project) {
      localStorage.setItem('tf_project_draft', JSON.stringify(form))
    }
  }, [form, project])

  const toggle = id =>
    setForm(f => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter(x => x !== id) : [...f.members, id],
    }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast('Project name is required', 'err')
    setSaving(true)
    try {
      if (project) {
        await updateProject(project._id, form)
        toast('Project updated')
      } else {
        await createProject(form)
        toast('Project created!')
        // 3. Clear draft on successful creation
        localStorage.removeItem('tf_project_draft') 
      }
      onSave()
    } catch (e) {
      toast(e.response?.data?.message || 'Error saving project', 'err')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>{project ? 'Edit Project' : 'New Project'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 24px 8px' }}>
          <div className="field">
            <label>Project Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Redesign" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea className="input" style={{ height: 80, resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief project overview..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Team Leader</label>
            <select className="input" value={form.teamLeader} onChange={e => setForm({ ...form, teamLeader: e.target.value })}>
              <option value="">— None —</option>
              {employees.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Team Members</label>
            <div className="input" style={{ height: 'auto', maxHeight: 180, overflowY: 'auto', padding: '6px 10px' }}>
              {employees.length === 0
                ? <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '4px 0' }}>No employees found.</p>
                : employees.map(u => (
                  <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.members.includes(u._id)} onChange={() => toggle(u._id)} />
                    <MiniAvatar user={u} size={24} />
                    <span style={{ fontSize: 14 }}>{u.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{u.email}</span>
                  </label>
                ))
              }
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              {form.members.length} member{form.members.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete }) {
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline) - new Date()) / 86400000)
    : null

  return (
    <div className="team-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className={`tag ${STATUS_TAG[project.status] || 'tag-teal'}`}>
          <Dot status={project.status} />{STATUS_LABELS[project.status]}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
          <button className="btn btn-danger btn-xs" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
      {project.description && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
          {project.description.length > 90 ? project.description.slice(0, 90) + '…' : project.description}
        </div>
      )}

      {project.teamLeader && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MiniAvatar user={project.teamLeader} size={26} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{project.teamLeader.name}</span>
          <span className="tag tag-yellow" style={{ fontSize: 11, padding: '1px 7px' }}>👑 Leader</span>
        </div>
      )}

      {project.members.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex' }}>
            {project.members.slice(0, 5).map((m, i) => (
              <div key={m._id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
                <MiniAvatar user={m} size={26} />
              </div>
            ))}
            {project.members.length > 5 && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--bg-3, #333)', color: 'var(--text-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, marginLeft: -8,
                border: '2px solid var(--bg-2, #1e1e2e)',
              }}>+{project.members.length - 5}</div>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {daysLeft !== null && (
        <span className={`tag ${daysLeft < 0 ? 'tag-red' : daysLeft < 7 ? 'tag-yellow' : 'tag-green'}`} style={{ fontSize: 12, alignSelf: 'flex-start' }}>
          {daysLeft < 0 ? `⚠ Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? '📅 Due today' : `📅 ${daysLeft}d left`}
        </span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PMProjects() {
  const [projects,  setProjects]  = useState([])
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const { toast } = useToast()

  const load = async () => {
    try {
      // Fetch projects
      const pRes = await getProjects()
      setProjects(pRes.data.data)

      // Try /users/assignable first, fall back to /users
      let allUsers = []
      try {
        const r = await api.get('/users/assignable')
        const raw = r.data?.data ?? r.data
        allUsers = Array.isArray(raw) ? raw : []
      } catch {
        try {
          const r = await api.get('/users')
          const raw = r.data?.data ?? r.data
          allUsers = Array.isArray(raw) ? raw : []
        } catch (e2) {
          console.error('[Projects] Could not fetch users:', e2)
        }
      }

      // Your DB uses 'User' (capital U) — filter to employees only
      // If no 'User' role found, show everyone (handles edge cases)
      const employees = allUsers.filter(u => u.role === 'User')
      setEmployees(employees.length > 0 ? employees : allUsers)
    } catch (e) {
      toast('Failed to load projects', 'err')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return
    try {
      await deleteProject(id)
      toast('Project deleted', 'err')
      load()
    } catch { toast('Error deleting project', 'err') }
  }

  const filtered = projects
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    )

  if (loading) return (
    <div className="page animate-fadeIn">
      <div className="empty"><div className="empty-icon">⏳</div><h4>Loading projects…</h4></div>
    </div>
  )

  return (
    <div className="page animate-fadeIn">
      <div className="page-hdr">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''} managed by you</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Project</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ maxWidth: 240, margin: 0 }}
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', ...Object.keys(STATUS_LABELS)].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'} btn-xs`}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📂</div>
          <h4>No projects found</h4>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Create your first project to get started.</p>
        </div>
      ) : (
        <div className="team-grid">
          {filtered.map(p => (
            <ProjectCard key={p._id} project={p} onEdit={() => setModal(p)} onDelete={() => handleDelete(p._id)} />
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          employees={employees}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}