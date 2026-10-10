import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Drawer from './Drawer';
import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';
import api from '../../api/axios';
import { formatDate, isOverdue, priorityClass, statusClass, timeAgo } from '../../utils';
import { Send, Clock, User, Calendar, Tag, MessageSquare } from 'lucide-react';

export default function TaskViewModal({ task, open, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && task) fetchComments();
  }, [open, task]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/comments/${task._id}`);
      setComments(Array.isArray(data) ? data : data?.data || []);
    } catch {
      /* silent */
    }
    setLoading(false);
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/comments/${task._id}`, { text: text.trim() });
      setComments((prev) => [...prev, data]);
      setText('');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send comment', 'error');
    }
    setSending(false);
  };

  if (!task) return null;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Drawer isOpen={open} onClose={onClose} title={task.title} size="lg">
      <div className="task-drawer-container">
        {/* Top Metadata */}
        <div className="task-drawer-meta-grid">
          <div className="meta-item">
            <span className="meta-label"><Tag size={14} /> Status</span>
            <span className={`tf-badge status-${task.status?.toLowerCase().replace(/\s+/g, '-')}`}>
              {task.status}
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label"><Tag size={14} /> Priority</span>
            <span className={`tf-badge priority-${task.priority?.toLowerCase()}`}>
              {task.priority}
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label"><User size={14} /> Assignee</span>
            <div className="flex items-center gap-2">
              <Avatar name={task.assignedTo?.name || 'Unassigned'} size={24} color={task.assignedTo?.color || '#6366f1'} />
              <span className="text-sm font-semibold">{task.assignedTo?.name || 'Unassigned'}</span>
            </div>
          </div>

          <div className="meta-item">
            <span className="meta-label"><Calendar size={14} /> Due Date</span>
            <span className={`text-sm ${overdue ? 'text-danger font-semibold' : 'text-muted'}`}>
              {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="drawer-section-box">
          <h4 className="section-box-title">Description</h4>
          <p className="section-box-desc">{task.description || 'No description provided for this task.'}</p>
        </div>

        {/* Discussion Comments Thread */}
        <div className="drawer-comments-box">
          <div className="comments-header font-semibold">
            <MessageSquare size={16} /> Activity & Discussion ({comments.length})
          </div>

          <div className="comments-stream">
            {loading && <div className="comments-loading"><div className="btn-spinner" /></div>}
            {!loading && comments.length === 0 && (
              <div className="comments-empty">No comments yet. Start the conversation!</div>
            )}
            {comments.map((c) => {
              const mine = c.author?._id === user?._id;
              return (
                <div key={c._id} className={`comment-bubble-row ${mine ? 'is-mine' : ''}`}>
                  <Avatar name={c.author?.name || 'Member'} color={c.author?.color || '#6366f1'} size={32} />
                  <div className="comment-bubble-content">
                    <div className="comment-author-name">{c.author?.name}</div>
                    <div className="comment-text-body">{c.text}</div>
                    <div className="comment-timestamp">{timeAgo(c.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="comment-input-area">
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            />
            <Button icon={Send} onClick={send} loading={sending} disabled={!text.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
