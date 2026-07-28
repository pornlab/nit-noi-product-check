import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  @MaxLength(200)
  password!: string;
}
