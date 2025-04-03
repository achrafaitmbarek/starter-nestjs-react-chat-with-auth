import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePrivateMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsUUID()
  @IsNotEmpty()
  recipientId: string;
}
