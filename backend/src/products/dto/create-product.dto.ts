import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Unit } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
};

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(200)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsEnum(Unit, { message: 'Некорректная единица измерения' })
  baseUnit!: Unit;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimOrNull)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(trimOrNull)
  barcode?: string | null;

  @IsOptional()
  @IsBoolean()
  isInventoryTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isPurchasable?: boolean;
}
