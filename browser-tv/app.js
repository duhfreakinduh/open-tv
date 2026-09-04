const PLAYLISTS = [
  'https://iptv-org.github.io/iptv/countries/us.m3u',
  'https://iptv-org.github.io/iptv/subdivisions/us-tx.m3u',
  'https://iptv-org.github.io/iptv/cities/usdal.m3u',
  'https://iptv-org.github.io/iptv/cities/usfwt.m3u'
];

const GROUPS = ['Favorites', 'All', 'Local/News', 'Sports', 'Kids', 'Movies', 'Comedy', 'Music', 'Weather', 'Texas'];
const FAVORITES_KEY = 'open-tv-favorites';

const video = document.querySelector('#video');
const playerCard = document.querySelector('#playerCard');
const channelsEl = document.querySelector('#channels');
const categoriesEl = document.querySelector('#categories');
const searchEl = document.querySelector('#search');
const statusEl = document.querySelector('#status');
const countEl = document.querySelector('#count');
const listTitleEl = document.querySelector('#listTitle');
const playerEmpty = document.querySelector('#playerEmpty');
const nowName = document.querySelector('#nowName');
const nowGroup = document.querySelector('#nowGroup');
const favoriteNow = document.querySelector('#favoriteNow');
const prevBtn = document.querySelector('#prev');
const playPauseBtn = document.querySelector('#playPause');
const nextBtn = document.querySelector('#next');
const fullscreenBtn = document.querySelector('#fullscreen');

let channels = [];
let filtered = [];
let activeGroup = 'All';
let current = null;
let hls = null;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

const favorites = loadFavorites();

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // Favorites still work for this session when storage is unavailable.
  }
}

function categoryOf(name, group = '') {
  const s = `${name} ${group}`.toLowerCase();
  if (/weather|accuweather/.test(s)) return 'Weather';
  if (/news|abc|cbs|nbc|fox|local|pbs|cw|c-span/.test(s)) return 'Local/News';
  if (/sport|nfl|nba|mlb|nhl|soccer|golf|racing|poker/.test(s)) return 'Sports';
  if (/kid|cartoon|animation|family|junior/.test(s)) return 'Kids';
  if (/movie|cinema|film|western|action|horror/.test(s)) return 'Movies';
  if (/comedy|funny/.test(s)) return 'Comedy';
  if (/music|vevo|mtv|radio|concert/.test(s)) return 'Music';
  return group || 'General';
}

function isTexasChannel(name, group = '') {
  return /texas|dallas|fort worth|dfw|austin|houston|san antonio|waco|el paso/i.test(`${name} ${group}`);
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let meta = null;

  for (const line0 of lines) {
    const line = line0.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const name = (line.split(',').slice(1).join(',') || 'Unknown').trim();
      const attrs = {};
      for (const match of line.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
      meta = {
        name,
        logo: attrs['tvg-logo'] || '',
        sourceGroup: attrs['group-title'] || ''
      };
      continue;
    }

    if (meta && !line.startsWith('#')) {
      if (/^https:\/\//i.test(line) && /\.m3u8(?:[?#]|$)/i.test(line)) {
        const group = categoryOf(meta.name, meta.sourceGroup);
        out.push({
          ...meta,
          group,
          texas: isTexasChannel(meta.name, meta.sourceGroup),
          url: line,
          id: `${meta.name}|${line}`
        });
      }
      meta = null;
    }
  }

  return out;
}

async function fetchPlaylist(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return parseM3U(await response.text());
}

async function load() {
  setStatus('Loading channel lists…');
  const settled = await Promise.allSettled(PLAYLISTS.map(fetchPlaylist));
  const results = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const failed = settled.filter(result => result.status === 'rejected').length;

  const deduped = new Map();
  for (const channel of results) {
    if (!deduped.has(channel.url)) deduped.set(channel.url, channel);
  }

  channels = [...deduped.values()].slice(0, 300);
  renderCategories();
  applyFilters();

  if (!channels.length) {
    setStatus('No browser-playable HLS channels loaded. Try reloading.');
  } else if (failed) {
    setStatus(`${channels.length} channels loaded · ${failed} source list${failed === 1 ? '' : 's'} unavailable`);
  } else {
    setStatus(`${channels.length} channels loaded`);
  }
}

