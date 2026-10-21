import { coinBalance } from '../coins';
type Standing = { points: number|string; rank: number; isCurrent: boolean };
/** Exact integer arithmetic also supports negative teacher adjustments and huge totals. */
export function nextRankGap(rows: Standing[]) {
 const current=rows.find(r=>r.isCurrent);
 if(!current)return null;
 const above=rows.filter(r=>BigInt(r.points)>BigInt(current.points));
 if(!above.length)return null;
 const nearest=above.reduce((a,b)=>BigInt(a.points)<BigInt(b.points)?a:b);
 return {rank:nearest.rank,coins:coinBalance(BigInt(nearest.points)-BigInt(current.points))};
}
