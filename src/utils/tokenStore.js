let inMemoryToken = null;
let useLocalStorage = true;

export const setUseLocalStorage = (v) => { useLocalStorage = !!v; };
export const setToken = (token) => {
  inMemoryToken = token || null;
  if (useLocalStorage) {
    try { localStorage.setItem('authToken', token); } catch (e) {}
  }
};
export const getToken = () => {
  if (!useLocalStorage) return inMemoryToken;
  try {
    return localStorage.getItem('authToken') || inMemoryToken;
  } catch (e) {
    return inMemoryToken;
  }
};
export const clearToken = () => {
  inMemoryToken = null;
  try { localStorage.removeItem('authToken'); } catch (e) {}
};

export const _internal = { get useLocalStorage() { return useLocalStorage; }, get inMemoryToken() { return inMemoryToken; } };