function renderCategories() {
  categoriesEl.replaceChildren();
  for (const group of GROUPS) {
    const button = document.createElement('button');
    button.className = `chip${group === activeGroup ? ' active' : ''}`;
    button.textContent = group;
    button.type = 'button';
    button.onclick = () => {
      activeGroup = group;
      renderCategories();
      applyFilters();
    };
    categoriesEl.appendChild(button);
  }
}

function matchesGroup(channel) {
  if (activeGroup === 'All') return true;
  if (activeGroup === 'Favorites') return favorites.has(channel.id);
  if (activeGroup === 'Texas') return channel.texas;
  return channel.group === activeGroup;
}

function applyFilters() {
  const query = searchEl.value.trim().toLowerCase();
  filtered = channels.filter(channel => {
    const text = `${channel.name} ${channel.group} ${channel.sourceGroup}`.toLowerCase();
    return matchesGroup(channel) && (!query || text.includes(query));
  });

  listTitleEl.textContent = activeGroup === 'All' ? 'All channels' : activeGroup;
  countEl.textContent = `${filtered.length} channel${filtered.length === 1 ? '' : 's'}`;
  renderChannels();
}

function createLogo(channel) {
  if (!channel.logo) return createFallbackLogo(channel.name);

  const image = document.createElement('img');
  image.className = 'logo';
  image.src = channel.logo;
  image.alt = '';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.onerror = () => image.replaceWith(createFallbackLogo(channel.name));
  return image;
}

function createFallbackLogo(name) {
  const fallback = document.createElement('div');
  fallback.className = 'logo logo-fallback';
  fallback.textContent = name.slice(0, 2).toUpperCase();
  return fallback;
}

