import { parse } from "csv-parse";

export const parseCSVStream = (csvData: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const parser = parse({
      columns: true,
      trim: true,
      skip_empty_lines: true,
      bom: true,
      cast: (value, context) => {
        if (typeof value === "string") {
          return value.trim();
        }
        return value;
      },
    });

    parser.on("data", (row) => {
      const trimmedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() : value,
        ])
      );
      records.push(trimmedRow);
    });
    parser.on("end", () => resolve(records));
    parser.on("error", (err) => reject(err));
    parser.write(csvData);
    parser.end();
  });
};
