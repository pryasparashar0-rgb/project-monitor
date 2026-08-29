// ---------- CHART INSTANCES ----------
let projectsChartInstance = null;
let tasksChartInstance = null;

// ---------- PROJECT MODAL ----------
let editingProjectIndex = null;

function showProjectForm() {
    document.getElementById("projectModal").classList.remove("hidden");
}

function closeProjectForm() {
    document.getElementById("projectModal").classList.add("hidden");
    document.getElementById("inputName").value = "";
    document.getElementById("inputManager").value = "";
    document.getElementById("inputDeadline").value = "";
    editingProjectIndex = null;
}

function submitProject() {
    const projectName = document.getElementById("inputName").value;
    const manager = document.getElementById("inputManager").value;
    const deadline = document.getElementById("inputDeadline").value;
    const status = document.getElementById("inputStatus").value;

    if (!projectName.trim() || !manager.trim() || !deadline) {
        alert("Please fill all fields.");
        return;
    }

    const submitBtn = event.target;
    submitBtn.classList.add("btn-loading");

    setTimeout(function () {
        finishSubmitProject(projectName, manager, deadline, status, submitBtn);
    }, 400);
}

function finishSubmitProject(projectName, manager, deadline, status, submitBtn) {
    const projects = getProjects();

    if (editingProjectIndex !== null) {
        projects[editingProjectIndex].name = projectName;
        projects[editingProjectIndex].manager = manager;
        projects[editingProjectIndex].deadline = deadline;
        projects[editingProjectIndex].status = status;
    } else {
        projects.push({
            name: projectName,
            manager: manager,
            deadline: deadline,
            status: status,
            progress: 0
        });
    }

    localStorage.setItem("projects", JSON.stringify(projects));

    renderProjects();
    renderFullProjects();
    renderReports();
    closeProjectForm();
    submitBtn.classList.remove("btn-loading");
}

function editProject(index) {
    const projects = getProjects();
    const p = projects[index];

    document.getElementById("inputName").value = p.name;
    document.getElementById("inputManager").value = p.manager;
    document.getElementById("inputDeadline").value = p.deadline;
    document.getElementById("inputStatus").value = p.status;

    editingProjectIndex = index;

    document.getElementById("projectModal").classList.remove("hidden");
}

function deleteProject(index) {
    const projects = getProjects();
    projects.splice(index, 1);
    localStorage.setItem("projects", JSON.stringify(projects));
    renderProjects();
    renderFullProjects();
    renderReports();
}

// ---------- PROJECT DATA ----------

function getDefaultProjects() {
    return [
        { name: "College Website Development", manager: "Team Alpha", deadline: "2026-08-30", status: "on-track", progress: 75 },
        { name: "Campus Infrastructure", manager: "Team Beta", deadline: "2026-08-25", status: "delayed", progress: 42 },
        { name: "Student Mobile Application", manager: "Team Gamma", deadline: "2026-09-02", status: "at-risk", progress: 60 }
    ];
}

function getProjects() {
    let projects = JSON.parse(localStorage.getItem("projects"));
    if (!projects) {
        projects = getDefaultProjects();
        localStorage.setItem("projects", JSON.stringify(projects));
    }
    return projects;
}

// ---------- DASHBOARD PROJECT LIST ----------

function renderProjects() {
    const projectList = document.getElementById("projectList");
    const projects = getProjects();

    projectList.innerHTML = "";

    if (projects.length === 0) {
        projectList.innerHTML = "<p style='padding: 20px; color: #6b7280;'>No projects yet — click '+ New Project' to add one.</p>";
        updateStats(projects);
        return;
    }

    projects.forEach(function (p, index) {
        const statusLabel = {
            "on-track": "On Track",
            "delayed": "Delayed",
            "at-risk": "At Risk"
        }[p.status] || "On Track";

        const statusClass = p.status || "on-track";
        const progress = p.progress || 0;

        projectList.innerHTML += `
            <div class="project" onclick="openProjectDetail(${index})">
                <div>
                    <h3>${p.name}</h3>
                    <p>${p.manager} • Due ${p.deadline}</p>
                </div>
                <div class="progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
                <span class="status ${statusClass}">${statusLabel}</span>
                <button class="task-edit" onclick="editProject(${index}); event.stopPropagation();">Edit</button>
                <button class="task-delete" onclick="deleteProject(${index}); event.stopPropagation();">Delete</button>
            </div>
        `;
    });

    updateStats(projects);
}

