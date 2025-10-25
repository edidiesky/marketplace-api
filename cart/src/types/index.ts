import { DirectorateType, Permission, RoleLevel } from "../models/User";
import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    userType: string;
    userId: string;
    name: string;
    permissions: Permission[];
    directorates: DirectorateType[];
    roleLevel?: RoleLevel;
  };
};


export interface AgencyAggregationResult {
  totalAgencies: number;
  totalFederal: number;
  totalState: number;
  totalLocalGovt: number;
}

export interface AgencyChartData {
  totalAgencies: number;
  totalFederal: number;
  totalState: number;
  totalLocalGovt: number;
  chartData: Array<{
    date: string;
    totalAgencies: number;
    federalAgencies: number;
    stateAgencies: number;
    localGovtAgencies: number;
  }>;
}