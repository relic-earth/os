import { cloudCall } from '../api'

/** cloud.storage — encrypted object storage for sync + backup (MOCK). */
export const cloudStorage = {
  usage: () => ({ usedTB: 0.84, totalTB: 2, objects: 184_220, encryption: 'E2E · XCHACHA20' }),
  put: (key: string) => cloudCall(() => ({ key, etag: Math.random().toString(16).slice(2, 10) })),
}
