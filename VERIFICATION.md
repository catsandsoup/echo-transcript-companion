# Verification — 17 November 2026

## Automated checks

`node --test ChromeExtension/tests/*.test.mjs`: 16 passing tests. Regression cases were observed failing before fixing stale section inheritance, bracket-prefixed TXT rejection, scan/Resume replacement, path traversal identifiers, renamed-save collisions and the completed-unit status after switching units.

The Mac app's full `./test.sh` also completed successfully. It emits existing Security framework deprecation warnings. The persistence suite deliberately exercises a failed-save path and then passes its recovery assertions. No live API key was read or modified.

## Live Chrome checks

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

Chrome displayed native Save dialogs in this setup despite `saveAs:false`; these were handled during testing. The extension does not change browser download/security preferences. A user-selected Save location can differ from the proposed unit folder; the report records the actual file path. A renamed file that loses its unique name or collides with another queued file is reported as failed.

Grouped/paginated sections, forced sign-out, actual Chrome process termination mid-save, interactive poll gates, and 12 MB+ responses were not exercised live. Relevant synthetic tests cover supported failure handling, but the implementation does not claim universal Echo endpoint compatibility. For an initial direct lesson view without a section link, return to Echo's class list before scanning.
