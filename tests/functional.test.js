const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createElementStub() {
  return {
    value: 'all',
    innerHTML: '',
    textContent: '',
    checked: false,
    disabled: false,
    className: '',
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function loadApp() {
  const source = fs.readFileSync('script.js', 'utf8');
  const elements = new Map();

  const documentStub = {
    documentElement: createElementStub(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElementStub());
      return elements.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return createElementStub(); },
    addEventListener() {}
  };

  const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    window: {},
    document: documentStub,
    localStorage: {
      store: {},
      getItem(key) { return this.store[key] || null; },
      setItem(key, value) { this.store[key] = String(value); },
      removeItem(key) { delete this.store[key]; },
      clear() { this.store = {}; }
    },
    crypto: {
      randomUUID() { return '00000000-0000-0000-0000-000000000000'; }
    }
  };

  vm.runInNewContext(`${source}\nmodule.exports = { inferSemesterFromDate, normalizeImportedSprintData, getSprintSemester, getFilteredSprints, getSprintsByTeam, calculateSprintProductivityAverage, buildDashboardDatasets, getSprintTasksExportRows, duplicateSprintData, getSprintVisualStatus, calculateSprintStats, setSprints: (value) => { sprints = value; }, setTeamFilter: (value) => { teamFilterSelect.value = value; }, setSemesterFilter: (value) => { semesterFilterSelect.value = value; } };`, sandbox);

  return sandbox.module.exports;
}

test('inferSemesterFromDate identifica corretamente o semestre', () => {
  const app = loadApp();
  assert.equal(app.inferSemesterFromDate('2026-01-10'), '1° Semestre');
  assert.equal(app.inferSemesterFromDate('2026-10-10'), '2° Semestre');
});

test('normalizeImportedSprintData garante campos team/semester/tasks', () => {
  const app = loadApp();
  const normalized = app.normalizeImportedSprintData({
    name: 'Sprint sem time',
    startDate: '2026-03-01'
  });

  assert.equal(normalized.team, '');
  assert.equal(normalized.semester, '1° Semestre');
  assert.equal(Array.isArray(normalized.tasks), true);
  assert.equal(normalized.tasks.length, 0);
});

test('getFilteredSprints filtra por time e semestre simultaneamente', () => {
  const app = loadApp();
  app.setSprints([
    { id: 's1', team: 'Time A', semester: '1° Semestre', startDate: '2026-01-01' },
    { id: 's2', team: 'Time A', semester: '2° Semestre', startDate: '2026-08-01' },
    { id: 's3', team: 'Time B', semester: '1° Semestre', startDate: '2026-03-01' }
  ]);

  app.setTeamFilter('Time A');
  app.setSemesterFilter('1° Semestre');
  assert.deepEqual(app.getFilteredSprints().map((s) => s.id), ['s1']);

  app.setTeamFilter('Time A');
  app.setSemesterFilter('all');
  assert.deepEqual(app.getFilteredSprints().map((s) => s.id), ['s1', 's2']);

  app.setTeamFilter('all');
  app.setSemesterFilter('1° Semestre');
  assert.deepEqual(app.getFilteredSprints().map((s) => s.id), ['s1', 's3']);
});

test('calculateSprintStats mantém sprint como ongoing antes da data final', () => {
  const app = loadApp();
  const stats = app.calculateSprintStats({
    endDate: '2099-12-31',
    manualPlannedPoints: 10,
    tasks: [
      { status: 'Planejada', points: 5, isCompleted: true }
    ]
  });

  assert.equal(stats.sprintOutcome, 'ongoing');
  assert.equal(stats.isGoalMet, false);
  assert.equal(stats.hasEnded, false);
});

test('calculateSprintStats define complete/incomplete após data final', () => {
  const app = loadApp();
  const complete = app.calculateSprintStats({
    endDate: '2020-01-10',
    manualPlannedPoints: 10,
    tasks: [
      { status: 'Planejada', points: 5, isCompleted: true }
    ]
  });

  const incomplete = app.calculateSprintStats({
    endDate: '2020-01-10',
    manualPlannedPoints: 10,
    tasks: [
      { status: 'Planejada', points: 5, isCompleted: false }
    ]
  });

  assert.equal(complete.sprintOutcome, 'complete');
  assert.equal(complete.isGoalMet, true);
  assert.equal(incomplete.sprintOutcome, 'incomplete');
  assert.equal(incomplete.isGoalMet, false);
});


