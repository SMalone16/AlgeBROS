const MAX_RESULTS = 60;
const POLL_INTERVAL = 30_000;

const PIPED_INSTANCES = [
  "https://piped.video",
  "https://piped.lunar.icu",
  "https://piped.projectsegfau.lt",
];

const LEGACY_LEMNOS_INSTANCES = ["https://ytapi.lemnoslife.com", "https://yt.lemnoslife.com"];

const VIDEO_SOURCES = [
  ...PIPED_INSTANCES.map(createPipedSource),
  ...LEGACY_LEMNOS_INSTANCES.map(createLegacyLemnosSource),
];

const feedList = document.getElementById("videoFeed");
const statusMessage = document.getElementById("statusMessage");
const lastUpdated = document.getElementById("lastUpdated");
const refreshButton = document.getElementById("refreshButton");
const template = document.getElementById("videoTemplate");

const state = {
  knownIds: new Set(),
  videos: [],
  lastSource: null,
};

let pollTimer = null;

function createPipedSource(origin) {
  const { hostname } = new URL(origin);
  return {
    name: `Piped @ ${hostname}`,
    requestUrl() {
      const url = new URL("/api/v1/search", origin);
      url.searchParams.set("q", "*");
      url.searchParams.set("filter", "videos");
      url.searchParams.set("sort", "upload_date");
      url.searchParams.set("region", "US");
      url.searchParams.set("maxCount", String(MAX_RESULTS));
      return url.toString();
    },
    normalize: (payload) => normalizePipedResponse(payload),
  };
}

function createLegacyLemnosSource(origin) {
  const { hostname } = new URL(origin);
  return {
    name: `Lemnos @ ${hostname}`,
    requestUrl() {
      const url = new URL("/noKey/search", origin);
      url.searchParams.set("type", "video");
      url.searchParams.set("order", "date");
      url.searchParams.set("maxResults", String(Math.min(50, MAX_RESULTS)));
      url.searchParams.set("part", "snippet");
      return url.toString();
    },
    normalize: (payload) => normalizeLegacyLemnosResponse(payload),
  };
}

function formatRelativeTime(isoString) {
  const published = new Date(isoString);
  if (Number.isNaN(published.getTime())) {
    return "Unknown publish date";
  }

  const diffMs = published.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / (60 * 1000));

  const rtf = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
  }

  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, "hour");
  }

  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return rtf.format(days, "day");
}

function clearStatus() {
  statusMessage.hidden = true;
  statusMessage.textContent = "";
}

