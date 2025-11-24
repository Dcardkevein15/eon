
// A simple Gematria calculator
export function Gematria(word: string): number {
  const values: { [key: string]: number } = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
  };
  return word.split('').reduce((sum, char) => sum + (values[char] || 0), 0);
}

// Finds Equidistant Letter Sequences (ELS)
export function findELS(text: string, word: string, skip: number): number[] {
  if (skip === 0 || !word || !text) return [];
  const indices: number[] = [];
  const textLen = text.length;
  const wordLen = word.length;

  for (let i = 0; i <= textLen - (wordLen - 1) * skip; i++) {
    let found = true;
    for (let j = 0; j < wordLen; j++) {
      const nextCharIndex = i + j * skip;
      if (nextCharIndex >= textLen || text[nextCharIndex] !== word[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      indices.push(i); // Return start index of each occurrence
    }
  }
  return indices;
}

// Finds words at a specific ELS
export function findWordsAtELS(text: string, skip: number, minLength = 3, maxLength = 7, limit = 5): { word: string, startIndex: number }[] {
    const foundWords = [];
    for (let i = 0; i < text.length - (minLength - 1) * skip; i++) {
        let currentWord = '';
        for (let j = 0; j < maxLength; j++) {
            const index = i + j * skip;
            if (index >= text.length) break;
            currentWord += text[index];
            if (j + 1 >= minLength) {
                foundWords.push({ word: currentWord, startIndex: i });
                if (foundWords.length >= limit * 10) return foundWords; // safety break
            }
        }
    }
    return foundWords.slice(0, limit);
}


// Extracts a matrix of characters around a central index
export function extractMatrixFromIndex(text: string, centerIndex: number, size: number = 21): string[][] {
    const matrix: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const center = Math.floor(size / 2);

    const matrixStartIndex = centerIndex - (center * size) - center;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = matrixStartIndex + (row * size) + col;
            if (index >= 0 && index < text.length) {
                matrix[row][col] = text[index];
            }
        }
    }
    return matrix;
}
