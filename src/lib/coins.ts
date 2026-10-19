/** Keep ordinary balances numeric, and preserve exact decimal totals above JS's safe range. */
export function coinBalance(value:bigint|string) {
 const exact=BigInt(value);
 return exact<=BigInt(Number.MAX_SAFE_INTEGER)&&exact>=BigInt(Number.MIN_SAFE_INTEGER)?Number(exact):exact.toString();
}
