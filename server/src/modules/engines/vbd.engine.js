// ========================================================
// YARDLINE NFL - BACKEND DYNAMIC VBD & REPLACEMENT LEVEL ENGINE
// Derivação matemática das baselines a partir dos slots da liga
// ========================================================

const DEFAULT_FALLBACK_BASELINES = {
  PPR: { QB: 14.5, RB: 8.5, WR: 8.5, TE: 6.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  HALF_PPR: { QB: 14.5, RB: 7.0, WR: 6.0, TE: 4.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  STANDARD: { QB: 14.5, RB: 5.5, WR: 3.5, TE: 2.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  TE_PREMIUM: { QB: 14.5, RB: 8.5, WR: 8.5, TE: 9.0, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 }
};

export function calculateLeagueBaselines(slotsDef, totalTeams = 12, allRankedPlayers = [], format = 'PPR') {
  if (!Array.isArray(slotsDef) || slotsDef.length === 0) {
    return DEFAULT_FALLBACK_BASELINES[format] || DEFAULT_FALLBACK_BASELINES.PPR;
  }

  let countQB = 0, countRB = 0, countWR = 0, countTE = 0, countK = 0, countDEF = 0;
  let countDL = 0, countLB = 0, countDB = 0, countFLEX = 0, countIDP = 0;

  slotsDef.forEach(s => {
    const k = (s.key || s.slot_key || s).toUpperCase();
    if (k.startsWith('QB')) countQB++;
    else if (k.startsWith('RB')) countRB++;
    else if (k.startsWith('WR')) countWR++;
    else if (k.startsWith('TE')) countTE++;
    else if (k.startsWith('K')) countK++;
    else if (k.startsWith('DEF')) countDEF++;
    else if (k.startsWith('DL')) countDL++;
    else if (k.startsWith('LB')) countLB++;
    else if (k.startsWith('DB')) countDB++;
    else if (k.startsWith('FLEX')) countFLEX++;
    else if (k.startsWith('IDP')) countIDP++;
  });

  const targetRanks = {
    QB: Math.max(1, Math.round(totalTeams * countQB)),
    RB: Math.max(1, Math.round(totalTeams * (countRB + (countFLEX * 0.45)))),
    WR: Math.max(1, Math.round(totalTeams * (countWR + (countFLEX * 0.45)))),
    TE: Math.max(1, Math.round(totalTeams * (countTE + (countFLEX * 0.10)))),
    K: Math.max(1, Math.round(totalTeams * Math.max(1, countK))),
    DEF: Math.max(1, Math.round(totalTeams * Math.max(1, countDEF))),
    DL: Math.max(1, Math.round(totalTeams * (countDL + (countIDP * 0.33)))),
    LB: Math.max(1, Math.round(totalTeams * (countLB + (countIDP * 0.44)))),
    DB: Math.max(1, Math.round(totalTeams * (countDB + (countIDP * 0.23))))
  };

  const baselines = {};
  for (const [pos, targetRank] of Object.entries(targetRanks)) {
    const posPlayers = allRankedPlayers
      .filter(p => {
        const pPos = (p.position || p.pos || '').toUpperCase();
        if (pPos === pos) return true;
        if (pos === 'DL' && ['DE', 'DT'].includes(pPos)) return true;
        if (pos === 'LB' && ['ILB', 'OLB'].includes(pPos)) return true;
        if (pos === 'DB' && ['CB', 'S', 'FS', 'SS'].includes(pPos)) return true;
        return false;
      })
      .sort((a, b) => (b.projection || b.proj || 0) - (a.projection || a.proj || 0));

    if (posPlayers.length >= targetRank) {
      baselines[pos] = posPlayers[targetRank - 1].projection || posPlayers[targetRank - 1].proj || 0;
    } else if (posPlayers.length > 0) {
      baselines[pos] = posPlayers[posPlayers.length - 1].projection || posPlayers[posPlayers.length - 1].proj || 0;
    } else {
      const fallback = DEFAULT_FALLBACK_BASELINES[format] || DEFAULT_FALLBACK_BASELINES.PPR;
      baselines[pos] = fallback[pos] || 7.0;
    }
  }

  return baselines;
}

export function computeVBD(projection, position, baselines, format = 'PPR') {
  const pos = (position || 'WR').toUpperCase();
  const baseline = (baselines && baselines[pos] !== undefined)
    ? baselines[pos]
    : ((DEFAULT_FALLBACK_BASELINES[format] || DEFAULT_FALLBACK_BASELINES.PPR)[pos] || 7.0);

  return parseFloat((projection - baseline).toFixed(1));
}
