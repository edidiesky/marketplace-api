export const formatAmountWithSuffix = (amount: number, decimal: number = 2): string => {
  if (amount === 0) return "0";
  const absValue = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absValue >= 1_000_000_000_000) {
    const formattedAmt = (absValue / 1_000_000_000_000).toFixed(decimal);
    return `${sign}${formattedAmt}T`;
  } else if (absValue >= 1_000_000_000) {
    const formattedAmt = (absValue / 1_000_000_000).toFixed(decimal);
    return `${sign}${formattedAmt}B`;
  } else if (absValue >= 1_000_000) {
    const formattedAmt = (absValue / 1_000_000).toFixed(decimal);
    return `${sign}${formattedAmt}M`;
  } else if (absValue >= 1_000) {
    const formattedAmt = (absValue / 1_000).toFixed(decimal);
    return `${sign}${formattedAmt}K`;
  } else {
    return `${sign}${absValue.toFixed(decimal)}`;
  }
};
