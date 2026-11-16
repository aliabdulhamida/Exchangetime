export function alignMarketCloses(times: unknown, closes: unknown) {
  const timestamps: number[] = [];
  const prices: number[] = [];
  if (Array.isArray(times) && Array.isArray(closes)) {
    closes.forEach((price, index) => {
      const stamp = times[index];
      if (typeof price === 'number' && Number.isFinite(price) && Number.isSafeInteger(stamp) && stamp > 0) {
        prices.push(price);
        timestamps.push(stamp);
      }
    });
  }
  return { timestamps, prices };
}
