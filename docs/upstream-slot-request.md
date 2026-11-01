## Summary

TUI plugins cannot render anything on the prompt composer's model line (the `agent · model provider · variant` row beneath the input). No published slot path covers it — every `prompt.footer*` placement lands on or below the footer row (cwd/branch, context %, keybind hints), so a provider-specific status chip can't sit next to the model selector.

## Environment

- opencode version: v2.2.5
- OS: Linux x64 (Fedora, 7.2.13-200)
- Terminal: xterm-256color, truecolor
- Shell: /bin/bash
- Install/channel: npm `@opencode/cli`, latest (release)
- Active plugins: one local TUI plugin (the chip this motivates); repro below is self-contained

## Reproduction

1. Write a minimal TUI plugin that registers a distinct `<text>` marker at every published placement: `append`/`prepend` on `prompt.footer`, `prompt.footer.status`, `prompt.footer.file`; `before`/`after` on `prompt.footer.status`, `prompt.footer.file`, and `prompt.footer`; and `append`/`prepend` on `session.composer.top`.
2. Open the TUI and look at the composer.
3. Every marker renders on or below the bottom footer row. The model line is not reachable from any slot. (`session.composer.top` additionally renders no contributions on the home route.)

## Expected Behavior

Plugins should be able to render inline on the model line — e.g. an additional slot path (`prompt.footer.model`, publishing the existing `PromptFooterInput`) or another documented anchor at that row. Per-model status is only glanceable next to the model itself: a DeepSeek-style peak-billing clock (2× during fixed UTC windows) belongs beside the model/variant label, and the same holds for cost/rate-limit chips, context pressure, and subscription warnings.

## Actual Behavior

The model line is plain host JSX with no slot path; its text renderables carry no id, and host renderables are explicitly not part of the plugin API. The only way to place anything there today is unsupported scene-graph traversal. Meanwhile all `prompt.footer*` slots compose below the composer's bottom border, and `session.composer.top` is above the input.

## Additional Context

Proposed change (additive, small): expose the model row as a slot path — e.g. `prompt.footer.model` with the same input as the other `prompt.footer.*` slots — mirroring how `prompt.footer.file` and `prompt.footer.status` are already exposed inside the same row group. Happy to open a PR if you'd like it and can point me at the right spot.
