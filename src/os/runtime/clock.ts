import { getOS, setOS } from './store'
import { media } from '../media/service'

/**
 * System clock — the heartbeat that advances simulated hardware:
 * media positions, thermostat convergence, device telemetry, cloud sync.
 */
let started = false
export function startClock() {
  if (started) return
  started = true
  let beats = 0
  setInterval(() => {
    beats++
    media.tick(1)
    const s = getOS()
    // thermostat converges 1° every 6s toward target
    if (beats % 6 === 0 && s.thermostat.mode !== 'OFF' && s.thermostat.indoor !== s.thermostat.target) {
      const dir = Math.sign(s.thermostat.target - s.thermostat.indoor)
      setOS({ thermostat: { ...s.thermostat, indoor: s.thermostat.indoor + dir } })
    }
    // telemetry jitter on this computer
    if (beats % 3 === 0) {
      setOS((st) => ({
        devices: st.devices.map((d) => {
          if (d.status !== 'online') return d
          if (d.id === 'relic-laptop' || d.id === 'relic-desktop') {
            const running = st.windows.filter((w) => w.deviceId === d.id).length
            const cpu = Math.min(0.92, Math.max(0.06, 0.12 + running * 0.07 + (Math.random() - 0.5) * 0.08))
            return { ...d, lastSeen: Date.now(), state: { ...d.state, cpu, memory: Math.min(0.9, 0.34 + running * 0.06) } }
          }
          return { ...d, lastSeen: Date.now() }
        }),
      }))
    }
    if (beats % 90 === 0 && s.cloud.status === 'connected') setOS((st) => ({ cloud: { ...st.cloud, lastSync: Date.now() } }))
  }, 1000)
}
