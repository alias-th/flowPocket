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
import { User } from "./user.entity";
import { Transaction } from "./transaction.entity";

enum AccountType {
  BANK = "BANK",
  CASH = "CASH",
  EWALLET = "EWALLET",
  CREDIT_CARD = "CREDIT_CARD",
  OTHER = "OTHER",
}

enum AccountCurrency {
  THB = "THB",
  USD = "USD",
}

enum AccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

@Entity({ name: "accounts" })
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({
    type: "enum",
    enum: AccountType,
    default: AccountType.BANK,
    enumName: "account_type_enum",
  })
  type!: AccountType;

  @Column({
    type: "enum",
    enum: AccountCurrency,
    default: AccountCurrency.THB,
    enumName: "account_currency_enum",
  })
  currency!: AccountCurrency;

  @Column({
    name: "account_status",
    type: "enum",
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
    enumName: "account_status_enum",
  })
  accountStatus!: AccountStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions!: Transaction[];
}
