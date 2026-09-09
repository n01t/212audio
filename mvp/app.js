const participants = [
  { id: 'host', initials: 'JD', name: 'Jhone Doe', role: 'Host', status: 'HOST', type: 'host' },
  { id: 'sarah', initials: 'SC', name: 'Sarah Chen', role: 'Speaker', status: 'SPEAKER', type: 'speaker' },
  { id: 'mike', initials: 'MR', name: 'Mike Rivera', role: 'Listener', status: 'LISTENING', type: 'listener' },
  { id: 'alex', initials: 'AP', name: 'Alex Patel', role: 'Listener', status: 'LISTENING', type: 'listener' }
];
let handRaised = true;
let hostMicOn = true;
let showCreated = false;

const views = [...document.querySelectorAll('.view')];
const navLinks = [...document.querySelectorAll('[data-view]')];
const toast = document.querySelector('#toast');
const modal = document.querySelector('#modal');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function renderParticipants() {
  const list = document.querySelector('#participant-list');
  list.innerHTML = participants.map((person) => `
    <div class="participant-row" data-person="${person.id}">
      <div class="participant-avatar ${person.type}">${person.initials}${person.status === 'SPEAKER' ? '<span class="mic-state">♩</span>' : ''}</div>
      <div class="participant-copy"><strong>${person.name}${person.id === 'host' ? ' (you)' : ''}</strong><small>${person.role}</small></div>
      <span class="participant-status ${person.status === 'SPEAKER' ? 'speaking' : ''}">${person.status}</span>
      ${person.id !== 'host' ? `<button class="participant-menu" data-action="participant-menu" data-id="${person.id}" aria-label="Participant actions">•••</button>` : ''}
    </div>`).join('');
  document.querySelector('#participant-count').textContent = participants.length;
  document.querySelector('#listener-count').textContent = participants.length * 3;
}

function openView(viewName) {
  const target = document.querySelector(`#${viewName}-view`);
  if (!target) return;
  views.forEach((view) => view.classList.remove('active-view'));
  target.classList.add('active-view');
  navLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === viewName));
  document.querySelector('#page-title').textContent = viewName === 'live' ? 'Live studio' : viewName.charAt(0).toUpperCase() + viewName.slice(1);
  window.history.replaceState(null, '', `#${viewName}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function admitSarah() {
  if (!handRaised) return;
  const sarah = participants.find((person) => person.id === 'sarah');
  sarah.status = 'SPEAKER';
  sarah.role = 'Speaker';
  sarah.type = 'speaker';
  handRaised = false;
  document.querySelector('#request-callout').style.display = 'none';
  renderParticipants();
  showToast('Sarah is now on stage as a speaker.');
}

function createShow() {
  const input = document.querySelector('#new-show-name');
  const name = input.value.trim() || 'The Creative Brief';
  showCreated = true;
  modal.classList.remove('open');
  input.value = '';
  showToast(`${name} is ready for its first conversation.`);
}

function endLive() {
  document.querySelector('#live-status').textContent = 'ENDED';
  document.querySelector('.studio-status .live-pulse').style.background = '#94a09a';
  document.querySelector('#request-callout').style.display = 'none';
  showToast('Broadcast ended. Your episode is being prepared.');
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-view], [data-action]');
  if (!target) return;
  const { view, action } = target.dataset;
  if (view) {
    event.preventDefault();
    openView(view);
  }
  if (action === 'new-show') modal.classList.add('open');
  if (action === 'close-modal') modal.classList.remove('open');
  if (action === 'create-show') createShow();
  if (action === 'admit-sarah') admitSarah();
  if (action === 'end-live') endLive();
  if (action === 'toggle-host') {
    hostMicOn = !hostMicOn;
    target.classList.toggle('active', hostMicOn);
    target.innerHTML = `<span>♩</span> Mic ${hostMicOn ? 'on' : 'off'}`;
    showToast(`Your microphone is ${hostMicOn ? 'on' : 'off'}.`);
  }
  if (action === 'manage') showToast('Show management is ready for the next build.');
  if (action === 'participant-menu') {
    const person = participants.find((item) => item.id === target.dataset.id);
    if (person && person.status === 'SPEAKER') {
      person.status = 'MUTED';
      person.role = 'Muted speaker';
      renderParticipants();
      showToast(`${person.name} has been muted.`);
    } else if (person) {
      person.status = 'REMOVED';
      participants.splice(participants.indexOf(person), 1);
      renderParticipants();
      showToast(`${person.name} was removed from the room.`);
    }
  }
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.classList.remove('open');
});

window.addEventListener('hashchange', () => openView(window.location.hash.slice(1) || 'dashboard'));
renderParticipants();
openView(window.location.hash.slice(1) || 'dashboard');
