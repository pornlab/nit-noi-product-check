import { IsBoolean, IsBooleanString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string | null;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListZonesDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class AssignUserToZoneDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  isResponsible?: boolean;
}

export class UpdateZoneAssignmentDto {
  @IsBoolean()
  isResponsible!: boolean;
}
