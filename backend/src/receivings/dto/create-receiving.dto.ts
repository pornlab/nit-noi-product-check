import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const QTY_MAX = 1_000_000;
const MONEY_MAX = 100_000_000;

export class CreateReceivingAllocationDto {
  @IsString()
  zoneId!: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Количество в зоне должно быть числом (до 3 знаков)' })
  @Min(0, { message: 'Количество в зоне не может быть отрицательным' })
  @Max(QTY_MAX, { message: 'Слишком большое количество в зоне' })
  quantity!: number;
}

export class CreateReceivingItemDto {
  @IsString()
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Количество должно быть числом (до 3 знаков)' })
  @Min(0.001, { message: 'Количество должно быть больше нуля' })
  @Max(QTY_MAX, { message: 'Слишком большое количество' })
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Стоимость должна быть числом (до 2 знаков)' })
  @Min(0, { message: 'Стоимость не может быть отрицательной' })
  @Max(MONEY_MAX, { message: 'Слишком большая стоимость' })
  cost!: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Нужно распределить товар хотя бы по одной зоне' })
  @ValidateNested({ each: true })
  @Type(() => CreateReceivingAllocationDto)
  allocations!: CreateReceivingAllocationDto[];
}

export class CreateReceivingDto {
  @IsString({ message: 'Некорректный поставщик' })
  @IsNotEmpty({ message: 'Выберите поставщика' })
  supplierId!: string;

  // YYYY-MM-DD — сравниваем на сервере с сегодняшней датой.
  @IsISO8601({ strict: true }, { message: 'Некорректная дата поступления' })
  receivedAt!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Стоимость доставки должна быть числом (до 2 знаков)' })
  @Min(0, { message: 'Стоимость доставки не может быть отрицательной' })
  @Max(MONEY_MAX, { message: 'Слишком большая стоимость доставки' })
  deliveryCost!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Код валюты должен быть из 3 символов (ISO 4217)' })
  currency?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Добавьте хотя бы один товар' })
  @ValidateNested({ each: true })
  @Type(() => CreateReceivingItemDto)
  items!: CreateReceivingItemDto[];
}
