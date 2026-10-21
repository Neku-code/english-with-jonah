import content from '../../learning/unit2.json';
import keys from './unit2-keys.json';
import type { LessonContent } from '../../learning/types';
import { stableUuid } from './unit1';

export const unit2 = content as LessonContent[];
export const unit2Keys = keys;
export const unit2Id = stableUuid('u2');
