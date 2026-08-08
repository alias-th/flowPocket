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
import { Account } from "./account.entity";
import { User } from "./user.entity";
import { Category } from "./category.entity";
import { Image } from "./image.entity";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  OPENING_BALANCE = "OPENING_BALANCE",
}

@Entity({ name: "transactions" })
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Index()
  @Column({ name: "account_id", type: "uuid" })
  accountId!: string;

  @Index()
  @Column({ name: "category_id", type: "uuid", nullable: true })
  categoryId!: string | null;

  @Column({
    type: "enum",
    enum: TransactionType,
    enumName: "transaction_type_enum",
  })
  type!: TransactionType;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: string;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ name: "transaction_date", type: "timestamptz" })
  transactionDate!: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Account, (account) => account.transactions)
  @JoinColumn({ name: "account_id" })
  account!: Account;

  @ManyToOne(() => Category, (category) => category.transactions, {
    nullable: true,
  })
  @JoinColumn({ name: "category_id" })
  category!: Category | null;

  @OneToMany(() => Image, (image) => image.transaction)
  images!: Image[];
}
