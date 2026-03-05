// assets/js/site.js
function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// --- Game page rendering ---
async function renderGameFromPath(){
  // expected path: /tracking/games/<id>/<slug>/
  const parts = location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('games');
  if(idx === -1) return;
  const id = parts[idx+1];
  if(!id) return;
  const data = await fetchJSON(DATA_PATH + 'games.json');
  const found = (data||[]).find(x=> String(x.id) === String(id) || String(x.universeId) === String(id));
  const container = document.getElementById('gameCard');
  if(!container) return;

  // if we have mapping, try to fetch live data from roproxy
  let gameData = found || { id };
  try{
    // if universeId exists use it; otherwise try id as place id
    const u = found?.universeId || found?.universe || found?.rootPlaceId || id;
    const api = `https://games.roproxy.com/v1/games?universeIds=${u}`;
    const r = await fetch(api);
    if(r.ok){ const json = await r.json(); if(json.data && json.data.length) gameData = {...gameData, ...json.data[0]}; }
  }catch(e){ console.warn('live fetch failed',e); }

  // render
  container.innerHTML = `
    <div class="card" style="flex-direction:column;align-items:flex-start">
      <h1 style="font-size:1.6rem">${escapeHtml(gameData.name||('Game '+id))}</h1>
      <p class="muted">${escapeHtml(gameData.description||'No description')}</p>
      <div style="margin-top:12px">Active: <strong>${fmt(gameData.playing||gameData.activePlayers||0)}</strong> — Visits: <strong>${fmt(gameData.visits||0)}</strong></div>
      <div style="margin-top:8px"><a class="btn" href="https://www.roblox.com/games/${gameData.rootPlaceId||gameData.id||id}/" target="_blank">Play on Roblox</a></div>
    </div>
  `;
}

// --- Community rendering ---
async function renderCommunityFromPath(){
  const parts = location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('communities');
  if(idx === -1) return;
  const id = parts[idx+1];
  if(!id) return;
  const data = await fetchJSON(DATA_PATH + 'communities.json');
  const found = (data||[]).find(x=> String(x.id) === String(id));
  const container = document.getElementById('communityApp');
  if(!container) return;
  if(!found) { container.innerHTML = '<p>Community not found in data.</p>'; return; }

  // try fetch group info best-effort
  let groupInfo = {};
  try{ const r = await fetch(`https://groups.roproxy.com/v1/groups/${found.id}`); if(r.ok) groupInfo = await r.json(); }catch(e){}

  container.innerHTML = `\n    <div class="card">\n      <img src="${found.avatar||''}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;margin-right:12px">\n      <div>\n        <h1>${escapeHtml(found.name)}</h1>\n        <div class="muted">Members: ${fmt(groupInfo.memberCount||found.members||'—')}</div>\n        <p class="muted">${escapeHtml(found.description||'No description')}</p>\n      </div>\n    </div>\n  `;
}

// --- Router / init ---
async function init(){
  // only act if page contains certain ids
  if(document.getElementById('gamesGrid')){ await renderHome(); }
  if(document.getElementById('gameCard')){ await renderGameFromPath(); }
  if(document.getElementById('communityApp')){ await renderCommunityFromPath(); }
}

if(typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', init);

// default export is empty; functions exported above
export default {};
