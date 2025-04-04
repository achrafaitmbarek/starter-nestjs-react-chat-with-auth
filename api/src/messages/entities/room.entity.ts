import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RoomMessage } from './room-message.entity';

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User)
  owner: User;

  @ManyToMany(() => User)
  @JoinTable({ name: 'room_members' })
  members: User[];

  @OneToMany(() => RoomMessage, (message) => message.room)
  messages: RoomMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
