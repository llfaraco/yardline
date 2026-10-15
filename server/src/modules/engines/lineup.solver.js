// ========================================================
// YARDLINE NFL - BACKEND EXACT LINEUP OPTIMIZER
// Branch & Bound com Heurística MRV para Assignment Ótimo
// ========================================================

export function solveOptimalLineupAssignment(slots, playerList) {
  if (!Array.isArray(slots) || slots.length === 0 || !Array.isArray(playerList) || playerList.length === 0) {
    return { bestScore: 0, bestAssignment: {} };
  }

  // Mapear candidatos elegíveis ordenados por projeção decrescente
  const slotCandidates = slots.map(slot => {
    const candidates = playerList.filter(p => {
      if (!p) return false;
      const pos = (p.position || p.pos || '').toUpperCase();
      if (slot.allowed_positions?.includes(pos) || slot.allowed?.includes(pos)) return true;
      if (p.allowedAlt && Array.isArray(p.allowedAlt) && p.allowedAlt.some(a => slot.allowed?.includes(a))) return true;
      if ((slot.allowed?.includes('DL') || slot.allowed_positions?.includes('DL')) && ['DE', 'DT'].includes(pos)) return true;
      if ((slot.allowed?.includes('LB') || slot.allowed_positions?.includes('LB')) && ['ILB', 'OLB'].includes(pos)) return true;
      if ((slot.allowed?.includes('DB') || slot.allowed_positions?.includes('DB')) && ['CB', 'S', 'FS', 'SS'].includes(pos)) return true;
      return false;
    }).sort((a, b) => (b.projection || b.proj || 0) - (a.projection || a.proj || 0));
    return { slot, candidates };
  });

  // Ordenar slots por número de candidatos elegíveis crescente (MRV)
  slotCandidates.sort((a, b) => a.candidates.length - b.candidates.length);

  let bestScore = -1;
  let bestAssignment = {};
  const currentAssignment = {};
  const usedPlayers = new Set();

  function search(slotIdx, currentScore) {
    if (slotIdx === slotCandidates.length) {
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestAssignment = { ...currentAssignment };
      }
      return;
    }

    const { slot, candidates } = slotCandidates[slotIdx];
    const slotKey = slot.key || slot.slot_key;

    // Poda por Limitante Superior
    let upperBound = currentScore;
    const tempUsed = new Set(usedPlayers);
    for (let i = slotIdx; i < slotCandidates.length; i++) {
      const cand = slotCandidates[i].candidates.find(p => !tempUsed.has(p.id));
      if (cand) {
        upperBound += (cand.projection || cand.proj || 0);
        tempUsed.add(cand.id);
      }
    }

    if (upperBound <= bestScore) return;

    let assignedAny = false;
    for (const p of candidates) {
      if (!usedPlayers.has(p.id)) {
        usedPlayers.add(p.id);
        currentAssignment[slotKey] = p.id;
        assignedAny = true;
        search(slotIdx + 1, currentScore + (p.projection || p.proj || 0));
        delete currentAssignment[slotKey];
        usedPlayers.delete(p.id);
      }
    }

    if (!assignedAny) {
      search(slotIdx + 1, currentScore);
    }
  }

  search(0, 0);

  return {
    bestScore: Math.max(0, parseFloat((bestScore >= 0 ? bestScore : 0).toFixed(1))),
    bestAssignment: bestAssignment || {}
  };
}
