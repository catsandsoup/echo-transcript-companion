# Verification — 17 November 2026

## Automated checks

`node --test ChromeExtension/tests/*.test.mjs`: 24 passing tests in version 1.1.0. Regression cases were observed failing before fixing stale section inheritance, bracket-prefixed TXT rejection, scan/Resume replacement, path traversal identifiers, renamed-save collisions and the completed-unit status after switching units.

The Mac app's full `./test.sh` also completed successfully. It emits existing Security framework deprecation warnings. The persistence suite deliberately exercises a failed-save path and then passes its recovery assertions. No live API key was read or modified.

## Version 1.1.0 follow-up

The initial implementation only reconciled completed downloads on worker recovery. A panel refresh returned stored completion states indefinitely. Version 1.1.0 rechecks complete tasks while the panel is open and handles asynchronous `exists:false` and history-erasure events, including events racing an in-flight search. Missing files reduce the saved count and become explicitly retryable. Rescans preserve extant files and queue missing formats.

New synthetic tests cover deletion without restart, delayed cached search results, history erasure, retry/search interleavings, wrong-folder saves and the Open folder target. A background integration test invokes the real message/event listeners against mocked Chrome APIs; it verifies STATE, SCAN, onChanged and onErased behavior without implicit downloads. The deletion and race regressions were observed failing before their fixes.

Chrome's **Settings → Downloads → Ask where to save each file before downloading** was on. Turning it off allowed the existing `saveAs:false` requests to save automatically. This is a Chrome-wide preference changed through native UI for the user's requested unattended downloads; the extension itself does not alter preferences.

Live checks with version 1.1.0:

- A complete 16-recording batch saved both formats into its unit folder without any Save dialog.
- Open folder opened that exact unit folder in Finder and selected a transcript.
- Moved one newly downloaded TXT/VTT pair to the Bin using Finder. Without restarting Chrome or the extension, the panel changed from 32 saved to 30 saved / 2 missing. Retry restored both without replacing or duplicating the other files.
- Moved all 32 transcripts to the Bin. The panel changed to 0 saved / 32 missing; Open folder was disabled until a file was saved again. Retried the full unit automatically.
- Deletion is asynchronous: Chrome's search initially returned cached positive existence, then its deletion events updated the panel. The UI documents the approximate ten-second detection delay.
- The final restored batch was validated independently on disk: 32 unique files in one unit folder, expected byte lengths, nonempty UTF-8, and valid WebVTT headers/timestamps. The Chrome control connection became intermittent after the full restore, so final full-batch validation used the filesystem; the earlier pair retry and both deletion counts were observed on screen.
- Test deletions remain recoverable in the Bin. No Trash emptying or credential access occurred.

## Initial live Chrome checks

- Loaded the unpacked extension through Chrome's native extension controls.
- Unit A: 16 classes, 16 accessible recordings, 32 requested TXT/VTT files. Unit B: 13 classes, 13 accessible recordings, 26 requested files. Both finished with every listed format saved.
- Retrieved metadata and file content from the authenticated cross-origin Echo frame, while the Canvas top-level URL remained the unit's external-tool URL.
- Checked saved files locally for nonempty text, valid WebVTT headers/timestamps, distinct media/format pairs and expected byte lengths. Live records and exported reports are outside this repository.
- Cancelled a VTT Save dialog. It became a failed file with Chrome's USER_CANCELED result. Retry fetched and saved that format without repeating the completed TXT.
- Paused after four completed files, reloaded the extension and Canvas, confirmed persisted progress, then resumed at the next pending file.
- Detected a native Save dialog filename collision during filesystem verification. Added regression coverage, reloaded, observed both affected files marked failed, and repaired them through Retry. The conflicting test copy was retained separately, not deleted.
- Switched units in the same Canvas tab; the second unit showed its own inventory and queue. Returned to the original unit with its completed progress preserved.
- Tested the toolbar popup's Open transcript panel action and Escape dismissal returning focus to the launcher. Inspected wrapping, scrolling, text labels and visible progress in the native Chrome window. No blanket accessibility certification is claimed.
- Verified report export uses JSON MIME/type and a `.json` filename.

## Boundaries

Chrome can request Save dialogs if its profile preference is enabled, even with `saveAs:false`. The preference was disabled during follow-up testing. Files outside their unit folder, renamed files that lose their unique name, and path collisions are reported as failed. Chrome's existence information is cached and is not an immediate filesystem integrity audit. Clearing download history produces an uncertain state because the file may still exist.

Grouped/paginated sections, forced sign-out, actual Chrome process termination mid-save, interactive poll gates, and 12 MB+ responses were not exercised live. Relevant synthetic tests cover supported failure handling, but the implementation does not claim universal Echo endpoint compatibility. For an initial direct lesson view without a section link, return to Echo's class list before scanning.
