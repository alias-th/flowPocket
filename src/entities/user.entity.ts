import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Account } from "./account.entity";
import { Transaction } from "./transaction.entity";
import { Category } from "./category.entity";
import { Session } from "./session.entity";
import { Budget } from "./budget.entity";

export enum PreferredLanguage {
  TH = "TH",
  EN = "EN",
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar" })
  passwordHash!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({
    name: "preferred_language",
    type: "enum",
    enum: PreferredLanguage,
    default: PreferredLanguage.TH,
    enumName: "preferred_language_enum",
  })
  preferredLanguage!: PreferredLanguage;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => Account, (account) => account.user)
  accounts!: Account[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions!: Transaction[];

  @OneToMany(() => Category, (category) => category.user)
  categories!: Category[];

  @OneToMany(() => Session, (session) => session.user)
  sessions!: Session[];

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets!: Budget[];
}
