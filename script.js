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
    'Team registration': 'Registro de equipos', 'Tournament info': 'Información', 'Admin': 'Administradores',
    'Home': 'Inicio', 'Players and teams': 'Jugadores y equipos', 'Football tournament • Your city': 'Torneo de fútbol • Tu ciudad',
    'PLAY FOR<br><em>THE CUP.</em>': 'JUEGA POR<br><em>LA COPA.</em>', 'TEAM<br><em>REGISTRATION</em>': 'REGISTRO<br><em>DE EQUIPOS</em>',
    'Build your squad. Bring your game. Take home the title.': 'Forma tu equipo. Da lo mejor. Llévate el título.',
    'Register here, then pay your team entry fee through Cash App.': 'Regístrate aquí y después paga la cuota de tu equipo por Cash App.',
    'Register your team <span>→</span>': 'Registra tu equipo <span>→</span>', 'When': 'Cuándo', 'Where': 'Dónde', 'Entry': 'Entrada',
    'TOURNAMENT RULES': 'REGLAS DEL TORNEO', 'UPDATES': 'ACTUALIZACIONES', 'For organizers only': 'Solo organizadores',
    'ADMIN AREA': 'ÁREA DE ADMINISTRADORES', 'Continue': 'Continuar', 'Save changes': 'Guardar cambios'
  };
  document.querySelectorAll('a, button, p, h1, h2, h3').forEach(el => { if (strings[el.innerHTML.trim()]) el.innerHTML = strings[el.innerHTML.trim()]; });
  document.querySelectorAll('label').forEach(label => { const text = label.firstChild; if (!text || text.nodeType !== Node.TEXT_NODE) return; const labels = {'Select your team':'Selecciona tu equipo','New team name':'Nombre del nuevo equipo',"Player's full name":'Nombre completo del jugador',"Player's age":'Edad del jugador','Email address':'Correo electrónico','Organizer email':'Correo electrónico del organizador','Rules (one rule per line)':'Reglas (una por línea)','Update title':'Título de actualización'}; const current = text.nodeValue.trim(); if (labels[current]) text.nodeValue = labels[current]; });
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
  if (values.rules && rulesContent) rulesContent.innerHTML = `<ol>${values.rules.split('\n').filter(Boolean).map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}</ol>`;
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

document.querySelector('#registrationForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const { error } = await tournamentDb.from('registrations').insert({
    player_name: form.get('playerName'), player_age: Number(form.get('age')), team: form.get('lockedTeam')
  });
  if (error) { alert('Registration could not be saved yet. Please try again.'); return; }
  paymentDialog.showModal();
});
document.querySelector('#teamSelect')?.addEventListener('change', (event) => {
  const newTeamField = document.querySelector('#newTeamField');
  const newTeamInput = newTeamField.querySelector('input');
  newTeamField.hidden = event.target.value !== 'new';
  newTeamInput.required = event.target.value === 'new';
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
