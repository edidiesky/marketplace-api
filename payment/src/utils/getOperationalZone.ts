import { ZONE_1_LGAS, ZONE_2_LGAS } from "../constants";

export const getOperationalZone = (lga: string): string => {
  if (ZONE_1_LGAS.includes(lga.toUpperCase())) {
    return 'Zone 1';
  } else if (ZONE_2_LGAS.includes(lga.toUpperCase())) {
    return 'Zone 2';
  } else {
    return 'Zone 3';
  }
};
