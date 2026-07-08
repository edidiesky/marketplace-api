import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";
import { esClient }        from "../../config/elasticSearch";
import { SERVICE_NAME, PRODUCT_INDEX } from "../../constants";
import logger              from "../../utils/logger";
import { ESProductDoc, SearchQueryDto } from "./search.dto";

export const searchRepository = {
  async upsert(doc: ESProductDoc): Promise<void> {
    await esClient.index({
      index:    PRODUCT_INDEX,
      id:       doc.productId,
      document: doc,
    });
  },

  async partialUpdate(
    productId: string,
    fields:    Partial<ESProductDoc>
  ): Promise<void> {
    await esClient.update({
      index:         PRODUCT_INDEX,
      id:            productId,
      doc:           fields,
      doc_as_upsert: true,
    });
  },

  async softDelete(productId: string): Promise<void> {
    await esClient.update({
      index:         PRODUCT_INDEX,
      id:            productId,
      doc:           { isDeleted: true },
      doc_as_upsert: false,
    });
  },

  async search(
    params: SearchQueryDto
  ): Promise<{ hits: ESProductDoc[]; total: number }> {
    const must:   QueryDslQueryContainer[] = [{ term: { isDeleted: false } }];
    const filter: QueryDslQueryContainer[] = [];

    if (params.storeId) {
      filter.push({ term: { storeId: params.storeId } });
    }

    if (params.q) {
      must.push({ 
        multi_match: {
          query:          params.q,
          fields:         ["name^3", "description"],
          fuzziness:      "AUTO",
          prefix_length:  2,
          max_expansions: 50,
        },
      });
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      const range: Record<string, number> = {};
      if (params.minPrice !== undefined) range["gte"] = params.minPrice;
      if (params.maxPrice !== undefined) range["lte"] = params.maxPrice;
      filter.push({ range: { price: range } });
    }

    const from = (params.page - 1) * params.limit;

    const result = await esClient.search<ESProductDoc>({
      index: PRODUCT_INDEX,
      from,
      size:  params.limit,
      query: { bool: { must, filter } },
      sort:  params.q
        ? ["_score"]
        : [{ createdAt: { order: "desc" } }],
    });

    const hits = result.hits.hits
      .map((h) => h._source)
      .filter((s): s is ESProductDoc => s !== undefined);

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    logger.debug("es_search_completed", {
      event:   "es_search_completed",
      service: SERVICE_NAME,
      query:   params.q,
      total,
    });

    return { hits, total };
  },

  async autocomplete(
    q:        string,
    storeId?: string
  ): Promise<string[]> {
    const filter: QueryDslQueryContainer[] = [
      { term: { isDeleted: false } },
    ];
    if (storeId) filter.push({ term: { storeId } });

    const result = await esClient.search<{ name: string }>({
      index: PRODUCT_INDEX,
      size:  10,
      query: {
        bool: {
          should: [
            {
              match_phrase_prefix: {
                name: {
                  query:          q,
                  max_expansions: 10,
                  boost:          3,
                },
              },
            },
            {
              fuzzy: {
                "name.keyword": {
                  value:          q,
                  fuzziness:      "AUTO",
                  prefix_length:  2,
                  max_expansions: 10,
                  transpositions: true,
                  boost:          1,
                },
              },
            },
          ],
          minimum_should_match: 1,
          filter,
        },
      },
      _source: ["name"],
    });

    return result.hits.hits
      .map((h) => h._source?.name ?? "")
      .filter(Boolean);
  },
};