function animateCount(elementId, targetValue) {
    const el = document.getElementById(elementId);
    const startValue = parseInt(el.textContent) || 0;

    if (startValue === targetValue) return;

    const duration = 400;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
        el.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function updateStats(projects) {
    const total = projects.length;
    const delayed = projects.filter(p => p.status === "delayed").length;
    const atRisk = projects.filter(p => p.status === "at-risk").length;
    const onTrack = projects.filter(p => p.status === "on-track").length;

    animateCount("statTotal", total);
    animateCount("statOnTrack", onTrack);
    animateCount("statDelayed", delayed);
    animateCount("statAtRisk", atRisk);
}

// ---------- FULL PROJECTS PAGE (with filters + search) ----------

let currentFilter = "all";

function setFilter(status) {
    currentFilter = status;

    const buttons = document.querySelectorAll(".filter-bar .filter-btn");
    buttons.forEach(function (b) {
        b.classList.remove("active");
    });
    event.target.classList.add("active");

    renderFullProjects();
}

function renderFullProjects() {
    const container = document.getElementById("projectListFull");
    if (!container) return;

    const allProjects = getProjects();
    const searchBox = document.getElementById("projectSearch");
    const searchTerm = searchBox ? searchBox.value.toLowerCase() : "";

    let projects = currentFilter === "all"
        ? allProjects
        : allProjects.filter(p => p.status === currentFilter);

    if (searchTerm) {
        projects = projects.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.manager.toLowerCase().includes(searchTerm)
        );
    }

    container.innerHTML = "";

    if (projects.length === 0) {
        container.innerHTML = "<p style='padding: 20px; color: #6b7280;'>No projects match this filter.</p>";
        return;
    }

    projects.forEach(function (p) {
        const realIndex = allProjects.indexOf(p);

        const statusLabel = {
            "on-track": "On Track",
            "delayed": "Delayed",
            "at-risk": "At Risk"
        }[p.status] || "On Track";

        const statusClass = p.status || "on-track";
        const progress = p.progress || 0;

        container.innerHTML += `
            <div class="project" onclick="openProjectDetail(${realIndex})">
                <div>
                    <h3>${p.name}</h3>
                    <p>${p.manager} • Due ${p.deadline}</p>
                </div>
                <div class="progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <span>${progress}%</span>
                </div>
                <span class="status ${statusClass}">${statusLabel}</span>
                <button class="task-edit" onclick="editProject(${realIndex}); event.stopPropagation();">Edit</button>
                <button class="task-delete" onclick="deleteProject(${realIndex}); event.stopPropagation();">Delete</button>
            </div>
        `;
    });
}

// ---------- SIDEBAR VIEW SWITCHING ----------

function switchView(viewName) {
    const views = document.querySelectorAll(".view");
    views.forEach(function (v) {
        v.classList.add("hidden");
    });

    document.getElementById("view-" + viewName).classList.remove("hidden");

    const menus = document.querySelectorAll(".menu");
    menus.forEach(function (m) {
        m.classList.remove("active");
    });

    if (typeof event !== "undefined" && event.target && event.target.closest(".menu")) {
        event.target.closest(".menu").classList.add("active");
    }

    if (viewName === "projects") {
        renderFullProjects();
    }

    if (viewName === "reports") {
        renderReports();
    }
}

// ---------- TASKS ----------

function getTasks() {
    return JSON.parse(localStorage.getItem("tasks")) || [];
}

