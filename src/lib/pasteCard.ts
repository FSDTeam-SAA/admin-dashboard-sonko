// Pasting a card designed elsewhere (by a designer, or a Claude draft).
// Only the words and one picture are kept: no tags, styles, scripts, links
// or buttons ever reach the card. The server refuses code in the words too
// (utils/offerCard.rules.js codeProblem).

export type PastedCard = {
  title: string;
  body: string;
  /** A picture written inside the code (data:image/…), ready to upload. */
  pictureData: string | null;
  /** A picture on another website: not allowed, it must be uploaded. */
  pictureElsewhere: string | null;
  /** How many links, buttons or scripts were thrown away. */
  removed: number;
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
// Web, email and phone details are never kept in the words.
const LINKISH = /(https?:\/\/|www\.|[a-z0-9.-]+\.(com|app|net|org|io|sn|gm)\b|\S+@\S+\.\S+)/i;
const strip = (s: string) => clean(s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/[<>]/g, " "));

/** The words and picture from pasted code (or plain text). */
export function wordsFromPaste(input: string): PastedCard {
  const text = input || "";
  const result: PastedCard = { title: "", body: "", pictureData: null, pictureElsewhere: null, removed: 0 };
  if (!/[<>]/.test(text)) {
    // Plain text: first line is the title, the rest the message.
    const lines = text.split(/\n+/).map(clean).filter(Boolean);
    result.title = lines[0] || "";
    result.body = lines.slice(1).join(" ");
    return dropLinks(result);
  }
  const doc = typeof DOMParser !== "undefined" ? new DOMParser().parseFromString(text, "text/html") : null;
  if (!doc) {
    result.body = strip(text);
    return dropLinks(result);
  }
  // Count and throw away anything that could act.
  doc.querySelectorAll("script, style, iframe, object, embed, form, input, button, a, link, meta, svg, video, audio").forEach((el) => {
    if (el.tagName === "A" || el.tagName === "BUTTON") result.removed += 1;
    if (el.tagName === "SCRIPT" || el.tagName === "IFRAME" || el.tagName === "FORM") result.removed += 1;
    if (el.tagName === "A") el.replaceWith(doc.createTextNode(el.textContent || ""));
    else el.remove();
  });
  const img = doc.querySelector("img");
  const src = img?.getAttribute("src") || "";
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(src)) result.pictureData = src;
  else if (src) result.pictureElsewhere = src;
  // The first heading (or bold line) is the title; the other text is the message.
  const heading = doc.querySelector("h1, h2, h3, h4, strong, b");
  result.title = clean(heading?.textContent || "");
  heading?.remove();
  const parts = [...doc.querySelectorAll("p, li, span, div")]
    .filter((el) => !el.querySelector("p, li, div"))
    .map((el) => clean(el.textContent || ""))
    .filter(Boolean);
  const unique = [...new Set(parts)];
  result.body = unique.length ? unique.join(" ") : clean(doc.body?.textContent || "");
  if (!result.title && result.body) {
    const [first, ...rest] = result.body.split(/(?<=[.!?])\s+/);
    result.title = first ?? "";
    result.body = rest.join(" ");
  }
  return dropLinks(result);
}

function dropLinks(r: PastedCard): PastedCard {
  const keep = (s: string) =>
    s
      .split(/\s+/)
      .filter((w) => {
        const bad = LINKISH.test(w) || /\d{7,}/.test(w.replace(/[\s()+-]/g, ""));
        if (bad) r.removed += 1;
        return !bad;
      })
      .join(" ");
  return { ...r, title: keep(r.title).slice(0, 60), body: keep(r.body).slice(0, 160) };
}

/** A data:image/… address as a file, to upload with the Picture button's route. */
export function fileFromData(dataUrl: string, name = "pasted-picture"): File | null {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  const mime = m[1], kind = m[2], data = m[3];
  try {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    if (bytes.length > 5 * 1024 * 1024) return null;
    const ext = kind.toLowerCase() === "jpeg" ? "jpg" : kind.toLowerCase();
    return new File([bytes], `${name}.${ext}`, { type: mime.toLowerCase() });
  } catch {
    return null;
  }
}

// Where a tap on the card goes. The same list as the server (ACTIONS) and the app.
export const CARD_ACTIONS = [
  ["none", "No button", "", ""],
  ["tickets", "See tickets (opens the event in the app)", "See tickets", "Voir les billets"],
  ["send", "Send money", "Send money", "Envoyer de l’argent"],
  ["request", "Request money", "Request money", "Demander de l’argent"],
  ["airtime", "Airtime", "Buy airtime", "Acheter du crédit"],
  ["bills", "Pay bills", "Pay a bill", "Payer une facture"],
  ["add_money", "Add money", "Add money", "Ajouter de l’argent"],
  ["invite", "Invite friends", "Invite friends", "Inviter des amis"],
  ["repeat", "Repeat transfers", "Set it up", "Programmer"],
] as const;

export function buttonLabel(action: string, lang: "en" | "fr"): string {
  const row = CARD_ACTIONS.find((a) => a[0] === action);
  return row ? (lang === "fr" ? row[3] : row[2]) : "";
}
