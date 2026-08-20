import { MigrationInterface, QueryRunner } from "typeorm";

export class SwitchFeatRefreshToken1787214663104 implements MigrationInterface {
  name = "SwitchFeatRefreshToken1787214663104";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9cfe37d28c3b229a350e086d94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "UQ_abaa9e068cdd390bc5210f79884"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "access_token_hash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "refresh_token_hash" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "refresh_token_hash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "access_token_hash" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "revoked_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "UQ_abaa9e068cdd390bc5210f79884" UNIQUE ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9cfe37d28c3b229a350e086d94" ON "sessions" USING btree ("expires_at") `,
    );
  }
}
