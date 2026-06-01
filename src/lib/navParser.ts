import path from "path";
import XLSX from "xlsx";

export const parseNavFile = () => {
  const filePath = path.join(process.cwd(), "Month_End_NAV.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
};
