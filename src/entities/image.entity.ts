import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Transaction } from "./transaction.entity";

@Entity({ name: "images" })
export class Image {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "transaction_id", type: "uuid" })
  transactionId!: string;

  @Column({ name: "file_key", type: "varchar" })
  fileKey!: string;

  @Column({ name: "file_name", type: "varchar" })
  fileName!: string;

  @Column({ name: "mime_type", type: "varchar", nullable: true })
  mimeType!: string | null;

  @Column({ name: "file_size", type: "integer", nullable: true })
  fileSize!: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Transaction, (transaction) => transaction.images)
  @JoinColumn({ name: "transaction_id" })
  transaction!: Transaction;
}
