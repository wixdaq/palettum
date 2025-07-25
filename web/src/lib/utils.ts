import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Rgb, type Palette } from "palettum";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LIMITS = {
  MIN_COLORS: 1,
  MAX_COLORS: 255,
  MAX_ID_LENGTH: 50,
  // TODO: Delineate between max draw dimension and max encode dimension
  MAX_DIMENSION: 2048,
  MAX_FILE_SIZE: 200 * 1024 * 1024,
} as const;

export const DEFAULTS = {
  COLOR: { r: 0, g: 0, b: 0 },
} as const;

export function rgbToHex({ r, g, b }: Rgb): string {
  return (
    "#" +
    [r, g, b]
      .map((x) =>
        Math.max(0, Math.min(255, Math.round(x)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function hexToRgb(hex: string): Rgb | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function normalizeColor(color: Rgb): Rgb {
  return {
    r: Math.min(255, Math.max(0, Math.round(color.r))),
    g: Math.min(255, Math.max(0, Math.round(color.g))),
    b: Math.min(255, Math.max(0, Math.round(color.b))),
  };
}

export function isSameColor(a: Rgb, b: Rgb): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function validatePalette(palette: Palette): string[] {
  const errors: string[] = [];

  if (!palette.id || !palette.id.trim()) {
    errors.push("Palette id is required");
  }

  const colorCount = palette.colors?.length ?? 0;

  if (colorCount < LIMITS.MIN_COLORS) {
    errors.push(
      `Palette must have at least ${LIMITS.MIN_COLORS} color${LIMITS.MIN_COLORS > 1 ? "s" : ""}`,
    );
  }

  if (colorCount > LIMITS.MAX_COLORS) {
    errors.push(`Palette cannot have more than ${LIMITS.MAX_COLORS} colors`);
  }

  return errors;
}

export function getContrastColor(color: Rgb | string, alpha = 1): string {
  let r: number, g: number, b: number;

  if (typeof color === "string") {
    const hex = color.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    ({ r, g, b } = color);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6
    ? `rgba(0,0,0,${alpha})`
    : `rgba(255,255,255,${alpha})`;
}

export function getContrastTextColor(color: Rgb | string): "black" | "white" {
  let r: number, g: number, b: number;

  if (typeof color === "string") {
    const hex = color.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    ({ r, g, b } = color);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}

export function getOppositeTextColor(color: Rgb | string): "black" | "white" {
  return getContrastTextColor(color) === "black" ? "white" : "black";
}

export const generateUniqueId = (
  baseId: string,
  existingIds: Set<string>,
): string => {
  let counter = 0;
  let candidate = baseId.slice(0, LIMITS.MAX_ID_LENGTH);

  while (existingIds.has(candidate)) {
    counter += 1;
    const suffix = `-${counter}`;
    const maxBase = LIMITS.MAX_ID_LENGTH - suffix.length;
    candidate = `${baseId.slice(0, maxBase)}${suffix}`;
  }

  return candidate;
};

export const getDisplayedColors = (
  palette: Palette,
  maxColors: number,
  startIndex: number,
) => {
  if (palette.colors.length <= maxColors) {
    return palette.colors;
  }
  const displayed = [];
  for (let i = 0; i < maxColors; i++) {
    const index = (startIndex + i) % palette.colors.length;
    displayed.push(palette.colors[index]);
  }
  return displayed;
};

// TODO: A media type should be passed here that can
// retrieve type much easier in sync with the rest of the app
export async function checkAlphaChannel(file: File): Promise<boolean> {
  if (file.type.startsWith("video/")) {
    return false;
  }
  const image = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] < 255) {
      return true;
    }
  }
  return false;
}
