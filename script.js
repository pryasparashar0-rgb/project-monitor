// =====================================================================
// FIREBASE CONFIG — paste your own config object from the Firebase console
// (Project Settings → General → Your apps → SDK setup and configuration)
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCA_WuWUYbdt3N9tlwX5lYzPzrw7vGo_NM",
    authDomain: "project-monitor-sih.firebaseapp.com",
    projectId: "project-monitor-sih",
    storageBucket: "project-monitor-sih.firebasestorage.app",
    messagingSenderId: "773667222615",
    appId: "1:773667222615:web:bd21a99be8631bf79ddf12"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let editingProjectId = null; // was editingProjectIndex — now stores a Firestore doc id

// ---------- PROJECT MODAL ----------

function showProjectForm() {
    document.getElementById("projectModal").classList.remove("hidden");
}

function closeProjectForm() {
    document.getElementById("projectModal").classList.add("hidden");
    document.getElementById("inputName").value = "";
    document.getElementById("inputManager").value = "";
    document.getElementById("inputDeadline").value = "";
    editingProjectId = null;
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
    const data = {
        name: projectName,
        manager: manager,
        deadline: deadline,
        status: status
    };

    let promise;
    if (editingProjectId !== null) {
        // keep existing progress value, just update the edited fields
        promise = db.collection("projects").doc(editingProjectId).update(data);
    } else {
        data.progress = 0;
        promise = db.collection("projects").add(data);
    }

    promise
        .then(function () {
            closeProjectForm();
            submitBtn.classList.remove("btn-loading");
        })
        .catch(function (err) {
            alert("Error saving project: " + err.message);
            submitBtn.classList.remove("btn-loading");
        });
    // renderProjects()/renderFullProjects() fire automatically via the
    // onSnapshot listener in listenProjects() once the write lands
}

function editProject(index) {
    const projects = getProjects();
    const p = projects[index];

    document.getElementById("inputName").value = p.name;
    document.getElementById("inputManager").value = p.manager;
    document.getElementById("inputDeadline").value = p.deadline;
    document.getElementById("inputStatus").value = p.status;

    editingProjectId = p.id;

    document.getElementById("projectModal").classList.remove("hidden");
}

function deleteProject(index) {
    const projects = getProjects();
    const p = projects[index];
    db.collection("projects").doc(p.id).delete()
        .catch(function (err) {
            alert("Error deleting project: " + err.message);
        });
    // list re-renders automatically via the onSnapshot listener
}

// ---------- PROJECT DATA ----------

function getDefaultProjects() {
    return [
        { name: "College Website Development", manager: "Team Alpha", deadline: "2026-08-30", status: "on-track", progress: 75 },
        { name: "Campus Infrastructure", manager: "Team Beta", deadline: "2026-08-25", status: "delayed", progress: 42 },
        { name: "Student Mobile Application", manager: "Team Gamma", deadline: "2026-09-02", status: "at-risk", progress: 60 }
    ];
}

// In-memory cache kept in sync with Firestore by listenProjects().
// getProjects() stays synchronous so every existing render function
// (renderProjects, renderFullProjects, renderReports, editProject...)
// works completely unchanged.
let projectsCache = [];

function getProjects() {
    return projectsCache;
}

function listenProjects() {
    db.collection("projects").get().then(function (snapshot) {
        if (snapshot.empty) {
            // seed with the same defaults the old localStorage version used,
            // only the very first time the collection is empty
            const defaults = getDefaultProjects();
            const batch = db.batch();
            defaults.forEach(function (p) {
                const ref = db.collection("projects").doc();
                batch.set(ref, p);
            });
            batch.commit();
        }
    });

    db.collection("projects").onSnapshot(function (snapshot) {
        projectsCache = snapshot.docs.map(function (doc) {
            return Object.assign({ id: doc.id }, doc.data());
        });
        renderProjects();
        renderFullProjects();
        if (document.getElementById("view-reports") && !document.getElementById("view-reports").classList.contains("hidden")) {
            renderReports();
        }
    });
}

// ---------- DASHBOARD PROJECT LIST ----------

