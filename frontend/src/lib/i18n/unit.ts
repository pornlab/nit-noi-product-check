import type { Unit } from '@/types/unit';
import type { I18nKey } from './provider';

/** i18n-ключ для базовой единицы. Использование: t(unitLabelKey('GRAM')). */
export function unitLabelKey(u: Unit): I18nKey {
  return `units.${u}` as I18nKey;
}
