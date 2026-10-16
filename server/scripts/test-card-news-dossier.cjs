const { JSDOM } = require('jsdom');

async function run() {
  console.log('Testing Card, Dossier & News Filter in DOM...');
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

  console.log('\n--- 1. Testing Trevor Lawrence Dossier Modal ---');
  // Trigger openPlayerDossierModal for 7523
  await win.openPlayerDossierModal('7523');
  await new Promise(r => setTimeout(r, 2000));

  const modal = doc.getElementById('player-modal');
  console.log('Player modal open?', modal?.classList.contains('open'));

  const modalContent = doc.getElementById('player-modal-content')?.innerHTML || '';
  
  // Check photo: should NOT be jax.png as main photo, should be ESPN or Sleeper CDN
  const hasEspnOrSleeperPhoto = modalContent.includes('4360310.png') || modalContent.includes('sleepercdn.com/content/nfl/players/thumb/7523.jpg');
  console.log('Dossier photo contains real athlete headshot (ESPN or Sleeper thumb)?', hasEspnOrSleeperPhoto);
  
  // Check Height & Weight formatting
  const hasFormattedHeight = modalContent.includes(`6'6" (1.98m)`);
  const hasFormattedWeight = modalContent.includes(`220 lbs (100kg)`);
  console.log('Dossier has formatted height 6\'6" (1.98m)?', hasFormattedHeight);
  console.log('Dossier has formatted weight 220 lbs (100kg)?', hasFormattedWeight);

  // Check ID ESPN
  const hasEspnId = modalContent.includes('4360310');
  console.log('Dossier has ID ESPN 4360310?', hasEspnId);

  // Check linked news
  const hasLinkedNews = modalContent.includes('Trevor Lawrence lidera ataque dos Jaguars') || !modalContent.includes('Nenhuma notícia vinculada');
  console.log('Dossier contains athlete news?', hasLinkedNews);

  // Test historical tab buttons
  console.log('\n--- Testing Historical Logs Switching in Dossier ---');
  await win.YL_LOAD_PLAYER_SEASON('7523', 2024);
  await new Promise(r => setTimeout(r, 1000));
  const content2024 = doc.getElementById('player-modal-content')?.innerHTML || '';
  const has2024Logs = content2024.includes('WK') && !content2024.includes('Nenhum jogo registrado para a temporada 2024');
  console.log('Dossier loaded 2024 game logs successfully?', has2024Logs);

  // Close modal
  win.closeModal('player-modal');
  console.log('Player modal closed?', !modal?.classList.contains('open'));

  console.log('\n--- 2. Testing News Tab & "Do Meu Time" Filter ---');
  // Navigate to home view
  win.openNavTab('home');
  await new Promise(r => setTimeout(r, 1000));

  // Find filter buttons
  const teamBtn = Array.from(doc.querySelectorAll('button')).find(b => b.textContent.includes('Do Meu Time'));
  console.log('Team filter button found?', !!teamBtn);
  console.log('Team filter text before click:', teamBtn?.textContent?.trim());

  if (teamBtn) {
    teamBtn.click();
    await new Promise(r => setTimeout(r, 800));
    
    const visibleCards = doc.querySelectorAll('#view-home .grid-2 > div.yl-card');
    console.log('Visible news cards after "Do Meu Time" filter:', visibleCards.length);
    console.log('Team filter text after click:', teamBtn.textContent.trim());
    console.log('Active filter:', win.currentHomeFilter);
  }

  console.log('\n--- 3. Testing Backend Historical Stats for 7523 ---');
  const res2024 = await fetch('http://127.0.0.1:3001/api/players/7523/history?season=2024');
  const data2024 = await res2024.json();
  console.log('Backend 2024 game logs count:', data2024.history?.length || 0);

  const res2025 = await fetch('http://127.0.0.1:3001/api/players/7523/history?season=2025');
  const data2025 = await res2025.json();
  console.log('Backend 2025 game logs count:', data2025.history?.length || 0);

  const resNews = await fetch('http://127.0.0.1:3001/api/players/7523/news');
  const dataNews = await resNews.json();
  console.log('Backend linked news count for 7523:', Array.isArray(dataNews) ? dataNews.length : 0);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