function renderProjects() {
    const projectList = document.getElementById("projectList");
    if (!projectList) return;
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
            <div class="project">
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
                <button class="task-edit" onclick="editProject(${index})">Edit</button>
                <button class="task-delete" onclick="deleteProject(${index})">Delete</button>
            </div>
        `;
    });

    updateStats(projects);
}

function animateCount(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
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

// ---------- FULL PROJECTS PAGE (with filters) ----------

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
    const projects = currentFilter === "all"
        ? allProjects
        : allProjects.filter(p => p.status === currentFilter);

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
            <div class="project">
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
                <button class="task-edit" onclick="editProject(${realIndex})">Edit</button>
                <button class="task-delete" onclick="deleteProject(${realIndex})">Delete</button>
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

    event.target.classList.add("active");

    if (viewName === "projects") {
        renderFullProjects();
    }

    if (viewName === "reports") {
        renderReports();
    }
}

// ---------- TASKS ----------

let tasksCache = [];

function getTasks() {
    return tasksCache;
}

function listenTasks() {
    db.collection("tasks").onSnapshot(function (snapshot) {
        tasksCache = snapshot.docs.map(function (doc) {
            return Object.assign({ id: doc.id }, doc.data());
        });
        renderTasks();
        if (document.getElementById("view-reports") && !document.getElementById("view-reports").classList.contains("hidden")) {
            renderReports();
        }
    });
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

    db.collection("tasks").add({
        title: title,
        project: project,
        deadline: deadline,
        done: false
    }).then(function () {
        closeTaskForm();
    }).catch(function (err) {
        alert("Error saving task: " + err.message);
    });
    // list re-renders automatically via the onSnapshot listener
}

function toggleTask(index) {
    const tasks = getTasks();
    const t = tasks[index];
    db.collection("tasks").doc(t.id).update({ done: !t.done })
        .catch(function (err) {
            alert("Error updating task: " + err.message);
        });
}

function deleteTask(index) {
    const tasks = getTasks();
    const t = tasks[index];
    db.collection("tasks").doc(t.id).delete()
        .catch(function (err) {
            alert("Error deleting task: " + err.message);
        });
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
    if (!taskList) return;
    const allTasks = getTasks();

    let tasks = allTasks;
    if (currentTaskFilter === "pending") {
        tasks = allTasks.filter(t => !t.done);
    } else if (currentTaskFilter === "done") {
        tasks = allTasks.filter(t => t.done);
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

// ---------- LOGIN / LOGOUT ----------
// NOTE: Firebase Auth requires an email format for its built-in
// email/password provider. Keep your existing username/password fields
// exactly as they are in login.html — just create your Firebase user(s)
// with an email like "admin@projectmonitor.app" and type that same
// string into the "username" field when logging in.

function handleLogin() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    auth.signInWithEmailAndPassword(username, password)
        .then(function () {
            window.location.href = "index.html";
        })
        .catch(function () {
            document.getElementById("loginError").classList.remove("hidden");
        });
}

function checkLogin() {
    auth.onAuthStateChanged(function (user) {
        if (!user) {
            window.location.href = "login.html";
        }
    });
}

function logout() {
    auth.signOut().then(function () {
        window.location.href = "login.html";
    });
}

// ---------- REPORTS ----------

let projectsChartInstance = null;
let tasksChartInstance = null;

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

    projectsChartInstance = new Chart(projectsCtx, {
        type: "bar",
        data: {
            labels: ["On Track", "Delayed", "At Risk"],
            datasets: [{
                label: "Number of Projects",
                data: [onTrack, delayed, atRisk],
                backgroundColor: ["#15803d", "#dc2626", "#b45309"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    tasksChartInstance = new Chart(tasksCtx, {
        type: "doughnut",
        data: {
            labels: ["Completed", "Pending"],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ["#2563eb", "#e5e7eb"]
            }]
        },
        options: {
            responsive: true
        }
    });
}

// ---------- LOADING SCREEN ----------

window.addEventListener("load", function () {
    setTimeout(function () {
        const screen = document.getElementById("loadingScreen");
        if (screen) screen.classList.add("hide");
    }, 1200);
});

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

// ---------- STARTUP ----------
// Replaces the old `window.addEventListener("DOMContentLoaded", renderProjects)`
// and the matching one for renderTasks — the Firestore listeners call
// render automatically every time data changes, including on first load.
window.addEventListener("DOMContentLoaded", function () {
    listenProjects();
    listenTasks();
});
