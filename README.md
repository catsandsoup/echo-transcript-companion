# EchoVideo transcript companion

Downloads available TXT and VTT lecture transcripts for the Sydney Canvas unit open in Chrome. It lives alongside Assignment Dates because the Mac app's Canvas API key does not authenticate the separate EchoVideo session.

## Install

1. In Chrome, open **Extensions → Manage Extensions**.
2. Enable **Developer mode**, choose **Load unpacked**, and select this `ChromeExtension` folder.
3. Reload the Canvas page. Keep this folder in place while the extension is installed.

## Download

1. Open a unit's **Recorded Lectures** class list. If a recording is already open, use Echo's **Back** button first.
2. Click **Lecture transcripts** at the bottom right, then **Scan this unit**.
3. Click **Download TXT + VTT**. Files are grouped under `Downloads/EchoVideo Transcripts/<unit> [section identifier]/`.

Names include the class date, class title, a stable media suffix and a save-attempt suffix. Split lectures and repeated titles remain distinct. A repeated publication of the same media produces one pair of files and retains all class references in the report.

**Pause** stops new work after the current browser save. **Resume** continues pending work, preserving saved files. **Retry missing / failed** retries failed, unavailable and uncertain items; check the folder before retrying an uncertain save. **Scan this unit** refreshes the available inventory and preserves completed outcomes for media still present. Use **Save report** for a local JSON inventory and per-file result.

Chrome may display Save dialogs depending on the browser's configuration. A file is counted as saved only when Chrome reports completion. Cancelling a dialog leaves a retryable failure. Keep the source unit open; if its frame or session disappears, reopen its class list and Resume. Only one unit downloads at a time. Progress survives extension/service-worker restarts; complete browser restarts can require reopening the unit and clicking Resume.

Keep the proposed filename in Save dialogs. A changed name or collision is flagged for retry; the report records the actual chosen path. Choosing another folder is supported, so check the report if a file is outside its proposed unit folder.

## Scope and privacy

- Sydney Canvas and Australian EchoVideo hosts only; no hardcoded course, section, lesson or media IDs.
- Requests run in the authenticated Echo frame. No API key, cookie-reading permission, credential copying, server, analytics or uploads.
- Chrome permissions: site access for Canvas/Echo, local storage for queue metadata, downloads for file saves/completion, alarms to continue a suspended queue.
- Transcript contents are held in memory while saving, not in extension storage. Local progress records contain class names and identifiers. Removing the extension removes this progress; downloaded files remain.
- Uses observed Echo UI endpoints, which can change. Unknown inventory shapes and continuation fields are reported explicitly. Empty, restricted, processing, missing-format and failed entries are not presented as downloaded.
- Never answers interactive questions or changes academic content. Only formats advertised by Echo's download metadata are requested; server access rules remain authoritative.
- Direct lesson launches without a current section link require returning to the class list. This prevents carrying a cached section into a different Canvas unit.
- Decoded inventory/transcript responses are limited to 12 MB each. Larger responses fail explicitly.
- The extension supports recursive embedded class lists, but live grouped/paginated sections have not been verified. A detected continuation produces an inventory warning rather than an unsupported completeness claim.

## Development and checks

No build step, packages, remote scripts or network test fixtures are needed.

```sh
node --test ChromeExtension/tests/*.test.mjs
```

The tests exercise inventory traversal, deduplication, filenames, opaque IDs, content validation, per-format completion, cancellation/recovery, retry limits, pause races and stale-unit protection. Live verification results are recorded in `VERIFICATION.md` after Chrome testing.

References: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [download API](https://developer.chrome.com/docs/extensions/reference/api/downloads), [service-worker lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [Echo transcript behavior](https://support.echo360.com/hc/en-us/articles/11077285975565-EchoVideo-Viewing-Media-Transcripts).
