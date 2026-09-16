const OSRM_BASE_URL = 'https://router.project-osrm.org';
const MIN_REQUEST_INTERVAL_MS = 1000;
const MAX_CACHE_ENTRIES = 100;

const routeCache = new Map();
let nextRequestAllowedAt = 0;

const createAbortError = () => new DOMException('The request was aborted.', 'AbortError');

const waitForRequestSlot = async (signal) => {
  if (signal?.aborted) throw createAbortError();

  const waitMs = Math.max(0, nextRequestAllowedAt - Date.now());
  if (waitMs > 0) {
    await new Promise((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        signal?.removeEventListener('abort', handleAbort);
        resolve();
      }, waitMs);
      const handleAbort = () => {
        globalThis.clearTimeout(timer);
        reject(createAbortError());
      };
      signal?.addEventListener('abort', handleAbort, { once: true });
    });
  }

  if (signal?.aborted) throw createAbortError();
  nextRequestAllowedAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
};

const getRouteCacheKey = (startPosition, endPosition) => (
  [...startPosition, ...endPosition]
    .map((coordinate) => Number(coordinate).toFixed(5))
    .join(':')
);

const cacheRoute = (key, route) => {
  if (routeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = routeCache.keys().next().value;
    routeCache.delete(oldestKey);
  }
  routeCache.set(key, route);
};

export async function fetchRoadRoute(startPosition, endPosition, { signal } = {}) {
  const cacheKey = getRouteCacheKey(startPosition, endPosition);
  const cachedRoute = routeCache.get(cacheKey);
  if (cachedRoute) return cachedRoute;

  await waitForRequestSlot(signal);

  const [startLat, startLng] = startPosition;
  const [endLat, endLng] = endPosition;
  const routeUrl = new URL(
    `/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`,
    OSRM_BASE_URL,
  );
  routeUrl.searchParams.set('overview', 'full');
  routeUrl.searchParams.set('geometries', 'geojson');
  routeUrl.searchParams.set('steps', 'false');
  routeUrl.searchParams.set('generate_hints', 'false');

  const response = await fetch(routeUrl, { signal });
  if (!response.ok) throw new Error(`Road routing failed with HTTP ${response.status}.`);

  const payload = await response.json();
  const route = payload.routes?.[0];
  const positions = route?.geometry?.coordinates
    ?.map(([longitude, latitude]) => [latitude, longitude])
    .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

  if (payload.code !== 'Ok' || !route || positions?.length < 2 || !Number.isFinite(route.duration)) {
    throw new Error(payload.message || payload.code || 'Road routing returned an invalid route.');
  }

  const roadRoute = {
    positions,
    durationMinutes: route.duration / 60,
  };
  cacheRoute(cacheKey, roadRoute);
  return roadRoute;
}
