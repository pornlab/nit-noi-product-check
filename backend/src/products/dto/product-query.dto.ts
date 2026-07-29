import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Unit } from '@prisma/client';

const toBool = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
const trimOrUndef = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? undefined : t;
};

export class ProductQueryDto {
  @IsOptional()
  @Transform(trimOrUndef)
  @IsString()
  search?: string;

  // Accepts an UUID or the sentinel "none" to filter products without category.
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(Unit)
  baseUnit?: Unit;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isInventoryTracked?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isPurchasable?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}
