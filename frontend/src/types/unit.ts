export type Unit =
  | 'PIECE'
  | 'GRAM'
  | 'KILOGRAM'
  | 'MILLILITER'
  | 'LITER'
  | 'PACK'
  | 'BOX'
  | 'BOTTLE'
  | 'CAN'
  | 'BAG';

export const unitLabels: Record<Unit, string> = {
  PIECE: 'шт.',
  GRAM: 'г',
  KILOGRAM: 'кг',
  MILLILITER: 'мл',
  LITER: 'л',
  PACK: 'упак.',
  BOX: 'кор.',
  BOTTLE: 'бут.',
  CAN: 'банка',
  BAG: 'мешок',
};

export function getUnitLabel(unit: Unit): string {
  return unitLabels[unit];
}
