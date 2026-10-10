import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Drawer from './Drawer';
import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';
import Checkbox from './Checkbox';
import api from '../../api/axios';
import { formatDate, isOverdue, timeAgo } from '../../utils';
import {
  Link,
  Send,
  Sparkles,
  Clock,
  User,
  Calendar,
  Tag,
  CheckSquare,
  MessageSquare,
  Activity as ActivityIcon,
} from 'lucide-react';

export default function TaskDrawer({ task, open, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subtasks checklist placeholder state
  const [subtasks, setSubtasks] = useState([
    { id: 1, text: 'Add rotation logic to /api/auth/refresh', completed: true },
    { id: 2, text: 'Store token family in MongoDB', completed: true },
    { id: 3, text: 'Update Axios interceptor on the client', completed: false },
  ]);

  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/comments/${task._id}`);
      setComments(Array.isArray(data) ? data : data?.data || []);
    } catch {
      /* silent catch */
    }
    setLoading(false);
  };

  const handleSendComment = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);

    try {
      const { data } = await api.post(`/comments/${task._id}`, { text: text.trim() });
      setComments((prev) => [...prev, data]);
      setText('');
      toast('Comment posted', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send comment', 'error');
    }
    setSending(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopied(true);
    toast('Task link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSubtask = (id) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;
  const taskKey = task.key || `TF-${task._id ? task._id.slice(-3).toUpperCase() : '128'}`;
  const labelText = task.label || 'Backend';

  const headerActions = (
    <button
      type="button"
      className="btn-icon btn-sm"
      onClick={handleCopyLink}
      title="Copy link to task"
      aria-label="Copy link to task"
    >
      <Link size={16} />
    </button>
  );

  const headerTitle = (
    <div className="task-drawer-header-title">
      <div className="text-xs text-muted font-medium mb-1 flex items-center gap-1.5">
        <span>{taskKey}</span>
        <span>•</span>
        <span>{labelText}</span>
      </div>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', lineHeight: 1.25 }}>
        {task.title}
      </h2>
    </div>
  );

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={headerTitle}
      headerActions={headerActions}
      size="lg"
      className="task-drawer-redesign"
    >
      <div className="task-drawer-container flex flex-col gap-6 py-2">
        {/* ── PROPERTY GRID ── */}
        <div className="task-property-grid grid grid-cols-2 gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border)' }}>
          <div className="property-item flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Status</span>
            <div>
              <Badge variant={task.status?.toLowerCase().replace(/\s+/g, '-') || 'progress'}>
                {task.status || 'In Progress'}
              </Badge>
            </div>
          </div>

          <div className="property-item flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Priority</span>
            <div>
              <Badge variant={task.priority?.toLowerCase() || 'high'}>
                {task.priority || 'High'}
              </Badge>
            </div>
          </div>

          <div className="property-item flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Assignee</span>
            {task.assignedTo ? (
              <div className="flex items-center gap-2">
                <Avatar user={task.assignedTo} name={task.assignedTo.name} color={task.assignedTo.color} size={24} />
                <span className="text-sm font-semibold">{task.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted italic">Unassigned</span>
            )}
          </div>

          <div className="property-item flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Due date</span>
            <span className={`text-sm font-semibold ${overdue ? 'text-danger' : 'text-primary'}`}>
              {formatDate(task.dueDate)} {overdue && '• overdue'}
            </span>
          </div>

          <div className="property-item flex flex-col gap-1 col-span-2">
            <span className="text-xs text-muted font-medium">Time tracked</span>
            <span className="text-sm font-medium text-secondary">
              3h 20m of 6h estimate <span className="text-xs text-muted">(Placeholder)</span>
            </span>
          </div>
        </div>

        {/* ── DESCRIPTION BLOCK ── */}
        <div className="drawer-section-box flex flex-col gap-1.5">
          <h4 className="font-semibold text-sm">Description</h4>
          <p className="text-sm text-secondary leading-relaxed">
            {task.description || 'Rotate refresh tokens on every use and revoke the previous one. Detect token reuse and invalidate the whole session family. Needs updated Axios interceptor on the client.'}
          </p>
        </div>

        {/* ── AI ASSISTANT ACTION STRIP (Placeholder) ── */}
        <div className="ai-assistant-strip flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--accent-text)' }}>
            <Sparkles size={16} />
            <span className="text-xs font-semibold">AI assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" style={{ height: 30, fontSize: 11 }}>
              Summarize thread
            </Button>
            <Button size="sm" variant="secondary" style={{ height: 30, fontSize: 11 }}>
              Suggest subtasks
            </Button>
          </div>
        </div>

        {/* ── SUBTASKS CHECKLIST (Placeholder preview) ── */}
        <div className="subtasks-section flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckSquare size={16} /> Subtasks
            </h4>
            <span className="text-xs text-muted font-medium">
              {completedSubtasksCount} of {subtasks.length}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-active)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                backgroundColor: '#10B981',
              }}
            />
          </div>

          <div className="flex flex-col gap-2 mt-1">
            {subtasks.map((st) => (
              <Checkbox
                key={st.id}
                label={st.text}
                checked={st.completed}
                onChange={() => toggleSubtask(st.id)}
              />
            ))}
          </div>
        </div>

        {/* ── COMMENTS & ACTIVITY SECTION ── */}
        <div className="drawer-comments-box flex flex-col gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              className={`flex items-center gap-1.5 text-xs font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === 'comments' ? 'border-accent text-primary' : 'border-transparent text-muted'
              }`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={14} /> Comments • {comments.length}
            </button>
            <button
              type="button"
              className={`flex items-center gap-1.5 text-xs font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === 'activity' ? 'border-accent text-primary' : 'border-transparent text-muted'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              <ActivityIcon size={14} /> Activity
            </button>
          </div>

          {activeTab === 'comments' ? (
            <>
              <div className="comments-stream flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                {loading && (
                  <div className="text-center py-4 text-xs text-muted">
                    Loading comments...
                  </div>
                )}

                {!loading && comments.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted">
                    No comments yet. Start the conversation!
                  </div>
                )}

                {comments.map((c) => {
                  const mine = c.author?._id === user?._id;
                  return (
                    <div key={c._id} className="comment-bubble-row flex items-start gap-3">
                      <Avatar
                        user={c.author}
                        name={c.author?.name || 'Member'}
                        color={c.author?.color}
                        size={30}
                      />
                      <div className="comment-bubble-content flex-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-primary">{c.author?.name || 'Member'}</span>
                          <span className="text-xs text-muted" style={{ fontSize: 10 }}>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-secondary leading-normal">{c.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Composer */}
              <form onSubmit={handleSendComment} className="comment-composer flex items-center gap-2 mt-2">
                <Avatar user={user} name={user?.name} color={user?.color} size={30} />
                <input
                  type="text"
                  className="input-control flex-1"
                  placeholder="Write a comment. Use @ to mention someone"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Send}
                  loading={sending}
                  disabled={!text.trim()}
                >
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="activity-stream flex flex-col gap-3 text-xs text-muted py-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <span>Task created by <strong>Sara Khan</strong> • Oct 10, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                <span>Priority set to <strong>High</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
