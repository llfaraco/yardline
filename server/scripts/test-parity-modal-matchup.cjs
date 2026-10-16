const { JSDOM } = require('jsdom');

async function testParity() {
  console.log('Testing Sleeper + FantasyPros Parity in DOM at http://127.0.0.1:8080/ ...');

  const dom = await JSDOM.fromURL('http://127.0.0.1:8080/', {
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window) {
      window.scrollTo = () => {};
      window.fetch = globalThis.fetch.bind(globalThis);
      window.AbortController = globalThis.AbortController;
      window.AbortSignal = globalThis.AbortSignal;
    }
  });

  const win = dom.window;
  const doc = win.document;

  await new Promise(r => setTimeout(r, 4000));

  console.log('\n--- 1. Testing Brock Purdy Dossier (Sleeper & FantasyPros Parity) ---');
  await win.openPlayerDossierModal('8183'); // Brock Purdy Sleeper ID
  await new Promise(r => setTimeout(r, 1500));

  const modal = doc.getElementById('player-modal');
  console.log('Player modal open?', modal.classList.contains('open'));

  const content = doc.getElementById('player-modal-content')?.innerHTML || '';

  // Check 1: Stat Boxes (FantasyPros)
  const hasStatBoxes = content.includes('WK 6 ECR') && content.includes('PPR PROJ') && content.includes('VS MATCHUP') && content.includes('ROS RANK');
  console.log('Has FantasyPros Stat Boxes (ECR, Proj, Stars, ROS)?', hasStatBoxes);

  // Check 2: Biometrics
  const hasBio = content.includes('AGE') && content.includes('HEIGHT') && content.includes('WEIGHT') && content.includes('COLLEGE');
  console.log('Has Sleeper Biometrics (Age, Height, Weight, College)?', hasBio);

  // Check 3: Super Header in Game Logs
  const hasSuperHeader = content.includes('super-header') && content.includes('PASS / RECEIVING');
  console.log('Has Grouped Super Headers in Game Logs?', hasSuperHeader);

  // Check 4: Tab Switcher to Consensus Sentiment (Coach AI)
  console.log('\n--- 2. Testing Consensus Sentiment (Coach AI) Tab ---');
  win.YL_SWITCH_DOSSIER_TAB('sentiment');
  const sentimentSec = doc.getElementById('tab-sec-sentiment');
  console.log('Sentiment tab visible?', sentimentSec && sentimentSec.style.display !== 'none');
  const hasCoachAI = sentimentSec?.innerHTML.includes('Consensus Sentiment') && sentimentSec?.innerHTML.includes('Coach AI') && sentimentSec?.innerHTML.includes('OVERALL');
  console.log('Has Coach AI with Sentiment Meters?', hasCoachAI);

  // Check 5: Tab Switcher to Season Stats
  console.log('\n--- 3. Testing Season Stats Tab ---');
  win.YL_SWITCH_DOSSIER_TAB('seasonstats');
  const seasonStatsSec = doc.getElementById('tab-sec-seasonstats');
  console.log('Season Stats tab visible?', seasonStatsSec && seasonStatsSec.style.display !== 'none');
  const hasSeasonTable = seasonStatsSec?.innerHTML.includes('HISTÓRICO CONSOLIDADO POR TEMPORADA') && seasonStatsSec?.innerHTML.includes('2026');
  console.log('Has Aggregated Season Stats table?', hasSeasonTable);

  // Close modal
  win.closeModal('player-modal');
  console.log('Modal closed successfully?', !modal.classList.contains('open'));

  // Check 6: Matchup View (FantasyPros Image 5 Parity in #view-league)
  console.log('\n--- 4. Testing Matchup View (Stars, Kickoff Schedule, Current/Optimal) ---');
  win.openNavTab('league');
  if (typeof win.renderAuditLeagueView === 'function') {
    win.renderAuditLeagueView();
  }
  await new Promise(r => setTimeout(r, 1000));

  const matchupHtml = doc.getElementById('view-league')?.innerHTML || '';
  console.log('Matchup HTML length:', matchupHtml.length);
  console.log('Matchup HTML slice (0-600):', matchupHtml.slice(0, 600));
  const hasCurrentOptimal = matchupHtml.includes('Current') && matchupHtml.includes('Optimal');
  console.log('Has Current/Optimal toggle?', hasCurrentOptimal);

  const hasDifficultyStars = matchupHtml.includes('★');
  console.log('Has Matchup Difficulty Stars (★★★★★)?', hasDifficultyStars);

  const hasKickoffs = matchupHtml.includes('Sun') || matchupHtml.includes('Mon') || matchupHtml.includes('PM');
  console.log('Has Kickoff Schedule (Day & Time)?', hasKickoffs);

  const allPassed = hasStatBoxes && hasBio && hasSuperHeader && hasCoachAI && hasSeasonTable && hasCurrentOptimal && hasDifficultyStars;
  console.log('\n========================================');
  console.log('OVERALL PARITY VERIFICATION:', allPassed ? '✅ 100% PARITY APPROVED' : '❌ SOME CHECKS FAILED');
  console.log('========================================');

  process.exit(allPassed ? 0 : 1);
}

testParity().catch(err => {
  console.error(err);
  process.exit(1);
});
