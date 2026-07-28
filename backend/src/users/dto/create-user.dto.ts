import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEmail({}, { message: 'Некорректный email' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен быть не короче 6 символов' })
  @MaxLength(200)
  password!: string;

  @IsEnum(Role, { message: 'Некорректная роль' })
  role!: Role;

  @IsOptional()
  @IsUUID()
  positionId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
