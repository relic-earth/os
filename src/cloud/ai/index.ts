import { cloudAvailable } from '../api'

/** cloud.ai — hosted model access used by the Claude Gateway (MOCK status). */
export const cloudAi = {
  available: () => cloudAvailable(),
  region: () => 'US-WEST · ZERO RETENTION',
}
