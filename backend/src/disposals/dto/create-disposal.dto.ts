import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const QTY_MAX = 1_000_000;

export class CreateDisposalItemDto {
  @IsString()
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Количество должно быть числом (до 3 знаков)' })
  @Min(0.001, { message: 'Количество должно быть больше нуля' })
  @Max(QTY_MAX, { message: 'Слишком большое количество' })
  quantity!: number;
}

export class CreateDisposalDto {
  @IsString()
  @IsNotEmpty({ message: 'Выберите зону' })
  zoneId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Добавьте хотя бы один товар' })
  @ArrayUnique((it: CreateDisposalItemDto) => it.productId, { message: 'Товар не должен повторяться' })
  @ValidateNested({ each: true })
  @Type(() => CreateDisposalItemDto)
  items!: CreateDisposalItemDto[];
}
