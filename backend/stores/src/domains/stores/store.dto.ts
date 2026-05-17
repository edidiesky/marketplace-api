import {
  CustomDomainStatus,
  IStoreAddress,
  IStoreSettings,
  StoreStatus,
} from "./store.model";

export interface CreateStoreDto {
  organizationId: string;
  ownerId:        string;
  ownerName:      string;
  ownerEmail:     string;
  name:           string;
  subdomain?:     string;
  description?:   string;
  logo?:          string;
  email:          string;
  phoneNumber?:   string;
  address:        IStoreAddress;
  settings?:      Partial<IStoreSettings>;
  notificationId?: string;
}

export interface UpdateStoreDto {
  name?:        string;
  description?: string;
  logo?:        string;
  banner?:      string;
  email?:       string;
  phoneNumber?: string;
  address?:     Partial<IStoreAddress>;
  settings?:    Partial<IStoreSettings>;
}

export interface UpdateStoreStatusDto {
  status: StoreStatus;
  reason?: string;
}

export interface AddCustomDomainDto {
  customDomain: string;
}

export interface StoreResponseDto {
  storeId:                string;
  organizationId:         string;
  ownerId:                string;
  ownerName:              string;
  ownerEmail:             string;
  name:                   string;
  subdomain:              string;
  slug:                   string;
  description?:           string;
  logo?:                  string;
  banner?:                string;
  email:                  string;
  phoneNumber?:           string;
  address:                IStoreAddress;
  settings:               IStoreSettings;
  status:                 StoreStatus;
  customDomain?:          string;
  customDomainStatus:     CustomDomainStatus;
  customDomainVerifiedAt?: Date;
  createdAt:              Date;
  updatedAt:              Date;
}

export interface StoreListResponseDto {
  stores:     StoreResponseDto[];
  totalCount: number;
  totalPages: number;
  page:       number;
  limit:      number;
}