const ITEMS=[
{name:'Disney+',group:'Streaming',logo:'https://logo.clearboxtv.com/disneyplus.png',url:'https://www.disneyplus.com/',description:'Disney+ — opens your paid account in the browser'},
{name:'Netflix',group:'Streaming',logo:'https://logo.clearboxtv.com/netflix.png',url:'https://www.netflix.com/',description:'Netflix — opens your paid account in the browser'},
{name:'Prime Video',group:'Streaming',logo:'https://logo.clearboxtv.com/amazon.png',url:'https://www.primevideo.com/',description:'Amazon Prime Video'},
{name:'HBO Max',group:'Streaming',logo:'https://logo.clearboxtv.com/hbomax.png',url:'https://www.hbomax.com/',description:'HBO Max'},
{name:'Paramount+',group:'Streaming',logo:'https://logo.clearboxtv.com/paramount.png',url:'https://www.paramountplus.com/',description:'Paramount+'},
{name:'Apple TV+',group:'Streaming',logo:'https://logo.clearboxtv.com/appletv.png',url:'https://tv.apple.com/',description:'Apple TV+'},
{name:'Hulu',group:'Streaming',logo:'https://logo.clearboxtv.com/hulu.png',url:'https://www.hulu.com/',description:'Hulu / Hulu + Live TV'},
{name:'Starz',group:'Streaming',logo:'https://logo.clearboxtv.com/starz.png',url:'https://www.starz.com/',description:'Starz'},
{name:'Peacock',group:'Streaming',logo:'https://logo.clearboxtv.com/peacock.png',url:'https://www.peacocktv.com/',description:'Peacock'},
{name:'ABC',group:'Networks',logo:'https://logo.clearboxtv.com/abc.png',url:'https://abc.com/',description:'ABC — use your TV provider when required'},
{name:'CBS',group:'Networks',logo:'https://logo.clearboxtv.com/cbs.png',url:'https://www.cbs.com/',description:'CBS — live access may use Paramount+ or provider login'},
{name:'NBC',group:'Networks',logo:'https://logo.clearboxtv.com/nbc.png',url:'https://www.nbc.com/',description:'NBC — use your TV provider when required'},
{name:'FOX',group:'Networks',logo:'https://logo.clearboxtv.com/fox.png',url:'https://www.fox.com/',description:'FOX — use your TV provider when required'},
{name:'MTV',group:'Networks',logo:'https://logo.clearboxtv.com/mtv.png',url:'https://www.mtv.com/',description:'MTV'},
{name:'Comedy Central',group:'Networks',logo:'https://logo.clearboxtv.com/comedycentral.png',url:'https://www.cc.com/',description:'Comedy Central'},
{name:'National Geographic',group:'Networks',logo:'https://logo.clearboxtv.com/natgeo.png',url:'https://www.nationalgeographic.com/tv/',description:'National Geographic'},
{name:'FOX Sports',group:'Sports',logo:'https://logo.clearboxtv.com/foxsports.png',url:'https://www.foxsports.com/live',description:'FOX Sports live'},
{name:'NFL',group:'Sports',logo:'https://logo.clearboxtv.com/nfl.png',url:'https://www.nfl.com/watch/',description:'NFL / NFL+'},
{name:'NBA',group:'Sports',logo:'https://logo.clearboxtv.com/nba.png',url:'https://www.nba.com/watch/',description:'NBA / League Pass'},
{name:'NHL',group:'Sports',logo:'https://logo.clearboxtv.com/nhl.png',url:'https://www.nhl.com/',description:'NHL'},
{name:'MLB',group:'Sports',logo:'https://logo.clearboxtv.com/mlb.png',url:'https://www.mlb.com/tv',description:'MLB.TV'},
{name:'UFC',group:'Sports',logo:'https://logo.clearboxtv.com/ufc.png',url:'https://www.ufc.com/watch',description:'UFC'},
{name:'PGA Tour',group:'Sports',logo:'https://logo.clearboxtv.com/pga.png',url:'https://www.pgatour.com/watch',description:'PGA Tour'},
{name:'Golf Channel',group:'Sports',logo:'https://logo.clearboxtv.com/golf.png',url:'https://www.nbcsports.com/golf',description:'Golf Channel / NBC Sports Golf'},
{name:'CNN',group:'News',logo:'https://logo.clearboxtv.com/cnn.png',url:'https://www.cnn.com/live-tv',description:'CNN live — provider/sign-in may be required'},
{name:'Fox News',group:'News',logo:'https://logo.clearboxtv.com/foxnews.png',url:'https://www.foxnews.com/video/topics/live',description:'Fox News live'},
{name:'MSNBC',group:'News',logo:'https://logo.clearboxtv.com/msnbc.png',url:'https://www.msnbc.com/live',description:'MSNBC live'},
{name:'C-SPAN',group:'News',logo:'https://logo.clearboxtv.com/cspan.png',url:'https://www.c-span.org/networks/',description:'C-SPAN'}
];
const GROUPS=['All','Streaming','Networks','Sports','News'];
const list=document.querySelector('#list'),groups=document.querySelector('#groups'),search=document.querySelector('#search'),status=document.querySelector('#status'),nameEl=document.querySelector('#name'),details=document.querySelector('#details'),playBtn=document.querySelector('#play'),video=document.querySelector('#video'),watch=document.querySelector('.watch');
let shown=[...ITEMS],idx=0,active='All',touchX=0;
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderGroups(){groups.innerHTML=GROUPS.map(g=>`<button class="${g===active?'on':''}" data-g="${g}">${g}</button>`).join('');groups.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.g;idx=0;renderGroups();filter()})}
function filter(){const q=search.value.toLowerCase().trim();shown=ITEMS.filter(x=>(active==='All'||x.group===active)&&(!q||(x.name+' '+x.description+' '+x.group).toLowerCase().includes(q)));list.innerHTML=shown.length?shown.map((x,i)=>`<article class="channel" data-i="${i}" tabindex="0">${x.logo?`<img src="${esc(x.logo)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;fallback&quot;>${esc(x.name.slice(0,2).toUpperCase())}</div>'">`:`<div class="fallback">${esc(x.name.slice(0,2).toUpperCase())}</div>`}<div><b>${esc(x.name)}</b><p>${esc(x.description)}</p></div><span class="tag">${esc(x.group)}</span></article>`).join(''):'<div class="empty">No services found</div>';list.querySelectorAll('.channel').forEach(r=>{r.onclick=()=>select(+r.dataset.i);r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+r.dataset.i);launch()}}});status.textContent=`${shown.length} services`;if(shown.length){const saved=localStorage.getItem('open-tv-last');const savedIndex=saved?shown.findIndex(x=>x.name===saved):-1;select(savedIndex>=0?savedIndex:Math.min(idx,shown.length-1),false)}}
function select(i,open=false){if(!shown.length)return;idx=(i+shown.length)%shown.length;const c=shown[idx];localStorage.setItem('open-tv-last',c.name);nameEl.textContent=c.name;details.textContent=c.description;status.textContent=`Ready: ${c.name}`;video.removeAttribute('src');video.poster=c.logo||'';video.load();playBtn.textContent='▶';if(open)launch()}
function launch(){if(!shown.length)return;const c=shown[idx];status.textContent=`Opening ${c.name}…`;const w=window.open(c.url,'_blank','noopener,noreferrer');if(!w)location.href=c.url}
function prev(){select(idx-1)}function next(){select(idx+1)}
document.querySelector('#prev').onclick=prev;document.querySelector('#next').onclick=next;playBtn.onclick=launch;search.oninput=()=>{idx=0;filter()};
document.addEventListener('keydown',e=>{if(e.target===search)return;if(e.key==='ArrowLeft'){e.preventDefault();prev()}else if(e.key==='ArrowRight'){e.preventDefault();next()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();launch()}});
watch.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX},{passive:true});watch.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)(dx>0?prev:next)()},{passive:true});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
renderGroups();filter();