test('duplicateSprintData cria cópia com novos ids e mantém dados principais', () => {
  const app = loadApp();
  const source = {
    id: 's1',
    name: 'Sprint Base',
    team: 'Time A',
    semester: '1° Semestre',
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    tasks: [
      { id: 't1', name: 'Task 1', status: 'Planejada', isCompleted: false },
      { id: 't2', name: 'Task 2', status: 'Incluída', isCompleted: true }
    ]
  };

  const duplicate = app.duplicateSprintData(source);

  assert.notEqual(duplicate.id, source.id);
  assert.equal(duplicate.name, 'Sprint Base (Cópia)');
  assert.equal(duplicate.team, source.team);
  assert.equal(duplicate.semester, source.semester);
  assert.equal(duplicate.tasks.length, 2);
  assert.notEqual(duplicate.tasks[0].id, source.tasks[0].id);
  assert.notEqual(duplicate.tasks[1].id, source.tasks[1].id);
  assert.equal(duplicate.tasks[0].name, source.tasks[0].name);
});


test('calculateSprintProductivityAverage considera tarefas pontuadas, colaboradores e dias úteis', () => {
  const app = loadApp();
  const productivity = app.calculateSprintProductivityAverage({
    totalCollaborators: 2,
    workingDays: 5,
    tasks: [
      { points: 8 },
      { points: 0 },
      { points: 4 },
      { points: null }
    ]
  });

  assert.equal(productivity, 0.6);
});

test('calculateSprintProductivityAverage retorna 0 sem colaboradores ou dias úteis válidos', () => {
  const app = loadApp();
  const productivityWithoutCollaborators = app.calculateSprintProductivityAverage({
    totalCollaborators: 0,
    workingDays: 5,
    tasks: [{ points: 8 }, { points: 4 }]
  });

  const productivityWithoutWorkingDays = app.calculateSprintProductivityAverage({
    totalCollaborators: 2,
    workingDays: 0,
    tasks: [{ points: 8 }, { points: 4 }]
  });

  assert.equal(productivityWithoutCollaborators, 0);
  assert.equal(productivityWithoutWorkingDays, 0);
});

test('buildDashboardDatasets separa linhas por time e respeita ordem cronológica', () => {
  const app = loadApp();
  const { labels, datasets } = app.buildDashboardDatasets([
    { name: 'Sprint B', team: 'Time A', startDate: '2026-02-01', totalCollaborators: 1, workingDays: 1, tasks: [{ points: 6 }] },
    { name: 'Sprint A', team: 'Time B', startDate: '2026-01-01', totalCollaborators: 1, workingDays: 1, tasks: [{ points: 10 }, { points: 0 }] }
  ]);

  assert.equal(labels.length, 2);
  assert.equal(labels.join(','), 'Sprint A,Sprint B');
  assert.equal(datasets.length, 2);
  const timeA = datasets.find((d) => d.label === 'Time A');
  const timeB = datasets.find((d) => d.label === 'Time B');
  assert.equal(timeA.data[0], null);
  assert.equal(timeA.data[1], 6);
  assert.equal(timeB.data[0], 10);
  assert.equal(timeB.data[1], null);
});


test('getSprintTasksExportRows gera layout compatível com importação', () => {
  const app = loadApp();
  const rows = app.getSprintTasksExportRows({
    tasks: [
      { name: 'Task 1', type: 'Novo Recurso', points: 8, observation: 'Obs', status: 'Planejada', isCompleted: true },
      { name: 'Task 2', type: 'Erro', points: 0, observation: '', status: 'Não entregue', isCompleted: false }
    ]
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].join(','), 'Nome da Tarefa,Tipo,Pontos,Observação,Status,Concluída?');
  assert.equal(rows[1][0], 'Task 1');
  assert.equal(rows[1][5], 'Sim');
  assert.equal(rows[2][5], 'Não');
});


test('getSprintVisualStatus retorna cor/estado conforme fase da sprint', () => {
  const app = loadApp();

  const notStarted = app.getSprintVisualStatus(
    { startDate: '2099-01-01' },
    { sprintOutcome: 'ongoing' }
  );
  const ongoing = app.getSprintVisualStatus(
    { startDate: '2020-01-01' },
    { sprintOutcome: 'ongoing' }
  );
  const complete = app.getSprintVisualStatus(
    { startDate: '2020-01-01' },
    { sprintOutcome: 'complete' }
  );
  const incomplete = app.getSprintVisualStatus(
    { startDate: '2020-01-01' },
    { sprintOutcome: 'incomplete' }
  );

  assert.equal(notStarted.key, 'not_started');
  assert.equal(notStarted.headerColor, '#3273dc');
  assert.equal(ongoing.key, 'ongoing');
  assert.equal(ongoing.headerColor, '#ff9800');
  assert.equal(complete.key, 'complete');
  assert.equal(complete.headerColor, '#23d160');
  assert.equal(incomplete.key, 'incomplete');
  assert.equal(incomplete.headerColor, '#ff3860');
});


test('getSprintsByTeam retorna apenas sprints do time selecionado', () => {
  const app = loadApp();
  app.setSprints([
    { id: 's1', team: 'Time A' },
    { id: 's2', team: 'Time B' },
    { id: 's3', team: 'Time A' }
  ]);

  const result = app.getSprintsByTeam('Time A');
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 's1');
  assert.equal(result[1].id, 's3');
});
