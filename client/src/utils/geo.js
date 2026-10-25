// Straight-line distance between two coordinates, in metres.
export const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const a1 = Number(lat1);
  const o1 = Number(lon1);
  const a2 = Number(lat2);
  const o2 = Number(lon2);

  if (![a1, o1, a2, o2].every(Number.isFinite)) return null;

  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(a2 - a1);
  const dLon = rad(o2 - o1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a1)) * Math.cos(rad(a2)) * Math.sin(dLon / 2) ** 2;

  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
};

export const formatMeters = (meters) => {
  const value = Number(meters);

  if (!Number.isFinite(value)) return "";

  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
};
