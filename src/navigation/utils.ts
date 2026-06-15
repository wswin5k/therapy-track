export function dayDifference(firstTime: Date, secondDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    Math.abs((firstTime.getTime() - secondDate.getTime()) / oneDay),
  );
}
