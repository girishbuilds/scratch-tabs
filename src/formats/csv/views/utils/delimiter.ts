const CANDIDATE_DELIMITERS = ["\t", ",", ";", "|"];

/** Picks the delimiter that occurs most often in the first line (default: comma). */
export const detectDelimiter = (content: string): string => {
  const firstLine = content.split("\n")[0] || "";

  const counts = CANDIDATE_DELIMITERS.map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length - 1,
  }));

  const detected = counts.reduce((max, curr) =>
    curr.count > max.count ? curr : max,
  );
  return detected.count > 0 ? detected.delimiter : ",";
};
