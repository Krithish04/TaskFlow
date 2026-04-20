// client/src/api/projects.js
// Drop this alongside your existing axios.js / api files.

import API from "./axios"; // reuse your existing axios instance

// Fetch all projects visible to the logged-in user
export const getProjects = () => API.get("/projects");

// Fetch a single project by id
export const getProject = (id) => API.get(`/projects/${id}`);

// Create a new project (PM / Admin only)
export const createProject = (data) => API.post("/projects", data);

// Update a project (PM / Admin only)
export const updateProject = (id, data) => API.put(`/projects/${id}`, data);

// Delete a project (PM / Admin only)
export const deleteProject = (id) => API.delete(`/projects/${id}`);

// Add or remove a member from a project
// action: 'add' | 'remove'
export const updateProjectMember = (projectId, userId, action) =>
  API.post(`/projects/${projectId}/members`, { userId, action });