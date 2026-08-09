import fp from "fastify-plugin";
import { S3Client } from "@aws-sdk/client-s3";
import { FastifyInstance } from "fastify";

interface S3StorageOptions {
  ACCOUNT_ID: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
}
export default fp(async function (
  fastify: FastifyInstance,
  opts: S3StorageOptions
) {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${opts.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: opts.ACCESS_KEY_ID,
      secretAccessKey: opts.SECRET_ACCESS_KEY,
    },
  });

  fastify.decorate("s3", s3);
});
