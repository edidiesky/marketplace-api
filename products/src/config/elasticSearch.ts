import { Client } from "@elastic/elasticsearch";
import logger from "../utils/logger";

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://elasticsearch:9200",
  requestTimeout: 10_000,
  maxRetries: 3,
});

export const PRODUCT_INDEX = "products";

export async function bootstrapProductIndex(): Promise<void> {
  const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
  if (exists) {
    logger.info("ES product index already exists");
    return;
  }

  await esClient.indices.create({
    index: PRODUCT_INDEX,
    settings: {
      number_of_shards: 2,
      number_of_replicas: 1,
      max_ngram_diff:7,
      analysis: {
        tokenizer: {
          ngram_tokenizer: {
            type: "ngram" as const,
            min_gram: 3,
            max_gram: 10,
            token_chars: ["letter", "digit"] as const,
          },
        },
        analyzer: {
          ngram_analyzer: {
            type: "custom" as const,
            tokenizer: "ngram_tokenizer",
            filter: ["lowercase"],
          },
          search_analyzer: {
            type: "custom" as const,
            tokenizer: "standard",
            filter: ["lowercase"],
          },
        },
      },
    },
    mappings: {
      properties: {
        productId:   { type: "keyword" as const },
        storeId:     { type: "keyword" as const },
        ownerId:     { type: "keyword" as const },
        storeName:   { type: "keyword" as const },
        name: {
          type: "text" as const,
          analyzer: "ngram_analyzer",
          search_analyzer: "search_analyzer",
          fields: {
            keyword: { type: "keyword" as const },
          },
        },
        description: {
          type: "text" as const,
          analyzer: "ngram_analyzer",
          search_analyzer: "search_analyzer",
        },
        price:     { type: "float" as const },
        images:    { type: "keyword" as const, index: false },
        isDeleted: { type: "boolean" as const },
        createdAt: { type: "date" as const },
        updatedAt: { type: "date" as const },
      },
    },
  });

  logger.info("ES product index created with ngram mapping");
}