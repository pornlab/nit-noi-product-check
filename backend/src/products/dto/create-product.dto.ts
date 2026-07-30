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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique({ message: 'Зоны не должны повторяться' })
  zoneIds?: string[];

  // Минимальный запас (не блокирует, используется для будущих закупок).
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Минимальный запас должен быть числом (до 3 знаков)' })
  @Min(0, { message: 'Минимальный запас не может быть отрицательным' })
  @Max(1_000_000, { message: 'Слишком большое значение' })
  minQuantity?: number | null;

  // Оптимальный запас.
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Оптимальный запас должен быть числом (до 3 знаков)' })
  @Min(0, { message: 'Оптимальный запас не может быть отрицательным' })
  @Max(1_000_000, { message: 'Слишком большое значение' })
  optimalQuantity?: number | null;
}
