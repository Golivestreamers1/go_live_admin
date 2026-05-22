import api from './api';

/** Feature toggles shown in the Logging Settings page. Keys must match the backend model. */
export const LOGGING_FEATURES = [
  { key: 'navigation', label: 'Navigation', description: 'Screen transitions and navigation traces.' },
  { key: 'api', label: 'API', description: 'REST request failures and request_id correlation.' },
  { key: 'streaming', label: 'Streaming (Agora)', description: 'Live video / Agora engine errors and join failures.' },
  { key: 'messaging', label: 'Messaging (Socket)', description: 'Chat / socket reconnects and ack timeouts.' },
  { key: 'gifting', label: 'Gifting', description: 'Gift send failures (REST + socket).' },
];

export const loggingConfigService = {
  /** Public read (same endpoint the app uses). Returns { globalEnabled, features, updatedAt }. */
  async get() {
    const res = await api.get('/config/logging');
    return res.data.data;
  },
  /** Admin-only patch. `patch` = { globalEnabled?, features?: { [key]: boolean } }. */
  async update(patch) {
    const res = await api.patch('/admin/config/logging', patch);
    return res.data.data;
  },
};
