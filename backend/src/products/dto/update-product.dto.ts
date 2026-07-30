import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimOrNull)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(Unit)
  baseUnit?: Unit;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique({ message: 'Зоны не должны повторяться' })
  zoneIds?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Минимальный запас должен быть числом (до 3 знаков)' })
  @Min(0, { message: 'Минимальный запас не может быть отрицательным' })
  @Max(1_000_000, { message: 'Слишком большое значение' })
  minQuantity?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Оптимальный запас должен быть числом (до 3 знаков)' })
  @Min(0, { message: 'Оптимальный запас не может быть отрицательным' })
  @Max(1_000_000, { message: 'Слишком большое значение' })
  optimalQuantity?: number | null;
}