function renderChannels() {
  channelsEl.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No channels found.';
    channelsEl.appendChild(empty);
    return;
  }

  for (const channel of filtered) {
    const row = document.createElement('article');
    row.className = `channel${current?.id === channel.id ? ' playing' : ''}`;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Play ${channel.name}`);
    row.onclick = () => playChannel(channel);
    row.onkeydown = event => {
      if (event.target !== row) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        playChannel(channel);
      }
    };

    const meta = document.createElement('div');
    meta.className = 'channel-meta';

    const name = document.createElement('div');
    name.className = 'channel-name';
    name.textContent = channel.name;

    const group = document.createElement('div');
    group.className = 'channel-group';
    group.textContent = channel.texas && channel.group !== 'Texas' ? `${channel.group} · Texas` : channel.group;

    meta.append(name, group);

    const favorite = document.createElement('button');
    favorite.className = `fav${favorites.has(channel.id) ? ' on' : ''}`;
    favorite.type = 'button';
    favorite.setAttribute('aria-label', `${favorites.has(channel.id) ? 'Remove' : 'Add'} ${channel.name} ${favorites.has(channel.id) ? 'from' : 'to'} favorites`);
    favorite.textContent = favorites.has(channel.id) ? '★' : '☆';
    favorite.onclick = event => {
      event.stopPropagation();
      toggleFavorite(channel);
    };

    row.append(createLogo(channel), meta, favorite);
    channelsEl.appendChild(row);
  }
}

function toggleFavorite(channel) {
  favorites.has(channel.id) ? favorites.delete(channel.id) : favorites.add(channel.id);
  saveFavorites();
  updateCurrentFavorite();
  applyFilters();
}

function updateCurrentFavorite() {
  const on = Boolean(current && favorites.has(current.id));
  favoriteNow.textContent = on ? '★' : '☆';
  favoriteNow.setAttribute('aria-label', on ? 'Remove current channel from favorites' : 'Favorite current channel');
}

function setStatus(message) {
  statusEl.textContent = message;
}

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function resetVideo() {
  destroyHls();
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function updatePlayButton() {
  const playing = !video.paused && !video.ended;
  playPauseBtn.textContent = playing ? '❚❚' : '▶';
  playPauseBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

function attachHls(channel) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = channel.url;
    return Promise.resolve();
  }

  if (!window.Hls || !Hls.isSupported()) {
    return Promise.reject(new Error('HLS is not supported in this browser'));
  }

  return new Promise((resolve, reject) => {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 30
    });

    let finished = false;
    let networkRetries = 0;
    let mediaRetries = 0;
    const timeout = setTimeout(() => finish(new Error('Timed out loading channel')), 12000);

    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    }

    hls.on(Hls.Events.MANIFEST_PARSED, () => finish());
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal || finished) return;

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 1) {
        networkRetries += 1;
        hls.startLoad();
        return;
      }

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 1) {
        mediaRetries += 1;
        hls.recoverMediaError();
        return;
      }

      finish(new Error(data.details || 'Fatal HLS playback error'));
    });

    hls.loadSource(channel.url);
    hls.attachMedia(video);
  });
}

async function playChannel(channel) {
  current = channel;
  playerEmpty.classList.add('hidden');
  nowName.textContent = channel.name;
  nowGroup.textContent = channel.texas ? `${channel.group} · Texas` : channel.group;
  updateCurrentFavorite();
  renderChannels();
  setStatus(`Connecting to ${channel.name}…`);

  resetVideo();

  try {
    await attachHls(channel);
    await video.play();
    setStatus(`Playing ${channel.name}`);
  } catch (error) {
    console.warn('Playback failed', channel.name, error);
    updatePlayButton();
    setStatus(`${channel.name} could not start. Try another channel or tap Play.`);
  }
}

function navigationList() {
  if (filtered.length && current && filtered.some(channel => channel.id === current.id)) return filtered;
  return channels;
}

function stepChannel(direction) {
  const list = navigationList();
  if (!list.length) return;

  const currentIndex = current ? list.findIndex(channel => channel.id === current.id) : -1;
  const start = currentIndex >= 0 ? currentIndex : (direction > 0 ? -1 : 0);
  const nextIndex = (start + direction + list.length) % list.length;
  playChannel(list[nextIndex]);
}

async function togglePlayPause() {
  if (!current) {
    const first = filtered[0] || channels[0];
    if (first) await playChannel(first);
    return;
  }

  if (!video.src && !hls) {
    await playChannel(current);
    return;
  }

  try {
    if (video.paused) await video.play();
    else video.pause();
  } catch {
    setStatus('Playback needs another tap or a different channel.');
  }
  updatePlayButton();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (playerCard.requestFullscreen) {
      await playerCard.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  } catch {
    setStatus('Fullscreen is not available in this browser.');
  }
}

favoriteNow.onclick = () => current && toggleFavorite(current);
prevBtn.onclick = () => stepChannel(-1);
nextBtn.onclick = () => stepChannel(1);
playPauseBtn.onclick = togglePlayPause;
fullscreenBtn.onclick = toggleFullscreen;
searchEl.addEventListener('input', applyFilters);
video.addEventListener('playing', () => {
  updatePlayButton();
  if (current) setStatus(`Playing ${current.name}`);
});
video.addEventListener('pause', updatePlayButton);
video.addEventListener('ended', updatePlayButton);
video.addEventListener('error', () => {
  updatePlayButton();
  if (current) setStatus(`${current.name} is unavailable right now.`);
});
document.addEventListener('fullscreenchange', () => {
  fullscreenBtn.textContent = document.fullscreenElement ? '↙' : '⛶';
  fullscreenBtn.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
});

updatePlayButton();
load();
