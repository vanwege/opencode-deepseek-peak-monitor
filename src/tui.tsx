import { Plugin } from "@opencode/plugin/tui"
import { Show, createMemo, createSignal } from "solid-js"
import { formatDistance, peakState, type Phase } from "./windows"

const PEAK_FG = "#FF4500"
const OFF_FG = "#3FB950"
const PROVIDER_ID = "deepseek"

function utcClock(date: Date): string {
  const hh = date.getUTCHours().toString().padStart(2, "0")
  const mm = date.getUTCMinutes().toString().padStart(2, "0")
  return `${hh}:${mm} UTC`
}

export default Plugin.define({
  id: "deepseek-peak",
  setup(context) {
    const [now, setNow] = createSignal(new Date())
    let lastPhase: Phase = peakState(new Date()).phase

    function isDeepSeek(): boolean {
      return context.ui.model.current()?.providerID === PROVIDER_ID
    }

    const timer = setInterval(() => {
      const current = new Date()
      setNow(current)
      const state = peakState(current)
      if (lastPhase !== "peak" && state.phase === "peak" && isDeepSeek()) {
        context.ui.toast.show({
          title: "DeepSeek",
          message: `Peak pricing started (2x) - ends ${utcClock(state.boundaryAt)}`,
          variant: "warning",
        })
      }
      lastPhase = state.phase
    }, 1000)

    const PeakChip = () => {
      const selected = createMemo(() => context.ui.model.current())
      const state = createMemo(() => peakState(now()))
      const label = createMemo(() => {
        const distance = formatDistance(state().boundaryAt.getTime() - now().getTime())
        return state().phase === "peak" ? ` ⚡ peak ${distance} left ` : ` ⏳ peak in ${distance} `
      })
      return (
        <Show when={selected()?.providerID === PROVIDER_ID}>
          <text fg={state().phase === "peak" ? PEAK_FG : OFF_FG}>{label()}</text>
        </Show>
      )
    }

    const unregister = context.ui.slot({
      append: "prompt.footer.status",
      render: () => <PeakChip />,
    })

    return () => {
      clearInterval(timer)
      unregister()
    }
  },
})
