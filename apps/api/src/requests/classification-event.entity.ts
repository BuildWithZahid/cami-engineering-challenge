import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerRequest } from './customer-request.entity';

@Entity({ name: 'classification_events' })
export class ClassificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  @ManyToOne(() => CustomerRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'request_id' })
  request!: CustomerRequest | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: string;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({ type: 'varchar', length: 64 })
  provider!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
