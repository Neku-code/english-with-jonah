import { createHash } from 'node:crypto';
import content from '../../learning/unit1.json';
import keys from './unit1-keys.json';
import type { LessonContent } from '../../learning/types';
export const unit1 = content as LessonContent[];
export const unit1Keys = keys;
export function stableUuid(id: string) { const h = createHash('sha256').update('learn-with-jonah:' + id).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; }
export const unit1Id = stableUuid('u1');
