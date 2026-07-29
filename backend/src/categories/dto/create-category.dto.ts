import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const trimOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
};

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(120)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimOrNull)
  description?: string | null;
}
