const PLAYLISTS=[
  'https://iptv-org.github.io/iptv/countries/us.m3u',
  'https://iptv-org.github.io/iptv/subdivisions/us-tx.m3u',
  'https://iptv-org.github.io/iptv/cities/usdal.m3u',
  'https://iptv-org.github.io/iptv/cities/usfwt.m3u'
];
const GROUPS=['Favorites','All','Local/News','Sports','Kids','Movies','Comedy','Music','Weather','Texas'];
const video=document.querySelector('#video');
const channelsEl=document.querySelector('#channels');
const categoriesEl=document.querySelector('#categories');
const searchEl=document.querySelector('#search');
const statusEl=document.querySelector('#status');
const countEl=document.querySelector('#count');
const listTitleEl=document.querySelector('#listTitle');
const playerEmpty=document.querySelector('#playerEmpty');
const nowName=document.querySelector('#nowName');
const nowGroup=document.querySelector('#nowGroup');
const favoriteNow=document.querySelector('#favoriteNow');
let channels=[];let filtered=[];let activeGroup='All';let current=null;let hls=null;
const favorites=new Set(JSON.parse(localStorage.getItem('open-tv-favorites')||'[]'));
function saveFavorites(){localStorage.setItem('open-tv-favorites',JSON.stringify([...favorites]));}
function categoryOf(name,group=''){
  const s=`${name} ${group}`.toLowerCase();
  if(/texas|dallas|fort worth|dfw|austin|houston|san antonio|waco|el paso/.test(s))return'Texas';
  if(/weather|accuweather/.test(s))return'Weather';
  if(/news|abc|cbs|nbc|fox|local|pbs|cw|c-span/.test(s))return'Local/News';
  if(/sport|nfl|nba|mlb|nhl|soccer|golf|racing|poker/.test(s))return'Sports';
  if(/kid|cartoon|animation|family|junior/.test(s))return'Kids';
  if(/movie|cinema|film|western|action|horror/.test(s))return'Movies';
  if(/comedy|funny/.test(s))return'Comedy';
  if(/music|vevo|mtv|radio|concert/.test(s))return'Music';
  return group||'General';
}
function parseM3U(text){
  const lines=text.split(/\r?\n/);const out=[];let meta=null;
  for(const line0 of lines){const line=line0.trim();if(!line)continue;
    if(line.startsWith('#EXTINF:')){const name=(line.split(',').slice(1).join(',')||'Unknown').trim();const attrs={};for(const m of line.matchAll(/([\w-]+)="([^"]*)"/g))attrs[m[1]]=m[2];meta={name,logo:attrs['tvg-logo']||'',group:attrs['group-title']||''};}
    else if(meta&&!line.startsWith('#')){if(/^https:\/\//i.test(line)&&/\.m3u8(?:\?|$)/i.test(line)){const group=categoryOf(meta.name,meta.group);out.push({...meta,group,url:line,id:`${meta.name}|${line}`});}meta=null;}
  }return out;
}
async function load(){
  statusEl.textContent='Loading verified sources…';const results=[];
  for(const url of PLAYLISTS){try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status);results.push(...parseM3U(await r.text()));}catch(e){console.warn('Playlist failed',url,e);}}
  const map=new Map();for(const c of results){if(!map.has(c.url))map.set(c.url,c);}channels=[...map.values()].slice(0,300);
  statusEl.textContent=channels.length?`${channels.length} browser-ready streams loaded`:'Could not load playlist';renderCategories();applyFilters();
}
function renderCategories(){categoriesEl.innerHTML='';for(const g of GROUPS){const b=document.createElement('button');b.className='chip'+(g===activeGroup?' active':'');b.textContent=g;b.onclick=()=>{activeGroup=g;renderCategories();applyFilters();};categoriesEl.appendChild(b);}}
function applyFilters(){const q=searchEl.value.trim().toLowerCase();filtered=channels.filter(c=>{const fav=activeGroup==='Favorites'?favorites.has(c.id):true;const group=activeGroup==='All'||activeGroup==='Favorites'?true:c.group===activeGroup;const text=!q||`${c.name} ${c.group}`.toLowerCase().includes(q);return fav&&group&&text;});listTitleEl.textContent=activeGroup==='All'?'All channels':activeGroup;countEl.textContent=`${filtered.length} channels`;renderChannels();}
function renderChannels(){channelsEl.innerHTML='';if(!filtered.length){channelsEl.innerHTML='<div class="empty">No channels found.</div>';return;}for(const c of filtered){const row=document.createElement('article');row.className='channel'+(current?.id===c.id?' playing':'');row.tabIndex=0;row.onclick=()=>play(c);row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play(c);}};
    const logo=c.logo?`<img class="logo" src="${escapeHtml(c.logo)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;logo logo-fallback&quot;>${escapeHtml(c.name.slice(0,2).toUpperCase())}</div>'">`:`<div class="logo logo-fallback">${escapeHtml(c.name.slice(0,2).toUpperCase())}</div>`;
    row.innerHTML=`${logo}<div class="channel-meta"><div class="channel-name">${escapeHtml(c.name)}</div><div class="channel-group">${escapeHtml(c.group)}</div></div><button class="fav ${favorites.has(c.id)?'on':''}" aria-label="Favorite">${favorites.has(c.id)?'★':'☆'}</button>`;
    row.querySelector('.fav').onclick=e=>{e.stopPropagation();toggleFavorite(c);};channelsEl.appendChild(row);}}
function toggleFavorite(c){favorites.has(c.id)?favorites.delete(c.id):favorites.add(c.id);saveFavorites();if(current?.id===c.id)favoriteNow.textContent=favorites.has(c.id)?'★':'☆';applyFilters();}
function setStatus(msg){statusEl.textContent=msg;}
function play(c){current=c;playerEmpty.classList.add('hidden');nowName.textContent=c.name;nowGroup.textContent=c.group;favoriteNow.textContent=favorites.has(c.id)?'★':'☆';setStatus(`Connecting to ${c.name}…`);if(hls){hls.destroy();hls=null;}video.pause();video.removeAttribute('src');video.load();
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=c.url;video.play().then(()=>setStatus(`Playing ${c.name}`)).catch(()=>setStatus('Tap play to start this channel'));}
  else if(window.Hls&&Hls.isSupported()){hls=new Hls({enableWorker:true,lowLatencyMode:true,maxBufferLength:30});hls.loadSource(c.url);hls.attachMedia(video);hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().then(()=>setStatus(`Playing ${c.name}`)).catch(()=>setStatus('Tap play to start this channel')));hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){setStatus(`${c.name} is unavailable right now`);}});}
  else setStatus('This browser does not support HLS playback');renderChannels();}
favoriteNow.onclick=()=>{if(current)toggleFavorite(current);};searchEl.addEventListener('input',applyFilters);video.addEventListener('playing',()=>current&&setStatus(`Playing ${current.name}`));video.addEventListener('error',()=>current&&setStatus(`${current.name} is unavailable right now`));
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
load();