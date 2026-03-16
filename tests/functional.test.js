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

  vm.runInNewContext(`${source}\nmodule.exports = { inferSemesterFromDate, getSprintSemester, getFilteredSprints, calculateSprintStats, setSprints: (value) => { sprints = value; }, setSemesterFilter: (value) => { semesterFilterSelect.value = value; } };`, sandbox);

  return sandbox.module.exports;
}

test('inferSemesterFromDate identifica corretamente o semestre', () => {
  const app = loadApp();
  assert.equal(app.inferSemesterFromDate('2026-01-10'), '1° Semestre');
  assert.equal(app.inferSemesterFromDate('2026-10-10'), '2° Semestre');
});

test('getFilteredSprints respeita filtro all e semestre específico', () => {
  const app = loadApp();
  app.setSprints([
    { id: 's1', semester: '1° Semestre', startDate: '2026-01-01' },
    { id: 's2', semester: '2° Semestre', startDate: '2026-08-01' },
    { id: 's3', startDate: '2026-03-01' }
  ]);

  app.setSemesterFilter('all');
  assert.equal(app.getFilteredSprints().length, 3);

  app.setSemesterFilter('1° Semestre');
  assert.deepEqual(app.getFilteredSprints().map((s) => s.id), ['s1', 's3']);

  app.setSemesterFilter('2° Semestre');
  assert.deepEqual(app.getFilteredSprints().map((s) => s.id), ['s2']);
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
