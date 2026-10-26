export type ProjectStatus = "active" | "archived" | "completed";

export function generateProjectKey(
  name: string,
  existingKeys?: Set<string> | string[]
): string {
  const set = existingKeys instanceof Set ? existingKeys : new Set(existingKeys || []);

  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  let candidate = "";

  if (words.length >= 2) {
    candidate = words
      .map((w) => w[0])
      .slice(0, 5)
      .join("");
  } else if (words.length === 1) {
    const single = words[0];
    if (single.length >= 2) {
      candidate = single.slice(0, Math.min(single.length, 4));
    } else {
      candidate = single + "P";
    }
  }

  // Ensure only A-Z
  candidate = candidate.replace(/[^A-Z]/g, "");

  if (candidate.length < 2) {
    candidate = (candidate + "PR").slice(0, 2);
  } else if (candidate.length > 5) {
    candidate = candidate.slice(0, 5);
  }

  let finalKey = candidate;
  let counter = 1;
  while (set.has(finalKey)) {
    const charSuffix = String.fromCharCode(65 + ((counter - 1) % 26));
    const base = candidate.slice(0, Math.min(candidate.length, 4));
    finalKey = (base + charSuffix).slice(0, 5);
    counter++;
    if (counter > 50) {
      finalKey = "PRJ" + String.fromCharCode(65 + (counter % 26));
      break;
    }
  }

  return finalKey;
}
