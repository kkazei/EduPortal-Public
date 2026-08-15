import localforage from 'localforage';

localforage.config({ name: 'eduportal-cache' });

export async function fetchWithCache(key, fetcher) {
  const online = navigator.onLine;
  if (!online) {
    const cached = await localforage.getItem(key);
    if (cached) return cached;
    throw new Error('Offline and no cached data');
  }

  const data = await fetcher();
  // Store latest for offline
  await localforage.setItem(key, data);
  return data;
}