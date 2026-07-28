import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

export class ZoneAssignmentDto {
  @IsUUID()
  zoneId!: string;

  @IsBoolean()
  isResponsible!: boolean;
}

export class ReplaceZonesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneAssignmentDto)
  @ArrayUnique((z: ZoneAssignmentDto) => z.zoneId, { message: 'Зоны не должны дублироваться' })
  zones!: ZoneAssignmentDto[];
}
