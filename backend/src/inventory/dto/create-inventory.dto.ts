import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsNumber, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class InventoryItemDto {
  @IsString()
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Количество должно быть числом (до 3 знаков после запятой)' })
  @Min(0, { message: 'Количество не может быть отрицательным' })
  quantity!: number;
}

export class CreateInventoryDto {
  @IsUUID()
  zoneId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Нужна хотя бы одна позиция' })
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  @ArrayUnique((i: InventoryItemDto) => i.productId, { message: 'Товар не должен повторяться' })
  items!: InventoryItemDto[];
}
