# EchoVideo transcript companion

Downloads available TXT and VTT lecture transcripts for the Sydney Canvas unit open in Chrome. A standalone Chrome companion for [Assignment Dates](https://github.com/catsandsoup/whenaremyassignmentsdue_mac). It uses the authenticated EchoVideo browser session.

## Install

Download the extension ZIP from [Releases](https://github.com/catsandsoup/echo-transcript-companion/releases/latest), unzip it, then follow these steps. The repository folder can also be used directly.

1. In Chrome, open **Extensions → Manage Extensions**.
2. Enable **Developer mode**, choose **Load unpacked**, and select this repository’s folder (the folder containing `manifest.json`).
3. Reload the Canvas page. Keep this folder in place while the extension is installed.

## Download

1. Open a unit's **Recorded Lectures** class list. If a recording is already open, use Echo's **Back** button first.
2. Click **Lecture transcripts** at the bottom right, then **Scan this unit**.
3. For automatic saving, turn off Chrome **Settings → Downloads → Ask where to save each file before downloading**. This is a Chrome-wide preference.
4. Click **Download TXT + VTT**. Files are grouped under `Downloads/EchoVideo Transcripts/<unit> [section identifier]/`.

Names include the class date, class title, a stable media suffix and a save-attempt suffix. Split lectures and repeated titles remain distinct. A repeated publication of the same media produces one pair of files and retains all class references in the report.

**Pause** stops new work after the current browser save. **Resume** continues pending work, preserving saved files. **Retry missing / failed** retries deleted/moved, failed, unavailable and uncertain items; check the folder before retrying an uncertain save. **Scan this unit** refreshes the available inventory and preserves completed outcomes for media still present. **Open folder** reveals a saved transcript inside this unit’s folder in Finder. It becomes available after the first successful save. Use **Save report** for a local JSON inventory and per-file result.

Chrome’s **Ask where to save each file** setting can still request dialogs even with the extension’s `saveAs:false`. Turn it off for unattended batches. A file is counted as saved only when Chrome reports completion. Cancelling a dialog leaves a retryable failure. Keep the source unit open; if its frame or session disappears, reopen its class list and Resume. Only one unit downloads at a time. Progress survives extension/service-worker restarts; complete browser restarts can require reopening the unit and clicking Resume.

Keep the proposed filename in Save dialogs. A changed name or collision is flagged for retry; the report records the actual chosen path. Saving outside the proposed unit folder is flagged as failed so it can be retried into the correct folder.

## Deleted or moved files

The panel rechecks completed download IDs while open and before scanning, retrying or opening the folder. Chrome’s `exists` value is cached; its asynchronous deletion checks can take about ten seconds. **Check saved files** requests a check, and the panel keeps polling for updates. A detected deletion changes the format to **Missing**, lowers the saved count and enables **Retry missing / failed**. Intact completed files are retained.

Clearing download history makes those saves **uncertain**, because Chrome can no longer verify their location. Check the folder before retrying to avoid duplicates. Checks confirm Chrome’s recorded file existence, not current file contents or a cryptographic integrity audit.

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
- Release ZIPs contain only extension code and installation documentation, with no saved Canvas data, transcripts, screenshots or browser profile information. Packages use an explicit file list and include a SHA-256 checksum.

## Development and checks

No build step, packages, remote scripts or network test fixtures are needed.

```sh
node --test tests/*.test.mjs
```

The tests exercise inventory traversal, deduplication, filenames, opaque IDs, content validation, per-format completion, cancellation/recovery, retry limits, pause races and stale-unit protection. Live verification results are recorded in `VERIFICATION.md` after Chrome testing.

To build an installable release ZIP, run `python3 scripts/package-release.py --output dist`. Packaging rejects common private-data patterns and includes only the declared extension files. Review changes before publishing; pattern checks supplement review.

References: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [download API](https://developer.chrome.com/docs/extensions/reference/api/downloads), [service-worker lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [Echo transcript behavior](https://support.echo360.com/hc/en-us/articles/11077285975565-EchoVideo-Viewing-Media-Transcripts).
