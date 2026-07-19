const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const loginMessage = document.querySelector('#loginMessage');
const adminUrl = `${window.location.origin}${window.location.pathname}`;

function safe(text) { const node = document.createElement('div'); node.textContent = text; return node.innerHTML; }
function isOrganizer(email) { return organizerEmails.includes((email || '').toLowerCase()); }

async function loadDashboard() {
  const { data: { session } } = await tournamentDb.auth.getSession();
  if (!session || !isOrganizer(session.user.email)) { loginView.hidden = false; dashboard.hidden = true; return; }
  loginView.hidden = true; dashboard.hidden = false;
  document.querySelector('#signOutButton').hidden = false;
  document.querySelector('#signedInAs').textContent = session.user.email;
  const [{ data: registrations }, { data: content }, { data: posts }] = await Promise.all([
    tournamentDb.from('registrations').select('player_name, player_age, position, team, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('site_content').select('content_key, content_value'),
    tournamentDb.from('community_posts').select('message, created_at').order('created_at', { ascending: false })
  ]);
  const values = Object.fromEntries((content || []).map(row => [row.content_key, row.content_value]));
  document.querySelector('#whenEditor').value = values.when || '';
  document.querySelector('#whereEditor').value = values.where || '';
  document.querySelector('#rulesEditor').value = values.rules || '';
  document.querySelector('#updateEditor').value = values.update || '';
  document.querySelector('#registrationCount').textContent = (registrations || []).length;
  document.querySelector('#moneyTotal').textContent = `$${(registrations || []).length * 5}`;
  document.querySelector('#registrationList').innerHTML = registrations?.length ? registrations.map(player => `<p><strong>${safe(player.player_name)}</strong> · ${safe(player.team)} · ${safe(player.position || 'Position not set')} · age ${safe(player.player_age)}</p>`).join('') : 'No registrations yet.';
  document.querySelector('#adminPosts').innerHTML = posts?.length ? posts.map(post => `<p class="post-item">${safe(post.message)}</p>`).join('') : '';
}

document.querySelector('#loginButton').addEventListener('click', async () => {
  const email = document.querySelector('#adminEmail').value.trim().toLowerCase();
  if (!isOrganizer(email)) { loginMessage.textContent = 'This email is not an organizer account.'; return; }
  const { data: { session } } = await tournamentDb.auth.getSession();
  if (session?.user?.email === email) { loadDashboard(); return; }
  const { error } = await tournamentDb.auth.signInWithOtp({ email, options: { emailRedirectTo: adminUrl } });
  loginMessage.textContent = error ? 'Could not send the sign-in email. Wait and try once later.' : 'Check your email and open the sign-in link.';
});
document.querySelector('#signOutButton').addEventListener('click', async () => { await tournamentDb.auth.signOut(); loadDashboard(); });
document.querySelector('#saveButton').addEventListener('click', async () => {
  const updates = [['when', '#whenEditor'], ['where', '#whereEditor'], ['rules', '#rulesEditor'], ['update', '#updateEditor']];
  const results = await Promise.all(updates.map(([key, selector]) => tournamentDb.from('site_content').update({ content_value: document.querySelector(selector).value }).eq('content_key', key)));
  if (results.some(result => result.error)) { alert('Could not save. Please try again.'); return; }
  alert('Tournament information saved.');
});
document.querySelector('#postButton').addEventListener('click', async () => {
  const editor = document.querySelector('#postEditor');
  const message = editor.value.trim(); if (!message) return;
  const { error } = await tournamentDb.from('community_posts').insert({ message });
  if (error) { alert('Could not publish post.'); return; }
  editor.value = ''; loadDashboard();
});
loadDashboard();
