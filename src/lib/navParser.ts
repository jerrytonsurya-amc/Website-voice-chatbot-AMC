import XLSX from "xlsx";
import { resolveProjectFile } from "./resolveProjectFile";

export const parseNavFile = () => {
  const filePath = resolveProjectFile("Month_End_NAV.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
};
