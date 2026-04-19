/**
 * A basic profanity filter for nicknames.
 * Matches common inappropriate words in Vietnamese and English.
 */
const BANNED_WORDS = [
  // Vietnamese
  'cc', 'cl', 'vl', 'vcl', 'đm', 'dm', 'đmm', 'dmm', 'cứt', 'đỉ', 'điếm', 'lồn', 'buồi', 'cu', 'ặc', 'cặc',
  'ngu', 'chó', 'đẻ', 'mẹ', 'cha', 'vú', 'đít', 'phân', 'chuổng',
  // English
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'fag', 'nigger', 'bastard', 'slut', 'whore'
];

/**
 * Checks if a string contains any banned words.
 * @param {string} text 
 * @returns {boolean}
 */
export function isProfane(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase().trim();
  
  // Directly check for banned words as substrings
  // We include spaces to avoid false positives in longer normal words if needed, 
  // but for arcade nicknames (3-10 chars), substring match is usually intended.
  return BANNED_WORDS.some(word => lowerText.includes(word));
}

/**
 * Cleans the string if needed (optional: replaces with ***)
 * @param {string} text 
 * @returns {string}
 */
export function cleanText(text) {
  let cleaned = text;
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '*'.repeat(word.length));
  });
  return cleaned;
}
