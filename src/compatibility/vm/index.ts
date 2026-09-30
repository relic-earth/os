import type { RuntimeBackend } from '../types'

/** SIMULATED Windows virtual machine backend (KVM guest in a real build). */
export const windowsVmBackend: RuntimeBackend = {
  id: 'vm',
  label: 'WINDOWS VIRTUAL MACHINE',
  platform: 'WINDOWS',
  describe: () => ({ prefix: 'relic-vm://win11-guest', translation: 'VIRTIO-GPU · PER-WINDOW SURFACE', gpu: 'ACCELERATED' }),
  stages: () => [
    { key: 'vm', label: 'VIRTUAL MACHINE', ms: 900 },
    { key: 'gpu', label: 'GPU', ms: 600 },
    { key: 'files', label: 'FILES', ms: 400 },
    { key: 'display', label: 'DISPLAY', ms: 500 },
  ],
}

/** SIMULATED remote Windows host, streamed per window. */
export const remoteWindowsBackend: RuntimeBackend = {
  id: 'remote',
  label: 'REMOTE WINDOWS',
  platform: 'WINDOWS',
  describe: () => ({ prefix: 'relic-cloud://win-host-02', translation: 'REMOTE APP STREAM · AV1', gpu: 'ACCELERATED' }),
  stages: () => [
    { key: 'link', label: 'SECURE LINK', ms: 700 },
    { key: 'gpu', label: 'GPU', ms: 500 },
    { key: 'files', label: 'FILES', ms: 500 },
    { key: 'display', label: 'DISPLAY', ms: 500 },
  ],
}
