import { useEffect, useState } from "react";
import { api } from "./api.js";

const emptyExperience = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  highlights: [""],
};
const emptyEducation = {
  institution: "",
  degree: "",
  startDate: "",
  endDate: "",
  details: "",
};
const emptyProject = { name: "", link: "", description: "" };

function titleCase(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildAnalytics(form) {
  const text = [
    form.personal.fullName,
    form.personal.headline,
    form.personal.email,
    form.personal.phone,
    form.personal.location,
    form.summary,
    ...form.skills,
    ...form.experience.flatMap((item) => [
      item.company,
      item.role,
      ...item.highlights,
    ]),
    ...form.education.flatMap((item) => [
      item.institution,
      item.degree,
      item.details,
    ]),
    ...form.projects.flatMap((item) => [
      item.name,
      item.link,
      item.description,
    ]),
    ...form.certifications,
  ]
    .filter(Boolean)
    .join("\n");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const skillsLower = form.skills
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
  const duplicates = [
    ...new Set(
      skillsLower.filter(
        (skill, index) => skillsLower.indexOf(skill) !== index,
      ),
    ),
  ];

  return {
    words,
    characters: text.length,
    lettersIncludingSpaces: text.length,
    paragraphs: text.split(/\n+/).filter((item) => item.trim()).length,
    estimatedReadingTime: Math.max(1, Math.ceil(words / 200)),
    duplicateSkills: duplicates,
    capitalizationSuggestion: titleCase(form.personal.headline),
  };
}

function SectionCard({ title, children, actions }) {
  return (
    <section className="panel">
      <div className="section-header">
        <p className="eyebrow">{title}</p>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ArrayField({ label, items, renderItem, onAdd }) {
  return (
    <SectionCard title={label} actions={<button onClick={onAdd}>Add</button>}>
      <div className="stack">{items.map(renderItem)}</div>
    </SectionCard>
  );
}

export default function App() {
  const [tab, setTab] = useState("builder");
  const [meta, setMeta] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [savedResume, setSavedResume] = useState(null);
  const [form, setForm] = useState({
    personal: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      dob: "",
      profilePicture: "",
    },
    summary: "",
    skills: [""],
    experience: [{ ...emptyExperience }],
    education: [{ ...emptyEducation }],
    projects: [{ ...emptyProject }],
    certifications: [""],
  });

  const analytics = buildAnalytics(form);

  useEffect(() => {
    loadMeta();
    loadDashboard();
  }, []);

  async function loadMeta() {
    const payload = await api.getMeta();
    setMeta(payload);
  }

  async function loadDashboard() {
    const payload = await api.getDashboard();
    setDashboard(payload);
  }

  function updatePersonal(key, value) {
    setForm((current) => ({
      ...current,
      personal: { ...current.personal, [key]: value },
    }));
  }

  function handleProfilePictureChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updatePersonal("profilePicture", reader.result);
      setMessage(`${file.name} added as profile picture.`);
    };
    reader.readAsDataURL(file);
  }

  function removeProfilePicture() {
    updatePersonal("profilePicture", "");
    setMessage("Profile picture removed.");
  }

  function updateArrayValue(key, index, value) {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  }

  function updateObjectArray(key, index, nextValue) {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) =>
        itemIndex === index ? nextValue : item,
      ),
    }));
  }

  function removeArrayItem(key, index) {
    setForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function saveResume() {
    try {
      const payload = savedResume
        ? await api.updateResume(savedResume.id, form)
        : await api.createResume(form);
      setSavedResume(payload);
      setMessage(`Saved ${payload.resumeNumber} successfully.`);
      loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function generatePdf() {
    if (!savedResume)
      return setMessage("Save the resume before generating PDF.");
    try {
      const payload = await api.generatePdf(savedResume.id);
      setSavedResume(payload.resume);
      setMessage(`PDF ready. Your password is your DOB: ${payload.password}`);
      loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function shareEmail() {
    if (!savedResume) return setMessage("Save and generate PDF first.");
    const email = window.prompt("Enter email address");
    if (!email) return;
    try {
      const payload = await api.shareEmail(savedResume.id, email);
      setMessage(`${payload.message} Password is DOB: ${payload.password}`);
      loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function shareWhatsApp() {
    if (!savedResume) return setMessage("Save and generate PDF first.");
    const phone = window.prompt("Enter WhatsApp number");
    if (!phone) return;
    try {
      const payload = await api.shareWhatsApp(savedResume.id, phone);
      setMessage(`${payload.message} Password is DOB: ${payload.password}`);
      loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleFeature(key) {
    const next = await api.updateFeatures({ [key]: !dashboard.features[key] });
    setDashboard((current) => ({ ...current, features: next }));
    setMeta((current) => ({ ...current, features: next }));
  }

  async function loadResumeIntoForm(id) {
    const payload = await api.getResume(id);
    setSavedResume(payload);
    setForm(payload.data);
    setTab("builder");
    setMessage(`Loaded ${payload.resumeNumber}`);
  }

  async function deleteSelected(id) {
    await api.deleteResume(id);
    if (savedResume?.id === id) setSavedResume(null);
    loadDashboard();
    setMessage("Resume deleted.");
  }

  function handleDownloadClick() {
    window.alert("Your pdf password is Your DOB");
  }

  return (
    <div className="app-shell">
      <aside className="hero">
     
        <h1>Dynamic Resume Builder with Time-Controlled Access</h1>
       
        {meta ? (
          <div className="status-grid">
            <div className="stat-card">
              <span>Form access</span>
              <strong>{meta.formExpired ? "Expired" : "Active"}</strong>
            </div>
            <div className="stat-card">
              <span>Entry window ends</span>
              <strong>
                {new Date(meta.formAccessEndsAt).toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="stat-card">
              <span>Storage</span>
              <strong>{meta.dbMode}</strong>
            </div>
            <div className="stat-card">
              <span>Last edited</span>
              <strong>{new Date().toLocaleString("en-IN")}</strong>
            </div>
          </div>
        ) : null}
        <div className="tab-row">
          <button
            className={tab === "builder" ? "active" : ""}
            onClick={() => setTab("builder")}
          >
            Builder
          </button>
          <button
            className={tab === "admin" ? "active" : ""}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>
        </div>
        {message ? <div className="notice">{message}</div> : null}
      </aside>

      {tab === "builder" ? (
        <main className="workspace">
          <div className="form-column">
            <SectionCard title="Personal Details">
              <div className="grid two">
                <input
                  placeholder="Full name"
                  value={form.personal.fullName}
                  onChange={(e) => updatePersonal("fullName", e.target.value)}
                />
                <input
                  placeholder="Headline"
                  value={form.personal.headline}
                  onChange={(e) => updatePersonal("headline", e.target.value)}
                />
                <input
                  placeholder="Email"
                  value={form.personal.email}
                  onChange={(e) => updatePersonal("email", e.target.value)}
                />
                <input
                  placeholder="Phone"
                  value={form.personal.phone}
                  onChange={(e) => updatePersonal("phone", e.target.value)}
                />
                <input
                  placeholder="Location"
                  value={form.personal.location}
                  onChange={(e) => updatePersonal("location", e.target.value)}
                />
                <input
                  type="date"
                  value={form.personal.dob}
                  onChange={(e) => updatePersonal("dob", e.target.value)}
                />
                <div className="full-span profile-picker">
                  <label className="file-label">
                    Choose profile picture (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                  {form.personal.profilePicture ? (
                    <div className="profile-picker-preview">
                      <img
                        className="profile-image small"
                        src={form.personal.profilePicture}
                        alt="Selected profile"
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={removeProfilePicture}
                      >
                        Remove Picture
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Professional Summary">
              <textarea
                rows="5"
                value={form.summary}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    summary: e.target.value,
                  }))
                }
              />
            </SectionCard>

            <ArrayField
              label="Skills"
              items={form.skills}
              onAdd={() =>
                setForm((current) => ({
                  ...current,
                  skills: [...current.skills, ""],
                }))
              }
              renderItem={(skill, index) => (
                <div className="inline-row" key={`skill-${index}`}>
                  <input
                    value={skill}
                    onChange={(e) =>
                      updateArrayValue("skills", index, e.target.value)
                    }
                    placeholder={`Skill ${index + 1}`}
                  />
                  <button
                    className="ghost"
                    onClick={() => removeArrayItem("skills", index)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <ArrayField
              label="Experience"
              items={form.experience}
              onAdd={() =>
                setForm((current) => ({
                  ...current,
                  experience: [...current.experience, { ...emptyExperience }],
                }))
              }
              renderItem={(item, index) => (
                <div className="subpanel" key={`experience-${index}`}>
                  <div className="grid two">
                    <input
                      value={item.company}
                      placeholder="Company"
                      onChange={(e) =>
                        updateObjectArray("experience", index, {
                          ...item,
                          company: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.role}
                      placeholder="Role"
                      onChange={(e) =>
                        updateObjectArray("experience", index, {
                          ...item,
                          role: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.startDate}
                      placeholder="Start date"
                      onChange={(e) =>
                        updateObjectArray("experience", index, {
                          ...item,
                          startDate: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.endDate}
                      placeholder="End date"
                      onChange={(e) =>
                        updateObjectArray("experience", index, {
                          ...item,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <textarea
                    rows="3"
                    value={item.highlights.join("\n")}
                    placeholder="One highlight per line"
                    onChange={(e) =>
                      updateObjectArray("experience", index, {
                        ...item,
                        highlights: e.target.value.split("\n"),
                      })
                    }
                  />
                  <button
                    className="ghost"
                    onClick={() => removeArrayItem("experience", index)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <ArrayField
              label="Education"
              items={form.education}
              onAdd={() =>
                setForm((current) => ({
                  ...current,
                  education: [...current.education, { ...emptyEducation }],
                }))
              }
              renderItem={(item, index) => (
                <div className="subpanel" key={`education-${index}`}>
                  <div className="grid two">
                    <input
                      value={item.institution}
                      placeholder="Institution"
                      onChange={(e) =>
                        updateObjectArray("education", index, {
                          ...item,
                          institution: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.degree}
                      placeholder="Degree"
                      onChange={(e) =>
                        updateObjectArray("education", index, {
                          ...item,
                          degree: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.startDate}
                      placeholder="Start date"
                      onChange={(e) =>
                        updateObjectArray("education", index, {
                          ...item,
                          startDate: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.endDate}
                      placeholder="End date"
                      onChange={(e) =>
                        updateObjectArray("education", index, {
                          ...item,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <textarea
                    rows="3"
                    value={item.details}
                    placeholder="Details"
                    onChange={(e) =>
                      updateObjectArray("education", index, {
                        ...item,
                        details: e.target.value,
                      })
                    }
                  />
                  <button
                    className="ghost"
                    onClick={() => removeArrayItem("education", index)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <ArrayField
              label="Projects"
              items={form.projects}
              onAdd={() =>
                setForm((current) => ({
                  ...current,
                  projects: [...current.projects, { ...emptyProject }],
                }))
              }
              renderItem={(item, index) => (
                <div className="subpanel" key={`project-${index}`}>
                  <div className="grid two">
                    <input
                      value={item.name}
                      placeholder="Project name"
                      onChange={(e) =>
                        updateObjectArray("projects", index, {
                          ...item,
                          name: e.target.value,
                        })
                      }
                    />
                    <input
                      value={item.link}
                      placeholder="Project link"
                      onChange={(e) =>
                        updateObjectArray("projects", index, {
                          ...item,
                          link: e.target.value,
                        })
                      }
                    />
                  </div>
                  <textarea
                    rows="3"
                    value={item.description}
                    placeholder="Project description"
                    onChange={(e) =>
                      updateObjectArray("projects", index, {
                        ...item,
                        description: e.target.value,
                      })
                    }
                  />
                  <button
                    className="ghost"
                    onClick={() => removeArrayItem("projects", index)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <ArrayField
              label="Certifications"
              items={form.certifications}
              onAdd={() =>
                setForm((current) => ({
                  ...current,
                  certifications: [...current.certifications, ""],
                }))
              }
              renderItem={(item, index) => (
                <div className="inline-row" key={`cert-${index}`}>
                  <input
                    value={item}
                    placeholder={`Certification ${index + 1}`}
                    onChange={(e) =>
                      updateArrayValue("certifications", index, e.target.value)
                    }
                  />
                  <button
                    className="ghost"
                    onClick={() => removeArrayItem("certifications", index)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            <div className="action-bar">
              <button onClick={saveResume} disabled={meta?.formExpired}>
                Save Resume
              </button>
              <button onClick={generatePdf}>Generate PDF</button>
              <button onClick={shareEmail}>Share Email</button>
              <button onClick={shareWhatsApp}>Share WhatsApp</button>
            </div>
            {savedResume?.pdf ? (
              <a
                className="download-link"
                href={`http://localhost:5000/api/download/${savedResume.pdf.token}`}
                target="_blank"
                rel="noreferrer"
                onClick={handleDownloadClick}
              >
                Download current PDF
              </a>
            ) : null}
          </div>

          <div className="preview-column">
            <SectionCard title="Content Intelligence">
              <div className="analytics-grid">
                <div>
                  <span>Words</span>
                  <strong>{analytics.words}</strong>
                </div>
                <div>
                  <span>Characters</span>
                  <strong>{analytics.characters}</strong>
                </div>
                <div>
                  <span>Letters incl. spaces</span>
                  <strong>{analytics.lettersIncludingSpaces}</strong>
                </div>
                <div>
                  <span>Paragraphs</span>
                  <strong>{analytics.paragraphs}</strong>
                </div>
                <div>
                  <span>Reading time</span>
                  <strong>{analytics.estimatedReadingTime} min</strong>
                </div>
                <div>
                  <span>Resume ID</span>
                  <strong>{savedResume?.resumeNumber || "Pending"}</strong>
                </div>
              </div>
              <div className="tips">
                <p>Recommended length: 300-700 words</p>
                {analytics.words > 700 ? (
                  <p className="warning">
                    Warning: The recommended resume length is under 700 words.
                  </p>
                ) : null}
                {analytics.duplicateSkills.length ? (
                  <p className="warning">
                    Duplicate skill detected:{" "}
                    {titleCase(analytics.duplicateSkills[0])}
                  </p>
                ) : null}
                {form.personal.headline &&
                form.personal.headline !==
                  analytics.capitalizationSuggestion ? (
                  <p className="suggestion">
                    Suggestion: {analytics.capitalizationSuggestion}
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Live Resume Preview">
              <div className="page-stack">
                <article className="resume-page">
                  <div className="resume-header">
                    <div>
                      <h2>{form.personal.fullName || "Your Name"}</h2>
                      <p className="headline">
                        {form.personal.headline || "Professional Headline"}
                      </p>
                      <p className="muted">
                        {[
                          form.personal.email,
                          form.personal.phone,
                          form.personal.location,
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    </div>
                    {form.personal.profilePicture ? (
                      <img
                        className="profile-image"
                        src={form.personal.profilePicture}
                        alt="Profile"
                      />
                    ) : null}
                  </div>
                  <h3>Summary</h3>
                  <p>{form.summary || "Your summary will appear here."}</p>
                  <h3>Skills</h3>
                  <p>
                    {form.skills.filter(Boolean).join(", ") ||
                      "Add skills to preview them."}
                  </p>
                  <h3>Experience</h3>
                  {form.experience.map((item, index) => (
                    <div key={`preview-exp-${index}`} className="preview-block">
                      <strong>
                        {item.role || "Role"}
                        {item.company ? `, ${item.company}` : ""}
                      </strong>
                      <p>
                        {[item.startDate, item.endDate]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                      <ul>
                        {item.highlights
                          .filter(Boolean)
                          .map((line, lineIndex) => (
                            <li key={lineIndex}>{line}</li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </article>
                <article className="resume-page">
                  <h3>Education</h3>
                  {form.education.map((item, index) => (
                    <div key={`preview-edu-${index}`} className="preview-block">
                      <strong>
                        {item.degree || "Degree"}
                        {item.institution ? `, ${item.institution}` : ""}
                      </strong>
                      <p>
                        {[item.startDate, item.endDate]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                      <p>{item.details}</p>
                    </div>
                  ))}
                  <h3>Projects</h3>
                  {form.projects.map((item, index) => (
                    <div
                      key={`preview-proj-${index}`}
                      className="preview-block"
                    >
                      <strong>{item.name || "Project name"}</strong>
                      <p>{item.description}</p>
                      <p>{item.link}</p>
                    </div>
                  ))}
                  <h3>Certifications</h3>
                  <ul>
                    {form.certifications.filter(Boolean).map((item, index) => (
                      <li key={`cert-preview-${index}`}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </SectionCard>
          </div>
        </main>
      ) : (
        <main className="workspace admin-workspace">
          <div className="panel">
            <p className="eyebrow">Feature Toggles</p>
            {dashboard
              ? Object.entries(dashboard.features).map(([key, value]) => (
                  <label className="toggle-row" key={key}>
                    <span>{key}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => toggleFeature(key)}
                    />
                  </label>
                ))
              : null}
          </div>

          <div className="panel">
            <p className="eyebrow">Resumes</p>
            {dashboard?.resumes.map((resume) => (
              <div className="admin-card" key={resume.id}>
                <div>
                  <strong>{resume.resumeNumber}</strong>
                  <p>{resume.data.personal.fullName}</p>
                  <p>Downloads: {resume.downloads}</p>
                </div>
                <div className="inline-row">
                  <button onClick={() => loadResumeIntoForm(resume.id)}>
                    Edit
                  </button>
                  <button
                    className="ghost"
                    onClick={() => deleteSelected(resume.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <p className="eyebrow">Share History</p>
            {dashboard?.shareHistory.map((item) => (
              <div className="log-row" key={item.id}>
                <strong>{item.method}</strong>
                <span>{item.recipient}</span>
                <span>{new Date(item.timestamp).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <p className="eyebrow">Activity Logs</p>
            {dashboard?.activityLogs.map((item) => (
              <div className="log-row" key={item.id}>
                <strong>{item.action}</strong>
                <span>{item.resumeId}</span>
                <span>{new Date(item.timestamp).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
