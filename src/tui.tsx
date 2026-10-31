import { Plugin } from "@opencode/plugin/tui"
import { Show, createMemo, createSignal } from "solid-js"
import { formatDistance, formatUTCClock, peakState, type Phase } from "./windows"

const PEAK_FG = "#FF4500"
const OFF_FG = "#3FB950"
const PROVIDER_ID = "deepseek"

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
          message: `Peak pricing started (2x) - ends ${formatUTCClock(state.boundaryAt)}`,
          variant: "warning",
        })
      }
      lastPhase = state.phase
    }, 1000)

    const PeakChip = () => {
      const state = createMemo(() => peakState(now()))
      const label = createMemo(() => {
        const isPeak = state().phase === "peak"
        const distance = formatDistance(state().boundaryAt.getTime() - now().getTime(), isPeak)
        return isPeak ? ` ⚡ peak ${distance} left ` : ` ⏳ peak in ${distance} `
      })
      return (
        <Show when={isDeepSeek()}>
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
