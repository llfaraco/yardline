import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReferenceChecks } from '../src/modules/command-center/reference-monitor.js';

// Read-only: no login, sync POST, external mutation or commercial data ingestion.
const config = JSON.parse(fs.readFileSync(new URL('../data/agent-orchestration.json', import.meta.url),'utf8'));
const targets = ['sleeper.state','sleeper.league','sleeper.drafts','sleeper.rosters','sleeper.matchups','fantasypros.rankings','fantasypros.projections'];
config.referenceTargets = config.referenceTargets.filter(t => targets.includes(t.id));
process.env.API_URL ||= 'http://127.0.0.1:3002';
const result = await runReferenceChecks(config);
const report = {checkedAt:new Date().toISOString(),leagueId:config.leagueId,apiUrl:process.env.API_URL,
  checks:result.checks,limitations:['Inspeção HTTP/JSON e HTML estático público; não valida aparência nem interação autenticada.','FantasyPros fornece referência pública de organização, sem importação de rankings ou projeções licenciadas.','Divergência pontual pode refletir sincronização local atrasada; não altera dados automaticamente.']};
const outputDirectory = path.resolve(process.argv[2] || fileURLToPath(new URL('../../../../outputs/',import.meta.url)));
fs.mkdirSync(outputDirectory,{recursive:true});
const output = path.join(outputDirectory,'referencias-'+report.checkedAt.replace(/[:.]/g,'-')+'.json');
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:output,checks:report.checks.map(c=>({id:c.id,status:c.status,error:c.error,issues:c.issues}))},null,2));
process.exitCode = report.checks.some(c => c.status === 'FAIL') ? 1 : 0;