function saveTasks(tasks) {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function showTaskForm() {
    document.getElementById("taskModal").classList.remove("hidden");
}

function closeTaskForm() {
    document.getElementById("taskModal").classList.add("hidden");
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskProject").value = "";
    document.getElementById("taskDeadline").value = "";
}

function submitTask() {
    const title = document.getElementById("taskTitle").value;
    const project = document.getElementById("taskProject").value;
    const deadline = document.getElementById("taskDeadline").value;

    if (!title.trim() || !deadline) {
        alert("Please fill in at least Title and Deadline.");
        return;
    }

    const tasks = getTasks();
    tasks.push({
        title: title,
        project: project,
        deadline: deadline,
        done: false
    });

    saveTasks(tasks);
    renderTasks();
    renderReports();
    closeTaskForm();
}

function toggleTask(index) {
    const tasks = getTasks();
    tasks[index].done = !tasks[index].done;
    saveTasks(tasks);
    renderTasks();
    renderReports();
}

function deleteTask(index) {
    const tasks = getTasks();
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
    renderReports();
}

let currentTaskFilter = "all";

function setTaskFilter(filter) {
    currentTaskFilter = filter;

    const buttons = document.querySelectorAll("#view-tasks .filter-btn");
    buttons.forEach(function (b) {
        b.classList.remove("active");
    });
    event.target.classList.add("active");

    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById("taskList");
    const allTasks = getTasks();

    let tasks = allTasks;
    if (currentTaskFilter === "pending") {
        tasks = allTasks.filter(t => !t.done);
    } else if (currentTaskFilter === "done") {
        tasks = allTasks.filter(t => t.done);
    }

    const searchBox = document.getElementById("taskSearch");
    const searchTerm = searchBox ? searchBox.value.toLowerCase() : "";
    if (searchTerm) {
        tasks = tasks.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            (t.project && t.project.toLowerCase().includes(searchTerm))
        );
    }

    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = "<p style='padding: 20px; color: #6b7280;'>No tasks match this filter.</p>";
        return;
    }

    tasks.forEach(function (t) {
        const realIndex = allTasks.indexOf(t);
        const doneClass = t.done ? "done" : "";
        const checkedAttr = t.done ? "checked" : "";

        taskList.innerHTML += `
            <div class="task ${doneClass}">
                <input type="checkbox" ${checkedAttr} onchange="toggleTask(${realIndex})">
                <div>
                    <h3>${t.title}</h3>
                    <p>${t.project || "No project"}</p>
                </div>
                <p>Due: ${t.deadline}</p>
                <button class="task-delete" onclick="deleteTask(${realIndex})">Delete</button>
            </div>
        `;
    });
}

// ---------- REPORTS ----------

function renderReports() {
    const projects = getProjects();
    const tasks = getTasks();

    const onTrack = projects.filter(p => p.status === "on-track").length;
    const delayed = projects.filter(p => p.status === "delayed").length;
    const atRisk = projects.filter(p => p.status === "at-risk").length;

    const completed = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done).length;

    const projectsCtx = document.getElementById("projectsChart");
    const tasksCtx = document.getElementById("tasksChart");
    if (!projectsCtx || !tasksCtx) return;

    if (projectsChartInstance) projectsChartInstance.destroy();
    if (tasksChartInstance) tasksChartInstance.destroy();

    Chart.defaults.color = "#9ca3af";
    Chart.defaults.font.family = "'Poppins', sans-serif";

    projectsChartInstance = new Chart(projectsCtx, {
        type: "bar",
        data: {
            labels: ["On Track", "Delayed", "At Risk"],
            datasets: [{
                label: "Projects",
                data: [onTrack, delayed, atRisk],
                backgroundColor: [
                    "rgba(74, 222, 128, 0.7)",
                    "rgba(248, 113, 113, 0.7)",
                    "rgba(251, 191, 36, 0.7)"
                ],
                borderColor: ["#4ade80", "#f87171", "#fbbf24"],
                borderWidth: 1.5,
                borderRadius: 8,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(20, 26, 41, 0.95)",
                    borderColor: "rgba(96, 165, 250, 0.3)",
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 13, weight: "600" },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: "#9ca3af" },
                    grid: { color: "rgba(255,255,255,0.06)" }
                },
                x: {
                    ticks: { color: "#9ca3af" },
                    grid: { display: false }
                }
            }
        }
    });

    tasksChartInstance = new Chart(tasksCtx, {
        type: "doughnut",
        data: {
            labels: ["Completed", "Pending"],
            datasets: [{
                data: [completed, pending],
                backgroundColor: [
                    "rgba(124, 58, 237, 0.8)",
                    "rgba(255, 255, 255, 0.08)"
                ],
                borderColor: ["#7c3aed", "rgba(255,255,255,0.15)"],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            cutout: "70%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#9ca3af",
                        padding: 20,
                        font: { size: 13 },
                        usePointStyle: true,
                        pointStyle: "circle"
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(20, 26, 41, 0.95)",
                    borderColor: "rgba(96, 165, 250, 0.3)",
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            }
        }
    });
}

