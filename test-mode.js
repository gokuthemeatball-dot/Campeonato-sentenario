const testLoginView = document.querySelector('#testLoginView');
const testFormView = document.querySelector('#testFormView');
const testTeamSelect = document.querySelector('#testTeamSelect');
const testPositionSelect = document.querySelector('#testPositionSelect');
let activeTesterCode = sessionStorage.getItem('tournamentTesterCode') || '';
let testAvailability = [];
let currentTestRegistrationId = null;

async function testerAccess(code) {
  let token = localStorage.getItem('tournamentTesterToken');
  if (!token) {
    token = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('tournamentTesterToken', token);
  }
  const { data, error } = await tournamentDb.rpc('claim_tester_slot', { check_code: code, tester_token: token });
  return !error && data === true;
}

async function loadTestAvailability() {
  const { data, error } = await tournamentDb.rpc('test_registration_availability', { check_code: activeTesterCode });
  if (error) return;
  testAvailability = data || [];
  [...testTeamSelect.options].forEach(option => {
    if (!option.value) return;
    const count = testAvailability.filter(row => row.team === option.value).reduce((sum, row) => sum + Number(row.player_count), 0);
    option.dataset.label ||= option.textContent;
    option.disabled = count >= 6;
    option.textContent = `${option.dataset.label} — ${count >= 6 ? 'TEST FULL' : `${6 - count} test spots left`}`;
  });
}

function loadTestPositions(team) {
  const limits = { Goalkeeper: 1, Defender: 2, Midfielder: 2, Striker: 1 };
  testPositionSelect.selectedIndex = 0;
  [...testPositionSelect.options].forEach(option => {
    if (!option.value) return;
    const row = testAvailability.find(item => item.team === team && item.position === option.value);
    const count = Number(row?.player_count || 0);
    const limit = limits[option.value];
    option.dataset.label ||= option.textContent;
    option.disabled = count >= limit;
    option.textContent = `${option.dataset.label} — ${count >= limit ? 'TEST TAKEN' : `${limit - count} available`}`;
  });
  testPositionSelect.disabled = false;
  document.querySelector('#testAvailabilityMessage').textContent = 'Test limits: 1 goalkeeper, 2 defenders, 2 midfielders, and 1 striker per test team.';
}

async function openTesterArea(code) {
  if (!await testerAccess(code)) return false;
  activeTesterCode = code;
  sessionStorage.setItem('tournamentTesterCode', code);
  testLoginView.hidden = true;
  testFormView.hidden = false;
  await loadTestAvailability();
  return true;
}

document.querySelector('#testLoginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const code = document.querySelector('#testerCode').value.trim();
  if (!await openTesterArea(code)) document.querySelector('#testLoginMessage').textContent = 'Test Mode is off or the access code is incorrect.';
});
testTeamSelect.addEventListener('change', event => loadTestPositions(event.target.value));
document.querySelector('#testRegistrationForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const { data, error } = await tournamentDb.rpc('submit_test_registration', {
    check_code: activeTesterCode,
    test_name: String(form.get('playerName') || '').trim(),
    test_email: String(form.get('email') || '').trim().toLowerCase(),
    test_age: Number(form.get('age')),
    test_team: form.get('team'),
    test_position: form.get('position')
  });
  const message = document.querySelector('#testSubmitMessage');
  if (error) {
    const problem = error.message || '';
    message.textContent = problem.includes('TEST_MODE_OFF') ? 'Test Mode was turned off.' : problem.includes('TEAM_FULL') ? 'That test team is full.' : problem.includes('POSITION_FULL') ? 'That test position is taken.' : problem.includes('INVALID_REAL_NAME') ? 'Use a valid real first and last name.' : 'The test registration could not be saved.';
    return;
  }
  message.textContent = `Unofficial test registration ${data} saved.`;
  currentTestRegistrationId = data;
  document.querySelector('#testPaymentDialog').showModal();
  await loadTestAvailability();
});
document.querySelector('#simulatePaymentButton').addEventListener('click', async () => {
  const { error } = await tournamentDb.rpc('simulate_test_payment', { check_code: activeTesterCode, registration_id: currentTestRegistrationId });
  document.querySelector('#testPaymentMessage').textContent = error ? 'The test payment simulation failed.' : 'Test payment succeeded. No real money was charged.';
});
document.querySelector('#closeTestPayment').addEventListener('click', () => document.querySelector('#testPaymentDialog').close());

if (activeTesterCode) openTesterArea(activeTesterCode);
