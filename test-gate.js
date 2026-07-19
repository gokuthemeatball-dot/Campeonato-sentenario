(async function initializeTestGate() {
  window.tournamentTestModeActive = false;
  window.tournamentTesterCode = '';
  const { data: enabled, error } = await tournamentDb.rpc('test_mode_status');
  if (error || enabled !== true) {
    window.dispatchEvent(new Event('tournament-test-ready'));
    return;
  }

  window.tournamentTestModeActive = true;
  setInterval(async () => {
    const { data: stillEnabled } = await tournamentDb.rpc('test_mode_status');
    if (stillEnabled !== true) {
      sessionStorage.removeItem('tournamentTesterCode');
      window.location.reload();
    }
  }, 5000);
  const savedCode = sessionStorage.getItem('tournamentTesterCode') || '';
  const savedToken = localStorage.getItem('tournamentTesterToken') || '';
  if (savedCode && savedToken) {
    const { data: allowed } = await tournamentDb.rpc('claim_tester_slot', { check_code: savedCode, tester_token: savedToken });
    if (allowed === true) {
      window.tournamentTesterCode = savedCode;
      window.dispatchEvent(new Event('tournament-test-ready'));
      return;
    }
  }

  const gate = document.createElement('div');
  gate.id = 'siteTestGate';
  gate.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#09251e;color:white;display:grid;place-items:center;padding:24px;font-family:Inter,Arial,sans-serif';
  gate.innerHTML = `<div id="siteTesterQuestion" style="width:min(480px,100%);background:#f8f5ed;color:#09251e;padding:36px;display:grid;gap:18px"><p style="color:#b42609;font-weight:700;letter-spacing:.12em">TEST MODE ACTIVE</p><h1 style="font-family:'Barlow Condensed';font-size:4rem;line-height:.9;margin:0">ARE YOU A TESTER?</h1><p>Only two organizer-approved testers can enter.</p><div style="display:flex;gap:12px"><button id="testerYesButton" type="button" style="padding:15px 28px;background:#a8df47;border:0;font-weight:700;cursor:pointer">Yes</button><button id="testerNoButton" type="button" style="padding:15px 28px;background:#ddd;border:0;font-weight:700;cursor:pointer">No</button></div><p id="siteTestGateMessage" style="color:#b42609"></p></div><form id="siteTestGateForm" hidden style="width:min(480px,100%);background:#f8f5ed;color:#09251e;padding:36px;display:grid;gap:18px"><p style="color:#b42609;font-weight:700;letter-spacing:.12em">TESTER LOGIN</p><h1 style="font-family:'Barlow Condensed';font-size:4rem;line-height:.9;margin:0">ENTER CODE</h1><label style="display:grid;gap:8px">Tester access code<input id="siteTesterCode" required type="password" style="padding:13px;font:inherit" /></label><button type="submit" style="padding:15px;background:#a8df47;border:0;font-weight:700;cursor:pointer">Enter Test Mode</button><p id="siteTesterCodeMessage" style="color:#b42609"></p></form>`;
  document.body.appendChild(gate);
  document.querySelector('#testerYesButton').addEventListener('click', () => {
    document.querySelector('#siteTesterQuestion').hidden = true;
    document.querySelector('#siteTestGateForm').hidden = false;
  });
  document.querySelector('#testerNoButton').addEventListener('click', () => {
    document.querySelector('#siteTestGateMessage').textContent = 'The public website is unavailable while Test Mode is active.';
  });
  document.querySelector('#siteTestGateForm').addEventListener('submit', async event => {
    event.preventDefault();
    const code = document.querySelector('#siteTesterCode').value.trim();
    let token = localStorage.getItem('tournamentTesterToken');
    if (!token) {
      token = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('tournamentTesterToken', token);
    }
    const { data: allowed } = await tournamentDb.rpc('claim_tester_slot', { check_code: code, tester_token: token });
    if (allowed !== true) {
      document.querySelector('#siteTesterCodeMessage').textContent = 'Incorrect code, Test Mode is off, or both tester spots are already used.';
      return;
    }
    sessionStorage.setItem('tournamentTesterCode', code);
    window.tournamentTesterCode = code;
    gate.remove();
    window.dispatchEvent(new Event('tournament-test-ready'));
  });
})();
