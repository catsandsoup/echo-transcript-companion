# Development

The extension uses vanilla JavaScript ES modules and Chrome Manifest V3. No package installation, remote scripts or build step is needed to load the source folder in Chrome.

## Run checks

```sh
node --test tests/*.test.mjs
```

The 24 tests cover inventory traversal, deduplication, filenames, opaque identifiers, transcript validation, per-format completion, worker recovery, retry limits, pause/retry races and stale-unit protection. Tests use synthetic fixtures. See [verification](../VERIFICATION.md) for the exact live checks and boundaries.

## Build a release

```sh
python3 scripts/package-release.py --output dist
```

The packager uses an explicit runtime/documentation allowlist, checks common private-data patterns and writes a deterministic ZIP plus SHA-256 checksum. Review source changes before publication; pattern checks supplement review.

## Reproduce product screenshots

Serve this repository on localhost and open `docs/demo/index.html`. It imports the production `canvas-content.js` and uses synthetic queue fixtures. The preview selector provides ready, downloading, complete and missing-file states. It makes no Canvas requests and saves no transcripts.

Capture the rendered page, inspect it, and label images as demo data. Never use a signed-in account screenshot or exported report as a marketing fixture. [Reusable GitHub content guide](GITHUB-CONTENT-GUIDE.md)

## Repository structure

- `background.mjs`, `queue.mjs`: persistent queue and Chrome download handling.
- `core.mjs`: inventory parsing, filename generation and content validation.
- `echo-content.js`: authenticated, scoped EchoVideo frame requests.
- `canvas-content.js`, `popup.*`: user controls.
- `tests/`: synthetic regression tests.
- `docs/demo/`, `docs/images/`: fictional product demonstration and captures.

Works independently or alongside [Assignment Dates](https://github.com/catsandsoup/whenaremyassignmentsdue_mac). Native Mac app test results belong to that project; they are not extension verification.
