import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateRoomMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsUUID()
  @IsNotEmpty()
  roomId: string;
}
