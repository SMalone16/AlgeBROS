const API_URL =
  "https://yt.lemnoslife.com/noKey/search?type=video&order=date&maxResults=30&part=snippet";
const POLL_INTERVAL = 30_000;

const feedList = document.getElementById("videoFeed");
const statusMessage = document.getElementById("statusMessage");
const lastUpdated = document.getElementById("lastUpdated");
const refreshButton = document.getElementById("refreshButton");
const template = document.getElementById("videoTemplate");

const state = {
  knownIds: new Set(),
  videos: [],
};

let pollTimer = null;

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

async function fetchLatestVideos() {
  const response = await fetch(API_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];

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
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

async function refreshFeed({ showSpinner = true } = {}) {
  if (showSpinner) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing…";
  }

  try {
    const videos = await fetchLatestVideos();
    const newIds = new Set();

    for (const video of videos) {
      if (!state.knownIds.has(video.id)) {
        newIds.add(video.id);
      }
    }

    state.videos = [
      ...videos,
      ...state.videos.filter((video) => !videos.some((v) => v.id === video.id)),
    ].slice(0, 60);

    newIds.forEach((id) => state.knownIds.add(id));

    renderFeed(newIds);

    const now = new Date();
    lastUpdated.textContent = `Updated ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
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
