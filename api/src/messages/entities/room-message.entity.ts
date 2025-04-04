import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

@Entity()
export class RoomMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToOne(() => Room, (room) => room.messages)
  room: Room;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
