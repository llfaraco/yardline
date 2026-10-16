const fs = require('fs');
const code1 = fs.readFileSync('yardline-app/js/data_and_views.js', 'utf8');
const code2 = fs.readFileSync('yardline-app/js/engines.js', 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="view-playbook"></div></body></html>', { runScripts: 'dangerously', url: 'http://127.0.0.1:8080/' });
const win = dom.window;
try {
  win.eval(code1);
  console.log('code1 eval ok');
} catch(e) {
  console.error('code1 error:', e.message, e.stack);
}

try {
  win.eval(code2);
  console.log('code2 eval ok');
} catch(e) {
  console.error('code2 error:', e);
}

console.log('Testing resolveNFLPlayer("3918298"):');
const p1 = win.resolveNFLPlayer ? win.resolveNFLPlayer("3918298") : 'not found';
console.log('p1:', p1 ? { id: p1.id, name: p1.name, proj: p1.proj, avgPpr: p1.avgPpr, totalPts: p1.totalPts, ylIndex: p1.ylIndex } : null);

console.log('Testing resolveNFLPlayer("4984"):');
const p2 = win.resolveNFLPlayer ? win.resolveNFLPlayer("4984") : 'not found';
console.log('p2:', p2 ? { id: p2.id, name: p2.name, proj: p2.proj, avgPpr: p2.avgPpr, totalPts: p2.totalPts, ylIndex: p2.ylIndex } : null);

console.log('Testing Brock Purdy (from Image 1):');
const purdy = win.resolveNFLPlayer ? win.resolveNFLPlayer("8183") : 'not found'; // Sleeper 8183 or ESPN 4361529
console.log('purdy:', purdy ? { id: purdy.id, name: purdy.name, proj: purdy.proj, avgPpr: purdy.avgPpr, totalPts: purdy.totalPts, ylIndex: purdy.ylIndex } : null);
