# AlgeBROS Live YouTube Feed

AlgeBROS is now a lightweight web application that tracks the most recently uploaded public videos on YouTube. The site polls a public, no-authentication API and automatically prepends new uploads to the top of the feed so that the freshest content is always visible.

## Features
- Auto-refreshing list of the latest YouTube uploads.
- Client-side polling every 30 seconds to catch new videos.
- Visual highlight for videos that appeared during the most recent refresh.
- Manual refresh button for when you cannot wait for the next poll cycle.

## Technology
This project is a static web application built with plain HTML, CSS, and vanilla JavaScript. There is no build step or framework involved—simply open `index.html` in a browser or serve the `workspace` directory with your preferred static file server.

## Development
1. Open `index.html` in a modern browser.
2. Ensure the environment allows outbound HTTPS requests to `yt.lemnoslife.com`, which provides an unofficial YouTube Data API that requires no authentication.
3. New videos will appear automatically; use the **Refresh now** button to trigger a manual update.

> **Note:** Because this project relies on a third-party API without rate limits or SLAs, availability and response shape may change. The UI is built defensively to surface errors so you can diagnose connectivity issues quickly.
