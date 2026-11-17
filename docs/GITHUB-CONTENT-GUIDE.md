# A GitHub page people can understand and use

This guide turns a working tool into a clear project page. It is based on GitHub’s documentation, web-reading research, and a comparison of established extension repositories. The recommendations below are an editorial application of those sources, not evidence that a particular layout increases downloads.

## Start with the visitor’s decision

A new visitor needs to answer five questions:

1. What does this do for me?
2. Does it work in my situation?
3. Can I see what I will get?
4. How do I install and use it?
5. What should I know before trusting it?

GitHub describes a README as the place to explain the project’s purpose, usefulness, getting started and help. Put those answers before architecture and development history. [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)

For Echo Transcript Companion, the audience is a student using Sydney Canvas and Chrome on macOS. The primary action is downloading the extension. The outcome is a usable collection of lecture transcripts, organised by unit.

## Write the first screen as a product introduction

Use this sequence:

- **Name:** descriptive enough to identify the tool.
- **Promise:** one concrete sentence about the user’s outcome.
- **Scope:** browser, platform and supported service.
- **Primary action:** a plainly labelled download link.
- **Product image:** readable UI showing the promised task.

Example:

> **Save your lecture transcripts for offline study.**
>
> Download available EchoVideo transcripts from the Canvas unit you have open as TXT and VTT files, organised into a folder for that unit.
>
> Chrome on macOS · University of Sydney Canvas · Australian EchoVideo
>
> **Download for Chrome (.zip)**

“Available” matters: the extension cannot promise transcripts that EchoVideo does not offer. Avoid universal claims, invented time savings, testimonials, user counts or security certifications.

## Turn implementation into a benefit

| Internal detail | User-facing explanation |
|---|---|
| Persistent per-section queue | Pause a batch and resume pending downloads. |
| Chrome download reconciliation | See which files saved and which need attention. |
| Per-format tasks | Save TXT and VTT together. |
| Stable media suffixes | Keep recordings with similar titles distinct. |
| Download reveal API | Find a saved transcript in Finder. |
| Asynchronous existence checks | Deleted files become Missing after Chrome notices their removal. |

Use the benefit on the main page. Put the mechanism in technical documentation when it explains a useful limit.

NN/g’s web-reading research supports concise text, descriptive headings and scannable structure, and cautions against exaggerated promotional language. This is a reason to be clear and factual, not to add marketing adjectives. [NN/g: How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/)

## Give each document a job

| Surface | What belongs there |
|---|---|
| Repository About | One sentence describing the user outcome and supported service. |
| README | Promise, screenshot, three key benefits, quick start, scope and help. |
| INSTALL | Exact download asset, unpacking, loading, first successful action, updating. |
| Troubleshooting | Problems phrased as users experience them, followed by the next action. |
| Privacy | Data flows, local storage, permissions and relevant limitations. |
| Development / verification | Architecture, commands, test evidence and unverified cases. |
| Release page | What this version helps users do, the correct asset and install link. |

A release description should stand alone. Visitors can arrive directly from a shared release link without reading the repository first. Keep test chronology and packaging internals behind links.

## Make screenshots answer a question

Give every image one purpose:

| Image | Question it answers | Capture |
|---|---|---|
| Main panel | What does the tool look like? | Scan summary, formats and primary action. |
| Progress | Can I stop and continue? | Saved count and enabled Pause control. |
| Missing files | What happens if files disappear? | Lower saved count and available Retry action. |
| Installation detail, if needed | Which control or folder should I choose? | Tight capture of Developer mode / Load unpacked or `manifest.json`. |

Capture the actual current interface. Use fictional fixtures, not live academic records with a blur added afterwards. Label synthetic demonstrations visibly and in the caption. Keep names, avatars, email addresses, course IDs, lecture titles, bookmarks, unrelated tabs and local user paths out of the source scene.

For this project, `docs/demo/` renders the real production panel with fictional records. Its surrounding page is explicitly a demo, not Canvas. Demo interactions illustrate UI states; they are not new live network or download verification.

Prefer one useful screenshot near the top to a long gallery. Put supporting images next to the relevant instructions. Check that controls are legible at the width GitHub displays them. Supply alt text that explains what the image demonstrates, and keep essential instructions in selectable text. [W3C: Informative Images](https://www.w3.org/WAI/tutorials/images/informative/)

Store repository images with relative Markdown paths so GitHub resolves them with the branch. [GitHub: Relative links and image paths](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes#relative-links-and-image-paths-in-markdown-files)

## Tell the truth about installation

Do not label a developer-mode ZIP as “one-click install” or imply a Chrome Web Store listing. Name the exact install asset, distinguish it from automatically generated source archives, and show the folder containing `manifest.json`.

Chrome’s documented local installation is Extensions → Developer mode → Load unpacked → select the extension directory. Content-script updates also require reloading the host page. [Chrome: Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

Give the first successful task immediately after installation. For this tool, that is Recorded Lectures → Scan this unit → Download TXT + VTT. Mention the global Chrome download preference before an unattended batch.

## Use the rest of GitHub deliberately

- **Description:** “Save EchoVideo lecture transcripts from Sydney Canvas as TXT and VTT, organised by unit, with progress and resume.”
- **Topics:** a few accurate service and task terms, such as `chrome-extension`, `canvas-lms`, `echo360`, `echovideo`, `transcripts` and `webvtt`. Topics help categorise a repository; they do not make a private repository publicly visible. [GitHub: Repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- **Social preview:** a separate image for a shared repository link, rather than a screenshot dump. GitHub recommends 1280 × 640 pixels for best display, under 1 MB. Keep the title and outcome readable. Public sharing depends on repository visibility; this repository remains private. [GitHub: Social previews](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- **Badges:** use only helpful, accurate status signals. Do not imply a license, build pipeline, store listing or adoption count that does not exist.

## Useful examples, with limits

- [Refined GitHub](https://github.com/refined-github/refined-github): clear browser install options and feature-specific visual examples. Useful lesson: connect each image to a visible improvement.
- [SponsorBlock](https://github.com/ajayyy/SponsorBlock): prominent platform download links and a brief description of the main task. Useful lesson: make the next action obvious.
- [Buzz](https://github.com/chidiwilliams/buzz): a concrete transcription outcome, supported export formats and installation organised by platform. Useful lesson: connect capability to the visitor’s environment.

These are qualitative references, not a template to copy wholesale or proof that stars were caused by README design.

## Before publishing

Read the first screen without scrolling. The purpose, compatibility and download should be clear. Follow the install path as a new user. Check every link and image. Inspect screenshots and metadata for private information. Keep limitations close to the decision they affect. Preserve detailed engineering evidence in linked documentation instead of the main narrative.
