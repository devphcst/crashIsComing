export const calcDrawdown = (price: number, peak: number): number => {
  if (!isFinite(price) || !isFinite(peak) || peak <= 0) return 0;
  return ((price - peak) / peak) * 100;
};
