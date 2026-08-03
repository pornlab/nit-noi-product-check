import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const trimOrUndef = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? undefined : t;
};

const toInt = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

/**
 * Общие фильтры для collector-эндпоинтов.
 * Диапазон дат: включительно; интерпретируется UTC-датой без времени.
 */
export class CollectorListQueryDto {
  @IsOptional()
  @Transform(trimOrUndef)
  @IsISO8601({ strict: true }, { message: 'Invalid `from`' })
  from?: string;

  @IsOptional()
  @Transform(trimOrUndef)
  @IsISO8601({ strict: true }, { message: 'Invalid `to`' })
  to?: string;

  @IsOptional()
  @Transform(trimOrUndef)
  @IsString()
  zoneId?: string;

  @IsOptional()
  @Transform(trimOrUndef)
  @IsString()
  supplierId?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
