import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "sessions" })
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "device_name", type: "varchar", nullable: true })
  deviceName!: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent!: string | null;

  @Column({ name: "ip_address", type: "varchar", nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.sessions)
  @JoinColumn({ name: "user_id" })
  user!: User;

  // new field
  @Column({
    name: "access_token_hash",
    type: "varchar",
    unique: true,
  })
  accessTokenHash!: string;

  @Column({
    name: "refresh_token_hash",
    type: "varchar",
    unique: true,
  })
  refreshTokenHash!: string;

  @Column({
    name: "access_token_revoked_at",
    type: "timestamptz",
    nullable: true,
  })
  accessTokenRevokedAt!: Date | null;

  @Column({
    name: "refresh_token_revoked_at",
    type: "timestamptz",
    nullable: true,
  })
  refreshTokenRevokedAt!: Date | null;

  @Index()
  @Column({
    name: "access_token_expires_at",
    type: "timestamptz",
    nullable: true,
  })
  accessTokenExpiresAt!: Date;

  @Index()
  @Column({
    name: "refresh_token_expires_at",
    type: "timestamptz",
    nullable: true,
  })
  refreshTokenExpiresAt!: Date;
}
