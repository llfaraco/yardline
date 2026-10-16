const { JSDOM } = require('jsdom');

async function testUserFlow() {
  console.log('Testing user flow at http://127.0.0.1:8080/ ...');
  const errors = [];
  const logs = [];

  const virtualConsole = new (require('jsdom').VirtualConsole)();
  virtualConsole.on('error', (...args) => errors.push(['CONSOLE_ERROR', ...args]));
  virtualConsole.on('warn', (...args) => logs.push(['CONSOLE_WARN', ...args]));
  virtualConsole.on('log', (...args) => logs.push(['CONSOLE_LOG', ...args]));
  virtualConsole.on('jsdomError', (err) => errors.push(['JSDOM_ERROR', err.message]));

  const dom = await JSDOM.fromURL('http://127.0.0.1:8080/', {
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.alert = (msg) => console.log('ALERT:', msg);
      window.fetch = globalThis.fetch.bind(globalThis);
      window.AbortController = globalThis.AbortController;
      window.AbortSignal = globalThis.AbortSignal;
    }
  });

  const win = dom.window;
  const doc = win.document;

  console.log('\n--- Waiting for initialization & Sleeper sync ---');
  // Wait for initial sync and data load
  await new Promise(r => setTimeout(r, 4000));

  // If syncRealSleeperLeagueLive exists, trigger it explicitly and await
  if (typeof win.syncRealSleeperLeagueLive === 'function') {
    console.log('Triggering syncRealSleeperLeagueLive()...');
    await win.syncRealSleeperLeagueLive();
    console.log('syncRealSleeperLeagueLive completed!');
  }

  console.log('\n--- 1. Testing Home View (News) ---');
  win.openNavTab('home');
  const home = doc.getElementById('view-home');
  const homeText = home?.textContent || '';
  console.log('view-home active?', home?.classList.contains('active'));
  console.log('Zero Mock Rule check (Roster Player):', !homeText.includes('Roster Player'));
  console.log('Zero Mock Rule check (Canonical Test):', !homeText.includes('Canonical Test'));
  console.log('Josh Allen free agent check (Should NOT say LIVRE NO WAIVER: Josh Allen):', !homeText.includes('LIVRE NO WAIVER: Josh Allen'));
  
  const newsCards = home?.querySelectorAll('.grid-2 > .yl-card') || [];
  console.log('News cards rendered in DOM:', newsCards.length);

  console.log('\n--- 2. Testing Playbook View (Roster & Matchup) ---');
  win.openNavTab('playbook');
  const playbook = doc.getElementById('view-playbook');
  const playbookText = playbook?.textContent || '';
  console.log('view-playbook active?', playbook?.classList.contains('active'));
  console.log('activeRealMatchup defined?', Boolean(win.activeRealMatchup));
  if (win.activeRealMatchup) {
    console.log('Matchup ID:', win.activeRealMatchup.matchupId);
    console.log('My Score vs Opp Score:', win.activeRealMatchup.myScore, 'x', win.activeRealMatchup.oppScore);
  }
  
  const playerCards = playbook?.querySelectorAll('.yl-player-card-v2') || [];
  console.log('Player cards rendered in Playbook:', playerCards.length);

  let hasDashes = 0;
  let populatedCards = 0;
  playerCards.forEach(card => {
    const metrics = card.querySelectorAll('.yl-player-card-v2__metric b');
    const texts = Array.from(metrics).map(m => m.textContent.trim());
    if (texts.every(t => t === '—')) hasDashes++;
    else populatedCards++;
  });
  console.log(`Player card metrics: ${populatedCards} populated with real stats, ${hasDashes} with all dashes`);

  console.log('\n--- 3. Testing Waivers View (Free Agents) ---');
  win.openNavTab('waivers');
  const waivers = doc.getElementById('view-waivers');
  const freeAgentsCount = win.activeLeagueFreeAgents?.length || 0;
  console.log('activeLeagueFreeAgents count:', freeAgentsCount);
  const waiverRows = waivers?.querySelectorAll('tbody tr') || [];
  console.log('Waiver table rows rendered:', waiverRows.length);

  console.log('\n--- 4. Testing Modais (P0) ---');
  // Open player modal for Brock Purdy (8183)
  if (typeof win.openPlayerDossierModal === 'function') {
    await win.openPlayerDossierModal('8183');
    const playerModal = doc.getElementById('player-modal');
    console.log('Player modal open?', playerModal?.classList.contains('open'));
    console.log('Player modal content includes Purdy?', doc.getElementById('player-modal-content')?.textContent.includes('Purdy'));
    
    // Close modal
    win.closeModal('player-modal');
    console.log('Player modal closed?', !playerModal?.classList.contains('open'));
  }

  console.log('\n--- 5. Console Errors during run ---');
  const realErrors = errors.filter(([type, msg]) => !String(msg).includes('live-reload') && !String(msg).includes('favicon'));
  console.log(realErrors.length ? realErrors : 'None! Zero real errors.');

  console.log('\n=== TEST SUMMARY ===');
  const pass = (
    !homeText.includes('Roster Player') &&
    !homeText.includes('LIVRE NO WAIVER: Josh Allen') &&
    Boolean(win.activeRealMatchup) &&
    freeAgentsCount > 0 &&
    populatedCards > 0
  );
  console.log('OVERALL PASS?', pass ? '✅ PASS' : '❌ FAIL');

  process.exit(pass ? 0 : 1);
}

testUserFlow().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
