let meetingSpanish = localStorage.getItem('tournamentLanguage') === 'es';
const meetingFormStartedAt = Date.now();

function meetingSubmissionToken() {
  let token = localStorage.getItem('tournamentSubmissionToken');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    token = crypto.randomUUID();
    localStorage.setItem('tournamentSubmissionToken', token);
  }
  return token;
}
const meetingTeamSelect = document.querySelector('#meetingTeamSelect');
const meetingPositionSelect = document.querySelector('#meetingPositionSelect');
const meetingMessage = document.querySelector('#meetingRegistrationMessage');

function meetingText(en, es) { return meetingSpanish ? es : en; }
function escapeMeetingText(value) {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}
function validMeetingName(name) {
  const normalized = name.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ');
  const blockedNames = ['test test', 'none none', 'no name', 'your name', 'first last', 'name name', 'john doe', 'jane doe', 'asdf asdf', 'fake name'];
  const blockedWords = ['pito', 'pene', 'verga', 'puta', 'puto', 'culo', 'mierda', 'cabron', 'cabrón', 'fuck', 'fucker', 'fucking', 'shit', 'bitch', 'asshole', 'dick', 'penis', 'porn'];
  return parts.length >= 2 && parts.length <= 5
    && normalized.length >= 5 && normalized.length <= 80
    && parts.every(part => /^[\p{L}][\p{L}'’-]{1,29}$/u.test(part))
    && !blockedNames.includes(normalized.toLowerCase())
    && !parts.some(part => blockedWords.includes(part.toLowerCase()))
    && !/(.)\1{2,}/iu.test(normalized.replace(/\s/g, ''));
}

function applyMeetingLanguage() {
  document.documentElement.lang = meetingSpanish ? 'es' : 'en';
  document.querySelectorAll('[data-en][data-es]').forEach(element => {
    element.innerHTML = meetingSpanish ? element.dataset.es : element.dataset.en;
  });
  document.querySelector('#meetingLanguageButton').textContent = meetingSpanish ? 'English' : 'Español';
}

async function loadMeetingTeams() {
  const testMode = window.tournamentTestModeActive && window.tournamentTesterCode;
  const { data, error } = testMode
    ? await tournamentDb.rpc('test_registration_availability', { check_code: window.tournamentTesterCode })
    : await tournamentDb.rpc('team_availability');
  if (error || !data) return;
  const counts = testMode
    ? data.reduce((totals, row) => ({ ...totals, [row.team]: (totals[row.team] || 0) + Number(row.player_count) }), {})
    : Object.fromEntries(data.map(row => [row.team, Number(row.player_count)]));
  [...meetingTeamSelect.options].forEach(option => {
    if (!option.value) return;
    const count = counts[option.value] || 0;
    option.dataset.label ||= option.textContent;
    option.disabled = count >= 6;
    option.textContent = `${option.dataset.label} — ${count >= 6 ? meetingText('FULL', 'LLENO') : `${6 - count} ${meetingText('spots left', 'lugares disponibles')}`}`;
  });
}

async function loadMeetingPositions(team) {
  const limits = { Goalkeeper: 1, Defender: 2, Midfielder: 2, Striker: 1 };
  const testMode = window.tournamentTestModeActive && window.tournamentTesterCode;
  const { data, error } = testMode
    ? await tournamentDb.rpc('test_registration_availability', { check_code: window.tournamentTesterCode })
    : await tournamentDb.rpc('position_availability');
  meetingPositionSelect.selectedIndex = 0;
  if (error || !data) {
    meetingPositionSelect.disabled = false;
    document.querySelector('#meetingPositionAvailability').textContent = meetingText('Choose a position. Availability will be checked when you register.', 'Elige una posición. La disponibilidad se verificará al registrarte.');
    return;
  }
  const counts = Object.fromEntries(data.filter(row => row.team.toLowerCase() === team.toLowerCase()).map(row => [row.position, Number(row.player_count)]));
  [...meetingPositionSelect.options].forEach(option => {
    if (!option.value) return;
    const count = counts[option.value] || 0;
    const limit = limits[option.value];
    option.dataset.label ||= option.textContent;
    option.disabled = count >= limit;
    option.textContent = `${option.dataset.label} — ${count >= limit ? meetingText('TAKEN', 'OCUPADO') : `${limit - count} ${meetingText('available', 'disponible(s)')}`}`;
  });
  meetingPositionSelect.disabled = false;
  document.querySelector('#meetingPositionAvailability').textContent = meetingText('Per team: 1 goalkeeper, 2 defenders, 2 midfielders, and 1 striker.', 'Por equipo: 1 portero, 2 defensas, 2 mediocampistas y 1 delantero.');
}

async function showMeetingAnnouncements() {
  const section = document.querySelector('#meetingAnnouncements');
  const list = document.querySelector('#meetingAnnouncementList');
  if (!section || !list) return;
  section.hidden = false;
  const [{ data: posts }, { data: content }] = await Promise.all([
    tournamentDb.from('community_posts').select('message, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('site_content').select('content_key, content_value').eq('content_key', 'update')
  ]);
  const items = [];
  const organizerUpdate = content?.[0]?.content_value?.trim();
  if (organizerUpdate) items.push(organizerUpdate);
  (posts || []).forEach(post => items.push(post.message));
  list.innerHTML = items.length
    ? items.map(message => `<article><p class="date">${meetingText('ORGANIZER ANNOUNCEMENT', 'ANUNCIO DEL ORGANIZADOR')}</p><h3>${escapeMeetingText(message)}</h3></article>`).join('')
    : `<p>${meetingText('No announcements yet.', 'Aún no hay anuncios.')}</p>`;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function checkMeetingRegistrationStatus() {
  if (window.tournamentTestModeActive) return;
  const email = localStorage.getItem('meetingRegistrationEmail');
  if (!email) return;
  const { data, error } = await tournamentDb.rpc('meeting_registration_status', { check_email: email });
  if (error) return;
  if (data === 'accepted') {
    localStorage.removeItem('meetingRegistrationEmail');
    window.location.href = 'index.html';
  }
  if (data === null && localStorage.getItem('meetingRegistrationComplete') === 'true') {
    localStorage.removeItem('meetingRegistrationComplete');
    localStorage.removeItem('meetingRegistrationEmail');
    document.querySelector('#meetingAnnouncements').hidden = true;
    meetingMessage.textContent = meetingText('Your registration request was revoked because payment was not received.', 'Tu solicitud de registro fue revocada porque no se recibió el pago.');
  }
}

document.querySelector('#meetingLanguageButton').addEventListener('click', () => {
  meetingSpanish = !meetingSpanish;
  localStorage.setItem('tournamentLanguage', meetingSpanish ? 'es' : 'en');
  applyMeetingLanguage();
  loadMeetingTeams();
  if (meetingTeamSelect.value) loadMeetingPositions(meetingTeamSelect.value);
  if (localStorage.getItem('meetingRegistrationComplete') === 'true') showMeetingAnnouncements();
});
meetingTeamSelect.addEventListener('change', event => loadMeetingPositions(event.target.value));
document.querySelector('#meetingRegistrationForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const playerName = String(form.get('playerName') || '').trim();
  if (!validMeetingName(playerName)) {
    meetingMessage.textContent = meetingText('Use your real first and last name without nicknames or inappropriate words.', 'Usa tu nombre y apellido reales, sin apodos ni palabras inapropiadas.');
    return;
  }
  const testMode = window.tournamentTestModeActive && window.tournamentTesterCode;
  const result = testMode
    ? await tournamentDb.rpc('submit_test_registration', {
      check_code: window.tournamentTesterCode,
      test_name: playerName,
      test_email: String(form.get('email') || '').trim().toLowerCase(),
      test_age: Number(form.get('age')),
      test_team: form.get('team'),
      test_position: form.get('position')
    })
    : await tournamentDb.rpc('submit_meeting_registration', {
      p_player_name: playerName,
      p_email: String(form.get('email') || '').trim().toLowerCase(),
      p_player_age: Number(form.get('age')),
      p_team: form.get('team'),
      p_position: form.get('position'),
      p_submission_token: meetingSubmissionToken(),
      p_honeypot: String(form.get('website') || ''),
      p_form_elapsed_ms: Date.now() - meetingFormStartedAt
    });
  const { error } = result;
  if (error) {
    const problem = error.message || '';
    meetingMessage.textContent = problem.includes('SUBMISSION_RATE_LIMIT')
      ? meetingText('Too many attempts. Wait one hour before trying again.', 'Demasiados intentos. Espera una hora antes de intentarlo de nuevo.')
      : problem.includes('BOT_DETECTED')
        ? meetingText('The form could not be verified. Reload and try again.', 'No se pudo verificar el formulario. Recarga e inténtalo de nuevo.')
        : problem.includes('TEAM_FULL')
      ? meetingText('That team is now full. Choose another team.', 'Ese equipo ya está lleno. Elige otro equipo.')
      : problem.includes('POSITION_FULL')
        ? meetingText('That position was just taken. Choose another position.', 'Esa posición acaba de ocuparse. Elige otra posición.')
        : meetingText('Registration could not be saved. Please try again.', 'No se pudo guardar el registro. Inténtalo de nuevo.');
    await loadMeetingTeams();
    if (meetingTeamSelect.value) await loadMeetingPositions(meetingTeamSelect.value);
    return;
  }
  meetingMessage.textContent = '';
  if (!testMode) {
    localStorage.setItem('meetingRegistrationComplete', 'true');
    localStorage.setItem('meetingRegistrationEmail', String(form.get('email') || '').trim().toLowerCase());
  }
  if (testMode) {
    document.querySelector('#meetingSuccessDialog h2').textContent = meetingText('UNOFFICIAL TEST SAVED', 'PRUEBA NO OFICIAL GUARDADA');
    document.querySelector('#meetingSuccessDialog p:last-child').textContent = meetingText('This did not create a real pending registration or payment.', 'Esto no creó un registro pendiente ni un pago real.');
  }
  document.querySelector('#meetingSuccessDialog').showModal();
  await showMeetingAnnouncements();
  event.currentTarget.reset();
  meetingPositionSelect.disabled = true;
  await loadMeetingTeams();
});
document.querySelector('#closeMeetingSuccess').addEventListener('click', () => document.querySelector('#meetingSuccessDialog').close());

applyMeetingLanguage();
loadMeetingTeams();
if (localStorage.getItem('meetingRegistrationComplete') === 'true') showMeetingAnnouncements();
checkMeetingRegistrationStatus();
setInterval(checkMeetingRegistrationStatus, 5000);
window.addEventListener('tournament-test-ready', () => {
  loadMeetingTeams();
  if (meetingTeamSelect.value) loadMeetingPositions(meetingTeamSelect.value);
});
