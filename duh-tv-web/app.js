const API_BASE = "https://api.cdnlivetv.is/api/v1";
const CHANNELS_URL = `${API_BASE}/channels/?user=cdnlivetv&plan=free`;
const SPORTS_URL = `${API_BASE}/events/sports/?user=cdnlivetv&plan=free`;
const TVMAZE_BASE = "https://api.tvmaze.com";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const RADIO_BASE = "https://de1.api.radio-browser.info/json";

const state = {
  channels: [],
  sports: [],
  shows: [],
  radio: [],
  weather: null,
  selected: null,
  view: "channels",
  usOnly: false,
  favoritesOnly: false,
  liveSportsOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("duh-tv-favorites") || "[]"))
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function channelKey(channel) {
  return `${channel.code || ""}|${channel.name || ""}`;
}

function showNotice(message = "") {
  const el = $("#notice");
  el.textContent = message;
  el.classList.toggle("hidden", !message);
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadChannels() {
  $("#channelGrid").innerHTML = '<div class="loading">Loading channels…</div>';
  try {
    const data = await getJson(CHANNELS_URL);
    state.channels = Array.isArray(data.channels) ? data.channels : [];
    buildCountries();
    renderChannels();
    showNotice("");
  } catch (error) {
    state.channels = [];
    renderChannels();
    showNotice(`Channel API error: ${error.message}. Browser CORS or provider availability may be the cause.`);
  }
}

function normalizeSports(data) {
  const root = data?.["cdnlivetv.is"] || data || {};
  return Object.entries(root).flatMap(([sport, events]) =>
    Array.isArray(events) ? events.map((event) => ({ ...event, sport })) : []
  );
}

function buildSportsFilter() {
  const select = $("#sportFilter");
  const current = select.value;
  const sports = [...new Set(state.sports.map((e) => e.sport).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All sports</option>' +
    sports.map((sport) => `<option value="${esc(sport)}">${esc(sport)}</option>`).join("");
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

async function loadSports() {
  $("#sportsGrid").innerHTML = '<div class="loading">Loading sports…</div>';
  try {
    const data = await getJson(SPORTS_URL);
    state.sports = normalizeSports(data);
    buildSportsFilter();
    renderSports();
    showNotice("");
  } catch (error) {
    state.sports = [];
    renderSports();
    showNotice(`Sports API error: ${error.message}.`);
  }
}

function buildCountries() {
  const select = $("#countryFilter");
  const current = select.value;
  const codes = [...new Set(state.channels.map((c) => (c.code || "").toLowerCase()).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All countries</option>' +
    codes.map((code) => `<option value="${esc(code)}">${esc(code.toUpperCase())}</option>`).join("");
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function filteredChannels() {
  const q = $("#search").value.trim().toLowerCase();
  const country = $("#countryFilter").value;
  const status = $("#statusFilter").value;
  return state.channels.filter((channel) => {
    const code = (channel.code || "").toLowerCase();
    const channelStatus = (channel.status || "").toLowerCase();
    return (!q || (channel.name || "").toLowerCase().includes(q) || code.includes(q))
      && (country === "all" || code === country)
      && (status === "all" || channelStatus === status)
      && (!state.usOnly || code === "us")
      && (!state.favoritesOnly || state.favorites.has(channelKey(channel)));
  });
}

function renderChannels() {
  const list = filteredChannels();
  $("#channelCount").textContent = `${list.length.toLocaleString()} shown · ${state.channels.length.toLocaleString()} loaded`;

  if (!list.length) {
    $("#channelGrid").innerHTML = '<div class="empty">No channels match the current filters.</div>';
    return;
  }

  $("#channelGrid").innerHTML = list.map((channel) => {
    const key = channelKey(channel);
    const online = (channel.status || "").toLowerCase() === "online";
    const selected = state.selected && channelKey(state.selected) === key;
    return `<article class="card ${selected ? "selected" : ""}" data-key="${esc(key)}">
      <button class="star" data-favorite="${esc(key)}" aria-label="Toggle favorite">${state.favorites.has(key) ? "★" : "☆"}</button>
      <div class="logo-box"><img loading="lazy" src="${esc(channel.image || "")}" alt="" onerror="this.style.display='none'"></div>
      <h3>${esc(channel.name || "Unnamed channel")}</h3>
      <div class="meta"><span class="dot ${online ? "online" : ""}"></span>${esc((channel.code || "--").toUpperCase())} · ${esc(channel.status || "unknown")}${channel.viewers ?? channel.viewer_count ?? channel.viewers_count ? ` · 👁 ${esc(channel.viewers ?? channel.viewer_count ?? channel.viewers_count)}` : ""}</div>
    </article>`;
  }).join("");
}

function filteredSports() {
  const sport = $("#sportFilter").value;
  const q = $("#search").value.trim().toLowerCase();
  return state.sports.filter((event) => {
    const haystack = [
      event.homeTeam, event.awayTeam, event.tournament, event.country, event.sport,
      ...(event.channels || []).map((c) => c.channel_name)
    ].join(" ").toLowerCase();
    return (sport === "all" || event.sport === sport)
      && (!state.liveSportsOnly || (event.status || "").toLowerCase() === "live")
      && (!q || haystack.includes(q));
  });
}

function renderSports() {
  const list = filteredSports();
  $("#sportsCount").textContent = `${list.length.toLocaleString()} events`;
  if (!list.length) {
    $("#sportsGrid").innerHTML = '<div class="empty">No sports events match the current filters.</div>';
    return;
  }

  $("#sportsGrid").innerHTML = list.map((event, index) => {
    const channels = Array.isArray(event.channels) ? event.channels : [];
    return `<article class="event">
      <div class="event-head">
        <h3>${esc(event.homeTeam || "TBD")} vs ${esc(event.awayTeam || "TBD")}</h3>
        <span class="badge ${(event.status || "").toLowerCase() === "live" ? "live" : ""}">${esc(event.status || "unknown")}</span>
      </div>
      <div class="event-sub">${esc(event.sport)} · ${esc(event.tournament || "")} · ${esc(event.country || "")} · ${esc(event.start || event.time || "")}</div>
      <div class="event-channels">
        ${channels.length ? channels.map((channel, cIndex) => `
          <button class="event-channel" data-event="${index}" data-channel="${cIndex}">
            ${channel.image ? `<img src="${esc(channel.image)}" alt="" onerror="this.remove()">` : ""}
            <span>${esc(channel.channel_name || "Watch")}</span>
          </button>`).join("") : '<span class="meta">No channel listed</span>'}
      </div>
    </article>`;
  }).join("");

  $("#sportsGrid").dataset.rendered = JSON.stringify(list.map((e) => ({
    channels: e.channels || [], homeTeam: e.homeTeam, awayTeam: e.awayTeam, sport: e.sport
  })));
}


function safeProviderUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!(url.hostname === "cdnlivetv.is" || url.hostname.endsWith(".cdnlivetv.is"))) return null;
    return url.href;
  } catch { return null; }
}

async function loadTodayShows() {
  $("#showsGrid").innerHTML = '<div class="loading">Loading today’s U.S. TV schedule…</div>';
  try {
    const date = new Date().toISOString().slice(0, 10);
    state.shows = await getJson(`${TVMAZE_BASE}/schedule?country=US&date=${date}`);
    renderShows(true); showNotice("");
  } catch (error) {
    state.shows = [];
    $("#showsGrid").innerHTML = '<div class="empty">TV schedule unavailable.</div>';
    showNotice(`TVmaze error: ${error.message}`);
  }
}

async function searchShows() {
  const q = $("#showSearch").value.trim();
  if (q.length < 2) return loadTodayShows();
  $("#showsGrid").innerHTML = '<div class="loading">Searching TV shows…</div>';
  try {
    const results = await getJson(`${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(q)}`);
    state.shows = results.map((r) => ({ show: r.show, _search: true }));
    renderShows(false); showNotice("");
  } catch (error) { showNotice(`TVmaze search error: ${error.message}`); }
}

function renderShows(scheduleMode = false) {
  $("#showsCount").textContent = `${state.shows.length} results`;
  if (!state.shows.length) { $("#showsGrid").innerHTML = '<div class="empty">No TV results found.</div>'; return; }
  $("#showsGrid").innerHTML = state.shows.slice(0, 80).map((item) => {
    const show = item.show || item._embedded?.show || {};
    const image = show.image?.medium || "";
    const detail = scheduleMode ? `${item.airtime || ""} · ${item.name || "Episode"}` :
      [show.type, show.premiered?.slice(0,4), show.rating?.average ? `★ ${show.rating.average}` : ""].filter(Boolean).join(" · ");
    return `<article class="media-card">${image ? `<img loading="lazy" src="${esc(image)}" alt="">` : '<div class="logo-box">No image</div>'}<div class="media-body"><h3>${esc(show.name || "Untitled")}</h3><p>${esc(detail)}</p></div></article>`;
  }).join("");
}

const WEATHER_TEXT={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms + hail",99:"Severe thunderstorms + hail"};

async function loadWeather() {
  const query = $("#weatherLocation").value.trim();
  if (!query) return;
  $("#weatherGrid").innerHTML = '<div class="loading">Loading weather…</div>';
  try {
    const geo = await getJson(`${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    const place = geo.results?.[0]; if (!place) throw new Error("Location not found");
    const params = new URLSearchParams({latitude:place.latitude,longitude:place.longitude,current:"temperature_2m,apparent_temperature,weather_code,wind_speed_10m",daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",temperature_unit:"fahrenheit",wind_speed_unit:"mph",timezone:"auto",forecast_days:"7"});
    const data = await getJson(`${WEATHER_URL}?${params}`);
    state.weather={place,data}; renderWeather(); showNotice("");
  } catch (error) { $("#weatherGrid").innerHTML='<div class="empty">Weather unavailable.</div>'; showNotice(`Weather error: ${error.message}`); }
}

function renderWeather() {
  const {place,data}=state.weather||{}; if(!place||!data)return;
  const c=data.current||{}, d=data.daily||{};
  const days=(d.time||[]).map((date,i)=>`<div class="forecast-day"><strong>${esc(new Date(date+"T12:00:00").toLocaleDateString([],{weekday:"short"}))}</strong><span>${esc(WEATHER_TEXT[d.weather_code?.[i]]||"Weather")}</span><p>${Math.round(d.temperature_2m_max?.[i]??0)}° / ${Math.round(d.temperature_2m_min?.[i]??0)}°</p><small>Rain ${d.precipitation_probability_max?.[i]??0}%</small></div>`).join("");
  $("#weatherGrid").innerHTML=`<div class="weather-hero"><h2>${esc(place.name)}, ${esc(place.admin1||place.country||"")}</h2><div class="weather-now">${Math.round(c.temperature_2m??0)}°F</div><div>${esc(WEATHER_TEXT[c.weather_code]||"Current weather")} · Feels ${Math.round(c.apparent_temperature??0)}° · Wind ${Math.round(c.wind_speed_10m??0)} mph</div></div><div class="forecast-row">${days}</div>`;
}

async function loadTopRadio() {
  $("#radioGrid").innerHTML='<div class="loading">Loading top U.S. stations…</div>';
  try {
    state.radio=await getJson(`${RADIO_BASE}/stations/bycountrycodeexact/US?hidebroken=true&limit=60&order=clickcount&reverse=true`);
    renderRadio(); showNotice("");
  } catch(error){state.radio=[];$("#radioGrid").innerHTML='<div class="empty">Radio service unavailable.</div>';showNotice(`Radio Browser error: ${error.message}`);}
}

async function searchRadio() {
  const q=$("#radioSearch").value.trim(); if(!q)return loadTopRadio();
  $("#radioGrid").innerHTML='<div class="loading">Searching radio…</div>';
  try {state.radio=await getJson(`${RADIO_BASE}/stations/search?name=${encodeURIComponent(q)}&hidebroken=true&limit=60&order=clickcount&reverse=true`);renderRadio();showNotice("");}
  catch(error){showNotice(`Radio search error: ${error.message}`);}
}

function renderRadio() {
  $("#radioCount").textContent=`${state.radio.length} stations`;
  if(!state.radio.length){$("#radioGrid").innerHTML='<div class="empty">No radio stations found.</div>';return;}
  $("#radioGrid").innerHTML=state.radio.map((s,i)=>`<article class="radio-card">${s.favicon?`<img src="${esc(s.favicon)}" alt="" onerror="this.style.visibility='hidden'">`:"<div></div>"}<div><h3>${esc(s.name||"Radio station")}</h3><p>${esc([s.state,s.country,s.tags,s.codec&&s.bitrate?`${s.codec} ${s.bitrate}kbps`:""].filter(Boolean).join(" · "))}</p></div><button class="button primary" data-radio="${i}">Play</button></article>`).join("");
}

function playRadio(station) {
  const stream=station?.url_resolved||station?.url;if(!stream)return;
  state.selected={url:stream,name:station.name,radio:true};
  $("#player").innerHTML=`<div class="audio-player"><audio src="${esc(stream)}" controls autoplay></audio></div>`;
  $("#nowTitle").textContent=station.name||"Radio";
  $("#nowMeta").textContent=[station.state,station.country,station.codec].filter(Boolean).join(" · ");
  $("#openPlayerBtn").disabled=false;$("#copyUrlBtn").disabled=false;
}

function playChannel(channel, title = null, meta = null) {
  const safeUrl = safeProviderUrl(channel?.url);
  if (!safeUrl) { showNotice("Blocked an unexpected or unsafe player URL from the provider."); return; }
  state.selected = { ...channel, url: safeUrl };
  $("#player").innerHTML = `<iframe src="${esc(safeUrl)}" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
  $("#nowTitle").textContent = title || channel.name || channel.channel_name || "Channel";
  $("#nowMeta").textContent = meta || `${(channel.code || channel.channel_code || "--").toUpperCase()} · ${channel.status || "provider player"}`;
  $("#openPlayerBtn").disabled = false;
  $("#copyUrlBtn").disabled = false;
  renderChannels();
  if (innerWidth < 920) $("#player").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setView(view) {
  state.view=view;
  $$(".tab").forEach((tab)=>tab.classList.toggle("active",tab.dataset.view===view));
  ["channels","sports","shows","weather","radio"].forEach((name)=>{
    $("#"+name+"Controls")?.classList.toggle("hidden",view!==name);
    $("#"+name+"Grid")?.classList.toggle("hidden",view!==name);
  });
  if(view==="sports"){if(!state.sports.length)loadSports();else renderSports();}
  else if(view==="channels")renderChannels();
  else if(view==="shows"){if(!state.shows.length)loadTodayShows();else renderShows();}
  else if(view==="weather"){if(!state.weather)loadWeather();else renderWeather();}
  else if(view==="radio"){if(!state.radio.length)loadTopRadio();else renderRadio();}
}

$("#channelGrid").addEventListener("click", (event) => {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    event.stopPropagation();
    const key = favorite.dataset.favorite;
    state.favorites.has(key) ? state.favorites.delete(key) : state.favorites.add(key);
    localStorage.setItem("duh-tv-favorites", JSON.stringify([...state.favorites]));
    renderChannels();
    return;
  }
  const card = event.target.closest("[data-key]");
  if (!card) return;
  const channel = state.channels.find((c) => channelKey(c) === card.dataset.key);
  playChannel(channel);
});

$("#sportsGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-event][data-channel]");
  if (!button) return;
  const list = filteredSports();
  const sportEvent = list[Number(button.dataset.event)];
  const channel = sportEvent?.channels?.[Number(button.dataset.channel)];
  playChannel(
    channel,
    channel?.channel_name || `${sportEvent.homeTeam} vs ${sportEvent.awayTeam}`,
    `${sportEvent.sport} · ${sportEvent.homeTeam} vs ${sportEvent.awayTeam}`
  );
});

$("#search").addEventListener("input", () => { if (state.view === "channels") renderChannels(); else if (state.view === "sports") renderSports(); });
$("#countryFilter").addEventListener("change", renderChannels);
$("#statusFilter").addEventListener("change", renderChannels);
$("#sportFilter").addEventListener("change", renderSports);

$("#usOnlyBtn").addEventListener("click", () => {
  state.usOnly = !state.usOnly;
  $("#usOnlyBtn").classList.toggle("active", state.usOnly);
  if (state.usOnly) $("#countryFilter").value = "all";
  renderChannels();
});

$("#favoritesBtn").addEventListener("click", () => {
  state.favoritesOnly = !state.favoritesOnly;
  $("#favoritesBtn").classList.toggle("active", state.favoritesOnly);
  renderChannels();
});

$("#liveSportsBtn").addEventListener("click", () => {
  state.liveSportsOnly = !state.liveSportsOnly;
  $("#liveSportsBtn").classList.toggle("active", state.liveSportsOnly);
  renderSports();
});

$("#todayShowsBtn").addEventListener("click", loadTodayShows);
$("#showSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") searchShows(); });
$("#weatherBtn").addEventListener("click", loadWeather);
$("#weatherLocation").addEventListener("keydown", (e) => { if (e.key === "Enter") loadWeather(); });
$("#radioSearchBtn").addEventListener("click", searchRadio);
$("#radioTopBtn").addEventListener("click", loadTopRadio);
$("#radioSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") searchRadio(); });
$("#radioGrid").addEventListener("click", (e) => {
  const button=e.target.closest("[data-radio]");
  if(button) playRadio(state.radio[Number(button.dataset.radio)]);
});

$$(".tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));

$("#reloadBtn").addEventListener("click", async () => {
  showNotice("");
  if(state.view==="channels") await loadChannels();
  else if(state.view==="sports") await loadSports();
  else if(state.view==="shows") await loadTodayShows();
  else if(state.view==="weather") await loadWeather();
  else if(state.view==="radio") await loadTopRadio();
});

$("#openPlayerBtn").addEventListener("click", () => {
  if (state.selected?.url) window.open(state.selected.url, "_blank", "noopener,noreferrer");
});

$("#copyUrlBtn").addEventListener("click", async () => {
  if (!state.selected?.url) return;
  try {
    await navigator.clipboard.writeText(state.selected.url);
    const button = $("#copyUrlBtn");
    const old = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => button.textContent = old, 1200);
  } catch {
    prompt("Copy player URL:", state.selected.url);
  }
});

loadChannels();
