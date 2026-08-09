import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintBudget1786287494777 implements MigrationInterface {
    name = 'AddUniqueConstraintBudget1786287494777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "UQ_budget_user_category_period" UNIQUE ("user_id", "category_id", "month", "year")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "UQ_budget_user_category_period"`);
    }

}
