import mongoose, { FilterQuery } from "mongoose";
import { IRules } from "../models/Rules";

export interface IRulesRepository {
  createRules: (
    data: Partial<IRules>,
    session?: mongoose.ClientSession
  ) => Promise<IRules>;
  getRules: (
    query: FilterQuery<IRules>,
    skip: number,
    limit: number
  ) => Promise<IRules[] | null>;
  getStoreRules: (
    query: FilterQuery<IRules>,
    skip: number,
    limit: number
  ) => Promise<IRules[] | null>;
  getSingleRules: (ruleId: string) => Promise<IRules | null>;
  RulesExists: (idValue: string, resource: string) => Promise<IRules | null>;
  updateRules: (
    data: Partial<IRules>,
    ruleId: string
  ) => Promise<IRules | null>;
  deleteRules: (ruleId: string) => Promise<void>;
}