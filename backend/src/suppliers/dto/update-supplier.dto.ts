import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
};
const trimLowerOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim().toLowerCase();
  return t === '' ? null : t;
};

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimOrNull)
  contactPerson?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimOrNull)
  phone?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email' })
  @MaxLength(254)
  @Transform(trimLowerOrNull)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimOrNull)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimOrNull)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trimOrNull)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
