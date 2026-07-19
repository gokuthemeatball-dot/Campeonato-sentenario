const paymentDialog = document.querySelector('#paymentDialog');
const adminDialog = document.querySelector('#adminDialog');
const rulesContent = document.querySelector('#rulesContent');
const updatesContent = document.querySelector('#updatesContent');
const storedRules = localStorage.getItem('kickoffRules');
const storedUpdate = localStorage.getItem('kickoffUpdate');
const pageEnglish = document.body.innerHTML;
let isSpanish = false;

const playerEmailField = document.querySelector('#registrationForm input[name="email"]');
playerEmailField?.closest('label').remove();
document.querySelector('#registrationForm input[name="age"]')?.setAttribute('min', '14');

function setSpanishText() {
  const strings = {
    'Player registration': 'Registro de jugadores', 'Tournament info': 'Información del torneo', 'Organizer Desk': 'Panel de organizadores',
    'Home': 'Inicio', 'Football tournament • Your city': 'Torneo de fútbol • Tu ciudad',
    'PLAY FOR<br><em>THE CUP.</em>': 'JUEGA POR<br><em>LA COPA.</em>', 'TEAM<br><em>REGISTRATION</em>': 'REGISTRO<br><em>DE EQUIPOS</em>',
    'Build your squad. Bring your game. Take home the title.': 'Forma tu equipo. Da lo mejor. Llévate el título.',
    'Register your team <span>→</span>': 'Regístrate <span>→</span>', 'Register now <span>→</span>': 'Regístrate ahora <span>→</span>',
    'When': 'Cuándo', 'Where': 'Dónde', 'Entry': 'Entrada', 'PLAYER REGISTRATION': 'REGISTRO DE JUGADORES',
    'ANNOUNCEMENTS': 'ANUNCIOS', 'TOURNAMENT INFO': 'INFORMACIÓN DEL TORNEO', 'TOURNAMENT RULES': 'REGLAS DEL TORNEO',
    'Players age 14 and older': 'Jugadores de 14 años o más', 'News from the organizers': 'Noticias de los organizadores',
    'Tournament details': 'Detalles del torneo', 'Date and time will be announced.': 'La fecha y hora se anunciarán.',
    'Location will be announced.': 'El lugar se anunciará.', '$5 per player': '$5 por jugador', 'Cash App accepted': 'Se acepta Cash App',
    'Questions? Contact the tournament organizers.': '¿Preguntas? Contacta a los organizadores del torneo.',
    'REGISTER<br><em>TO PLAY</em>': 'REGÍSTRATE<br><em>PARA JUGAR</em>', 'Registration is $5 per player. Players must be age 14 or older.': 'El registro cuesta $5 por jugador. Los jugadores deben tener 14 años o más.',
    'Choose carefully': 'Elige con cuidado', 'Enter your real first and last name, choose your team and position, then pay the $5 entry fee with Cash App.': 'Escribe tu nombre y apellido reales, elige tu equipo y posición, y paga la cuota de $5 con Cash App.',
    'Your team selection is locked.': 'Tu selección de equipo está bloqueada.', 'Register <span>→</span>': 'Registrarse <span>→</span>'
  };
  document.querySelectorAll('a, button, p, h1, h2, h3').forEach(el => { if (strings[el.innerHTML.trim()]) el.innerHTML = strings[el.innerHTML.trim()]; });
  document.querySelectorAll('label').forEach(label => { const text = label.firstChild; if (!text || text.nodeType !== Node.TEXT_NODE) return; const labels = {'Full legal name':'Nombre y apellido legal','Age (14 or older)':'Edad (14 años o más)','Playing position':'Posición de juego','Select your national team':'Selecciona tu selección nacional','Select your team':'Selecciona tu equipo','Organizer email':'Correo electrónico del organizador','Rules (one rule per line)':'Reglas (una regla por línea)','Update title':'Título de actualización'}; const current = text.nodeValue.trim(); if (labels[current]) text.nodeValue = labels[current]; });
  const countryNames = {Spain:'España',England:'Inglaterra',Belgium:'Bélgica',Netherlands:'Países Bajos',Germany:'Alemania',Croatia:'Croacia',Italy:'Italia',Mexico:'México','U.S.A.':'Estados Unidos',Japan:'Japón',Morocco:'Marruecos'};
  document.querySelectorAll('#teamSelect option').forEach(option => { if (countryNames[option.textContent]) option.textContent = countryNames[option.textContent]; });
}
document.querySelector('#languageButton')?.addEventListener('click', () => { isSpanish = !isSpanish; if (!isSpanish) { document.body.innerHTML = pageEnglish; location.reload(); return; } document.documentElement.lang = 'es'; document.querySelector('#languageButton').textContent = 'English'; setSpanishText(); });

