import { IsBooleanString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class ListUsersDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
