/* ======= State & Storage ======= */
const ls = {
  get: (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

// Default language & theme
const state = {
  lang: ls.get('lang', 'pt'),
  theme: ls.get('theme', 'light'),
  view: ls.get('view', 'today'),
  tasks: ls.get('tasks', []),    // array de tarefas
  search: ''
};

// helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ======= i18n ======= */
const i18n = {
  pt: {
    brand: "Pendência",
    addTask: "Adicionar Tarefa",
    addTaskShort: "Adicionar Tarefa",
    today: "Meu Dia",
    favorites: "Favoritos",
    tasks: "Tarefas",
    assigned: "Atribuído",
    trash: "Excluídos",
    labels: "Etiquetas",
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
    update: "Atualizar",
    theme: "Tema",
    newTask: "Adicionar Nova Tarefa",
    title: "Título",
    date: "Data",
    time: "Hora",
    priority: "Prioridade",
    label: "Etiqueta",
    assignee: "Atribuído a",
    description: "Descrição",
    selectPriority: "Selecione prioridade",
    selectMember: "Selecione um membro",
    cancel: "Cancelar",
    noTasksTitle: "Nada por aqui",
    noTasksSub: "Adicione uma nova tarefa para começar.",
    confirmTitle: "Tens a certeza?",
    confirmSub: "Esta tarefa irá para os Excluídos. Podes recuperar depois.",
    yesDelete: "Sim, excluir",
    no: "Não",
    due: "Vence",
    todayViewTitle: "Meu Dia",
    favoritesViewTitle: "Favoritos",
    inboxViewTitle: "Tarefas",
    assignedViewTitle: "Atribuído",
    trashViewTitle: "Excluídos"
  },
  en: {
    brand: "Pending",
    addTask: "Add Task",
    addTaskShort: "Add Task",
    today: "My Day",
    favorites: "Favorites",
    tasks: "Tasks",
    assigned: "Assigned",
    trash: "Trash",
    labels: "Labels",
    low: "Low",
    medium: "Medium",
    high: "High",
    update: "Update",
    theme: "Theme",
    newTask: "Add New Task",
    title: "Title",
    date: "Date",
    time: "Time",
    priority: "Priority",
    label: "Label",
    assignee: "Assignee",
    description: "Description",
    selectPriority: "Select priority",
    selectMember: "Select a member",
    cancel: "Cancel",
    noTasksTitle: "Nothing here",
    noTasksSub: "Add a new task to get started.",
    confirmTitle: "Are you sure?",
    confirmSub: "This task will move to Trash. You can restore it later.",
    yesDelete: "Yes, delete",
    no: "No",
    due: "Due",
    todayViewTitle: "My Day",
    favoritesViewTitle: "Favorites",
    inboxViewTitle: "Tasks",
    assignedViewTitle: "Assigned",
    trashViewTitle: "Trash"
  }
};

function applyI18n() {
  const dict = i18n[state.lang];
  // text nodes
  $$("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  // placeholders
  const search = $("#search");
  search.placeholder = state.lang === 'pt'
    ? search.dataset.placeholderPt
    : search.dataset.placeholderEn;

  // select placeholders (need to update selected option text too)
  $("#f_priority option[disabled]").textContent = dict.selectPriority;
  $("#f_assignee option[value='']").textContent = dict.selectMember;

  // Lang label
  $("#langLabel").textContent = state.lang.toUpperCase();

  // Update current view title
  const map = {
    today: dict.todayViewTitle,
    favorites: dict.favoritesViewTitle,
    inbox: dict.inboxViewTitle,
    assigned: dict.assignedViewTitle,
    trash: dict.trashViewTitle
  };
  $("#viewTitle").textContent = map[state.view] || dict.todayViewTitle;
}

/* ======= Theme ======= */
function applyTheme() {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
}

/* ======= Drawer (Add/Edit) ======= */
const drawer = $("#drawer");
const backdrop = $("#backdrop");
function openDrawer() {
  drawer.classList.add('open');
  backdrop.classList.add('show');
  // reset form
  $("#f_title").value = "";
  $("#f_date").value = "";
  $("#f_time").value = "";
  $("#f_priority").value = "";
  $("#f_label").value = "";
  $("#f_assignee").value = "";
  $("#f_desc").value = "";
  drawer.dataset.mode = "create";
}
function closeDrawer() {
  drawer.classList.remove('open');
  backdrop.classList.remove('show');
}

/* ======= Confirm dialog ======= */
const confirmBox = $("#confirm");
let pendingDeleteId = null;
function askConfirm(id) {
  pendingDeleteId = id;
  confirmBox.classList.add("show");
}
function closeConfirm() {
  pendingDeleteId = null;
  confirmBox.classList.remove("show");
}

/* ======= Tasks ======= */
function saveTasks() {
  ls.set('tasks', state.tasks);
}
function createTaskFromForm() {
  const t = {
    id: crypto.randomUUID(),
    title: $("#f_title").value.trim(),
    date: $("#f_date").value || null,
    time: $("#f_time").value || null,
    priority: $("#f_priority").value || null,
    label: $("#f_label").value.trim() || null,
    assignee: $("#f_assignee").value || null,
    description: $("#f_desc").value.trim() || null,
    completed: false,
    favorite: false,
    deleted: false,
    createdAt: Date.now()
  };
  return t;
}

function formatDateISOtoHuman(iso, lang) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function viewFilter(task) {
  if (task.deleted && state.view !== 'trash') return false;
  if (!task.deleted && state.view === 'trash') return false;
  if (state.view === 'favorites' && !task.favorite) return false;
  if (state.view === 'today') {
    const d = task.date || "";
    return d === todayISO() && !task.deleted;
  }
  if (state.view === 'assigned') {
    // show only tasks having assignee (or filter by search)
    return !task.deleted && !!task.assignee;
  }
  if (state.view === 'inbox') {
    return !task.deleted;
  }
  return true;
}

function searchFilter(task) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    task.title, task.label, task.assignee, task.description,
    task.priority, task.date, task.time
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function renderTasks() {
  const ul = $("#taskList");
  ul.innerHTML = "";

  const filtered = state.tasks.filter(t => viewFilter(t) && searchFilter(t));
  $("#emptyState").style.display = filtered.length ? "none" : "block";

  filtered
    .sort((a, b) => a.completed - b.completed || (b.favorite - a.favorite) || (a.createdAt - b.createdAt))
    .forEach(task => {
      const li = document.createElement("li");
      li.className = `task ${task.completed ? "completed" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "round";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveTasks(); renderTasks();
      });

      const title = document.createElement("div");
      title.innerHTML = `
        <div class="title">${task.title || "(sem título)"}</div>
        <div class="meta">
          ${task.date ? `${i18n[state.lang].due}: ${formatDateISOtoHuman(task.date, state.lang)}${task.time ? " " + task.time : ""}` : ""}
          ${task.label ? " • #" + task.label : ""}
          ${task.assignee ? " • @" + task.assignee : ""}
        </div>`;

      const badge = document.createElement("span");
      badge.className = `badge ${task.priority || "update"}`;
      badge.textContent = i18n[state.lang][task.priority || "update"] || "";

      const star = document.createElement("button");
      star.className = `star ${task.favorite ? "active" : ""}`;
      star.innerHTML = "★";
      star.title = "Favorite";
      star.addEventListener("click", () => {
        task.favorite = !task.favorite;
        saveTasks(); renderTasks();
      });

      const actions = document.createElement("div");
      actions.className = "actions";
      const del = document.createElement("button");
      del.className = "btn btn-ghost";
      del.textContent = "🗑️";
      del.addEventListener("click", () => askConfirm(task.id));

      actions.appendChild(star);
      actions.appendChild(del);

      li.appendChild(checkbox);
      li.appendChild(title);
      li.appendChild(badge);
      li.appendChild(actions);
      ul.appendChild(li);
    });
}

/* ======= Events ======= */
// Theme
$("#toggleTheme").addEventListener("click", () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  ls.set('theme', state.theme);
  applyTheme();
});

// Language
$("#toggleLang").addEventListener("click", () => {
  state.lang = state.lang === 'pt' ? 'en' : 'pt';
  ls.set('lang', state.lang);
  applyI18n();
  renderTasks();
});

// Search
$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderTasks();
});

// Drawer open/close
$("#openDrawer").addEventListener("click", openDrawer);
$("#openDrawerTop").addEventListener("click", openDrawer);
$("#closeDrawer").addEventListener("click", closeDrawer);
$("#cancelDrawer").addEventListener("click", closeDrawer);
backdrop.addEventListener("click", closeDrawer);

// Submit task
$("#submitTask").addEventListener("click", () => {
  const t = createTaskFromForm();
  if (!t.title) return; // simples validação
  state.tasks.push(t);
  saveTasks();
  closeDrawer();
  renderTasks();
});

// Confirm delete
$("#confirmCancel").addEventListener("click", closeConfirm);
$("#confirmOk").addEventListener("click", () => {
  if (!pendingDeleteId) return;
  const idx = state.tasks.findIndex(t => t.id === pendingDeleteId);
  if (idx >= 0) { state.tasks[idx].deleted = true; state.tasks[idx].favorite = false; }
  saveTasks();
  closeConfirm();
  renderTasks();
});

// Menu views
$$(".menu-item").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".menu-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.view = btn.dataset.view;
    ls.set('view', state.view);
    applyI18n();
    renderTasks();
  });
});

/* ======= Boot ======= */
(function init() {
  applyTheme();
  applyI18n();
  renderTasks();
})();
