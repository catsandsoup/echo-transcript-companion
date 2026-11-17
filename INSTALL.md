# Install EchoVideo Transcript Companion

1. Download `EchoTranscriptCompanion-v1.1.0.zip` from this release.
2. Unzip it and keep the `EchoTranscriptCompanion` folder in a permanent location.
3. In Chrome, open **Extensions → Manage Extensions** and enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Reload your Canvas tab. Open a unit’s **Recorded Lectures** class list.
6. Open **Lecture transcripts**, select **Scan this unit**, then **Download TXT + VTT**.

For automatic saving, turn off **Chrome Settings → Downloads → Ask where to save each file before downloading**. This preference applies to all Chrome downloads.

Both formats save under `Downloads/EchoVideo Transcripts/<unit>/`. **Open folder** opens the unit folder in Finder. Pause, Resume and Retry preserve completed files. Deleted or moved files become **Missing** after Chrome detects their removal; this may take about ten seconds while the panel is open.

This is an unpacked Chrome extension ZIP, with no Chrome Web Store installation or automatic update service. Keep the extracted folder in place while the extension is installed.

## Privacy

The release contains extension code and documentation only. It contains no Canvas account data, course inventories, lecture transcripts, screenshots, download reports, cookies, API keys or browser profile data.

When used, the extension reads the unit open in your authenticated Canvas/EchoVideo tab. Progress and class metadata stay in local extension storage; transcript files stay on your computer. There is no analytics service or content upload.

Supports University of Sydney Canvas and Australian EchoVideo hosts. EchoVideo endpoints and institutional settings can change.
