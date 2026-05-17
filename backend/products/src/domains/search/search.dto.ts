export interface SearchQueryDto {
  q?:        string;
  storeId?:  string;
  minPrice?: number;
  maxPrice?: number;
  page:      number;
  limit:     number;
}

export interface AutocompleteQueryDto {
  q:        string;
  storeId?: string;
}

export interface ESProductDoc {
  productId:    string;
  storeId:      string;
  ownerId:      string;
  storeName:    string;
  name:         string;
  description?: string;
  price:        number;
  images:       string[];
  isDeleted:    boolean;
  createdAt?:   Date;
  updatedAt?:   Date;
}

export interface SearchResultDto {
  hits:  ESProductDoc[];
  total: number;
  page:  number;
  limit: number;
}