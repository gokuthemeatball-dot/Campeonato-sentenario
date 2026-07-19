const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const loginMessage = document.querySelector('#loginMessage');
const adminUrl = `${window.location.origin}${window.location.pathname}`;

function safe(text) { const node = document.createElement('div'); node.textContent = text; return node.innerHTML; }
function isOrganizer(email) { return organizerEmails.includes((email || '').toLowerCase()); }

function renderPosts(posts) {
  const container = document.querySelector('#adminPosts');
  if (!posts?.length) { container.innerHTML = '<p>No community posts yet.</p>'; return; }
  container.innerHTML = posts.map(post => `
    <article class="admin-post" data-post-id="${post.id}">
      <textarea class="post-edit" rows="4" aria-label="Edit post">${safe(post.message)}</textarea>
      <p class="post-date">Published ${new Date(post.created_at).toLocaleString()}</p>
      <div class="admin-actions">
        <button class="button button-small" type="button" data-action="save-post">Save</button>
        <button class="button button-small button-danger" type="button" data-action="delete-post">Delete</button>
      </div>
    </article>`).join('');
}

async function loadDashboard() {
  const { data: { session } } = await tournamentDb.auth.getSession();
  if (!session || !isOrganizer(session.user.email)) {
    loginView.hidden = false;
    dashboard.hidden = true;
    document.querySelector('#signOutButton').hidden = true;
    return;
  }
  loginView.hidden = true; dashboard.hidden = false;
  document.querySelector('#signOutButton').hidden = false;
  document.querySelector('#signedInAs').textContent = `Signed in as ${session.user.email}`;
  document.querySelector('#organizerTeam').innerHTML = organizerEmails
    .map(email => `<span class="organizer-chip">${safe(email)}</span>`)
    .join('');
  const [{ data: registrations }, { data: content }, { data: posts }] = await Promise.all([
    tournamentDb.from('registrations').select('player_name, player_age, position, team, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('site_content').select('content_key, content_value'),
    tournamentDb.from('community_posts').select('id, message, created_at').order('created_at', { ascending: false })
  ]);
  const values = Object.fromEntries((content || []).map(row => [row.content_key, row.content_value]));
  document.querySelector('#whenEditor').value = values.when || '';
  document.querySelector('#whereEditor').value = values.where || '';
  document.querySelector('#rulesEditor').value = values.rules || '';
  document.querySelector('#updateEditor').value = values.update || '';
  document.querySelector('#registrationCount').textContent = (registrations || []).length;
  document.querySelector('#moneyTotal').textContent = `$${(registrations || []).length * 5}`;
  document.querySelector('#registrationList').innerHTML = registrations?.length ? registrations.map(player => `<p><strong>${safe(player.player_name)}</strong> · ${safe(player.team)} · ${safe(player.position || 'Position not set')} · age ${safe(player.player_age)}</p>`).join('') : 'No registrations yet.';
  renderPosts(posts);
  window.translateAdmin?.();
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
  const message = document.querySelector('#contentMessage');
  if (results.some(result => result.error)) { message.textContent = 'Could not save. Please try again.'; return; }
  message.textContent = 'Tournament information saved.';
});
document.querySelector('#clearRulesButton').addEventListener('click', async () => {
  if (!window.confirm('Remove all tournament rules?')) return;
  const { error } = await tournamentDb.from('site_content').update({ content_value: '' }).eq('content_key', 'rules');
  const message = document.querySelector('#contentMessage');
  if (error) { message.textContent = 'Could not remove the rules.'; return; }
  document.querySelector('#rulesEditor').value = '';
  message.textContent = 'All tournament rules were removed.';
});
document.querySelector('#clearInfoButton').addEventListener('click', async () => {
  if (!window.confirm('Clear the date, location, rules, and organizer update?')) return;
  const keys = ['when', 'where', 'rules', 'update'];
  const results = await Promise.all(keys.map(key => tournamentDb.from('site_content').update({ content_value: '' }).eq('content_key', key)));
  const message = document.querySelector('#contentMessage');
  if (results.some(result => result.error)) { message.textContent = 'Could not clear all tournament information.'; return; }
  ['#whenEditor', '#whereEditor', '#rulesEditor', '#updateEditor'].forEach(selector => { document.querySelector(selector).value = ''; });
  message.textContent = 'Tournament information cleared.';
});
document.querySelector('#postButton').addEventListener('click', async () => {
  const editor = document.querySelector('#postEditor');
  const message = editor.value.trim(); if (!message) return;
  const { error } = await tournamentDb.from('community_posts').insert({ message });
  if (error) {
    // Some Supabase projects block the separate community_posts table. The
    // tournament update row has the same organizer-only protection and keeps
    // the public posting area working as a safe backup.
    const { error: backupError } = await tournamentDb
      .from('site_content')
      .update({ content_value: message })
      .eq('content_key', 'update');
    if (backupError) { document.querySelector('#postMessage').textContent = `Could not publish post: ${backupError.message}`; return; }
  }
  editor.value = ''; document.querySelector('#postMessage').textContent = 'Post published.'; loadDashboard();
});
document.querySelector('#adminPosts').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const post = button.closest('[data-post-id]');
  const id = Number(post.dataset.postId);
  const message = document.querySelector('#postMessage');
  if (button.dataset.action === 'save-post') {
    const newMessage = post.querySelector('.post-edit').value.trim();
    if (!newMessage) { message.textContent = 'A post cannot be empty. Delete it instead.'; return; }
    const { error } = await tournamentDb.from('community_posts').update({ message: newMessage }).eq('id', id);
    message.textContent = error ? 'Could not update the post.' : 'Post updated.';
    if (!error) loadDashboard();
  }
  if (button.dataset.action === 'delete-post') {
    if (!window.confirm('Permanently delete this post?')) return;
    const { error } = await tournamentDb.from('community_posts').delete().eq('id', id);
    message.textContent = error ? 'Could not delete the post.' : 'Post deleted.';
    if (!error) loadDashboard();
  }
});
loadDashboard();