// ---------- LOGIN / LOGOUT ----------

function handleLogin() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    const errorMsg = document.getElementById("loginError");

    const validUsers = [
        { user: "admin", pass: "1234" },
        { user: "pryasparashar0@gmail.com", pass: "pryas@123" }
    ];

    const match = validUsers.find(u => u.user === username && u.pass === password);

    if (match) {
        localStorage.setItem("loggedIn", "true");
        window.location.href = "index.html";
    } else {
        errorMsg.classList.remove("hidden");
    }
}

function checkLogin() {
    if (localStorage.getItem("loggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "login.html";
}

// ---------- CURSOR SPOTLIGHT EFFECT ----------

document.addEventListener("mousemove", function (e) {
    const targets = document.querySelectorAll(".card, .team-card, .project, .task, .report-card");
    targets.forEach(function (el) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty("--x", x + "px");
        el.style.setProperty("--y", y + "px");
    });
});

// ---------- TEAM MODAL ----------

const teamData = {
    pryas: { name: "Pryas", role: "Team Lead + Frontend + Integration + Testing", work: "Leading the team, building the full frontend, and handling integration and testing." },
    varun: { name: "Varun", role: "Backend / Database", work: "Setting up the backend server and database to replace localStorage with real shared data." },
    ashwani: { name: "Ashwani", role: "Automation / APIs", work: "Building automation workflows and APIs to connect different parts of the platform." },
    ishan: { name: "Ishan", role: "Frontend backup + mistake analysis", work: "Supporting the team across tasks, coordination, and testing throughout the project." },
    bhavika: { name: "Bhavika", role: "UI/UX + Dashboard", work: "Designing the UI/UX and dashboard layout for a clean, intuitive user experience." },
    devanshu: { name: "Devanshu", role: "AI / Risk Prediction", work: "Building the AI model that predicts project risk levels based on progress, deadlines and delays." }
};

let currentTeamMember = null;

function openTeamModal(personId) {
    currentTeamMember = personId;
    const person = teamData[personId];

    document.getElementById("teamModalName").textContent = person.name;
    document.getElementById("teamModalRole").textContent = person.role;
    document.getElementById("teamModalWork").textContent = person.work;

    const savedPhoto = localStorage.getItem("teamPhoto_" + personId);
    const photoEl = document.getElementById("teamModalPhoto");

    if (savedPhoto) {
        photoEl.src = savedPhoto;
        photoEl.classList.add("show");
    } else {
        photoEl.classList.remove("show");
    }

    document.getElementById("teamModal").classList.remove("hidden");
}

function closeTeamModal() {
    document.getElementById("teamModal").classList.add("hidden");
}

function uploadTeamPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Image = e.target.result;
        localStorage.setItem("teamPhoto_" + currentTeamMember, base64Image);

        const photoEl = document.getElementById("teamModalPhoto");
        photoEl.src = base64Image;
        photoEl.classList.add("show");

        const avatarEl = document.getElementById("avatar-" + currentTeamMember);
        avatarEl.innerHTML = `<img src="${base64Image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

// ---------- PROJECT DETAIL PAGE ----------

let currentProjectIndex = null;

function openProjectDetail(index) {
    currentProjectIndex = index;
    const projects = getProjects();
    const p = projects[index];

    document.getElementById("ppName").textContent = p.name;
    document.getElementById("ppStatus").textContent = p.status;
    document.getElementById("ppBudget").textContent = p.budget || "Not added yet";
    document.getElementById("ppWork").textContent = p.work || "Not added yet";
    document.getElementById("ppIdea").textContent = p.idea || "Not added yet";

    renderProjectPhotos(p);
    switchView('projectPage');
}

function uploadProjectPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Image = e.target.result;

        const projects = getProjects();
        const p = projects[currentProjectIndex];

        if (!p.photos) p.photos = [];
        p.photos.push(base64Image);

        localStorage.setItem("projects", JSON.stringify(projects));

        renderProjectPhotos(p);
    };
    reader.readAsDataURL(file);
}

function renderProjectPhotos(p) {
    const grid = document.getElementById("ppPhotoGrid");
    grid.innerHTML = "";

    const photos = p.photos || [];

    if (photos.length === 0) {
        grid.innerHTML = "<p style='color:#6b7280;'>No photos uploaded yet.</p>";
        return;
    }

    photos.forEach(function (photoUrl) {
        grid.innerHTML += `<img src="${photoUrl}">`;
    });
}

// ---------- HOLOGRAM VIEW ----------

function openHologram() {
    const projects = getProjects();
    const p = projects[currentProjectIndex];
    const photos = p.photos || [];

    if (photos.length === 0) {
        alert("Upload a photo first to view it in Hologram mode!");
        return;
    }

    const latestPhoto = photos[photos.length - 1];
    document.getElementById("hologramImg").src = latestPhoto;
    document.getElementById("hologramLabel").textContent = p.name.toUpperCase() + " — LIVE SCAN";
    document.getElementById("hologramModal").classList.remove("hidden");
}

function closeHologram() {
    document.getElementById("hologramModal").classList.add("hidden");
}

// ---------- PROJECT QR CODE ----------

let qrCodeInstance = null;

function showProjectQR() {
    const projects = getProjects();
    const p = projects[currentProjectIndex];

    document.getElementById("qrProjectName").textContent = p.name;

    const box = document.getElementById("qrCodeBox");
    box.innerHTML = "";

    const baseUrl = window.location.origin + window.location.pathname;
    const qrUrl = baseUrl + "?project=" + currentProjectIndex;

    qrCodeInstance = new QRCode(box, {
        text: qrUrl,
        width: 200,
        height: 200,
        colorDark: "#0a0e17",
        colorLight: "#ffffff"
    });

    document.getElementById("qrModal").classList.remove("hidden");
}

function closeProjectQR() {
    document.getElementById("qrModal").classList.add("hidden");
}

function checkProjectFromURL() {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get("project");

    if (projectParam !== null) {
        const index = parseInt(projectParam);
        const projects = getProjects();
        if (projects[index]) {
            openProjectDetail(index);
        }
    }
}

// ---------- EDIT FIELD MODAL (Budget / Work / Idea) ----------

let currentEditField = null;

const fieldIcons = { budget: "💰", work: "🛠️", idea: "💡" };
const fieldLabels = { budget: "Budget", work: "Work Involved", idea: "Idea / Notes" };

function editProjectField(field) {
    currentEditField = field;
    const projects = getProjects();
    const p = projects[currentProjectIndex];

    document.getElementById("editFieldIcon").textContent = fieldIcons[field];
    document.getElementById("editFieldTitle").textContent = "Edit " + fieldLabels[field];
    document.getElementById("editFieldTextarea").value = p[field] || "";

    document.getElementById("editFieldModal").classList.remove("hidden");
    setTimeout(function () {
        document.getElementById("editFieldTextarea").focus();
    }, 100);
}

function closeEditFieldModal() {
    document.getElementById("editFieldModal").classList.add("hidden");
    currentEditField = null;
}

function saveEditField() {
    const newValue = document.getElementById("editFieldTextarea").value;
    const projects = getProjects();
    const p = projects[currentProjectIndex];

    p[currentEditField] = newValue;
    localStorage.setItem("projects", JSON.stringify(projects));

    const field = currentEditField;
    document.getElementById("pp" + field.charAt(0).toUpperCase() + field.slice(1)).textContent = newValue || "Not added yet";

    closeEditFieldModal();
}

// ---------- PAGE LOAD ----------

window.addEventListener("DOMContentLoaded", function () {
    renderProjects();
    renderTasks();
    checkProjectFromURL();

    Object.keys(teamData).forEach(function (personId) {
        const savedPhoto = localStorage.getItem("teamPhoto_" + personId);
        if (savedPhoto) {
            const avatarEl = document.getElementById("avatar-" + personId);
            if (avatarEl) {
                avatarEl.innerHTML = `<img src="${savedPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            }
        }
    });
});