import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./category.entity";
import { User } from "./user.entity";

enum CategoryCurrency {
  THB = "THB",
  USD = "USD",
}

@Entity({ name: "budgets" })
export class Budget {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @Column({ type: "integer" })
  month!: number;

  @Column({ type: "integer" })
  year!: number;

  @Column({
    type: "enum",
    enum: CategoryCurrency,
    default: CategoryCurrency.THB,
    enumName: "category_currency_enum",
  })
  currency!: CategoryCurrency;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.budgets)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Category, (category) => category.budgets)
  @JoinColumn({ name: "category_id" })
  category!: Category;
}
