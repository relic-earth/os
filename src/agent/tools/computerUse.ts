import { getOS, setOS, sleep } from '../../os/runtime/store'
import { logEvent, notifications } from '../../os/notifications/service'

/**
 * COMPUTER USE
 *
 * For applications with no native Relic API, Claude can operate the app the
 * way a person would: screenshot → reason → mouse / keyboard. The driver below
 * is a SIMULATION that animates an overlay on the app window and applies the
 * resulting state change to the app session. A production driver implements
 * the same interface against the compositor (screen capture + virtual input
 * device scoped to one window) and the Claude computer-use tool.
 */
export interface ComputerUseDriver {
  connect(windowId: string): Promise<{ screen: boolean; mouse: boolean; keyboard: boolean }>
  screenshot(): Promise<void>
  moveTo(x: number, y: number, label?: string, box?: { w: number; h: number }): Promise<void>
  click(): Promise<void>
  type(text: string): Promise<void>
  disconnect(): void
}

const log = (line: string) => setOS((s) => ({ computerUse: s.computerUse && { ...s.computerUse, log: [...s.computerUse.log, line] } }))

export const simulatedDriver: ComputerUseDriver = {
  async connect(windowId) {
    const w = getOS().windows.find((x) => x.id === windowId)
    setOS({ computerUse: { windowId, appId: w?.appId ?? '', phase: 'connecting', cursor: { x: 50, y: 50 }, log: [], task: '' } })
    await sleep(900)
    setOS((s) => ({ computerUse: s.computerUse && { ...s.computerUse, phase: 'active' } }))
    return { screen: true, mouse: true, keyboard: true }
  },
  async screenshot() {
    log('SCREENSHOT · 2560 × 1440')
    await sleep(650)
  },
  async moveTo(x, y, label, box) {
    setOS((s) => ({
      computerUse: s.computerUse && {
        ...s.computerUse,
        cursor: { x, y },
        target: label ? { x, y, w: box?.w ?? 8, h: box?.h ?? 4, label } : undefined,
      },
    }))
    if (label) log(`MOVE → ${label}`)
    await sleep(700)
  },
  async click() {
    log('CLICK')
    await sleep(380)
  },
  async type(text) {
    log(`TYPE “${text}”`)
    await sleep(600)
  },
  disconnect() {
    setOS((s) => ({ computerUse: s.computerUse && { ...s.computerUse, phase: 'done', target: undefined } }))
    setTimeout(() => setOS((s) => (s.computerUse?.phase === 'done' ? { computerUse: null } : {})), 2600)
  },
}

/** Scripted task used by the prototype: raise exposure on the open Photoshop document. */
export async function runComputerUseTask(windowId: string, task: string, driver: ComputerUseDriver = simulatedDriver) {
  await driver.connect(windowId)
  setOS((s) => ({ computerUse: s.computerUse && { ...s.computerUse, task } }))
  await driver.screenshot()
  await driver.moveTo(16, 3.2, 'MENU · IMAGE', { w: 5, h: 3 })
  await driver.click()
  await driver.moveTo(20, 12, 'ADJUSTMENTS', { w: 12, h: 3 })
  await driver.click()
  await driver.moveTo(35, 17, 'EXPOSURE…', { w: 10, h: 3 })
  await driver.click()
  await driver.screenshot()
  await driver.moveTo(50, 48, 'EXPOSURE FIELD', { w: 14, h: 4 })
  await driver.type('+0.60')
  await driver.moveTo(58, 62, 'OK', { w: 6, h: 4 })
  await driver.click()
  const w = getOS().windows.find((x) => x.id === windowId)
  if (w?.sessionId) {
    setOS((s) => ({
      sessions: s.sessions.map((x) => (x.id === w.sessionId ? { ...x, state: { ...x.state, exposure: 0.6 } } : x)),
    }))
  }
  await driver.screenshot()
  log('VERIFIED · EXPOSURE +0.60')
  driver.disconnect()
  logEvent('agent', `Computer use on ${w?.title}: ${task}`)
  notifications.push({ source: 'CLAUDE · COMPUTER USE', title: 'TASK COMPLETE', body: task, icon: 'mouse' })
}
