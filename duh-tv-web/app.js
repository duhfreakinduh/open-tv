const API_BASE = "https://api.cdnlivetv.is/api/v1";
const CHANNELS_URL = `${API_BASE}/channels/?user=cdnlivetv&plan=free`;
const SPORTS_URL = `${API_BASE}/events/sports/?user=cdnlivetv&plan=free`;

const state = {
  channels: [],
  sports: [],
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
  const root = data?.["cdnlivetv.is"] || {};
  const categories = ["Soccer", "NFL", "NBA", "NHL"];
  return categories.flatMap((sport) =>
    (Array.isArray(root[sport]) ? root[sport] : []).map((event) => ({ ...event, sport }))
  );
}

async function loadSports() {
  $("#sportsGrid").innerHTML = '<div class="loading">Loading sports…</div>';
  try {
    const data = await getJson(SPORTS_URL);
    state.sports = normalizeSports(data);
    renderSports();
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
      <div class="meta"><span class="dot ${online ? "online" : ""}"></span>${esc((channel.code || "--").toUpperCase())} · ${esc(channel.status || "unknown")}</div>
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

function playChannel(channel, title = null, meta = null) {
  if (!channel?.url) return;
  state.selected = channel;
  $("#player").innerHTML = `<iframe src="${esc(channel.url)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  $("#nowTitle").textContent = title || channel.name || channel.channel_name || "Channel";
  $("#nowMeta").textContent = meta || `${(channel.code || channel.channel_code || "--").toUpperCase()} · ${channel.status || "provider player"}`;
  $("#openPlayerBtn").disabled = false;
  $("#copyUrlBtn").disabled = false;
  renderChannels();
  if (innerWidth < 920) $("#player").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setView(view) {
  state.view = view;
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  $("#channelControls").classList.toggle("hidden", view !== "channels");
  $("#channelGrid").classList.toggle("hidden", view !== "channels");
  $("#sportsControls").classList.toggle("hidden", view !== "sports");
  $("#sportsGrid").classList.toggle("hidden", view !== "sports");
  if (view === "sports" && !state.sports.length) loadSports();
  if (view === "sports") renderSports(); else renderChannels();
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

$("#search").addEventListener("input", () => state.view === "channels" ? renderChannels() : renderSports());
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

$$(".tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));

$("#reloadBtn").addEventListener("click", async () => {
  showNotice("");
  await loadChannels();
  if (state.view === "sports") await loadSports();
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
