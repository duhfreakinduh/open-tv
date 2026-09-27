# DUH TV — CDNLiveTV web client

A standalone browser-based channel and sports-event viewer built around CDNLiveTV's documented public API and iframe player interface.

## What it does

- Fetches the current channel list at runtime.
- Displays channel logos, country codes, online/offline state and provider-reported viewer counts when available.
- Searches and filters channels.
- Includes U.S.-only and favorites views.
- Loads the provider's documented player URL in an iframe.
- Fetches the combined sports-event feed and supports Soccer, NFL, NBA and NHL filtering.
- Does **not** scrape or extract hidden media URLs.
- Does **not** bundle, mirror or restream television content.

## Provider endpoints used

Channels:

```text
https://api.cdnlivetv.is/api/v1/channels/?user=cdnlivetv&plan=free
```

Sports:

```text
https://api.cdnlivetv.is/api/v1/events/sports/?user=cdnlivetv&plan=free
```

The application uses each returned `url` field as the iframe source, which matches the provider's published integration example.

Provider documentation: https://cdnlivetv.is/

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local HTTP server is recommended instead of opening `index.html` as a `file://` URL because browser cross-origin rules can differ for local files.

## GitHub Pages

A workflow is included at:

```text
.github/workflows/duh-tv-pages.yml
```

It deploys only the `duh-tv-web` folder.

Before public deployment, review the provider's current plan/domain rules and content rights applicable to your use. The provider's published free tier uses its standard ad-supported player and may apply domain restrictions.

## Hugging Face

The connected Hugging Face account was checked while packaging this project. The current connector session exposes read-oriented Hub access rather than repository-write access, so this branch is the source of truth. If you later create a Static HTML Space, the contents of `duh-tv-web/` are suitable as the starting static site.

## Important

This project is only a client interface. Availability, channel metadata, logos, event information and video playback are controlled by the third-party provider and can change without notice. Use only content and services you are authorized to access.
