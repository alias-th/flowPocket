import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Transaction } from "./transaction.entity";
import { User } from "./user.entity";
import { Budget } from "./budget.entity";

export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

@Entity({ name: "categories" })
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({
    type: "enum",
    enum: CategoryType,
    enumName: "category_type_enum",
  })
  type!: CategoryType;

  @Column({ name: "category_status", type: "boolean", default: true })
  categoryStatus!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions!: Transaction[];

  @OneToMany(() => Budget, (budget) => budget.category)
  budgets!: Budget[];

  @ManyToOne(() => User, (user) => user.categories)
  @JoinColumn({ name: "user_id" })
  user!: User;
}