function displayContent() {
  const rules = localStorage.getItem('kickoffRules');
  const update = localStorage.getItem('kickoffUpdate');
  const when = localStorage.getItem('kickoffWhen');
  const where = localStorage.getItem('kickoffWhere');
  if (rules && rulesContent) rulesContent.innerHTML = `<ol>${rules.split('\n').filter(Boolean).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>`;
  if (update && updatesContent) updatesContent.innerHTML = `<article><p class="date">TOURNAMENT UPDATE</p><h3>${escapeHtml(update)}</h3></article>`;
  if (when && document.querySelector('#whenContent')) document.querySelector('#whenContent').innerHTML = escapeHtml(when).replace(/\n/g, '<br>');
  if (where && document.querySelector('#whereContent')) document.querySelector('#whereContent').innerHTML = escapeHtml(where).replace(/\n/g, '<br>');
}
function escapeHtml(text) { const node = document.createElement('div'); node.textContent = text; return node.innerHTML; }
async function loadRemoteContent() {
  const { data, error } = await tournamentDb.from('site_content').select('content_key, content_value');
  if (error || !data) return;
  const values = Object.fromEntries(data.map(row => [row.content_key, row.content_value]));
  if (rulesContent) rulesContent.innerHTML = values.rules ? `<ol>${values.rules.split('\n').filter(Boolean).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>` : '';
  if (document.querySelector('#rulesSection')) document.querySelector('#rulesSection').hidden = !values.rules?.trim();
  if (values.update && updatesContent) updatesContent.innerHTML = `<article><p class="date">TOURNAMENT UPDATE</p><h3>${escapeHtml(values.update)}</h3></article>`;
  if (values.when && document.querySelector('#whenContent')) document.querySelector('#whenContent').innerHTML = escapeHtml(values.when).replace(/\n/g, '<br>');
  if (values.where && document.querySelector('#whereContent')) document.querySelector('#whereContent').innerHTML = escapeHtml(values.where).replace(/\n/g, '<br>');
}
async function loadCommunityPosts() {
  const container = document.querySelector('#communityPosts');
  if (!container) return;
  const { data, error } = await tournamentDb.from('community_posts').select('message, created_at').order('created_at', { ascending: false });
  if (error || !data) return;
  container.innerHTML = data.length ? data.map(post => `<article><p class="date">COMMUNITY UPDATE</p><h3>${escapeHtml(post.message)}</h3></article>`).join('') : '<p>No community posts yet.</p>';
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

async function showOrganizerLink() {
  const link = document.querySelector('#organizerLink');
  if (!link) return;
  const { data: { session } } = await tournamentDb.auth.getSession();
  link.hidden = !session || !organizerEmails.includes(session.user.email.toLowerCase());
}
showOrganizerLink();

document.querySelector('#registrationForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const playerName = form.get('playerName').trim();
  const nameParts = playerName.split(/\s+/).filter(Boolean);
  const blockedNames = ['test test', 'none none', 'no name', 'your name', 'first last', 'name name'];
  const nameIsValid = nameParts.length >= 2 && nameParts.every(part => /^[\p{L}][\p{L}'-]{1,29}$/u.test(part)) && !blockedNames.includes(playerName.toLowerCase()) && !/^(.)\1+$/u.test(nameParts.join(''));
  if (!nameIsValid) {
    alert('Please enter your real first and last name using letters only.'); return;
  }
  const { error } = await tournamentDb.from('registrations').insert({
    player_name: playerName, player_age: Number(form.get('age')), position: form.get('position'), team: form.get('lockedTeam')
  });
  if (error) { alert('Registration could not be saved yet. Please try again.'); return; }
  paymentDialog.showModal();
});
document.querySelector('#teamSelect')?.addEventListener('change', (event) => {
  const newTeamField = document.querySelector('#newTeamField');
  const newTeamInput = newTeamField?.querySelector('input');
  if (newTeamField) newTeamField.hidden = event.target.value !== 'new';
  if (newTeamInput) newTeamInput.required = event.target.value === 'new';
  document.querySelector('#lockedTeam').value = event.target.value;
  event.target.disabled = true;
  document.querySelector('#teamLockMessage').hidden = false;
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
