import fs   from "fs";
import path from "path";
import logger from "./logger";

interface FontSet {
  regular: string;
  medium:  string;
  bold:    string;
}

let cachedFonts: FontSet | null = null;

export function getBase64Fonts(): FontSet {
  if (cachedFonts) return cachedFonts;

  const assetsBase = process.env.NODE_ENV === "production"
    ? path.join("/app", "assets", "fonts")
    : path.join(__dirname, "../assets/fonts");

  const fonts: Record<keyof FontSet, string> = {
    regular: path.join(assetsBase, "Cabinet-regular.ttf"),
    medium:  path.join(assetsBase, "Cabinet-medium.ttf"),
    bold:    path.join(assetsBase, "Cabinet-bold.ttf"),
  };

  for (const [key, fontPath] of Object.entries(fonts)) {
    if (!fs.existsSync(fontPath)) {
      logger.error("Font file not found", { key, path: fontPath });
      throw new Error(`Cabinet ${key} font not found at: ${fontPath}`);
    }
  }

  logger.info("Cabinet fonts loaded successfully", { assetsBase });

  cachedFonts = {
    regular: fs.readFileSync(fonts.regular).toString("base64"),
    medium:  fs.readFileSync(fonts.medium).toString("base64"),
    bold:    fs.readFileSync(fonts.bold).toString("base64"),
  };

  return cachedFonts;
}