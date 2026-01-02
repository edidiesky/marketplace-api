import { PaymentGateway } from "../models/Payment";
import { Response, Request } from "express";

export type AuthenticatedRequest = Request & {
  user: {
    role: string;
    userId: string;
    name: string;
    permissions: Permission[];
    roleLevel?: RoleLevel;
  };
};

export enum RoleLevel {
  SUPER_ADMIN = 1,
  EXECUTIVE = 2,
  MEMBER = 3,
}

export enum Permission {
  CREATE_USER = "CREATE_USER",
  MANAGE_ROLES = "MANAGE_ROLES",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  VIEW_REPORTS = "VIEW_REPORTS",
}

export interface CreateCategoryInput {
  name: string;
  value: string;
}

export interface IAdapterRequest {
  secretKey?: string;
  publicKey?: string;
  clientId?: string;
  clientSecret?: string;
  merchantCode?: string;
  payItemId?: string;
}

export interface IClassAdapterCred {
  gateway: PaymentGateway;
}

export interface IPaymentResponse {
  redirectUrl?: string;
  transactionId?: string;
  success: boolean;
  message: string;
}

export interface IPaymentProcessRequest {
  amount: number;
  email: string;
  phone: string;
  userId: string;
  callbackUrl: string;
  currency: string;
  name: string;
  transactionId?:string;
  reason?:string;
}

export interface IPaymentRefundRequest {
  amount: number;
  transactionId?:string;
  reason?:string;
}
export interface IPaystackResponse {
  status: boolean | string;
  data?: {
    reference?: string;
    authorization_url?: string;
    refund_id?: string;
  };
}

export interface IPaymentWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number; // in kobo
    status: string;
    gateway_response?: string;
    paid_at?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}

export interface IAdapterResponse {
  process: (processBody: IPaymentProcessRequest) => Promise<IPaymentResponse>;
  refund?: (body: IPaymentRefundRequest) => Promise<IPaymentResponse>;
  virtual?: (processBody: IPaymentProcessRequest) => Promise<IPaymentResponse>;
  
  verifyWebhook?: (payload: any, signature?: string) => boolean;
  extractTransactionId?: (payload: any) => string;
  extractStatus?: (payload: any) => "success" | "failed" | "pending";
  extractAmount?: (payload: any) => number;
  extractMetadata?: (payload: any) => Record<string, any>;
}

export interface ISignatureVerifier {
  verify(signature: string | undefined, payload: any, headers: any): boolean;
}

export interface IPayloadNormalizer {
  extractTransactionId(payload: any, headers: any): string;
  extractStatus(payload: any, headers: any): "success" | "failed" | "pending";
  extractAmount(payload: any, headers: any): number;
  extractMetadata?(payload: any, headers: any): Record<string, any>;
}

export interface IResponseFormatter {
  formatSuccess(res: Response, payload?: any): void;
  formatError(res: Response, message: string, code?: number): void;
}
