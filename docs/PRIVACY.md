# Privacy, permissions and compatibility

## What stays local

The extension runs read-only requests inside the EchoVideo frame you are already signed into. It does not read the Mac app’s Canvas API key, extract cookies, operate a server, collect analytics or upload transcripts.

Queue progress and class metadata are stored in Chrome’s local extension storage. Transcript contents are held in memory while saving and are not retained in extension storage. Downloaded transcripts and optional JSON reports stay on your computer. Reports can contain private class names, identifiers and local file paths.

Removing the extension removes its local progress. Downloaded files remain.

## Why these permissions are needed

| Permission | Purpose |
|---|---|
| Sydney Canvas and Australian EchoVideo site access | Show the panel and request transcripts through the authenticated EchoVideo frame. |
| Storage | Retain local progress and recording metadata for resume/retry. |
| Downloads | Save files, check their Chrome download status and reveal a saved file in Finder. |
| Alarms | Continue queue work when Chrome wakes the extension’s background worker. |

## What the release contains

Install ZIPs use an explicit file list: extension runtime and documentation only. They do not contain Canvas account data, saved queues, course inventories, lecture transcripts, screenshots, reports, credentials or browser profile data. A SHA-256 checksum accompanies the published ZIP.

Repository product images are captured from the actual extension panel running against fictional fixtures. They are labelled as demos and have no personal Canvas information.

## Compatibility and limits

- University of Sydney Canvas and Australian EchoVideo hosts; Chrome on macOS was tested live.
- No hardcoded user course, section, lesson or media identifiers.
- Only formats advertised by EchoVideo are requested. Server restrictions remain authoritative.
- Direct recording launches without section context require returning to the class list.
- Decoded inventory and transcript responses have a 12 MB limit. Larger responses fail explicitly.
- Embedded nested class lists are supported by the parser; live grouped/paginated lists remain unverified. Scan warnings mean completeness is not confirmed.
- EchoVideo UI endpoints can change. This independent project is not endorsed by the University, Canvas or EchoVideo.

[Verification details](../VERIFICATION.md) · [Troubleshooting](TROUBLESHOOTING.md)
