export function dayDifference(firstTime: Date, secondDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    Math.abs((firstTime.getTime() - secondDate.getTime()) / oneDay),
  );
}

export function mixColors(
  color1: string,
  color2: string,
  weight: number = 0.5,
): string {
  const hexToRgb = (hex: string) => {
    hex = hex.replace(/^#/, "");

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };

  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const w = Math.max(0, Math.min(1, weight));

  const r = Math.round(r1 * w + r2 * (1 - w));
  const g = Math.round(g1 * w + g2 * (1 - w));
  const b = Math.round(b1 * w + b2 * (1 - w));

  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
