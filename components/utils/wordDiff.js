/**
 * Word-level diff utility using LCS (Longest Common Subsequence).
 * Compares a target sentence against what the user actually said,
 * identifying which words were correct vs. missing.
 */
export function wordDiff(target, spoken) {
  const clean = (text) =>
    text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"''\[\]]/g, "").trim();

  const targetWords = clean(target).split(/\s+/).filter((w) => w.length > 0);
  const spokenWords = clean(spoken || "").split(/\s+/).filter((w) => w.length > 0);

  // No speech detected
  if (spokenWords.length === 0) {
    return {
      words: targetWords.map((w) => ({ word: w, status: "missing" })),
      accuracy: 0,
      matchedCount: 0,
      totalWords: targetWords.length,
      spokenWordCount: 0,
    };
  }

  // Build LCS table
  const m = targetWords.length;
  const n = spokenWords.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (targetWords[i - 1] === spokenWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to mark which target words were matched
  const wordResults = targetWords.map((w) => ({ word: w, status: "missing" }));
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (targetWords[i - 1] === spokenWords[j - 1]) {
      wordResults[i - 1] = { word: targetWords[i - 1], status: "correct" };
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const matchedCount = dp[m][n];
  const accuracy = m > 0 ? Math.round((matchedCount / m) * 100) : 0;

  return {
    words: wordResults,
    accuracy,
    matchedCount,
    totalWords: m,
    spokenWordCount: n,
  };
}