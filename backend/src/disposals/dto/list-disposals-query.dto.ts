import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const trimOrUndef = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? undefined : t;
};

export class ListDisposalsQueryDto {
  /** YYYY-MM-DD (включительно). */
  @IsOptional()
  @Transform(trimOrUndef)
  @IsISO8601({ strict: true }, { message: 'Некорректная дата «с»' })
  dateFrom?: string;

  /** YYYY-MM-DD (включительно). */
  @IsOptional()
  @Transform(trimOrUndef)
  @IsISO8601({ strict: true }, { message: 'Некорректная дата «по»' })
  dateTo?: string;

  @IsOptional()
  @Transform(trimOrUndef)
  @IsString()
  zoneId?: string;

  /** Роль автора. Учитывается только для admin. */
  @IsOptional()
  @Transform(trimOrUndef)
  @IsIn(['admin', 'manager', 'employee'], { message: 'Некорректная роль' })
  role?: 'admin' | 'manager' | 'employee';
}
