import { Redis, RedisConfigNodejs } from "@upstash/redis";

const config: RedisConfigNodejs = {
  url: process.env.UPSTASH_REDIS_REST_URL
    ? process.env.UPSTASH_REDIS_REST_URL
    : "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN
    ? process.env.UPSTASH_REDIS_REST_TOKEN
    : "",
};

export const db = new Redis(config);
