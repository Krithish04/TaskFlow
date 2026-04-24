import { useState, useEffect } from "react";

export default function TaskModal({
  open,
  onClose,
  onSave,
  task,
  users,
  loading,
}) {
  // 1. Initialize form state with a lazy initializer to check for drafts
  const [form, setForm] = useState(() => {
    // Only check for drafts if we are creating a NEW task (not editing)
    const savedDraft = localStorage.getItem("tf_task_draft");
    if (savedDraft && !task) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error("Failed to parse task draft", e);
      }
    }
    return {
      title: "",
      description: "",
      assignedTo: "",
      priority: "Medium",
      status: "Pending",
      dueDate: "",
    };
  });

  // 2. Sync state when editing an existing task
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        assignedTo: task.assignedTo?._id || task.assignedTo || "",
        priority: task.priority || "Medium",
        status: task.status || "Pending",
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      });
    } else if (!localStorage.getItem("tf_task_draft")) {
      // If no draft and no task, set defaults
      setForm({
        title: "",
        description: "",
        assignedTo: users[0]?._id || "",
        priority: "Medium",
        status: "Pending",
        dueDate: "",
      });
    }
  }, [task, open, users]);

  // 3. Auto-save the draft to localStorage as you type
  useEffect(() => {
    // Only save drafts for NEW tasks while the modal is open
    if (!task && open) {
      localStorage.setItem("tf_task_draft", JSON.stringify(form));
    }
  }, [form, task, open]);

  if (!open) return null;

  const handle = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // 4. Create a wrapper for saving to clear the draft upon success
  const handleSave = async () => {
    await onSave(form);
    // Clear the draft only if we were creating a new task
    if (!task) {
      localStorage.removeItem("tf_task_draft");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>{task ? "Edit Task" : "Create Task"}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="form-section">
          <div className="field">
            <label>Title *</label>
            <input
              className="input"
              name="title"
              value={form.title}
              onChange={handle}
              placeholder="e.g. Build authentication API"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              className="input"
              name="description"
              value={form.description}
              onChange={handle}
              placeholder="Describe the task…"
            />
          </div>
          <div className="field">
            <label>Assign To *</label>
            <select
              className="input"
              name="assignedTo"
              value={form.assignedTo}
              onChange={handle}
            >
              <option value="">— Select member —</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="input-row3">
            <div className="field">
              <label>Priority</label>
              <select
                className="input"
                name="priority"
                value={form.priority}
                onChange={handle}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="input"
                name="status"
                value={form.status}
                onChange={handle}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input
                className="input"
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handle}
              />
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {/* Use the new handleSave function instead of calling onSave directly */}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || !form.title || !form.assignedTo}
          >
            {loading ? (
              <span className="spinner" />
            ) : task ? (
              "Save Changes"
            ) : (
              "Create Task"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
