const VEHICLE_COMPANY_WEIGHTS = [
  '日通',
  '日通',
  '日通',
  '日通',
  '日通',
  '日通',
  '恆大',
  '東川',
  '廣騰',
  '上順',
];

export const getVehicleCompany = (plate) => {
  const normalizedPlate = String(plate ?? '').trim();

  if (!normalizedPlate) return '';

  const seed = [...normalizedPlate].reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );

  return VEHICLE_COMPANY_WEIGHTS[seed % VEHICLE_COMPANY_WEIGHTS.length];
};

export const formatVehiclePlate = (plate) => {
  const normalizedPlate = String(plate ?? '').trim();

  if (!normalizedPlate) return '-';

  return `${getVehicleCompany(normalizedPlate)} ${normalizedPlate}`;
};