function setStatus(message, { tone = "info" } = {}) {
  statusMessage.hidden = false;
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

function renderFeed(newIds = new Set()) {
  if (!state.videos.length) {
    feedList.innerHTML = "";
    setStatus("No videos to display yet. Hang tight!", { tone: "info" });
    return;
  }

  clearStatus();
  const fragment = document.createDocumentFragment();

  for (const video of state.videos) {
    const clone = template.content.firstElementChild.cloneNode(true);
    clone.dataset.videoId = video.id;

    const link = clone.querySelector(".video__title a");
    const thumbnailLink = clone.querySelector(".video__thumbnail");
    const thumbnailImg = clone.querySelector(".video__thumbnail img");
    const channel = clone.querySelector(".video__channel");
    const published = clone.querySelector(".video__published");

    link.href = video.url;
    link.textContent = video.title;
    link.title = video.title;

    thumbnailLink.href = video.url;
    thumbnailImg.src = video.thumbnail;
    thumbnailImg.alt = `Thumbnail for ${video.title}`;

    channel.textContent = video.channel;
    published.textContent = formatRelativeTime(video.publishedAt);

    if (newIds.has(video.id)) {
      clone.classList.add("newly-arrived");
    }

    fragment.appendChild(clone);
  }

  feedList.replaceChildren(fragment);

  if (newIds.size) {
    window.requestAnimationFrame(() => {
      newIds.forEach((id) => {
        const element = feedList.querySelector(`[data-video-id="${id}"]`);
        if (!element) return;
        setTimeout(() => {
          element.classList.remove("newly-arrived");
        }, 6000);
      });
    });
  }
}

function parseVideoIdFromUrl(candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  try {
    const normalized = new URL(candidate, "https://www.youtube.com");
    const fromQuery = normalized.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const path = normalized.pathname ?? "";
    if (path.startsWith("/watch/")) {
      return path.split("/").pop();
    }
  } catch (error) {
    console.debug("Unable to parse video id from", candidate, error);
  }

  return null;
}

function toIsoString(value) {
  if (!value && value !== 0) return null;

  const maybeNumber = Number(value);
  if (Number.isFinite(maybeNumber) && maybeNumber > 0) {
    const iso = new Date(maybeNumber).toISOString();
    if (!Number.isNaN(Date.parse(iso))) {
      return iso;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00Z`).toISOString();
    }
  }

  return null;
}

function normalizePipedResponse(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const type = String(item?.type ?? item?.itemType ?? "").toLowerCase();
      if (type && !type.includes("stream") && type !== "video") {
        return null;
      }

      const id =
        parseVideoIdFromUrl(item?.url ?? item?.videoUrl ?? "") ??
        (typeof item?.id === "string" ? item.id : null);

      if (!id) return null;

      const title =
        typeof item?.title === "string" && item.title.trim()
          ? item.title.trim()
          : "Untitled video";

      const channel =
        typeof item?.uploaderName === "string" && item.uploaderName.trim()
          ? item.uploaderName.trim()
          : typeof item?.author === "string" && item.author.trim()
            ? item.author.trim()
            : "Unknown channel";

      const thumbnail =
        typeof item?.thumbnail === "string" && item.thumbnail
          ? item.thumbnail
          : typeof item?.thumbnailUrl === "string"
            ? item.thumbnailUrl
            : "";

      const publishedAt =
        toIsoString(item?.uploaded) ??
        toIsoString(item?.uploadDate) ??
        toIsoString(item?.uploadedDate);

      if (!publishedAt) return null;

      return {
        id,
        title,
        channel,
        publishedAt,
        thumbnail,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_RESULTS);
}

function normalizeLegacyLemnosResponse(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items
    .map((item) => {
      const id = item?.id?.videoId ?? item?.id;
      const snippet = item?.snippet ?? {};
      const title = snippet?.title ?? "Untitled video";
      const channel = snippet?.channelTitle ?? "Unknown channel";
      const publishedAt = snippet?.publishedAt ?? null;
      const thumbnails = snippet?.thumbnails ?? {};
      const thumbnail =
        thumbnails?.maxres?.url ??
        thumbnails?.standard?.url ??
        thumbnails?.high?.url ??
        thumbnails?.medium?.url ??
        thumbnails?.default?.url ??
        "";

      if (!id || !publishedAt) return null;

      return {
        id,
        title,
        channel,
        publishedAt,
        thumbnail,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_RESULTS);
}

async function fetchLatestVideos() {
  const errors = [];

  for (const source of VIDEO_SOURCES) {
    const requestUrl = source.requestUrl();

    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const payload = await response.json();
      const videos = source.normalize(payload);

      if (!Array.isArray(videos) || !videos.length) {
        throw new Error("No videos found in response");
      }

      return { videos, sourceName: source.name };
    } catch (error) {
      console.error(`Failed to fetch from ${source.name}`, error);
      errors.push(`${source.name}: ${error?.message ?? error}`);
    }
  }

  throw new Error(
    errors.length
      ? `All sources failed. ${errors.join(" · ")}`
      : "No video sources available.",
  );
}

async function refreshFeed({ showSpinner = true } = {}) {
  if (showSpinner) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing…";
  }

  try {
    const { videos, sourceName } = await fetchLatestVideos();
    const incomingIds = new Set(videos.map((video) => video.id));
    const newIds = new Set();

    for (const id of incomingIds) {
      if (!state.knownIds.has(id)) {
        newIds.add(id);
      }
    }

    state.videos = [
      ...videos,
      ...state.videos.filter((video) => !incomingIds.has(video.id)),
    ].slice(0, MAX_RESULTS);

    newIds.forEach((id) => state.knownIds.add(id));
    state.lastSource = sourceName;

    renderFeed(newIds);

    const now = new Date();
    const sourceSuffix = sourceName ? ` · via ${sourceName}` : "";
    lastUpdated.textContent = `Updated ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}${sourceSuffix}`;
  } catch (error) {
    console.error(error);
    setStatus(
      `Unable to fetch the latest videos. ${error.message ?? "Unknown error."}`,
      { tone: "error" },
    );
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh now";
    scheduleNextPoll();
  }
}

function scheduleNextPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  pollTimer = window.setTimeout(() => refreshFeed({ showSpinner: false }), POLL_INTERVAL);
}

refreshButton.addEventListener("click", () => {
  clearTimeout(pollTimer);
  refreshFeed({ showSpinner: true });
});

window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(pollTimer);
  } else {
    refreshFeed({ showSpinner: false });
  }
});

refreshFeed();
