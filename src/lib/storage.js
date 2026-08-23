// Local-storage backed persistence, matching the shape of the
// Claude.ai artifact `window.storage` API (get/set/delete/list),
// so the component code stays the same as the artifact version.

const PREFIX = "appboard:";

export const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw };
    } catch (e) {
      throw new Error("storage get failed");
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value };
    } catch (e) {
      throw new Error("storage set failed");
    }
  },

  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    } catch (e) {
      throw new Error("storage delete failed");
    }
  },

  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return { keys, prefix };
    } catch (e) {
      throw new Error("storage list failed");
    }
  },
};
