const paymentDialog = document.querySelector('#paymentDialog');
const adminDialog = document.querySelector('#adminDialog');
const rulesContent = document.querySelector('#rulesContent');
const updatesContent = document.querySelector('#updatesContent');
const storedRules = localStorage.getItem('kickoffRules');
const storedUpdate = localStorage.getItem('kickoffUpdate');
const pageEnglish = document.body.innerHTML;
let isSpanish = localStorage.getItem('tournamentLanguage') === 'es';

const playerEmailField = document.querySelector('#registrationForm input[name="email"]');
playerEmailField?.closest('label').remove();
document.querySelector('#registrationForm input[name="age"]')?.setAttribute('min', '14');
const positionSelect = document.querySelector('#registrationForm select[name="position"]');
if (positionSelect) {
  positionSelect.id = 'positionSelect';
  positionSelect.disabled = true;
  positionSelect.insertAdjacentHTML('afterend', '<input type="hidden" id="lockedPosition" name="lockedPosition" />');
  positionSelect.closest('label').insertAdjacentHTML('afterend', '<p class="small" id="positionAvailability">Choose a team to see available positions.</p><p class="small" id="positionLockMessage" hidden>Your position selection is locked. Reload this page to choose a different position before registering.</p>');
  const teamLockMessage = document.querySelector('#teamLockMessage');
  const positionLabel = positionSelect.closest('label');
  if (teamLockMessage && positionLabel) {
    teamLockMessage.after(positionLabel, document.querySelector('#positionAvailability'), document.querySelector('#positionLockMessage'));
  }
}

