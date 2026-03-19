const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "") + "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || (payload.errors && payload.errors.join(" ")) || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getMeta: () => request("/meta"),
  getDashboard: () => request("/admin/dashboard"),
  getResume: (id) => request(`/resumes/${id}`),
  createResume: (payload) => request("/resumes", { method: "POST", body: JSON.stringify(payload) }),
  updateResume: (id, payload) => request(`/resumes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteResume: (id) => request(`/resumes/${id}`, { method: "DELETE" }),
  generatePdf: (id) => request(`/resumes/${id}/pdf`, { method: "POST" }),
  shareEmail: (id, email) => request(`/resumes/${id}/share/email`, { method: "POST", body: JSON.stringify({ email }) }),
  shareWhatsApp: (id, phone) => request(`/resumes/${id}/share/whatsapp`, { method: "POST", body: JSON.stringify({ phone }) }),
  updateFeatures: (payload) => request("/admin/features", { method: "PUT", body: JSON.stringify(payload) })
};
