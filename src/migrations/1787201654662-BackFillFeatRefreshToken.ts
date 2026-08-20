import { MigrationInterface, QueryRunner } from "typeorm";

export class BackFillFeatRefreshToken1787201654662 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "sessions" 
       SET "access_token_hash" = "token_hash" 
       WHERE "access_token_hash" IS NULL`,
    );

    await queryRunner.query(
      `UPDATE "sessions" 
       SET "access_token_revoked_at" = "revoked_at" 
       WHERE "access_token_revoked_at" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "sessions" 
       SET "access_token_expires_at" = "expires_at" 
       WHERE "access_token_expires_at" IS NULL`,
    );

    await queryRunner.query(`
    UPDATE "sessions"
    SET
      "refresh_token_hash" =
        COALESCE("refresh_token_hash", 'backfill:' || "id"::text),
      "refresh_token_expires_at" =
        COALESCE("refresh_token_expires_at", "access_token_expires_at"),
      "refresh_token_revoked_at" =
        COALESCE("refresh_token_revoked_at", NOW())
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
