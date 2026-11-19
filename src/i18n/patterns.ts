// Some messages are built in lib code with codes and numbers inside. These
// patterns turn them back into a fixed French/English sentence with {slots}.
type T = (text: string, vars?: Record<string, string | number>) => string;

const PATTERNS: [RegExp, string, string[]][] = [
  [/^(\w+): type a number above zero$/, "{code}: type a number above zero", ["code"]],
  [/^(\w+) moves more than 25% at once — check it, or change it in steps$/, "{code} moves more than 25% at once — check it, or change it in steps", ["code"]],
  [/^(\w+) moves more than 5%$/, "{code} moves more than 5%", ["code"]],
  [/^100 (\w+) becomes (\S+) GMD \(now (\S+)\)$/, "100 {code} becomes {next} GMD (now {now})", ["code", "next", "now"]],
  [/^1,000 GMD becomes (\S+) (\w+) \(now (\S+)\)$/, "1,000 GMD becomes {next} {code} (now {now})", ["next", "code", "now"]],
  // Backups page: sentences the server builds with a number of hours or days.
  [/^The newest backup is (\d+) hours old\. This is normal\.$/, "The newest backup is {n} hours old. This is normal.", ["n"]],
  [/^The newest backup is (\d+) hours old\. One may have been missed\.$/, "The newest backup is {n} hours old. One may have been missed.", ["n"]],
  [/^The newest backup is (\d+) hours old\. Backups have stopped or failed\. Ask the developer to check today\.$/, "The newest backup is {n} hours old. Backups have stopped or failed. Ask the developer to check today.", ["n"]],
  [/^A restore was proved (\d+) days ago\.$/, "A restore was proved {n} days ago.", ["n"]],
  [/^The last proved restore was (\d+) days ago\. Ask the developer to repeat it\.$/, "The last proved restore was {n} days ago. Ask the developer to repeat it.", ["n"]],
];

/** Translate a message from lib code, whether fixed or built from a pattern. */
export function tp(t: T, text: string): string {
  for (const [re, key, names] of PATTERNS) {
    const m = re.exec(text);
    if (m) return t(key, Object.fromEntries(names.map((n, i) => [n, m[i + 1]!])));
  }
  return t(text);
}
