import * as Papa from "papaparse";
import { detectDelimiter } from "./delimiter";
import { ColumnSource } from "./columnOperations";

/** Parses delimited text into a header row plus data rows. */
export const parseColumnSource = (content: string): ColumnSource => {
  if (content.trim() === "") return { headers: [], rows: [] };

  const { data } = Papa.parse<string[]>(content, {
    delimiter: detectDelimiter(content),
    header: false,
    skipEmptyLines: true,
    transform: (value: string) => value.trim(),
  });

  const [headers = [], ...rows] = data;
  return { headers, rows };
};
