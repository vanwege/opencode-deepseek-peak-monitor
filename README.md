# opencode-deepseek-peak

A TUI-only [OpenCode](https://opencode.ai) plugin that puts a DeepSeek
peak-pricing countdown in the prompt footer, right of the model/reasoning
status items.

While a model from the **official `deepseek` provider** is selected:

- **Peak window** — `⚡ peak 2h 31m left` in **red-orange** (`#FF4500`).
  Ticks in seconds (`⚡ peak 9m 59s left`) during the final 10 minutes.
- **Off-peak** — `⏳ peak in 5h 12m` in **green** (`#3FB950`), abbreviated to
  `⏳ peak in 2d 13h` once the next peak is more than 48h out.
- When peak **starts** while a DeepSeek model is selected, a warning toast
  reports when it ends (e.g. `ends 04:00 UTC`).

The chip hides instantly for any other provider (including OpenRouter-served
DeepSeek models or self-hosted ones, where DeepSeek billing does not apply).

## Schedule

Hardcoded from the official DeepSeek pricing footnote (effective 2026-08-16):

| | UTC |
|---|---|
| Peak (2x) | 01:00–04:00 and 06:00–10:00, Monday–Friday |
| Off-peak (½x) | everything else, incl. all weekend |

Purely clock-based: no API calls, local timezone never involved. Chinese
public-holiday exemptions are **not** modeled — the schedule follows the
official UTC weekday rule.

## Install

```sh
opencode plugin add github:vanwege/opencode-deepseek-peak-monitor
```

This installs the package from GitHub and registers it in your **global**
`~/.config/opencode/cli.json`, which is where a TUI-only plugin belongs:

```jsonc
{
  "plugins": ["github:vanwege/opencode-deepseek-peak-monitor"]
}
```

The TUI watches `cli.json`; run `/reload` (or start a new TUI) to load it.

## Development

```sh
npm install     # dev deps only; the plugin itself loads from source
npm test        # node --test on the pure schedule logic (test/windows.test.ts)
npm run typecheck
```

`src/windows.ts` is dependency-free (peak windows, boundary search, countdown
formatting); `src/tui.tsx` is the plugin: it claims the `prompt.footer.status`
slot and reads the selected model via `context.ui.model.current()`.

## Placement limitation

No published slot reaches the prompt's model line, so the chip sits in the
footer row instead of beside the model selector. Every published slot path
(`app`, `home.footer`, `prompt.footer*`, `session.composer.top`, `sidebar.*`,
`session.panel`) lands elsewhere; upvote
[anomalyco/opencode#61390](https://github.com/anomalyco/opencode/issues/61390)
to ask OpenCode for a slot on the model row itself.

## License

MIT — see [LICENSE](LICENSE).
