import type { ToolDefinition } from '../../sdk/types'

/**
 * Claude system tools. Each tool is a typed contract with a risk level; the
 * executor (./executor.ts) runs it against the Relic Runtime and the policy
 * layer (../policies) decides whether the user must confirm first.
 */
type S = ToolDefinition['input_schema']['properties']
const obj = (properties: S, required: string[] = []) => ({ type: 'object' as const, properties, required })
const str = (description: string, e?: string[]) => ({ type: 'string', description, ...(e ? { enum: e } : {}) })
const num = (description: string) => ({ type: 'number', description })

type I = Record<string, unknown>
const s = (v: unknown) => String(v ?? '')
const dev = (v: unknown) => s(v).replace(/^relic-/, 'Relic ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Tv', 'TV')

export const toolDefinitions: ToolDefinition<I>[] = [
  // READ
  { name: 'search_files', risk: 'read', description: 'Search the Relic file system by name, path and tags. Returns newest-first matches.', input_schema: obj({ query: str('Search terms'), recent: { type: 'boolean', description: 'Return recently opened files instead' } }), label: (i) => (i.recent ? 'Reading recent files' : 'Searching Files') },
  { name: 'read_file', risk: 'read', description: 'Read a file’s metadata and extracted text.', input_schema: obj({ file_id: str('File id') }, ['file_id']), label: () => 'Reading document' },
  { name: 'list_devices', risk: 'read', description: 'List devices on the Relic mesh, optionally filtered by capability or status.', input_schema: obj({ capability: str('Capability filter, e.g. large-display, gps, climate'), status: str('Status filter', ['online', 'offline']) }), label: () => 'Querying device mesh' },

  // LOW RISK
  { name: 'open_app', risk: 'low', description: 'Open an installed application on this device.', input_schema: obj({ app_id: str('Application id') }, ['app_id']), label: (i) => `Opening ${s(i.app_id)}` },
  { name: 'close_app', risk: 'low', description: 'Close an application’s windows on this device.', input_schema: obj({ app_id: str('Application id') }, ['app_id']), label: (i) => `Closing ${s(i.app_id)}` },
  { name: 'launch_windows_app', risk: 'low', description: 'Launch a Windows application through the Relic compatibility layer.', input_schema: obj({ app_id: str('Application id'), mode: str('Compatibility backend', ['wine', 'vm', 'remote']) }, ['app_id']), label: (i) => `Launching ${s(i.app_id)} via compatibility layer` },
  { name: 'open_file', risk: 'low', description: 'Open a file in its default application and reveal it in Files.', input_schema: obj({ file_id: str('File id') }, ['file_id']), label: () => 'Opening file' },
  { name: 'move_file', risk: 'low', description: 'Move a file to a folder.', input_schema: obj({ file_id: str('File id'), folder: str('Destination folder name') }, ['file_id', 'folder']), label: (i) => `Moving to ${s(i.folder)}` },
  { name: 'copy_file', risk: 'low', description: 'Copy a file to a folder.', input_schema: obj({ file_id: str('File id'), folder: str('Destination folder name') }, ['file_id', 'folder']), label: (i) => `Copying to ${s(i.folder)}` },
  { name: 'send_to_device', risk: 'low', description: 'Move an active session (app or media) to another device on the mesh.', input_schema: obj({ device_id: str('Target device id'), session_id: str('Session id; omit for the focused session') }, ['device_id']), label: (i) => `Moving session to ${dev(i.device_id)}` },
  { name: 'play_media', risk: 'low', description: 'Play a media item on a device.', input_schema: obj({ media_id: str('Media id'), device_id: str('Device id') }, ['media_id']), label: () => 'Starting playback' },
  { name: 'pause_media', risk: 'low', description: 'Pause playback.', input_schema: obj({ session_id: str('Session id') }), label: () => 'Pausing playback' },
  { name: 'set_volume', risk: 'low', description: 'Set system volume 0–100.', input_schema: obj({ level: num('Volume 0–100') }, ['level']), label: (i) => `Setting volume to ${s(i.level)}` },
  { name: 'set_temperature', risk: 'low', description: 'Set the Relic thermostat target temperature in °F.', input_schema: obj({ target: num('Target °F') }, ['target']), label: (i) => `Setting thermostat to ${s(i.target)}°` },
  { name: 'open_url', risk: 'low', description: 'Open a URL or search in Relic Browser.', input_schema: obj({ url: str('URL or search query') }, ['url']), label: () => 'Opening Relic Browser' },
  { name: 'open_settings', risk: 'low', description: 'Open Relic Settings at a section.', input_schema: obj({ section: str('Section', ['general', 'display', 'network', 'devices', 'claude', 'security', 'compatibility', 'developer', 'system', 'architecture', 'about', 'roadmap']) }), label: (i) => `Opening Settings${i.section ? ' → ' + s(i.section).toUpperCase() : ''}` },
  { name: 'change_setting', risk: 'low', description: 'Change a non-security system setting.', input_schema: obj({ key: str('Setting key', ['theme', 'background', 'volume', 'windowsMode']), value: str('New value') }, ['key', 'value']), label: (i) => `Changing ${s(i.key)}` },

  // SENSITIVE
  { name: 'delete_file', risk: 'sensitive', description: 'Move a file to Trash.', input_schema: obj({ file_id: str('File id') }, ['file_id']), label: () => 'Deleting file' },
  { name: 'install_app', risk: 'sensitive', description: 'Install an application and grant its requested permissions.', input_schema: obj({ app_id: str('Application id') }, ['app_id']), label: (i) => `Installing ${s(i.app_id)}` },
  { name: 'create_automation', risk: 'sensitive', description: 'Create a standing automation that acts without asking.', input_schema: obj({ name: str('Name'), trigger: str('Trigger'), action: str('Action') }, ['name', 'trigger', 'action']), label: () => 'Creating automation' },
  { name: 'computer_use', risk: 'sensitive', description: 'Operate an application without a native Relic API through screen, mouse and keyboard.', input_schema: obj({ app_id: str('Application id'), task: str('What to do') }, ['app_id', 'task']), label: (i) => `Computer use · ${s(i.app_id)}` },

  // SYSTEM / DANGEROUS
  { name: 'vehicle_control', risk: 'system', description: 'Change vehicle settings (climate, locks, charging).', input_schema: obj({ setting: str('Setting', ['climate', 'locks', 'charging']), value: str('Value') }, ['setting', 'value']), label: (i) => `Vehicle · ${s(i.setting)}` },
]

export const toolByName = (name: string) => toolDefinitions.find((t) => t.name === name)
