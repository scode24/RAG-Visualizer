const BASE_URL = '/api';

export const api = {
  async runQuery(payload) {
    const res = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Network error occurred' }));
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  async getSettings() {
    const res = await fetch(`${BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async getKnowledgeBase() {
    const res = await fetch(`${BASE_URL}/knowledge-base`);
    if (!res.ok) throw new Error('Failed to load knowledge base');
    return res.json();
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/knowledge-base/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async reindexKnowledgeBase(params) {
    const formData = new FormData();
    formData.append('strategy', params.strategy);
    formData.append('chunk_size', params.chunk_size);
    formData.append('chunk_overlap', params.chunk_overlap);
    formData.append('embedding_provider', params.embedding_provider);
    if (params.gemini_api_key) {
      formData.append('gemini_api_key', params.gemini_api_key);
    }
    const res = await fetch(`${BASE_URL}/knowledge-base/reindex`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to reindex knowledge base');
    return res.json();
  },

  async previewChunking(payload) {
    const res = await fetch(`${BASE_URL}/chunk-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to preview chunking');
    return res.json();
  },

  async getCacheStats() {
    const res = await fetch(`${BASE_URL}/cache/stats`);
    if (!res.ok) throw new Error('Failed to fetch cache stats');
    return res.json();
  },

  async clearCache() {
    const res = await fetch(`${BASE_URL}/cache/clear`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear cache');
    return res.json();
  },

  async getModels() {
    const res = await fetch(`${BASE_URL}/models`);
    if (!res.ok) throw new Error('Failed to fetch model catalog');
    return res.json();
  }
};

