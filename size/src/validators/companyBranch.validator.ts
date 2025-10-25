import { getBranchTemplate } from "../utils/getBranchTemplate";


export function validateBranchRowData(
  row: any,
  rowCount: number,
  institutionType: string
): { errors?: { message: string; row: number }[] } {
  const template = getBranchTemplate(institutionType);
  const errors: { message: string; row: number }[] = [];

  // Check required fields from template
  for (const field of template) {
    if (!row[field] || row[field].trim() === "") {
      errors.push({ message: `Missing or empty ${field}`, row: rowCount });
    }
  }

  // Email validation (if present)
  if (row.EMAIL && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(row.EMAIL)) {
    errors.push({ message: "Invalid email format", row: rowCount });
  }

  // Phone validation
  if (row.PHONE && !/^(\+?[1-9]\d{0,2}\s?)?[1-9]\d{9,12}$/.test(row.PHONE)) {
    errors.push({ message: "Invalid phone format", row: rowCount });
  }

  return errors.length > 0 ? { errors } : {};
}