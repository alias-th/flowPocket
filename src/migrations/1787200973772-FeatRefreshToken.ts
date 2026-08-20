import { MigrationInterface, QueryRunner } from "typeorm";

export class FeatRefreshToken1787200973772 implements MigrationInterface {
    name = 'FeatRefreshToken1787200973772'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" ADD "access_token_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "UQ_88ef72a4c63fc332c665ba28fd1" UNIQUE ("access_token_hash")`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "refresh_token_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "UQ_d6185b2849a1e4d0c067a57ca89" UNIQUE ("refresh_token_hash")`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "access_token_revoked_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "refresh_token_revoked_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "access_token_expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE INDEX "IDX_f16cf94874af99326ac140be54" ON "sessions"  ("access_token_expires_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_e59af021a32c359c2d9dcf14cc" ON "sessions"  ("refresh_token_expires_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e59af021a32c359c2d9dcf14cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f16cf94874af99326ac140be54"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "refresh_token_expires_at"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "access_token_expires_at"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "refresh_token_revoked_at"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "access_token_revoked_at"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "UQ_d6185b2849a1e4d0c067a57ca89"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "refresh_token_hash"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "UQ_88ef72a4c63fc332c665ba28fd1"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "access_token_hash"`);
    }

}
