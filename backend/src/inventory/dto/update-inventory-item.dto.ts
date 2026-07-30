import { IsNumber, Min } from 'class-validator';

export class UpdateInventoryItemDto {
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Количество должно быть числом (до 3 знаков после запятой)' })
  @Min(0, { message: 'Количество не может быть отрицательным' })
  quantity!: number;
}
