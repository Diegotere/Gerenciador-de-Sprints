let sprints = [
  { id: '1', name: '03/2026', startDate: '2026-03-02', endDate: '2026-03-21', manualPlannedPoints: 142, totalCollaborators: 'N/A', workingDays: 15, tasks: new Array(24).fill({}) },
  { id: '2', name: '02/2026', startDate: '2026-02-02', endDate: '2026-02-20', manualPlannedPoints: 93, totalCollaborators: 8.5, workingDays: 15, tasks: new Array(21).fill({}) },
  { id: '3', name: '01/2026', startDate: '2026-01-02', endDate: '2026-01-23', manualPlannedPoints: 110, totalCollaborators: 9.5, workingDays: 16, tasks: new Array(26).fill({}) }
];

const sprintGrid = document.getElementById('sprintGrid');

function handleEditSprintRequest(event) {
  const sprintId = event.currentTarget.dataset.sprintId;
  const sprint = sprints.find(item => item.id === sprintId);
  if (!sprint) return;

  alert(`Editar sprint: ${sprint.name}`);
}

function renderSprints() {
  sprintGrid.innerHTML = '';

  sprints.forEach(sprint => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column is-one-third-desktop is-half-tablet';
    columnDiv.innerHTML = `
      <div class="card h-100 hover-shadow sprint-card-clickable" data-sprint-id="${sprint.id}" role="button" tabindex="0" aria-label="Editar sprint ${sprint.name}">
        <header class="card-header" style="background-color: #00609C; box-shadow: none;">
          <p class="card-header-title has-text-white is-justify-content-space-between">
            <span>${sprint.name}</span>
            <span class="dropdown is-hoverable is-right">
              <span class="dropdown-trigger">
                <button class="button is-small is-primary is-inverted is-outlined" aria-haspopup="true" aria-controls="dropdown-sprint-card" style="border: none; background-color: transparent !important;">
                  <span class="icon is-small"><i class="bi bi-three-dots-vertical"></i></span>
                </button>
              </span>
            </span>
          </p>
        </header>
        <div class="card-content">
          <div class="content is-small has-text-grey">
            <p><strong>Início:</strong> ${new Date(sprint.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Fim:</strong> ${new Date(sprint.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Planejado:</strong> ${sprint.manualPlannedPoints} pts</p>
            <p><strong>Colaboradores:</strong> ${sprint.totalCollaborators}</p>
            <p><strong>Dias Úteis:</strong> ${sprint.workingDays}</p>
            <p><strong>Tarefas:</strong> ${sprint.tasks.length}</p>
          </div>
        </div>
        <footer class="card-footer">
          <p class="card-footer-item has-text-success is-size-7 has-text-weight-semibold">Sprint Completa <i class="bi bi-check-circle-fill"></i></p>
          <a href="#" class="card-footer-item view-report-btn has-text-link is-size-7" data-sprint-id="${sprint.id}">Ver Relatório</a>
        </footer>
      </div>
    `;

    const cardEl = columnDiv.querySelector('.sprint-card-clickable');
    cardEl.addEventListener('click', (event) => {
      if (event.target.closest('.view-report-btn, .dropdown, .dropdown-trigger, button, a')) {
        return;
      }
      handleEditSprintRequest({ currentTarget: cardEl });
    });

    cardEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleEditSprintRequest({ currentTarget: cardEl });
      }
    });

    sprintGrid.appendChild(columnDiv);
  });
}

document.addEventListener('DOMContentLoaded', renderSprints);
