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
      <p class="post-text">${safe(post.message)}</p>
      <label class="post-editor" hidden>Edit post
        <textarea class="post-edit" rows="4" maxlength="1000">${safe(post.message)}</textarea>
      </label>
      <p class="post-date">${post.updated_at ? 'Updated' : 'Published'} ${new Date(post.updated_at || post.created_at).toLocaleString()}</p>
      <div class="admin-actions post-view-actions">
        <button class="button button-small" type="button" data-action="edit-post">Edit</button>
        <button class="button button-small button-danger" type="button" data-action="delete-post">Delete</button>
      </div>
      <div class="admin-actions post-edit-actions" hidden>
        <button class="button button-small" type="button" data-action="save-post">Save changes</button>
        <button class="button button-small" type="button" data-action="cancel-edit">Cancel</button>
      </div>
    </article>`).join('');
}

function setPostEditMode(post, editing) {
  post.querySelector('.post-text').hidden = editing;
  post.querySelector('.post-editor').hidden = !editing;
  post.querySelector('.post-view-actions').hidden = editing;
  post.querySelector('.post-edit-actions').hidden = !editing;
  if (editing) {
    const editor = post.querySelector('.post-edit');
    editor.dataset.originalMessage = post.querySelector('.post-text').textContent;
    editor.focus();
  }
}

function renderQuestions(questions) {
  const container = document.querySelector('#questionList');
  if (!questions?.length) { container.innerHTML = '<p>No questions yet.</p>'; return; }
  container.innerHTML = questions.map(item => `
    <article class="question-item" data-question-id="${item.id}">
      <p><strong>${safe(item.sender_name)}</strong> · ${new Date(item.created_at).toLocaleString()}</p>
      <blockquote>${safe(item.question)}</blockquote>
      <label>Organizer reply<textarea class="question-reply" rows="4" maxlength="1000">${safe(item.organizer_reply || '')}</textarea></label>
      <div class="admin-actions">
        <button class="button button-small" type="button" data-action="save-reply">Save and publish reply</button>
        <button class="button button-small button-danger" type="button" data-action="delete-question">Delete question</button>
      </div>
    </article>`).join('');
}

function renderPendingRegistrations(registrations) {
  const container = document.querySelector('#pendingRegistrationList');
  const pending = (registrations || []).filter(item => item.registration_status === 'pending');
  document.querySelector('#pendingRegistrationCount').textContent = pending.length;
  if (!pending.length) { container.innerHTML = '<p>No pending payment confirmations.</p>'; return; }
  container.innerHTML = pending.map(item => `
    <article class="question-item" data-registration-id="${item.id}">
      <p><strong>${safe(item.player_name)}</strong> · ${safe(item.email || 'No email')}</p>
      <p>${safe(item.team)} · ${safe(item.position || 'Position not set')} · age ${safe(item.player_age)}</p>
      <p><strong>Payment:</strong> ${item.registration_source === 'cash_app' ? `Cash App confirmation: ${safe(item.payment_reference || 'Missing')}` : 'Paying at organizer meeting'}</p>
      <div class="admin-actions">
        <button class="button button-small" type="button" data-action="accept-meeting-registration">Payment verified — accept registration</button>
        <button class="button button-small button-danger" type="button" data-action="revoke-meeting-registration">Payment not verified — reject registration</button>
      </div>
    </article>`).join('');
}

function renderTestRegistrations(registrations) {
  const container = document.querySelector('#testRegistrationList');
  if (!registrations?.length) { container.innerHTML = '<p>No test registrations.</p>'; return; }
  container.innerHTML = registrations.map(item => `<p><strong>${safe(item.player_name)}</strong> · ${safe(item.email)} · ${safe(item.team)} · ${safe(item.position)} · age ${safe(item.player_age)} · ${item.simulated_payment ? 'simulated payment passed' : 'payment simulation pending'}</p>`).join('');
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
  const [{ data: registrations }, { data: content }, postsResult, { data: questions }, { data: testSettings }, { data: testRegistrations }, { data: testerSessions }] = await Promise.all([
    tournamentDb.from('registrations').select('id, player_name, email, player_age, position, team, paid, payment_reference, registration_source, registration_status, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('site_content').select('content_key, content_value'),
    tournamentDb.from('community_posts').select('id, message, created_at, updated_at').order('created_at', { ascending: false }),
    tournamentDb.from('player_questions').select('id, sender_name, question, organizer_reply, replied_at, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('test_settings').select('enabled, access_code').eq('id', true).maybeSingle(),
    tournamentDb.from('test_registrations').select('player_name, email, player_age, team, position, simulated_payment, created_at').order('created_at', { ascending: false }),
    tournamentDb.from('test_access_sessions').select('tester_token')
  ]);
  const values = Object.fromEntries((content || []).map(row => [row.content_key, row.content_value]));
  const postMessage = document.querySelector('#postMessage');
  if (postsResult.error) {
    postMessage.textContent = 'Could not load posts. Run community-posts-admin-fix.sql in Supabase.';
    postMessage.dataset.loadError = 'true';
  } else if (postMessage.dataset.loadError === 'true') {
    postMessage.textContent = '';
    delete postMessage.dataset.loadError;
  }
  document.querySelector('#whenEditor').value = values.when || '';
  document.querySelector('#whereEditor').value = values.where || '';
  document.querySelector('#rulesEditor').value = values.rules || '';
  document.querySelector('#updateEditor').value = values.update || '';
  const acceptedRegistrations = (registrations || []).filter(player => player.paid === true || player.registration_status === 'accepted');
  document.querySelector('#registrationCount').textContent = acceptedRegistrations.length;
  document.querySelector('#moneyTotal').textContent = `$${acceptedRegistrations.length * 5}`;
  document.querySelector('#registrationList').innerHTML = acceptedRegistrations.length ? acceptedRegistrations.map(player => `<p><strong>${safe(player.player_name)}</strong> · ${safe(player.team)} · ${safe(player.position || 'Position not set')} · age ${safe(player.player_age)}</p>`).join('') : 'No registrations yet.';
  renderPendingRegistrations(registrations);
  document.querySelector('#testModeEnabled').checked = Boolean(testSettings?.enabled);
  document.querySelector('#testAccessCode').value = testSettings?.access_code || '';
  const testLink = `${window.location.origin}${window.location.pathname.replace(/admin\.html$/, '')}index.html`;
  document.querySelector('#testModeLink').href = testLink;
  document.querySelector('#testModeLink').textContent = testLink;
  renderTestRegistrations(testRegistrations);
  document.querySelector('#testerSlotsUsed').textContent = (testerSessions || []).length;
  renderPosts(postsResult.data);
  renderQuestions(questions);
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
  if (error) { document.querySelector('#postMessage').textContent = `Could not publish post: ${error.message}`; return; }
  editor.value = ''; document.querySelector('#postMessage').textContent = 'Post published.'; loadDashboard();
});
document.querySelector('#adminPosts').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const post = button.closest('[data-post-id]');
  const id = Number(post.dataset.postId);
  const message = document.querySelector('#postMessage');
  if (button.dataset.action === 'edit-post') {
    setPostEditMode(post, true);
    window.translateAdmin?.(post);
    return;
  }
  if (button.dataset.action === 'cancel-edit') {
    const editor = post.querySelector('.post-edit');
    editor.value = editor.dataset.originalMessage;
    setPostEditMode(post, false);
    message.textContent = '';
    return;
  }
  if (button.dataset.action === 'save-post') {
    const newMessage = post.querySelector('.post-edit').value.trim();
    if (!newMessage) { message.textContent = 'A post cannot be empty. Delete it instead.'; return; }
    button.disabled = true;
    const { data: updatedPost, error } = await tournamentDb
      .from('community_posts')
      .update({ message: newMessage, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    button.disabled = false;
    const updateFailed = error || !updatedPost;
    message.textContent = updateFailed ? 'Could not update the post. Check the Supabase admin policies.' : 'Post updated.';
    if (!updateFailed) {
      post.querySelector('.post-text').textContent = newMessage;
      setPostEditMode(post, false);
    }
    return;
  }
  if (button.dataset.action === 'delete-post') {
    if (!window.confirm('Permanently delete this post?')) return;
    const { data: deletedPost, error } = await tournamentDb
      .from('community_posts')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    const deleteFailed = error || !deletedPost;
    message.textContent = deleteFailed ? 'Could not delete the post. Check the Supabase admin policies.' : 'Post deleted.';
    if (!deleteFailed) loadDashboard();
  }
});
document.querySelector('#questionList').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = button.closest('[data-question-id]');
  const id = Number(item.dataset.questionId);
  if (button.dataset.action === 'save-reply') {
    const reply = item.querySelector('.question-reply').value.trim();
    if (reply.length < 2) { window.alert('Enter a reply before publishing.'); return; }
    const { error } = await tournamentDb.from('player_questions').update({ organizer_reply: reply, replied_at: new Date().toISOString() }).eq('id', id);
    if (error) { window.alert('Could not publish the reply.'); return; }
    window.alert('Reply published without showing the player name.');
    loadDashboard();
  }
  if (button.dataset.action === 'delete-question') {
    if (!window.confirm('Delete this question?')) return;
    const { error } = await tournamentDb.from('player_questions').delete().eq('id', id);
    if (error) { window.alert('Could not delete the question.'); return; }
    loadDashboard();
  }
});
document.querySelector('#pendingRegistrationList').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = button.closest('[data-registration-id]');
  const id = Number(item.dataset.registrationId);
  const message = document.querySelector('#pendingRegistrationMessage');
  if (button.dataset.action === 'accept-meeting-registration') {
    if (!window.confirm('Confirm that the $5 Cash App payment was verified?')) return;
    const { error } = await tournamentDb.from('registrations').update({ paid: true, registration_status: 'accepted' }).eq('id', id);
    if (error) { message.textContent = 'Could not accept this registration.'; return; }
    message.innerHTML = `Registration accepted. Give the player this link: <a href="index.html" target="_blank">${window.location.origin}${window.location.pathname.replace(/admin\.html$/, '')}index.html</a>`;
    loadDashboard();
  }
  if (button.dataset.action === 'revoke-meeting-registration') {
    if (!window.confirm('Reject this request because the payment could not be verified? This frees the team and position spot.')) return;
    const { error } = await tournamentDb.from('registrations').delete().eq('id', id);
    if (error) { message.textContent = 'Could not revoke this registration.'; return; }
    message.textContent = 'Registration revoked. The team and position spot are available again.';
    loadDashboard();
  }
});
document.querySelector('#saveTestModeButton').addEventListener('click', async () => {
  const enabled = document.querySelector('#testModeEnabled').checked;
  const accessCode = document.querySelector('#testAccessCode').value.trim();
  const message = document.querySelector('#testModeMessage');
  if (accessCode.length < 4) { message.textContent = 'Use an access code with at least 4 characters.'; return; }
  const { data: result, error } = await tournamentDb.rpc('save_test_mode_v2', {
    p_enabled: enabled,
    p_access_code: accessCode
  });
  const saved = result?.saved === true;
  message.textContent = error || !saved ? `Could not save Test Mode${error?.message ? `: ${error.message}` : '.'}` : enabled ? 'Test Mode is ON. Share the tester link and access code.' : 'Test Mode is OFF. Tester access is blocked and both tester slots were reset.';
  if (!error && saved) loadDashboard();
});
document.querySelector('#clearTestDataButton').addEventListener('click', async () => {
  if (!window.confirm('Delete all unofficial test registrations?')) return;
  const { error } = await tournamentDb.from('test_registrations').delete().neq('id', 0);
  document.querySelector('#testModeMessage').textContent = error ? 'Could not clear test registrations.' : 'All test registrations were cleared.';
  if (!error) loadDashboard();
});
loadDashboard();
