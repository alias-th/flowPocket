import blockedWords from "../data/blocked-words.json";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 
g = Global ค้นหาและแทนที่ทุกตำแหน่งในข้อความ
u = Unicode ประมวลผลตัวอักษรแบบ Unicode เหมาะกับภาษาไทย อีโมจิ และอักษรนอก ASCII 
"เหี้ย เหี้ย".replace(/เหี้ย/g, "***");
// "*** ***"
*/
const thaiPatterns = blockedWords.th.map(
  (word) => new RegExp(escapeRegExp(word), "gu"),
);

/** 
\p{L} ตัวอักษรทุกภาษา
\p{N} ตัวเลข
_  Regular Expression
 */
const englishPatterns = [...blockedWords.en]
  .sort((first, second) => second.length - first.length)
  .map(
    (word) =>
      new RegExp(
        `(?<![\\p{L}\\p{N}_])${escapeRegExp(word)}(?![\\p{L}\\p{N}_])`,
        "giu",
      ),
  );

export const censorWords = (text: string | null): string | null => {
  if (!text) return null;
  const patterns = [...thaiPatterns, ...englishPatterns];

  return patterns.reduce(
    (result, pattern) => result.replace(pattern, "***"),
    text,
  );
};
