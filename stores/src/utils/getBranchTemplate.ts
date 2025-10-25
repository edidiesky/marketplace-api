import {
  BANK_BRANCH_TEMPLATE,
  CORPORATE_TAXPAYER_TEMPLATE,
  HOSPITAL_BRANCH_TEMPLATE,
  OIL_GAS_BRANCH_TEMPLATE,
  PETROL_STATION_BRANCH_TEMPLATE,
} from "../constants";
import { InstitutionType } from "../models/User";

export const getBranchTemplate = (institutionType: string): string[] => {
  switch (institutionType) {
    case InstitutionType.BANK:
      return BANK_BRANCH_TEMPLATE;
    case InstitutionType.OIL_GAS:
      return OIL_GAS_BRANCH_TEMPLATE;
    case InstitutionType.PETROL_STATION:
      return PETROL_STATION_BRANCH_TEMPLATE;
    case InstitutionType.HOSPITAL:
      return HOSPITAL_BRANCH_TEMPLATE;
    default:
      return CORPORATE_TAXPAYER_TEMPLATE;
  }
};
