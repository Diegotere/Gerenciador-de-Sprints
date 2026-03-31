const TASK_TYPES = ['Melhoria', 'Novo Recurso', 'Automação', 'Dívida Técnica', 'Erro', 'Proteção', 'Usabilidade','Legislação','Merge'];
const TASK_STATUSES = ['Planejada', 'Incluída', 'Removida', 'Não entregue'];

let sprints = [];
let currentEditingSprintId = null;
let tasksForCurrentSprintForm = [];
let sprintToDeleteId = null;
let editingTaskIndexInForm = null;
let consolidatedTaskTypeChart = null;
let consolidatedPointsTypeChart = null;
let sprintsEvolutionChartConsolidated = null;
let productivityEvolutionChart = null;
let sprintVelocityChart = null;
let deliveredPointsEvolutionChart = null;
let sprintsDashboardChart = null;
let currentSessionUserEmail = '';
const DATA_ACTIONS_ALLOWED_EMAILS = new Set([
  'diego.dsn.erp@alterdata.com.br',
  'diegotere@yahoo.com.br'
]);

const sprintGrid = document.getElementById('sprintGrid');
const sprintProductivityDashboardCanvas = document.getElementById('sprintProductivityDashboardChart');
const sprintsDashboardEmptyMessage = document.getElementById('sprintsDashboardEmptyMessage');
const dashboardCalcInfoBtn = document.getElementById('dashboardCalcInfoBtn');
const dashboardCalcInfoModalEl = document.getElementById('dashboardCalcInfoModal');
const closeDashboardCalcInfoModalBtn = document.getElementById('closeDashboardCalcInfoModalBtn');
const closeDashboardCalcInfoModalXBtn = document.getElementById('closeDashboardCalcInfoModalXBtn');
const consolidatedChartInfoModalEl = document.getElementById('consolidatedChartInfoModal');
const consolidatedChartInfoModalTitleEl = document.getElementById('consolidatedChartInfoModalTitle');
const consolidatedChartInfoModalBodyEl = document.getElementById('consolidatedChartInfoModalBody');
const closeConsolidatedChartInfoModalBtn = document.getElementById('closeConsolidatedChartInfoModalBtn');
const closeConsolidatedChartInfoModalXBtn = document.getElementById('closeConsolidatedChartInfoModalXBtn');
const addSprintBtn = document.getElementById('addSprintBtn');
const mainNavbarMenu = document.getElementById('mainNavbarMenu');
const navbarBurgerBtn = document.querySelector('.navbar-burger');
const sprintModalEl = document.getElementById('sprintModal');
const sprintModalTitleEl = document.getElementById('sprintModalTitleLabel');
const sprintForm = document.getElementById('sprintForm');
const sprintIdInput = document.getElementById('sprintId');
const sprintNameInput = document.getElementById('sprintName');
const sprintTeamInput = document.getElementById('sprintTeam');
const sprintSemesterInput = document.getElementById('sprintSemester');
const sprintStartDateInput = document.getElementById('sprintStartDate');
const sprintEndDateInput = document.getElementById('sprintEndDate');
const sprintManualPlannedPointsInput = document.getElementById('sprintManualPlannedPoints');
const sprintTotalCollaboratorsInput = document.getElementById('sprintTotalCollaborators');
const sprintWorkingDaysInput = document.getElementById('sprintWorkingDays');
const sprintObservationInput = document.getElementById('sprintObservation');
const cancelSprintModalBtn = document.getElementById('cancelSprintModalBtn');
const closeSprintModalXBtn = document.getElementById('closeSprintModalXBtn');
const tasksContainerInForm = document.getElementById('tasksContainer');
const taskFormTitleEl = document.getElementById('taskFormTitle');
const editingTaskIndexInput = document.getElementById('editingTaskIndex');
const taskNameInput = document.getElementById('taskName');
const taskTypeSelect = document.getElementById('taskType');
const taskPointsInput = document.getElementById('taskPoints');
const taskObservationInput = document.getElementById('taskObservation');
const taskIsCompletedCheckbox = document.getElementById('taskIsCompleted');
const addOrUpdateTaskBtn = document.getElementById('addOrUpdateTaskBtn');
const cancelTaskEditBtn = document.getElementById('cancelTaskEditBtn');
const triggerImportTasksFileBtn = document.getElementById('triggerImportTasksFileBtn');
const importTasksFileEl = document.getElementById('importTasksFile');
const sprintReportModalEl = document.getElementById('sprintReportModal');
const sprintReportModalTitleEl = document.getElementById('sprintReportModalTitleLabel');
const sprintReportContent = document.getElementById('sprintReportContent');
const printSprintReportBtn = document.getElementById('printSprintReportBtn');
const closeSprintReportModalXBtn = document.getElementById('closeSprintReportModalXBtn');
const consolidatedReportBtn = document.getElementById('consolidatedReportBtn');
const consolidatedReportViewModalEl = document.getElementById('consolidatedReportViewModal');
const consolidatedReportViewContent = document.getElementById('consolidatedReportViewContent');
const printConsolidatedReportBtn = document.getElementById('printConsolidatedReportBtn');
const closeConsolidatedReportViewModalXBtn = document.getElementById('closeConsolidatedReportViewModalXBtn');
const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const closeDeleteConfirmModalXBtn = document.getElementById('closeDeleteConfirmModalXBtn');
const noSprintsMessage = document.getElementById('noSprintsMessage');
const noSprintsTitle = document.getElementById('noSprintsTitle');
const noSprintsSubtitle = document.getElementById('noSprintsSubtitle');
const teamFilterSelect = document.getElementById('teamFilter');
const semesterFilterSelect = document.getElementById('semesterFilter');
const exportDataJsonBtn = document.getElementById('exportDataJsonBtn');
const importDataBtnTrigger = document.getElementById('importDataBtnTrigger');
const importFileEl = document.getElementById('importFile');
const dataActionsDropdown = document.getElementById('dataActionsDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const appNotificationEl = document.getElementById('appNotification');
const notificationBodyEl = document.getElementById('notificationBody');
const closeNotificationBtn = document.getElementById('closeNotificationBtn');
const taskStatusButtonsContainer = document.getElementById('taskStatusButtonsContainer');
let notificationTimeout;

if (window.Chart && window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

function normalizeString(str) { return (typeof str === 'string' ? str : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

function isTaskNameDuplicateInCurrentSprint(taskName, taskIndexToIgnore = null) {
  const normalizedTaskNameToValidate = normalizeString(String(taskName || '').trim());
  if (!normalizedTaskNameToValidate) return false;
  return tasksForCurrentSprintForm.some((task, index) => {
    if (taskIndexToIgnore !== null && index === taskIndexToIgnore) return false;
    return normalizeString(String(task.name || '').trim()) === normalizedTaskNameToValidate;
  });
}

function showAppNotification(message, type = 'is-info') {
  if (!appNotificationEl || !notificationBodyEl) return;
  notificationBodyEl.textContent = message;
  appNotificationEl.className = `notification ${type}`;
  appNotificationEl.classList.remove('is-hidden');
  clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => appNotificationEl.classList.add('is-hidden'), 4500);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  const themeToggleButtons = document.querySelectorAll('#darkModeToggleBtn');
  themeToggleButtons.forEach((button) => {
    const textLabel = button.querySelector('#darkModeToggleBtnText');
    if (textLabel) textLabel.remove();
    const icon = button.querySelector('i');
    if (icon) icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    button.setAttribute('title', isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
    button.setAttribute('aria-label', isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
  });
}

function getStoredTheme() {
  return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(nextTheme);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Erro na comunicação com servidor.');
  return payload;
}

async function ensureAuthenticatedSession() {
  try {
    const result = await apiRequest('/api/auth/session', { method: 'GET' });
    return result?.user || null;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

async function handleLogout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    // noop
  } finally {
    window.location.href = '/login.html';
  }
}

function openModal(el) { if (el) { el.classList.add('is-active'); document.documentElement.classList.add('is-clipped'); } }
function closeModal(el) { if (el) el.classList.remove('is-active'); if (!document.querySelector('.modal.is-active')) document.documentElement.classList.remove('is-clipped'); }

function canAccessDataActions(email) {
  return DATA_ACTIONS_ALLOWED_EMAILS.has(String(email || '').trim().toLowerCase());
}

function canManageSprints(email) {
  return canAccessDataActions(email);
}

function updateDataActionsVisibility() {
  if (!dataActionsDropdown) return;
  const hasAccess = canAccessDataActions(currentSessionUserEmail);
  dataActionsDropdown.classList.toggle('is-hidden', !hasAccess);
}

function updateWriteAccessVisibility() {
  const hasWriteAccess = canManageSprints(currentSessionUserEmail);
  addSprintBtn?.classList.toggle('is-hidden', !hasWriteAccess);
}

function normalizeImportedSprintData(rawSprint) {
  const normalizedSprint = { ...(rawSprint || {}) };
  normalizedSprint.team = String(normalizedSprint.team || '').trim();
  normalizedSprint.semester = normalizedSprint.semester || inferSemesterFromDate(normalizedSprint.startDate);
  normalizedSprint.tasks = Array.isArray(normalizedSprint.tasks) ? normalizedSprint.tasks : [];
  return normalizedSprint;
}

async function loadSprints() {
  try {
    const data = await apiRequest('/api/sprints', { method: 'GET' });
    sprints = Array.isArray(data?.sprints) ? data.sprints.map(normalizeImportedSprintData) : [];
  } catch (error) {
    sprints = [];
    showAppNotification(`Erro ao carregar sprints: ${error.message}`, 'is-danger');
  }
}
async function saveSprints() {
  await apiRequest('/api/sprints/bulk', {
    method: 'PUT',
    body: JSON.stringify({ sprints })
  });
}

function calculateWorkingDaysBetweenDates(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const currentDate = new Date(`${startDateStr}T00:00:00`);
  const endDate = new Date(`${endDateStr}T00:00:00`);
  if (currentDate > endDate) return 0;
  let count = 0;
  while (currentDate <= endDate) {
    const d = currentDate.getDay();
    if (d !== 0 && d !== 6) count++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
}


function inferSemesterFromDate(dateStr) {
  if (!dateStr) return '';
  const month = new Date(`${dateStr}T00:00:00`).getMonth() + 1;
  return month <= 6 ? '1° Semestre' : '2° Semestre';
}

function getSprintSemester(sprint) {
  return sprint.semester || inferSemesterFromDate(sprint.startDate);
}

function getAvailableTeams() {
  return [...new Set(sprints.map((sprint) => String(sprint.team || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function populateTeamFilterOptions() {
  if (!teamFilterSelect) return;
  const selectedTeam = teamFilterSelect.value || 'all';
  const teamOptions = getAvailableTeams();
  teamFilterSelect.innerHTML = `<option value="all">Todos os times</option>${teamOptions.map((team) => `<option value="${team}">${team}</option>`).join('')}`;
  teamFilterSelect.value = teamOptions.includes(selectedTeam) ? selectedTeam : 'all';
}

function updateSemesterFilterState() {
  if (!semesterFilterSelect) return;
  semesterFilterSelect.disabled = false;
}

function getFilteredSprints() {
  const selectedTeam = teamFilterSelect?.value || 'all';
  const selectedSemester = semesterFilterSelect?.value || 'all';

  return sprints.filter((sprint) => {
    const matchesTeam = selectedTeam === 'all' || String(sprint.team || '').trim() === selectedTeam;
    const matchesSemester = selectedSemester === 'all' || getSprintSemester(sprint) === selectedSemester;
    return matchesTeam && matchesSemester;
  });
}

function getSprintsByTeam(teamName) {
  return sprints.filter((sprint) => String(sprint.team || '').trim() === teamName);
}

function isSprintStarted(sprint, referenceDate = new Date()) {
  if (!sprint?.startDate) return false;
  const startDate = new Date(`${sprint.startDate}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return false;
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return startDate <= today;
}

function getStartedSprints(sprintsList, referenceDate = new Date()) {
  return (Array.isArray(sprintsList) ? sprintsList : []).filter((sprint) => isSprintStarted(sprint, referenceDate));
}

function calculateSprintProductivityAverage(sprint) {
  const tasks = Array.isArray(sprint?.tasks) ? sprint.tasks : [];
  const scoredTasks = tasks.filter((task) => Number(task?.points) > 0);
  if (!scoredTasks.length) return 0;

  const collaborators = Number(sprint?.totalCollaborators) || 0;
  const workingDays = Number(sprint?.workingDays) || 0;
  if (collaborators <= 0 || workingDays <= 0) return 0;

  const totalPoints = scoredTasks.reduce((sum, task) => sum + (Number(task.points) || 0), 0);
  const productivity = totalPoints / (scoredTasks.length * collaborators * workingDays);
  return Number(productivity.toFixed(4));
}

function buildDashboardDatasets(filteredSprints) {
  const sortedSprints = [...filteredSprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const labels = sortedSprints.map((sprint) => sprint.name || 'Sprint');
  const teams = [...new Set(sortedSprints.map((sprint) => String(sprint.team || 'Sem Time').trim() || 'Sem Time'))];
  const palette = ['#3273dc', '#23d160', '#ff3860', '#b86bff', '#ffdd57', '#3298dc', '#ff9f43'];

  const datasets = teams.map((team, idx) => ({
    label: team,
    data: sortedSprints.map((sprint) => {
      const sprintTeam = String(sprint.team || 'Sem Time').trim() || 'Sem Time';
      return sprintTeam === team ? calculateSprintProductivityAverage(sprint) : null;
    }),
    borderColor: palette[idx % palette.length],
    backgroundColor: `${palette[idx % palette.length]}33`,
    borderWidth: 2,
    spanGaps: true,
    tension: 0.25
  }));

  return { labels, datasets };
}

function renderSprintsDashboard(filteredSprints) {
  if (sprintsDashboardChart) { sprintsDashboardChart.destroy(); sprintsDashboardChart = null; }
  if (!window.Chart || !sprintProductivityDashboardCanvas) return;

  const { labels, datasets } = buildDashboardDatasets(filteredSprints);
  const hasData = datasets.some((dataset) => dataset.data.some((value) => value !== null));

  if (!hasData) {
    sprintProductivityDashboardCanvas.style.display = 'none';
    if (sprintsDashboardEmptyMessage) sprintsDashboardEmptyMessage.classList.remove('is-hidden');
    return;
  }

  sprintProductivityDashboardCanvas.style.display = 'block';
  if (sprintsDashboardEmptyMessage) sprintsDashboardEmptyMessage.classList.add('is-hidden');

  sprintsDashboardChart = new Chart(sprintProductivityDashboardCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Produtividade média (pontos por tarefa pontuada por colaborador/dia útil)' }
        },
        x: {
          title: { display: true, text: 'Evolução das sprints (ordem cronológica)' }
        }
      }
    }
  });
}

function getSprintTasksExportRows(sprint) {
  const header = ['Nome da Tarefa', 'Tipo', 'Pontos', 'Observação', 'Status', 'Concluída?'];
  const tasks = Array.isArray(sprint?.tasks) ? sprint.tasks : [];
  const rows = tasks.map((task) => ([
    task?.name || '',
    task?.type || '',
    Number(task?.points) || 0,
    task?.observation || '',
    task?.status || '',
    task?.isCompleted ? 'Sim' : 'Não'
  ]));
  return [header, ...rows];
}

function duplicateSprintData(sourceSprint) {
  const sourceTasks = Array.isArray(sourceSprint?.tasks) ? sourceSprint.tasks : [];
  return {
    ...JSON.parse(JSON.stringify(sourceSprint || {})),
    id: crypto.randomUUID(),
    name: `${sourceSprint?.name || 'Sprint'} (Cópia)`,
    tasks: sourceTasks.map((task) => ({ ...JSON.parse(JSON.stringify(task)), id: crypto.randomUUID() }))
  };
}

function calculateSprintStats(sprint) {
  const tasks = Array.isArray(sprint.tasks) ? sprint.tasks : [];
  const ppm = Number(sprint.manualPlannedPoints) || 0;
  const includedPoints = tasks.filter(t => t.status === 'Incluída').reduce((s, t) => s + (Number(t.points) || 0), 0);
  const removedPoints = tasks.filter(t => t.status === 'Removida').reduce((s, t) => s + (Number(t.points) || 0), 0);
  const notDeliveredPoints = tasks.filter(t => t.status !== 'Removida' && !t.isCompleted).reduce((s, t) => s + (Number(t.points) || 0), 0);
  const tasksInScope = tasks.filter(t => t.status !== 'Removida');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = sprint.endDate ? new Date(`${sprint.endDate}T00:00:00`) : null;
  const hasEnded = !!(endDate && !Number.isNaN(endDate.getTime()) && today > endDate);
  const isGoalMet = hasEnded && tasksInScope.length > 0 && tasksInScope.every(t => t.isCompleted);
  const sprintOutcome = !hasEnded ? 'ongoing' : isGoalMet ? 'complete' : 'incomplete';
  const deliveredPoints = (ppm + includedPoints) - (removedPoints + notDeliveredPoints);
  return { ppm, includedPoints, removedPoints, notDeliveredPoints, deliveredPoints, isGoalMet, hasEnded, sprintOutcome, totalTasks: tasks.length, sprintName: sprint.name || 'Sprint' };
}

function getSprintVisualStatus(sprint, stats) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = sprint.startDate ? new Date(`${sprint.startDate}T00:00:00`) : null;
  const notStarted = !!(startDate && !Number.isNaN(startDate.getTime()) && today < startDate);

  if (notStarted) return { key: 'not_started', label: 'Sprint não iniciada', textClass: 'has-text-link', headerColor: '#3273dc' };
  if (stats.sprintOutcome === 'complete') return { key: 'complete', label: 'Sprint Completa', textClass: 'has-text-success', headerColor: '#23d160' };
  if (stats.sprintOutcome === 'incomplete') return { key: 'incomplete', label: 'Sprint Incompleta', textClass: 'has-text-danger', headerColor: '#ff3860' };
  return { key: 'ongoing', label: 'Sprint em andamento', textClass: 'has-text-warning', headerColor: '#ff9800' };
}

function updateTaskCompletedStateByStatus(status) {
  if (!taskIsCompletedCheckbox) return;
  if (status === 'Removida' || status === 'Não entregue') {
    taskIsCompletedCheckbox.checked = false;
    taskIsCompletedCheckbox.disabled = true;
    return;
  }
  taskIsCompletedCheckbox.disabled = false;
}

function populateTaskFormElements() {
  taskTypeSelect.innerHTML = TASK_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  taskStatusButtonsContainer.innerHTML = TASK_STATUSES.map((s, i) => `<button type="button" class="button is-small ${i === 0 ? 'is-active' : ''}" data-status="${s}">${s}</button>`).join('');
  taskStatusButtonsContainer.querySelectorAll('.button').forEach(btn => btn.addEventListener('click', () => {
    taskStatusButtonsContainer.querySelectorAll('.button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    updateTaskCompletedStateByStatus(btn.dataset.status);
  }));
}

function resetTaskForm() {
  editingTaskIndexInForm = null;
  editingTaskIndexInput.value = '';
  taskFormTitleEl.textContent = 'Adicionar Nova Tarefa';
  taskNameInput.value = '';
  taskTypeSelect.value = TASK_TYPES[0];
  taskPointsInput.value = '0';
  taskObservationInput.value = '';
  taskIsCompletedCheckbox.checked = false;
  taskIsCompletedCheckbox.disabled = false;
  addOrUpdateTaskBtn.textContent = 'Adicionar Tarefa';
  cancelTaskEditBtn.classList.add('is-hidden');
  taskStatusButtonsContainer.querySelectorAll('.button').forEach((b, i) => b.classList.toggle('is-active', i === 0));
}

function renderTasksInSprintForm() {
  tasksContainerInForm.innerHTML = '';
  if (tasksForCurrentSprintForm.length === 0) {
    tasksContainerInForm.innerHTML = '<p class="has-text-grey-light is-size-7 has-text-centered is-italic">Nenhuma tarefa adicionada a esta sprint ainda.</p>';
    return;
  }
  tasksForCurrentSprintForm.forEach((task, index) => {
    const el = document.createElement('div');
    el.className = 'box p-3 mb-2 is-flex is-justify-content-space-between is-align-items-center';
    el.innerHTML = `<div class="content is-small" style="flex-grow:1"><p class="has-text-weight-medium mb-0">${task.name}</p><p class="has-text-grey mb-0">(${task.points} pts, ${task.type}, ${task.status})</p></div><div class="buttons are-small"><button type="button" class="button is-info is-light" data-edit="${index}"><span class="icon"><i class="bi bi-pencil-square"></i></span></button><button type="button" class="button is-danger is-light" data-remove="${index}"><span class="icon"><i class="bi bi-trash3"></i></span></button></div>`;
    tasksContainerInForm.appendChild(el);
  });
  tasksContainerInForm.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { tasksForCurrentSprintForm.splice(Number(btn.dataset.remove), 1); renderTasksInSprintForm(); }));
  tasksContainerInForm.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.edit);
    const t = tasksForCurrentSprintForm[i];
    editingTaskIndexInForm = i;
    taskFormTitleEl.textContent = 'Editar Tarefa';
    taskNameInput.value = t.name;
    taskTypeSelect.value = t.type;
    taskPointsInput.value = t.points;
    taskObservationInput.value = t.observation || '';
    taskIsCompletedCheckbox.checked = !!t.isCompleted;
    taskStatusButtonsContainer.querySelectorAll('.button').forEach(b => b.classList.toggle('is-active', b.dataset.status === t.status));
    updateTaskCompletedStateByStatus(t.status);
    addOrUpdateTaskBtn.textContent = 'Atualizar Tarefa';
    cancelTaskEditBtn.classList.remove('is-hidden');
  }));
}

function openNewSprintModal() {
  if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
  currentEditingSprintId = null;
  sprintModalTitleEl.textContent = 'Nova Sprint';
  sprintForm.reset();
  sprintIdInput.value = '';
  if (sprintTeamInput) sprintTeamInput.value = '';
  if (sprintSemesterInput) sprintSemesterInput.value = '';
  tasksForCurrentSprintForm = [];
  renderTasksInSprintForm();
  resetTaskForm();
  openModal(sprintModalEl);
}

function renderSprints() {
  sprintGrid.innerHTML = '';
  populateTeamFilterOptions();
  updateSemesterFilterState();
  const filteredSprints = getFilteredSprints();

  if (filteredSprints.length === 0) {
    if (sprints.length === 0) {
      if (noSprintsTitle) noSprintsTitle.textContent = 'Nenhuma sprint cadastrada';
      if (noSprintsSubtitle) noSprintsSubtitle.textContent = 'Comece cadastrando uma nova sprint utilizando o botão "+ Nova Sprint".';
    } else {
      const selectedTeam = teamFilterSelect?.value || 'all';
      const selectedSemester = semesterFilterSelect?.value || 'all';
      if (noSprintsTitle) noSprintsTitle.textContent = 'Nenhuma sprint encontrada para o filtro selecionado';
      if (noSprintsSubtitle) noSprintsSubtitle.textContent = `Não há sprints para ${selectedTeam === 'all' ? 'os times selecionados' : selectedTeam}${selectedSemester === 'all' ? '' : ` no ${selectedSemester}`}.`;
    }
    noSprintsMessage.classList.remove('is-hidden');
    sprintGrid.classList.add('is-hidden');
    renderSprintsDashboard(filteredSprints);
    return;
  }

  noSprintsMessage.classList.add('is-hidden');
  sprintGrid.classList.remove('is-hidden');
  renderSprintsDashboard(filteredSprints);

  const groupedByTeam = filteredSprints.reduce((acc, sprint) => {
    const team = String(sprint.team || 'Sem Time').trim() || 'Sem Time';
    if (!acc[team]) acc[team] = [];
    acc[team].push(sprint);
    return acc;
  }, {});

  const teamNames = Object.keys(groupedByTeam).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const hasWriteAccess = canManageSprints(currentSessionUserEmail);

  teamNames.forEach((teamName) => {
    const teamWrapper = document.createElement('section');
    teamWrapper.className = 'box mb-5 is-fullwidth';
    teamWrapper.style.border = '1px solid #d5e7f5';
    teamWrapper.innerHTML = `<h3 class="title is-5 mb-4 has-text-link">${teamName}</h3><div class="columns is-multiline is-variable is-4" data-team-grid="${teamName}"></div>`;
    const teamGrid = teamWrapper.querySelector('[data-team-grid]');

    [...groupedByTeam[teamName]].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).forEach((sprint) => {
      const stats = calculateSprintStats(sprint);
      const visualStatus = getSprintVisualStatus(sprint, stats);
      const displayIdentifier = sprint.name || (sprint.startDate ? new Date(`${sprint.startDate}T00:00:00`).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric'}) : 'Sprint');

      const columnDiv = document.createElement('div');
      columnDiv.className = 'column is-half-mobile is-one-third-tablet is-one-quarter-desktop';
      const cardActionsHtml = hasWriteAccess ? `
                <span class="dropdown is-hoverable is-right">
                  <span class="dropdown-trigger">
                    <button class="button is-small is-primary is-inverted is-outlined" aria-haspopup="true" aria-controls="dropdown-sprint-card" style="border:none;background-color:transparent !important;">
                      <span class="icon is-small"><i class="bi bi-three-dots-vertical"></i></span>
                    </button>
                  </span>
                  <span class="dropdown-menu" role="menu">
                    <span class="dropdown-content">
                      <a href="#" class="dropdown-item edit-sprint-btn" data-sprint-id="${sprint.id}"><i class="bi bi-pencil-fill me-2"></i>Editar</a>
                      <a href="#" class="dropdown-item duplicate-sprint-btn" data-sprint-id="${sprint.id}"><i class="bi bi-files me-2"></i>Duplicar</a>
                      <a href="#" class="dropdown-item export-sprint-excel-btn" data-sprint-id="${sprint.id}"><i class="bi bi-file-earmark-excel me-2"></i>Exportar Excel</a>
                      <a href="#" class="dropdown-item delete-sprint-btn has-text-danger" data-sprint-id="${sprint.id}"><i class="bi bi-trash3-fill me-2"></i>Excluir</a>
                    </span>
                  </span>
                </span>` : '';

      columnDiv.innerHTML = `
        <div class="card h-100 hover-shadow sprint-card-clickable" data-sprint-id="${sprint.id}" role="button" tabindex="0" aria-label="${hasWriteAccess ? 'Editar' : 'Visualizar'} sprint ${displayIdentifier}">
          <header class="card-header" style="background-color: ${visualStatus.headerColor}; box-shadow: none;">
            <p class="card-header-title has-text-white is-justify-content-space-between">
              <span class="is-truncated" title="${displayIdentifier}">${displayIdentifier}</span>
              ${cardActionsHtml}
            </p>
          </header>
          <div class="card-content"><div class="content is-small has-text-grey">
            <p><strong>Status:</strong> <span class="${visualStatus.textClass}">${visualStatus.label}</span></p>
            <p><strong>Início:</strong> ${sprint.startDate ? new Date(`${sprint.startDate}T00:00:00`).toLocaleDateString('pt-BR') : 'N/D'}</p>
            <p><strong>Fim:</strong> ${sprint.endDate ? new Date(`${sprint.endDate}T00:00:00`).toLocaleDateString('pt-BR') : 'N/D'}</p>
            <p><strong>Planejado:</strong> ${sprint.manualPlannedPoints || 0} pts</p>
            <p><strong>Colaboradores:</strong> ${sprint.totalCollaborators || 'N/A'}</p>
            <p><strong>Dias Úteis:</strong> ${sprint.workingDays || 'N/A'}</p>
            <p><strong>Tarefas:</strong> ${Array.isArray(sprint.tasks) ? sprint.tasks.length : 0}</p>
          </div></div>
          <footer class="card-footer"><a href="#" class="card-footer-item view-report-btn has-text-link is-size-7" data-sprint-id="${sprint.id}">Ver Relatório</a></footer>
        </div>`;

      const card = columnDiv.querySelector('.sprint-card-clickable');
      card.addEventListener('click', (event) => {
        if (event.target.closest('.edit-sprint-btn, .duplicate-sprint-btn, .export-sprint-excel-btn, .delete-sprint-btn, .view-report-btn, .dropdown, button, a')) return;
        if (hasWriteAccess) handleEditSprintRequest({ currentTarget: card });
        else handleViewReportRequest({ currentTarget: card });
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (hasWriteAccess) handleEditSprintRequest({ currentTarget: card });
          else handleViewReportRequest({ currentTarget: card });
        }
      });

      teamGrid.appendChild(columnDiv);
    });

    sprintGrid.appendChild(teamWrapper);
  });

  document.querySelectorAll('.edit-sprint-btn').forEach(btn => btn.addEventListener('click', handleEditSprintRequest));
  document.querySelectorAll('.duplicate-sprint-btn').forEach(btn => btn.addEventListener('click', handleDuplicateSprintRequest));
  document.querySelectorAll('.export-sprint-excel-btn').forEach(btn => btn.addEventListener('click', handleExportSprintExcelRequest));
  document.querySelectorAll('.delete-sprint-btn').forEach(btn => btn.addEventListener('click', handleDeleteSprintRequest));
  document.querySelectorAll('.view-report-btn').forEach(btn => btn.addEventListener('click', handleViewReportRequest));
}

function handleEditSprintRequest(e) {
  if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
  const sprintId = e.currentTarget.dataset.sprintId;
  const sprint = sprints.find(s => s.id === sprintId);
  if (!sprint) return;
  currentEditingSprintId = sprintId;
  sprintModalTitleEl.textContent = 'Editar Sprint';
  sprintIdInput.value = sprint.id;
  sprintNameInput.value = sprint.name || '';
  if (sprintTeamInput) sprintTeamInput.value = sprint.team || '';
  if (sprintSemesterInput) sprintSemesterInput.value = sprint.semester || inferSemesterFromDate(sprint.startDate);
  sprintStartDateInput.value = sprint.startDate || '';
  sprintEndDateInput.value = sprint.endDate || '';
  sprintManualPlannedPointsInput.value = sprint.manualPlannedPoints || 0;
  sprintTotalCollaboratorsInput.value = sprint.totalCollaborators || 0;
  sprintWorkingDaysInput.value = sprint.workingDays || 0;
  sprintObservationInput.value = sprint.sprintObservation || '';
  tasksForCurrentSprintForm = JSON.parse(JSON.stringify(Array.isArray(sprint.tasks) ? sprint.tasks : []));
  renderTasksInSprintForm();
  resetTaskForm();
  openModal(sprintModalEl);
}

async function handleDuplicateSprintRequest(e) {
  if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
  const sprintId = e.currentTarget.dataset.sprintId;
  const sprint = sprints.find(s => s.id === sprintId);
  if (!sprint) return;
  const duplicatedSprint = duplicateSprintData(sprint);
  sprints.push(duplicatedSprint);
  try {
    await saveSprints();
    renderSprints();
    showAppNotification('Sprint duplicada com sucesso!', 'is-success');
  } catch (error) {
    showAppNotification(`Erro ao duplicar sprint: ${error.message}`, 'is-danger');
  }
}

function handleExportSprintExcelRequest(e) {
  const sprintId = e.currentTarget.dataset.sprintId;
  const sprint = sprints.find(s => s.id === sprintId);
  if (!sprint) return;

  const rows = getSprintTasksExportRows(sprint);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarefas');

  const sprintLabel = String(sprint.name || 'sprint').replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80) || 'sprint';
  XLSX.writeFile(workbook, `${sprintLabel}_tarefas.xlsx`);
  showAppNotification('Sprint exportada para Excel com sucesso!', 'is-success');
}

function handleDeleteSprintRequest(e) {
  if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
  sprintToDeleteId = e.currentTarget.dataset.sprintId;
  openModal(deleteConfirmModalEl);
}

function getTaskRowClass(task) {
  if (!task) return '';
  if (task.status === 'Removida') return 'table-task-removed';
  if (task.isCompleted) return 'table-task-completed';
  if (Number(task.points) === 0 && task.status !== 'Removida') return 'table-task-analysis';
  return 'table-task-not-delivered';
}

function handleViewReportRequest(e) {
  const sprint = sprints.find(s => s.id === e.currentTarget.dataset.sprintId);
  if (!sprint) return;
  const stats = calculateSprintStats(sprint);
  sprintReportModalTitleEl.textContent = `Relatório: ${stats.sprintName}`;
  const tasks = Array.isArray(sprint.tasks) ? sprint.tasks : [];
  const tasksHtml = tasks.length > 0 ? `
    <div class="table-container">
      <table class="table is-bordered is-striped is-narrow is-hoverable is-fullwidth is-size-7">
        <thead>
          <tr>
            <th class="has-text-centered">Concluída</th>
            <th>Tarefa</th>
            <th>Tipo</th>
            <th class="has-text-centered">Pontos</th>
            <th>Status</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => `
            <tr class="${getTaskRowClass(task)}">
              <td class="has-text-centered"><input type="checkbox" ${task.isCompleted ? 'checked' : ''} disabled class="checkbox is-small"></td>
              <td class="has-text-weight-medium">${task.name} ${Number(task.points) === 0 && task.status !== 'Removida' ? '<span class="tag is-warning is-light is-rounded">Análise</span>' : ''}</td>
              <td>${task.type}</td>
              <td class="has-text-centered">${task.points || 0}</td>
              <td>${task.status}</td>
              <td class="has-text-grey-dark" style="max-width: 200px; word-wrap: break-word;" title="${task.observation || ''}">${task.observation || '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`
    : '<p class="has-text-grey is-size-7 has-text-centered is-italic">Nenhuma tarefa nesta sprint.</p>';

  const sprintObservationHtml = sprint.sprintObservation ? `
    <div class="mb-4">
      <h5 class="subtitle is-6 has-text-primary">Observação da Sprint:</h5>
      <div class="content is-small box has-background-white-ter">
        <p>${sprint.sprintObservation.replace(/\n/g, '<br>')}</p>
      </div>
    </div>`
    : '';

  sprintReportContent.innerHTML = `
    <h3 class="title is-4 mb-5 ${stats.sprintOutcome === 'complete' ? 'has-text-success' : stats.sprintOutcome === 'incomplete' ? 'has-text-danger' : 'has-text-warning'}">${stats.sprintOutcome === 'complete' ? 'Sprint Batida!' : stats.sprintOutcome === 'incomplete' ? 'Sprint Não Batida' : 'Sprint em andamento'}</h3>
    ${sprintObservationHtml}
    <div class="mb-5">
      <h4 class="subtitle is-5 has-text-primary mb-3">Resumo da Sprint</h4>
      <div class="columns is-multiline is-mobile has-text-centered">
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Pontos Planejados</p><p class="title is-5 mb-0">${stats.ppm || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Pontos Incluídos</p><p class="title is-5 mb-0">${stats.includedPoints || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Pontos Removidos</p><p class="title is-5 mb-0">${stats.removedPoints || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Pontos Não Entregues</p><p class="title is-5 has-text-danger mb-0">${stats.notDeliveredPoints || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Pontos Entregues</p><p class="title is-5 has-text-success mb-0">${stats.deliveredPoints || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Total de Tarefas</p><p class="title is-5 mb-0">${stats.totalTasks || 0}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="box p-3"><p class="heading is-size-7">Entregue o Planejado?</p><p class="title is-5 ${stats.sprintOutcome === 'complete' ? 'has-text-success' : stats.sprintOutcome === 'incomplete' ? 'has-text-danger' : 'has-text-warning'} mb-0">${stats.sprintOutcome === 'complete' ? 'Sim' : stats.sprintOutcome === 'incomplete' ? 'Não' : 'Em andamento'}</p></div></div>
      </div>
    </div>
    <div>
      <h4 class="subtitle is-5 has-text-primary mb-3">Tarefas</h4>
      ${tasksHtml}
    </div>`;
  openModal(sprintReportModalEl);
}

function handleConsolidatedReport() {
  if (consolidatedTaskTypeChart) { consolidatedTaskTypeChart.destroy(); consolidatedTaskTypeChart = null; }
  if (consolidatedPointsTypeChart) { consolidatedPointsTypeChart.destroy(); consolidatedPointsTypeChart = null; }
  if (sprintsEvolutionChartConsolidated) { sprintsEvolutionChartConsolidated.destroy(); sprintsEvolutionChartConsolidated = null; }
  if (productivityEvolutionChart) { productivityEvolutionChart.destroy(); productivityEvolutionChart = null; }
  if (sprintVelocityChart) { sprintVelocityChart.destroy(); sprintVelocityChart = null; }
  if (deliveredPointsEvolutionChart) { deliveredPointsEvolutionChart.destroy(); deliveredPointsEvolutionChart = null; }

  const teams = getAvailableTeams();
  if (!teams.length) {
    consolidatedReportViewContent.innerHTML = '<p class="has-text-centered has-text-grey is-italic">Nenhuma sprint cadastrada para gerar o resumo.</p>';
    openModal(consolidatedReportViewModalEl);
    return;
  }

  const currentTeam = document.getElementById('consolidatedTeamFilter')?.value;
  const selectedTeam = teams.includes(currentTeam) ? currentTeam : teams[0];
  const teamSprints = getSprintsByTeam(selectedTeam);
  const startedTeamSprints = getStartedSprints(teamSprints);

  let totalTasksOverall = 0;
  let totalDeliveredPointsOverall = 0;
  let totalScopePointsOverall = 0;
  const taskTypeCounts = {};
  const taskTypePoints = {};
  TASK_TYPES.forEach(type => {
    taskTypeCounts[type] = 0;
    taskTypePoints[type] = 0;
  });

  teamSprints.forEach(sprint => {
    const stats = calculateSprintStats(sprint);
    const scopePoints = (stats.ppm || 0) + (stats.includedPoints || 0) - (stats.removedPoints || 0);
    totalTasksOverall += (Array.isArray(sprint.tasks) ? sprint.tasks.filter(t => t.status !== 'Removida').length : 0);
    totalDeliveredPointsOverall += stats.deliveredPoints || 0;
    totalScopePointsOverall += scopePoints;

    (Array.isArray(sprint.tasks) ? sprint.tasks : []).forEach(task => {
      if (task.status !== 'Removida') {
        if (taskTypeCounts[task.type] !== undefined) taskTypeCounts[task.type] += 1;
        if (taskTypePoints[task.type] !== undefined) taskTypePoints[task.type] += (Number(task.points) || 0);
      }
    });
  });

  let totalTasksStarted = 0;
  let totalDeliveredPointsStarted = 0;
  startedTeamSprints.forEach((sprint) => {
    const stats = calculateSprintStats(sprint);
    totalTasksStarted += (Array.isArray(sprint.tasks) ? sprint.tasks.filter((t) => t.status !== 'Removida').length : 0);
    totalDeliveredPointsStarted += stats.deliveredPoints || 0;
  });

  const averageTasksPerSprint = startedTeamSprints.length ? (totalTasksStarted / startedTeamSprints.length).toFixed(1) : '0.0';
  const averagePointsPerSprint = startedTeamSprints.length ? (totalDeliveredPointsStarted / startedTeamSprints.length).toFixed(1) : '0.0';
  const averagePointsPerTask = totalTasksStarted ? (totalDeliveredPointsStarted / totalTasksStarted).toFixed(1) : '0.0';
  const averageCompletionRate = totalScopePointsOverall > 0 ? Math.max(0, (totalDeliveredPointsOverall / totalScopePointsOverall) * 100).toFixed(1) : '0.0';

  consolidatedReportViewContent.innerHTML = `
    <div class="field mb-4">
      <label class="label">Time do resumo</label>
      <div class="control" style="max-width: 320px;">
        <div class="select is-fullwidth">
          <select id="consolidatedTeamFilter">${teams.map((team) => `<option value="${team}" ${team === selectedTeam ? 'selected' : ''}>${team}</option>`).join('')}</select>
        </div>
      </div>
    </div>
    <div>
      <h3 class="title is-5 has-text-primary mb-3">Estatísticas Gerais - ${selectedTeam}</h3>
      <div class="columns is-multiline is-mobile mb-5">
        <div class="column is-half-mobile is-one-quarter-tablet"><div class="stat-card total-sprints"><p class="stat-card-title">Total de Sprints</p><p class="stat-card-value">${teamSprints.length}</p></div></div>
        <div class="column is-half-mobile is-one-quarter-tablet"><div class="stat-card total-tasks"><p class="stat-card-title">Total de Tarefas (Escopo)</p><p class="stat-card-value">${totalTasksOverall}</p></div></div>
        <div class="column is-half-mobile is-one-quarter-tablet"><div class="stat-card total-delivered-points"><p class="stat-card-title">Total de Pontos Entregues</p><p class="stat-card-value">${totalDeliveredPointsOverall}</p></div></div>
        <div class="column is-half-mobile is-one-quarter-tablet"><div class="stat-card avg-completion-rate"><p class="stat-card-title">Taxa Média de Conclusão</p><p class="stat-card-value">${averageCompletionRate}%</p></div></div>
      </div>

      <h3 class="title is-5 has-text-primary mb-3">Médias por Sprint (somente sprints iniciadas)</h3>
      <div class="columns is-multiline is-mobile mb-5">
        <div class="column is-half-mobile is-one-third-tablet"><div class="stat-card avg-tasks"><p class="stat-card-title">Média de Tarefas por Sprint</p><p class="stat-card-value">${averageTasksPerSprint}</p></div></div>
        <div class="column is-half-mobile is-one-third-tablet"><div class="stat-card avg-points"><p class="stat-card-title">Média de Pontos por Sprint</p><p class="stat-card-value">${averagePointsPerSprint}</p></div></div>
        <div class="column is-full-mobile is-one-third-tablet"><div class="stat-card avg-points-per-task"><p class="stat-card-title">Média de Pontos por Tarefa</p><p class="stat-card-value">${averagePointsPerTask}</p></div></div>
      </div>

      <div class="box mb-5"><div class="is-flex is-justify-content-space-between is-align-items-center mb-3"><h4 class="title is-6 has-text-primary has-text-centered mb-0">Gráfico de Velocidade (Planejado vs. Entregue)</h4><button type="button" class="button is-white is-small consolidated-chart-info-btn" data-chart-type="velocity" title="Como calculamos" aria-label="Como calculamos"><span class="icon is-small has-text-grey"><i class="bi bi-question-circle"></i></span></button></div><div style="height: 350px;"><canvas id="sprintVelocityChartCanvas"></canvas></div></div>
      <div class="box mb-5"><div class="is-flex is-justify-content-space-between is-align-items-center mb-3"><h4 class="title is-6 has-text-primary has-text-centered mb-0">Evolução de Pontos Entregues por Sprint</h4><button type="button" class="button is-white is-small consolidated-chart-info-btn" data-chart-type="delivered_evolution" title="Como calculamos" aria-label="Como calculamos"><span class="icon is-small has-text-grey"><i class="bi bi-question-circle"></i></span></button></div><div style="height: 300px;"><canvas id="deliveredPointsEvolutionChart"></canvas></div></div>
      <div class="box mb-5"><div class="is-flex is-justify-content-space-between is-align-items-center mb-3"><h4 class="title is-6 has-text-primary has-text-centered mb-0">Gráfico de Evolução de Produtividade</h4><button type="button" class="button is-white is-small consolidated-chart-info-btn" data-chart-type="productivity_evolution" title="Como calculamos" aria-label="Como calculamos"><span class="icon is-small has-text-grey"><i class="bi bi-question-circle"></i></span></button></div><div style="height: 300px;"><canvas id="productivityEvolutionChart"></canvas></div></div>
      <div class="columns">
        <div class="column"><div class="box h-100"><div class="is-flex is-justify-content-space-between is-align-items-center mb-2"><h4 class="title is-6 has-text-primary has-text-centered mb-0">Distribuição de Tarefas por Tipo</h4><button type="button" class="button is-white is-small consolidated-chart-info-btn" data-chart-type="task_type_distribution" title="Como calculamos" aria-label="Como calculamos"><span class="icon is-small has-text-grey"><i class="bi bi-question-circle"></i></span></button></div><div style="height: 300px; display: flex; align-items: center; justify-content: center;"><canvas id="taskTypePieChartConsolidated"></canvas></div></div></div>
        <div class="column"><div class="box h-100"><div class="is-flex is-justify-content-space-between is-align-items-center mb-2"><h4 class="title is-6 has-text-primary has-text-centered mb-0">Distribuição de Pontos por Tipo</h4><button type="button" class="button is-white is-small consolidated-chart-info-btn" data-chart-type="points_type_distribution" title="Como calculamos" aria-label="Como calculamos"><span class="icon is-small has-text-grey"><i class="bi bi-question-circle"></i></span></button></div><div style="height: 300px; display: flex; align-items: center; justify-content: center;"><canvas id="pointsTypePieChartConsolidated"></canvas></div></div></div>
      </div>
    </div>`;

  document.getElementById('consolidatedTeamFilter')?.addEventListener('change', handleConsolidatedReport);
  document.querySelectorAll('.consolidated-chart-info-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openConsolidatedChartInfo(button.dataset.chartType);
    });
  });

  if (window.Chart) {
    const sorted = [...teamSprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const labels = sorted.map(s => calculateSprintStats(s).sprintName);
    const planned = sorted.map(s => calculateSprintStats(s).ppm || 0);
    const delivered = sorted.map(s => calculateSprintStats(s).deliveredPoints || 0);
    const avgDelivered = delivered.length ? delivered.reduce((a, b) => a + b, 0) / delivered.length : 0;

    const velocityCanvas = document.getElementById('sprintVelocityChartCanvas');
    if (velocityCanvas) {
      sprintVelocityChart = new Chart(velocityCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Planejado', data: planned, backgroundColor: 'rgba(255, 204, 153, 0.7)', borderColor: 'rgba(255, 204, 153, 1)', borderWidth: 1 },
            { label: 'Entregue', data: delivered, backgroundColor: 'rgba(163, 217, 163, 0.7)', borderColor: 'rgba(163, 217, 163, 1)', borderWidth: 1 },
            { label: `Média Entregue (${avgDelivered.toFixed(2)})`, data: labels.map(() => avgDelivered.toFixed(2)), type: 'line', borderColor: 'rgba(77, 175, 77, 1)', fill: false, tension: 0, pointRadius: 0, borderWidth: 2 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false } } }
      });
    }

    const productivityCanvas = document.getElementById('productivityEvolutionChart');
    if (productivityCanvas) {
      productivityEvolutionChart = new Chart(productivityCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Índice de Produtividade', data: sorted.map(s => { const collaborators = parseFloat(s.totalCollaborators) || 1; const workingDays = parseInt(s.workingDays, 10) || 1; const divisor = collaborators / workingDays; return (calculateSprintStats(s).deliveredPoints / divisor).toFixed(2); }), borderColor: '#4BC0C0', backgroundColor: 'rgba(75, 192, 192, 0.1)', tension: 0.1, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const deliveredEvolutionCanvas = document.getElementById('deliveredPointsEvolutionChart');
    if (deliveredEvolutionCanvas) {
      deliveredPointsEvolutionChart = new Chart(deliveredEvolutionCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Pontos Entregues',
            data: delivered,
            borderColor: '#23d160',
            backgroundColor: 'rgba(35, 209, 96, 0.15)',
            pointBackgroundColor: '#23d160',
            pointBorderColor: '#23d160',
            pointRadius: 4,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.25
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Pontos Entregues' }
            },
            x: {
              title: { display: true, text: 'Sprints' }
            }
          }
        }
      });
    }

    const taskPieCanvas = document.getElementById('taskTypePieChartConsolidated');
    const pointsPieCanvas = document.getElementById('pointsTypePieChartConsolidated');
    const colors = ['#3273dc', '#b86bff', '#ff3860', '#ffdd57', '#23d160', '#3298dc', '#4a4a4a', '#6c757d', '#adb5bd'];
    const labelsTasks = TASK_TYPES.filter(type => taskTypeCounts[type] > 0);
    const dataTasks = labelsTasks.map(type => taskTypeCounts[type]);
    const labelsPoints = TASK_TYPES.filter(type => taskTypePoints[type] > 0);
    const dataPoints = labelsPoints.map(type => taskTypePoints[type]);

    if (taskPieCanvas && dataTasks.length) {
      consolidatedTaskTypeChart = new Chart(taskPieCanvas, { type: 'pie', data: { labels: labelsTasks, datasets: [{ data: dataTasks, backgroundColor: colors.slice(0, dataTasks.length) }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    if (pointsPieCanvas && dataPoints.length) {
      consolidatedPointsTypeChart = new Chart(pointsPieCanvas, { type: 'pie', data: { labels: labelsPoints, datasets: [{ data: dataPoints, backgroundColor: colors.slice(0, dataPoints.length) }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
  }

  openModal(consolidatedReportViewModalEl);
}

function printReport(reportContentId) {
  const reportElement = document.getElementById(reportContentId);
  if (!reportElement) return;
  const printWindow = window.open('', '_blank', 'height=800,width=1200');
  printWindow.document.write('<html><head><title>Imprimir Relatório</title>');
  printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css">');
  printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css" rel="stylesheet">');
  printWindow.document.write(`<style>${Array.from(document.styleSheets).map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join(''); } catch { return ''; } }).join('\n')}</style>`);
  printWindow.document.write('</head><body>');
  printWindow.document.write(reportElement.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 700);
}

async function exportDataToJson() {
  if (!sprints.length) return showAppNotification('Não há dados para exportar.', 'is-warning');
  const blob = new Blob([JSON.stringify(sprints, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sprints_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showAppNotification('Dados exportados com sucesso!', 'is-success');
}

function handleImportData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (!Array.isArray(importedData)) throw new Error('JSON inválido');
      if (confirm('Tem certeza que deseja substituir todos os dados atuais?')) {
        sprints = importedData.map(normalizeImportedSprintData);
        saveSprints().then(() => {
          renderSprints();
          showAppNotification('Dados importados com sucesso!', 'is-success');
        }).catch((error) => {
          showAppNotification(`Erro ao salvar dados importados: ${error.message}`, 'is-danger');
        });
      }
    } catch (error) {
      showAppNotification(`Erro ao processar JSON: ${error.message}`, 'is-danger');
    } finally {
      importFileEl.value = '';
    }
  };
  reader.readAsText(file);
}

function handleImportTasksFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const dataRows = rows.length && normalizeString(String(rows[0][0])).includes('nome da tarefa') ? rows.slice(1) : rows;
      let count = 0;
      let skippedDuplicates = 0;
      dataRows.forEach(row => {
        const name = String(row[0] || '').trim();
        if (!name) return;

        if (isTaskNameDuplicateInCurrentSprint(name)) {
          skippedDuplicates++;
          return;
        }

        tasksForCurrentSprintForm.push({
          id: crypto.randomUUID(),
          name,
          type: TASK_TYPES.find(t => normalizeString(t) === normalizeString(String(row[1] || ''))) || TASK_TYPES[0],
          points: Math.max(0, parseInt(row[2], 10) || 0),
          observation: String(row[3] || '').trim().slice(0, 100),
          status: TASK_STATUSES.find(s => normalizeString(s) === normalizeString(String(row[4] || ''))) || TASK_STATUSES[0],
          isCompleted: (() => {
            const importedCompleted = ['true','sim','1','yes','ok','concluído','concluido','concluida'].includes(normalizeString(String(row[5] || '')));
            const normalizedStatus = normalizeString(String(row[4] || ''));
            return (normalizedStatus === normalizeString('Removida') || normalizedStatus === normalizeString('Não entregue')) ? false : importedCompleted;
          })()
        });
        count++;
      });
      renderTasksInSprintForm();
      if (skippedDuplicates > 0) {
        showAppNotification(`${count} tarefa(s) importada(s). ${skippedDuplicates} duplicada(s) ignorada(s).`, count ? 'is-warning' : 'is-danger');
      } else {
        showAppNotification(`${count} tarefa(s) importada(s).`, count ? 'is-success' : 'is-warning');
      }
    } catch (err) {
      showAppNotification(`Erro ao importar planilha: ${err.message}`, 'is-danger');
    } finally {
      importTasksFileEl.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

function updateWorkingDaysField() {
  if (sprintStartDateInput.value && sprintEndDateInput.value && !currentEditingSprintId) sprintWorkingDaysInput.value = calculateWorkingDaysBetweenDates(sprintStartDateInput.value, sprintEndDateInput.value);
  if (!currentEditingSprintId && sprintSemesterInput && sprintStartDateInput.value && !sprintSemesterInput.value) {
    sprintSemesterInput.value = inferSemesterFromDate(sprintStartDateInput.value);
  }
}

function getConsolidatedChartExplanation(chartType) {
  const explanations = {
    velocity: {
      title: 'Velocidade (Planejado vs. Entregue)',
      html: '<p><strong>Planejado:</strong> usa os pontos planejados da sprint (<em>manualPlannedPoints</em>).</p><p><strong>Entregue:</strong> soma os pontos das tarefas concluídas e não removidas.</p><p><strong>Linha de média:</strong> média simples dos pontos entregues nas sprints exibidas no gráfico.</p>'
    },
    delivered_evolution: {
      title: 'Evolução de Pontos Entregues',
      html: '<p>Cada ponto do gráfico representa os pontos entregues em uma sprint específica.</p><p>Os pontos entregues são calculados pelas tarefas concluídas, desconsiderando tarefas removidas.</p>'
    },
    productivity_evolution: {
      title: 'Evolução de Produtividade',
      html: '<p>Para cada sprint, o índice é calculado por:</p><p><strong>Pontos Entregues ÷ (Colaboradores ÷ Dias Úteis)</strong>.</p><p>Esta fórmula representa a produtividade média por colaborador por dia útil.</p><p><em>Exemplo prático:</em> Se uma sprint entregou 100 pontos com 5 colaboradores em 10 dias úteis: 100 ÷ (5 ÷ 10) = 100 ÷ 0.5 = 200.</p><p>Quando colaboradores ou dias úteis não são válidos, o cálculo usa valor mínimo para evitar divisão por zero.</p>'
    },
    task_type_distribution: {
      title: 'Distribuição de Tarefas por Tipo',
      html: '<p>Conta quantas tarefas existem por tipo no período selecionado.</p><p>Tarefas com status <strong>Removida</strong> não são consideradas.</p>'
    },
    points_type_distribution: {
      title: 'Distribuição de Pontos por Tipo',
      html: '<p>Soma os pontos das tarefas por tipo para mostrar concentração de esforço.</p><p>Tarefas removidas não entram no cálculo.</p>'
    }
  };
  return explanations[chartType] || { title: 'Como calculamos este gráfico', html: '<p>Sem explicação cadastrada para este gráfico.</p>' };
}

function openConsolidatedChartInfo(chartType) {
  const info = getConsolidatedChartExplanation(chartType);
  if (consolidatedChartInfoModalTitleEl) consolidatedChartInfoModalTitleEl.textContent = info.title;
  if (consolidatedChartInfoModalBodyEl) consolidatedChartInfoModalBodyEl.innerHTML = info.html;
  openModal(consolidatedChartInfoModalEl);
}

document.addEventListener('DOMContentLoaded', async () => {
  const duplicateThemeToggles = document.querySelectorAll('#darkModeToggleBtn');
  if (duplicateThemeToggles.length > 1) {
    duplicateThemeToggles.forEach((button, index) => {
      if (index < duplicateThemeToggles.length - 1) button.remove();
    });
  }

  const authenticatedUser = await ensureAuthenticatedSession();
  if (!authenticatedUser) return;
  currentSessionUserEmail = String(authenticatedUser.email || '').trim().toLowerCase();
  updateDataActionsVisibility();
  updateWriteAccessVisibility();

  applyTheme(getStoredTheme());
  await loadSprints();
  populateTaskFormElements();
  renderSprints();

  closeNotificationBtn?.addEventListener('click', () => appNotificationEl.classList.add('is-hidden'));
  document.querySelectorAll('#darkModeToggleBtn').forEach((button) => {
    button.addEventListener('click', toggleTheme);
  });
  navbarBurgerBtn?.addEventListener('click', () => {
    navbarBurgerBtn.classList.toggle('is-active');
    mainNavbarMenu?.classList.toggle('is-active');
  });
  addSprintBtn?.addEventListener('click', openNewSprintModal);
  cancelSprintModalBtn?.addEventListener('click', () => closeModal(sprintModalEl));
  closeSprintModalXBtn?.addEventListener('click', () => closeModal(sprintModalEl));
  closeSprintReportModalXBtn?.addEventListener('click', () => closeModal(sprintReportModalEl));
  dashboardCalcInfoBtn?.addEventListener('click', () => openModal(dashboardCalcInfoModalEl));
  closeDashboardCalcInfoModalBtn?.addEventListener('click', () => closeModal(dashboardCalcInfoModalEl));
  closeDashboardCalcInfoModalXBtn?.addEventListener('click', () => closeModal(dashboardCalcInfoModalEl));
  closeConsolidatedChartInfoModalBtn?.addEventListener('click', () => closeModal(consolidatedChartInfoModalEl));
  closeConsolidatedChartInfoModalXBtn?.addEventListener('click', () => closeModal(consolidatedChartInfoModalEl));
  closeConsolidatedReportViewModalXBtn?.addEventListener('click', () => {
    if (consolidatedTaskTypeChart) { consolidatedTaskTypeChart.destroy(); consolidatedTaskTypeChart = null; }
    if (consolidatedPointsTypeChart) { consolidatedPointsTypeChart.destroy(); consolidatedPointsTypeChart = null; }
    if (sprintsEvolutionChartConsolidated) { sprintsEvolutionChartConsolidated.destroy(); sprintsEvolutionChartConsolidated = null; }
    if (productivityEvolutionChart) { productivityEvolutionChart.destroy(); productivityEvolutionChart = null; }
    if (sprintVelocityChart) { sprintVelocityChart.destroy(); sprintVelocityChart = null; }
    if (deliveredPointsEvolutionChart) { deliveredPointsEvolutionChart.destroy(); deliveredPointsEvolutionChart = null; }
    closeModal(consolidatedReportViewModalEl);
  });
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteConfirmModalEl));
  closeDeleteConfirmModalXBtn?.addEventListener('click', () => closeModal(deleteConfirmModalEl));
  consolidatedReportBtn?.addEventListener('click', handleConsolidatedReport);
  if (canAccessDataActions(currentSessionUserEmail)) {
    exportDataJsonBtn?.addEventListener('click', exportDataToJson);
    importDataBtnTrigger?.addEventListener('click', () => importFileEl.click());
    importFileEl?.addEventListener('change', handleImportData);
  }
  logoutBtn?.addEventListener('click', handleLogout);
  triggerImportTasksFileBtn?.addEventListener('click', () => importTasksFileEl.click());
  importTasksFileEl?.addEventListener('change', handleImportTasksFromFile);
  sprintStartDateInput?.addEventListener('change', updateWorkingDaysField);
  sprintEndDateInput?.addEventListener('change', updateWorkingDaysField);
  teamFilterSelect?.addEventListener('change', renderSprints);
  semesterFilterSelect?.addEventListener('change', renderSprints);
  printSprintReportBtn?.addEventListener('click', () => printReport('sprintReportContent'));
  printConsolidatedReportBtn?.addEventListener('click', () => printReport('consolidatedReportViewContent'));

  addOrUpdateTaskBtn?.addEventListener('click', () => {
    const status = taskStatusButtonsContainer.querySelector('.is-active')?.dataset.status || TASK_STATUSES[0];
    const taskData = { id: editingTaskIndexInForm !== null ? tasksForCurrentSprintForm[editingTaskIndexInForm].id : crypto.randomUUID(), name: taskNameInput.value.trim(), type: taskTypeSelect.value, points: parseInt(taskPointsInput.value, 10) || 0, observation: taskObservationInput.value.trim(), status, isCompleted: (status === 'Removida' || status === 'Não entregue') ? false : taskIsCompletedCheckbox.checked };
    if (!taskData.name) return showAppNotification('O nome da tarefa é obrigatório.', 'is-warning');

    if (isTaskNameDuplicateInCurrentSprint(taskData.name, editingTaskIndexInForm)) {
      return showAppNotification(`A tarefa "${taskData.name}" já existe nesta sprint.`, 'is-danger');
    }

    if (editingTaskIndexInForm !== null) tasksForCurrentSprintForm[editingTaskIndexInForm] = taskData; else tasksForCurrentSprintForm.push(taskData);
    renderTasksInSprintForm();
    resetTaskForm();
  });

  cancelTaskEditBtn?.addEventListener('click', resetTaskForm);

  sprintForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
    const sprintData = {
      id: sprintIdInput.value || crypto.randomUUID(),
      name: sprintNameInput.value.trim(),
      team: sprintTeamInput?.value.trim() || '',
      semester: sprintSemesterInput?.value || '',
      startDate: sprintStartDateInput.value,
      endDate: sprintEndDateInput.value,
      manualPlannedPoints: parseInt(sprintManualPlannedPointsInput.value, 10) || 0,
      totalCollaborators: parseFloat(sprintTotalCollaboratorsInput.value) || 0,
      workingDays: parseInt(sprintWorkingDaysInput.value, 10) || 0,
      sprintObservation: sprintObservationInput.value.trim(),
      tasks: [...tasksForCurrentSprintForm]
    };
    if (!sprintData.name || !sprintData.team || !sprintData.semester || !sprintData.startDate || !sprintData.endDate) return showAppNotification('Preencha nome, time, semestre e datas da sprint.', 'is-danger');
    if (new Date(sprintData.startDate) > new Date(sprintData.endDate)) return showAppNotification('A data inicial não pode ser posterior à final.', 'is-danger');

    try {
      if (currentEditingSprintId) {
        const i = sprints.findIndex(s => s.id === currentEditingSprintId);
        if (i !== -1) sprints[i] = sprintData;
        showAppNotification('Sprint atualizada com sucesso!', 'is-success');
      } else {
        sprints.push(sprintData);
        showAppNotification('Sprint adicionada com sucesso!', 'is-success');
      }

      await saveSprints();
      renderSprints();
      closeModal(sprintModalEl);
    } catch (error) {
      showAppNotification(`Erro ao salvar sprint: ${error.message}`, 'is-danger');
    }
  });

  confirmDeleteBtn?.addEventListener('click', async () => {
    if (!canManageSprints(currentSessionUserEmail)) return showAppNotification('Você tem acesso somente para consulta.', 'is-warning');
    if (sprintToDeleteId) {
      try {
        sprints = sprints.filter(s => s.id !== sprintToDeleteId);
        await saveSprints();
        renderSprints();
        showAppNotification('Sprint excluída com sucesso.', 'is-success');
      } catch (error) {
        showAppNotification(`Erro ao excluir sprint: ${error.message}`, 'is-danger');
      }
    }
    sprintToDeleteId = null;
    closeModal(deleteConfirmModalEl);
  });
});
