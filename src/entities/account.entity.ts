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
import { User } from "./user.entity";

export enum AccountType {
  BANK = "BANK",
  CASH = "CASH",
  EWALLET = "EWALLET",
  CREDIT_CARD = "CREDIT_CARD",
  OTHER = "OTHER",
}

export enum AccountCurrency {
  THB = "THB",
  USD = "USD",
}

export enum AccountStatus {
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
  })
  type!: AccountType;

  @Column({
    type: "enum",
    enum: AccountCurrency,
    default: AccountCurrency.THB,
  })
  currency!: AccountCurrency;

  @Column({
    name: "account_status",
    type: "enum",
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  accountStatus!: AccountStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.accounts)
  @JoinColumn({ name: "user_id" })
  user!: User;
}
