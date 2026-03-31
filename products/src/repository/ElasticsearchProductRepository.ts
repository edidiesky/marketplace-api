import { esClient, PRODUCT_INDEX } from "../config/elasticSearch";

export interface ESProductDoc {
  productId: string;
  storeId: string;
  ownerId: string;
  storeName: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const esProductRepository = {
  async upsert(doc: ESProductDoc): Promise<void> {
    await esClient.index({
      index: PRODUCT_INDEX,
      id: doc.productId,
      document: doc,
    });
  },

  async partialUpdate(productId: string, fields: Partial<ESProductDoc>): Promise<void> {
    await esClient.update({
      index: PRODUCT_INDEX,
      id: productId,
      doc: fields,
      doc_as_upsert: true,
    });
  },

  async softDelete(productId: string): Promise<void> {
    await esClient.update({
      index: PRODUCT_INDEX,
      id: productId,
      doc: { isDeleted: true },
      doc_as_upsert: false,
    });
  },

  async search(params: {
    q?: string;
    storeId?: string;
    minPrice?: number;
    maxPrice?: number;
    page: number;
    limit: number;
  }): Promise<{ hits: ESProductDoc[]; total: number }> {
    const must: any[] = [{ term: { isDeleted: false } }];
    const filter: any[] = [];

    if (params.storeId) filter.push({ term: { storeId: params.storeId } });

    if (params.q) {
      must.push({
        multi_match: {
          query: params.q,
          fields: ["name^3", "description"], 
          analyzer: "search_analyzer",
        },
      });
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      const range: any = {};
      if (params.minPrice !== undefined) range.gte = params.minPrice;
      if (params.maxPrice !== undefined) range.lte = params.maxPrice;
      filter.push({ range: { price: range } });
    }

    const from = (params.page - 1) * params.limit;

    const result = await esClient.search({
      index: PRODUCT_INDEX,
      // from,
      size: params.limit,
      query: { bool: { must, filter } },
      sort: params.q ? ["_score"] : [{ createdAt: "desc" }],
      _source: true,
    });

    const hits = result.hits.hits.map((h) => h._source as ESProductDoc);
    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : result.hits.total?.value ?? 0;

    return { hits, total };
  },

  async autocomplete(q: string, storeId?: string): Promise<string[]> {
    const filter: any[] = [{ term: { isDeleted: false } }];
    if (storeId) filter.push({ term: { storeId } });

    const result = await esClient.search({
      index: PRODUCT_INDEX,
      size: 10,
      query: {
        bool: {
          must: [{ match_phrase_prefix: { "name": { query: q, max_expansions: 20 } } }],
          filter,
        },
      },
      _source: ["name"],
    });

    return result.hits.hits.map((h: any) => h._source.name as string);
  },
};