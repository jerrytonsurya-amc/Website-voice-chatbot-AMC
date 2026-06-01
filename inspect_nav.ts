import { parseNavFile } from "./src/lib/navParser";

const data = parseNavFile();
const uniqueSchemes = Array.from(new Set(data.map((row: any) => row["Scheme "])));
const uniqueTypes = Array.from(new Set(data.map((row: any) => row["Type "])));
const dateSamples = Array.from(new Set(data.map((row: any) => row["Date"]))).slice(0, 10);

console.log("Unique Schemes:", uniqueSchemes);
console.log("Unique Types:", uniqueTypes);
console.log("Total rows:", data.length);
console.log("Date Samples:", dateSamples);

