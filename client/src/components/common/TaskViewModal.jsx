import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import Avatar from './Avatar'
import { formatDate, isOverdue, priorityClass, statusClass, timeAgo } from '../../utils'

export default function TaskViewModal({ task, open, onClose }) {
  const { user }    = useAuth()
  const { toast }   = useToast()
  const [comments, setComments] = useState([])
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && task) fetchComments()
  }, [open, task])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/comments/${task._id}`)
      setComments(data)
    } catch { /* silent */ }
    setLoading(false)
  }

  const send = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const { data } = await api.post(`/comments/${task._id}`, { text: text.trim() })
      setComments(prev => [...prev, data])
      setText('')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send', 'err')
    }
    setSending(false)
  }

  if (!open || !task) return null
  const overdue = isOverdue(task.dueDate, task.status)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3 style={{ maxWidth: '70%' }}>{task.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="task-view">
          {/* Left: Task info */}
          <div className="task-info">
            <div className="info-row">
              <span className="info-lbl">Status</span>
              <span className={`tag ${statusClass(task.status)}`}>{task.status}</span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Priority</span>
              <span className={`tag ${priorityClass(task.priority)}`}>{task.priority}</span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Assigned To</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar user={task.assignedTo} size="sm" />
                <span style={{ fontSize: 13 }}>{task.assignedTo?.name}</span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Created By</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar user={task.createdBy} size="sm" />
                <span style={{ fontSize: 13 }}>{task.createdBy?.name}</span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Due Date</span>
              <span style={{ fontSize: 13, color: overdue ? 'var(--rose)' : 'var(--text)' }}>
                {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
              </span>
            </div>
            {task.description && (
              <div className="task-desc">{task.description}</div>
            )}
          </div>

          {/* Right: Comments */}
          <div className="chat-wrap">
            <div className="chat-title">💬 Comments ({comments.length})</div>

            <div className="chat-msgs">
              {loading && <div className="chat-empty"><div className="spinner" /></div>}
              {!loading && comments.length === 0 && (
                <div className="chat-empty">No comments yet. Start the conversation!</div>
              )}
              {comments.map(c => {
                const mine = c.author?._id === user?._id
                return (
                  <div key={c._id} className={`chat-msg ${mine ? 'mine' : ''}`}>
                    <Avatar user={c.author} size="sm" />
                    <div className="chat-bubble">
                      <div className="chat-author">{c.author?.name}</div>
                      <div className="chat-text">{c.text}</div>
                      <div className="chat-time">{timeAgo(c.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input">
              <input
                className="input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write a comment…"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              />
              <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
                {sending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