function setSpanishText() {
  const strings = {
    'CENTENNIAL <span>CHAMPIONSHIP</span>': 'CAMPEONATO <span>CENTENARIO</span>',
    'CENTENNIAL<br><em>CHAMPIONSHIP</em>': 'CAMPEONATO<br><em>CENTENARIO</em>',
    'CENTENNIAL CHAMPIONSHIP': 'CAMPEONATO CENTENARIO',
    'Player registration': 'Registro de jugadores', 'Registration': 'Registro', 'Posts': 'Publicaciones', 'Rules': 'Reglas', 'Tournament info': 'Información del torneo', 'Organizer Desk': 'Panel de organizadores',
    'Home': 'Inicio', 'Football tournament': 'Torneo de fútbol', 'Football tournament • Your city': 'Torneo de fútbol • Tu ciudad',
    'PLAY FOR<br><em>THE CUP.</em>': 'JUEGA POR<br><em>LA COPA.</em>', 'TEAM<br><em>REGISTRATION</em>': 'REGISTRO<br><em>DE EQUIPOS</em>',
    'Build your squad. Bring your game. Take home the title.': 'Forma tu equipo. Da lo mejor. Llévate el título.',
    'Register your team <span>→</span>': 'Regístrate <span>→</span>', 'Register now <span>→</span>': 'Regístrate ahora <span>→</span>',
    'When': 'Cuándo', 'Where': 'Dónde', 'Entry': 'Entrada', 'PLAYER REGISTRATION': 'REGISTRO DE JUGADORES',
    'ANNOUNCEMENTS': 'ANUNCIOS', 'TOURNAMENT INFO': 'INFORMACIÓN DEL TORNEO', 'TOURNAMENT RULES': 'REGLAS DEL TORNEO', 'REGISTRATION': 'REGISTRO', 'POSTS': 'PUBLICACIONES', 'RULES': 'REGLAS',
    'Players age 14 and older': 'Jugadores de 14 años o más', 'News from the organizers': 'Noticias de los organizadores', 'Ask the organizers': 'Pregunta a los organizadores', 'QUESTIONS': 'PREGUNTAS', 'ANSWERED QUESTIONS': 'PREGUNTAS RESPONDIDAS', 'No answers yet.': 'Aún no hay respuestas.', 'Send a question to the tournament organizers.': 'Envía una pregunta a los organizadores del torneo.',
    'Register to play, read posts, and check the tournament rules.': 'Regístrate para jugar, lee las publicaciones y consulta las reglas del torneo.',
    'Choose your national team and playing position, then pay $5 to register.': 'Elige tu selección nacional y posición de juego, luego paga $5 para registrarte.',
    'Tournament details': 'Detalles del torneo', 'Read before playing': 'Lee antes de jugar', 'Rules will be posted by the organizers soon.': 'Los organizadores publicarán las reglas pronto.', 'No posts yet.': 'Aún no hay publicaciones.', 'Date and time will be announced.': 'La fecha y hora se anunciarán.',
    'Location will be announced.': 'El lugar se anunciará.', '$5 per player': '$5 por jugador', 'Cash App accepted': 'Se acepta Cash App',
    'Questions? Contact the tournament organizers.': '¿Preguntas? Contacta a los organizadores del torneo.', 'COMMUNITY UPDATE': 'ACTUALIZACIÓN DE LA COMUNIDAD', 'ORGANIZER POST': 'PUBLICACIÓN DEL ORGANIZADOR',
    'REGISTER<br><em>TO PLAY</em>': 'REGÍSTRATE<br><em>PARA JUGAR</em>', 'Registration is $5 per player. Players must be age 14 or older.': 'El registro cuesta $5 por jugador. Los jugadores deben tener 14 años o más.',
    'Choose carefully': 'Elige con cuidado', 'Enter your real first and last name, choose your team and position, then pay the $5 entry fee with Cash App.': 'Escribe tu nombre y apellido reales, elige tu equipo y posición, y paga la cuota de $5 con Cash App.',
    'Your team selection is locked. Reload this page to choose a different team before registering.': 'Tu selección de equipo está bloqueada. Recarga la página para elegir otro equipo antes de registrarte.', 'Use your real first and last name. Nicknames, repeated letters, and fake names are not accepted.': 'Usa tu nombre y apellido reales. No se aceptan apodos, letras repetidas ni nombres falsos.', 'I confirm that I entered my real legal name, not a nickname.': 'Confirmo que ingresé mi nombre legal real, no un apodo.', 'I understand that my registration is not complete until I pay $5.': 'Entiendo que mi registro no está completo hasta que pague $5.', 'Register <span>→</span>': 'Registrarse <span>→</span>', 'Send question <span>→</span>': 'Enviar pregunta <span>→</span>'
  };
  document.querySelectorAll('a, button, p, h1, h2, h3, footer span').forEach(el => { if (strings[el.innerHTML.trim()]) el.innerHTML = strings[el.innerHTML.trim()]; });
  document.querySelectorAll('label').forEach(label => { const text = label.firstChild; if (!text || text.nodeType !== Node.TEXT_NODE) return; const labels = {'Full legal name':'Nombre y apellido legal','Age (14 or older)':'Edad (14 años o más)','Playing position':'Posición de juego','Select your national team':'Selecciona tu selección nacional','Select your team':'Selecciona tu equipo','Your full name':'Tu nombre completo','Your question':'Tu pregunta','Organizer email':'Correo electrónico del organizador','Rules (one rule per line)':'Reglas (una regla por línea)','Update title':'Título de actualización'}; const current = text.nodeValue.trim(); if (labels[current]) text.nodeValue = labels[current]; });
  const countryNames = {Spain:'España',England:'Inglaterra',Belgium:'Bélgica',Netherlands:'Países Bajos',Germany:'Alemania',Croatia:'Croacia',Italy:'Italia',Mexico:'México','U.S.A.':'Estados Unidos',Japan:'Japón',Morocco:'Marruecos'};
  document.querySelectorAll('#teamSelect option').forEach(option => { if (countryNames[option.textContent]) option.textContent = countryNames[option.textContent]; });
  const fallbackStrings = {
    'Registration': 'Registro', 'Posts': 'Publicaciones', 'Rules': 'Reglas',
    'Organizer Desk': 'Panel de organizadores', 'Football tournament': 'Torneo de fútbol',
    'Register to play, read posts, and check the tournament rules.': 'Regístrate para jugar, lee las publicaciones y consulta las reglas del torneo.',
    'Register →': 'Registrarse →', 'Players age 14 and older': 'Jugadores de 14 años o más',
    'Choose your national team and playing position, then pay $5 to register.': 'Elige tu selección nacional y posición de juego, luego paga $5 para registrarte.',
    'Register now →': 'Regístrate ahora →', 'News from the organizers': 'Noticias de los organizadores',
    'No posts yet.': 'Aún no hay publicaciones.', 'Read before playing': 'Lee antes de jugar',
    'Rules will be posted by the organizers soon.': 'Los organizadores publicarán las reglas pronto.',
    'Questions? Contact the tournament organizers.': '¿Preguntas? Contacta a los organizadores del torneo.',
    'Player registration': 'Registro de jugadores',
    'Registration is $5 per player. Players must be age 14 or older.': 'El registro cuesta $5 por jugador. Los jugadores deben tener 14 años o más.',
    'Choose carefully': 'Elige con cuidado',
    'Enter your real first and last name, choose your team and position, then pay the $5 entry fee with Cash App.': 'Escribe tu nombre y apellido reales, elige tu equipo y posición, y paga la cuota de $5 con Cash App.',
    '$5 per player': '$5 por jugador', 'Your team choice locks after you select it.': 'Tu selección de equipo se bloquea después de elegirla.',
    'Use your real first and last name. Nicknames are not accepted.': 'Usa tu nombre y apellido reales. No se aceptan apodos.',
    'Your team selection is locked.': 'Tu selección de equipo está bloqueada.',
    'I understand that my registration is not complete until I pay $5.': 'Entiendo que mi registro no está completo hasta que pague $5.'
  };
  document.querySelectorAll('nav a:not(.brand), p, h2, h3, footer span, .button').forEach(element => {
    const translated = fallbackStrings[element.textContent.trim()];
    if (translated) element.textContent = translated;
  });
  document.title = document.title.replace('Centennial Championship', 'Campeonato Centenario');
}
document.querySelector('#languageButton')?.addEventListener('click', () => {
  isSpanish = !isSpanish;
  localStorage.setItem('tournamentLanguage', isSpanish ? 'es' : 'en');
  if (!isSpanish) { location.reload(); return; }
  document.documentElement.lang = 'es';
  document.querySelector('#languageButton').textContent = 'English';
  setSpanishText();
});
if (isSpanish) {
  document.documentElement.lang = 'es';
  document.querySelector('#languageButton').textContent = 'English';
  setSpanishText();
}

function displayContent() {
  const rules = localStorage.getItem('kickoffRules');
  const update = localStorage.getItem('kickoffUpdate');
  const when = localStorage.getItem('kickoffWhen');
  const where = localStorage.getItem('kickoffWhere');
  if (rules && rulesContent) rulesContent.innerHTML = `<ol>${rules.split('\n').filter(Boolean).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>`;
  if (update && updatesContent) updatesContent.innerHTML = `<article><p class="date">ORGANIZER POST</p><h3>${escapeHtml(update)}</h3></article>`;
  if (when && document.querySelector('#whenContent')) document.querySelector('#whenContent').innerHTML = escapeHtml(when).replace(/\n/g, '<br>');
  if (where && document.querySelector('#whereContent')) document.querySelector('#whereContent').innerHTML = escapeHtml(where).replace(/\n/g, '<br>');
}
function escapeHtml(text) { const node = document.createElement('div'); node.textContent = text; return node.innerHTML; }
function validRealName(name) {
  const normalized = name.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' ');
  const blocked = ['test test', 'none none', 'no name', 'your name', 'first last', 'name name', 'john doe', 'jane doe', 'asdf asdf', 'fake name'];
  const blockedWords = [
    'pito', 'pene', 'verga', 'puta', 'puto', 'culo', 'mierda', 'cabron', 'cabrón',
    'fuck', 'fucker', 'fucking', 'shit', 'bitch', 'asshole', 'dick', 'penis', 'porn'
  ];
  return parts.length >= 2 && parts.length <= 5
    && normalized.length >= 5 && normalized.length <= 80
    && parts.every(part => /^[\p{L}][\p{L}'’-]{1,29}$/u.test(part))
    && !blocked.includes(normalized.toLowerCase())
    && !parts.some(part => blockedWords.includes(part.toLowerCase()))
    && !/(.)\1{2,}/iu.test(normalized.replace(/\s/g, ''));
}

async function loadTeamAvailability() {
  const select = document.querySelector('#teamSelect');
  if (!select) return;
  const { data, error } = await tournamentDb.rpc('team_availability');
  if (error || !data) return;
  const counts = Object.fromEntries(data.map(row => [row.team, Number(row.player_count)]));
  [...select.options].forEach(option => {
    if (!option.value) return;
    const count = counts[option.value] || 0;
    option.dataset.originalLabel ||= option.textContent;
    option.disabled = count >= 6;
    option.textContent = `${option.dataset.originalLabel} — ${count >= 6 ? (isSpanish ? 'LLENO' : 'FULL') : `${6 - count} ${isSpanish ? 'lugares disponibles' : 'spots left'}`}`;
  });
}
async function loadPositionAvailability(team) {
  const select = document.querySelector('#positionSelect');
  const message = document.querySelector('#positionAvailability');
  if (!select || !team) return;
  const limits = { Goalkeeper: 1, Defender: 2, Midfielder: 2, Striker: 1 };
  const { data, error } = await tournamentDb.rpc('position_availability');
  if (error || !data) {
    select.disabled = false;
    if (message) message.textContent = isSpanish ? 'Elige una posición. La disponibilidad se verificará al registrarte.' : 'Choose a position. Availability will be checked when you register.';
    return;
  }
  const counts = Object.fromEntries(data
    .filter(row => row.team.toLowerCase() === team.toLowerCase())
    .map(row => [row.position, Number(row.player_count)]));
  [...select.options].forEach(option => {
    if (!option.value) return;
    const count = counts[option.value] || 0;
    const limit = limits[option.value];
    option.dataset.originalLabel ||= option.textContent;
    option.disabled = count >= limit;
    option.textContent = `${option.dataset.originalLabel} — ${count >= limit ? (isSpanish ? 'OCUPADO' : 'TAKEN') : `${limit - count} ${isSpanish ? 'disponible(s)' : 'available'}`}`;
  });
  select.disabled = false;
  if (message) message.textContent = isSpanish
    ? 'Por equipo: 1 portero, 2 defensas, 2 mediocampistas y 1 delantero.'
    : 'Per team: 1 goalkeeper, 2 defenders, 2 midfielders, and 1 striker.';
}
async function loadRemoteContent() {
  const { data, error } = await tournamentDb.from('site_content').select('content_key, content_value');
  if (error || !data) return;
  const values = Object.fromEntries(data.map(row => [row.content_key, row.content_value]));
  if (rulesContent) rulesContent.innerHTML = values.rules?.trim() ? `<ol>${values.rules.split('\n').filter(Boolean).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>` : `<p>${isSpanish ? 'Los organizadores publicarán las reglas pronto.' : 'Rules will be posted by the organizers soon.'}</p>`;
  if (values.update && updatesContent) updatesContent.innerHTML = `<article><p class="date">${isSpanish ? 'PUBLICACIÓN DEL ORGANIZADOR' : 'ORGANIZER POST'}</p><h3>${escapeHtml(values.update)}</h3></article>`;
  if (values.when && document.querySelector('#whenContent')) document.querySelector('#whenContent').innerHTML = escapeHtml(values.when).replace(/\n/g, '<br>');
  if (values.where && document.querySelector('#whereContent')) document.querySelector('#whereContent').innerHTML = escapeHtml(values.where).replace(/\n/g, '<br>');
}
async function loadCommunityPosts() {
  const container = document.querySelector('#communityPosts');
  if (!container) return;
  const { data, error } = await tournamentDb.from('community_posts').select('message, created_at').order('created_at', { ascending: false });
  if (error || !data) return;
  container.innerHTML = data.length ? data.map(post => `<article><p class="date">${isSpanish ? 'ACTUALIZACIÓN DE LA COMUNIDAD' : 'COMMUNITY UPDATE'}</p><h3>${escapeHtml(post.message)}</h3></article>`).join('') : `<p>${isSpanish ? 'Aún no hay publicaciones.' : 'No community posts yet.'}</p>`;
}
async function loadAnsweredQuestions() {
  const container = document.querySelector('#answeredQuestions');
  if (!container) return;
  const { data, error } = await tournamentDb.rpc('public_answered_questions');
  if (error || !data) return;
  container.innerHTML = data.length ? data.map(item => `
    <article class="public-answer">
      <p><strong>${isSpanish ? 'PREGUNTA' : 'QUESTION'}:</strong> ${escapeHtml(item.question)}</p>
      <p><strong>${isSpanish ? 'RESPUESTA' : 'ANSWER'}:</strong> ${escapeHtml(item.answer)}</p>
    </article>`).join('') : `<p>${isSpanish ? 'Aún no hay respuestas.' : 'No answers yet.'}</p>`;
}
async function showRegistrations() {
  const { data: registrations, error } = await tournamentDb.from('registrations').select('player_name, player_age, team, paid, created_at').order('created_at', { ascending: false });
  if (error) return;
  const count = document.querySelector('#registrationCount');
  const total = document.querySelector('#moneyTotal');
  const list = document.querySelector('#registrationList');
  if (count) count.textContent = registrations.length;
  if (total) total.textContent = `$${registrations.length * 5}`;
  if (list) list.innerHTML = registrations.length
    ? registrations.map(player => `<p><strong>${escapeHtml(player.player_name)}</strong> · ${escapeHtml(player.team)} · age ${escapeHtml(player.player_age)}</p>`).join('')
    : 'No registrations yet.';
}
displayContent();
loadRemoteContent();
loadCommunityPosts();
loadAnsweredQuestions();
loadTeamAvailability();

async function showOrganizerLink() {
  const link = document.querySelector('#organizerLink');
  if (!link) return;
  const { data: { session } } = await tournamentDb.auth.getSession();
  link.hidden = !session || !organizerEmails.includes((session.user.email || '').toLowerCase());
}
showOrganizerLink();
tournamentDb.auth.onAuthStateChange(() => showOrganizerLink());

document.querySelector('#registrationForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const playerName = form.get('playerName').trim();
  if (!validRealName(playerName)) {
    alert(isSpanish
      ? 'Escribe tu nombre y apellido reales. No se permiten apodos, nombres falsos ni palabras inapropiadas.'
      : 'Enter your real first and last name. Nicknames, fake names, and inappropriate words are not allowed.');
    return;
  }
  if (!form.get('lockedPosition')) {
    alert(isSpanish ? 'Elige una posición disponible.' : 'Choose an available position.');
    return;
  }
  const { error } = await tournamentDb.from('registrations').insert({
    player_name: playerName, player_age: Number(form.get('age')), position: form.get('lockedPosition'), team: form.get('lockedTeam')
  });
  if (error) {
    const errorMessage = error.message || '';
    if (errorMessage.includes('TEAM_FULL')) {
      alert(isSpanish
        ? 'Ese equipo ya tiene 6 jugadores. Recarga la página y elige otro equipo.'
        : 'That team already has 6 players. Please reload and choose another team.');
    } else if (errorMessage.includes('POSITION_FULL')) {
      alert(isSpanish
        ? 'Esa posición ya está ocupada en este equipo. Recarga la página y elige otra posición.'
        : 'That position is already taken for this team. Reload and choose another position.');
    } else if (errorMessage.includes('INVALID_REAL_NAME')) {
      alert(isSpanish
        ? 'Usa tu nombre y apellido reales. No se permiten apodos, nombres falsos ni palabras inapropiadas.'
        : 'Use your real first and last name. Nicknames, fake names, and inappropriate words are not allowed.');
    } else {
      alert(isSpanish
        ? 'No se pudo guardar el registro. Inténtalo de nuevo.'
        : 'Registration could not be saved yet. Please try again.');
    }
    await loadTeamAvailability();
    return;
  }
  paymentDialog.showModal();
});
document.querySelector('#teamSelect')?.addEventListener('change', async (event) => {
  const newTeamField = document.querySelector('#newTeamField');
  const newTeamInput = newTeamField?.querySelector('input');
  if (newTeamField) newTeamField.hidden = event.target.value !== 'new';
  if (newTeamInput) newTeamInput.required = event.target.value === 'new';
  document.querySelector('#lockedTeam').value = event.target.value;
  await loadPositionAvailability(event.target.value);
  event.target.disabled = true;
  document.querySelector('#teamLockMessage').hidden = false;
});
document.querySelector('#positionSelect')?.addEventListener('change', (event) => {
  document.querySelector('#lockedPosition').value = event.target.value;
  event.target.disabled = true;
  document.querySelector('#positionLockMessage').hidden = false;
});
document.querySelector('#questionForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const senderName = String(form.get('questionName') || '').trim();
  const question = String(form.get('questionMessage') || '').trim();
  const status = document.querySelector('#questionMessage');
  if (!validRealName(senderName)) { status.textContent = isSpanish ? 'Usa tu nombre y apellido reales, sin apodos ni palabras inapropiadas.' : 'Use your real first and last name, without nicknames or inappropriate words.'; return; }
  if (question.length < 5) { status.textContent = isSpanish ? 'Escribe una pregunta completa.' : 'Please enter a complete question.'; return; }
  const { error } = await tournamentDb.from('player_questions').insert({ sender_name: senderName, question });
  if (error) { status.textContent = isSpanish ? 'No se pudo enviar tu pregunta. Inténtalo de nuevo.' : 'Your question could not be sent. Please try again.'; return; }
  event.currentTarget.reset();
  status.textContent = isSpanish ? 'Tu pregunta fue enviada a los organizadores.' : 'Your question was sent to the organizers.';
});
document.querySelector('#adminButton')?.addEventListener('click', () => adminDialog.showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close()));
document.querySelector('#loginButton')?.addEventListener('click', async () => {
  const email = document.querySelector('#adminEmail').value.trim().toLowerCase();
  const message = document.querySelector('#loginMessage');
  if (!email || !email.includes('@')) { message.textContent = 'Please enter a valid email address.'; return; }
  if (!organizerEmails.includes(email)) { message.textContent = 'This email is not an organizer account.'; return; }
  const { data: { session } } = await tournamentDb.auth.getSession();
  if (!session || session.user.email !== email) {
    const { error } = await tournamentDb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    message.textContent = error ? 'Could not send the sign-in email. Please try again.' : 'Check your email and open the sign-in link, then return here.';
    return;
  }
  document.querySelector('#editor').hidden = false;
  message.textContent = '';
  const { data } = await tournamentDb.from('site_content').select('content_key, content_value');
  const values = Object.fromEntries((data || []).map(row => [row.content_key, row.content_value]));
  document.querySelector('#rulesEditor').value = values.rules || '';
  document.querySelector('#updateEditor').value = values.update || '';
  document.querySelector('#whenEditor').value = values.when || '';
  document.querySelector('#whereEditor').value = values.where || '';
  await showRegistrations();
});
document.querySelector('#saveButton')?.addEventListener('click', async () => {
  const changes = [
    ['rules', document.querySelector('#rulesEditor').value], ['update', document.querySelector('#updateEditor').value],
    ['when', document.querySelector('#whenEditor').value], ['where', document.querySelector('#whereEditor').value]
  ];
  const results = await Promise.all(changes.map(([content_key, content_value]) => tournamentDb.from('site_content').update({ content_value }).eq('content_key', content_key)));
  if (results.some(result => result.error)) { alert('Changes could not be saved. Please try again.'); return; }
  await loadRemoteContent(); adminDialog.close();
});
