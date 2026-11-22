import { useMemo, useState } from "react";
import {
  approveOfferCard,
  makeOfferCard,
  offerCards,
  ticketEvents,
  uploadOfferPicture,
  withdrawOfferCard,
  type OfferCard,
  type OfferCardDraft,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { STATE_LABEL, textProblem } from "./AnnouncementsPage";
import { CARD_ACTIONS, buttonLabel, fileFromData, wordsFromPaste } from "../lib/pasteCard";

/** The poster colours when there is no picture. The app uses the same four. */
export const ART: Record<OfferCard["art"], string> = {
  sunset: "linear-gradient(130deg, #f24a0a, #b0287f 55%, #3a3fc9)",
  ocean: "linear-gradient(130deg, #0aa2c0, #1f5fd6 60%, #2b2f8f)",
  forest: "linear-gradient(130deg, #1f9d55, #0f6b4f 60%, #12343b)",
  night: "linear-gradient(130deg, #3a3fc9, #2a1f63 60%, #0e1130)",
};

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

/** The card as it looks at the end of Home in the app. */
export function OfferCardPreview({ d, lang }: { d: OfferCardDraft; lang: "en" | "fr" }) {
  const fr = lang === "fr";
  const title = (fr ? d.titleFr : d.titleEn) || (fr ? "Titre" : "Title");
  const body = (fr ? d.bodyFr : d.bodyEn) || (fr ? "Votre message" : "Your message");
  const date = d.eventDate ? new Date(d.eventDate).toLocaleString(fr ? "fr-FR" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const button = buttonLabel(d.action, lang);
  return (
    <div className="phone-preview offer-preview">
      <div className="op-card" style={{ background: d.imageUrl ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.6)), center / cover url(${d.imageUrl})` : ART[d.art] }}>
        {d.sponsored && <span className="op-sponsor">{fr ? "Sponsorisé" : "Sponsored"}{d.sponsorName ? ` · ${d.sponsorName}` : ""}</span>}
        <div className="op-text">
          <b>{title}</b>
          <span>{body}</span>
          {date && <small>{date}</small>}
        </div>
        {button && <span className="op-button">{button}</span>}
      </div>
      <p className="muted small" style={{ margin: "10px 2px 0", color: "#a3a9b6" }}>{fr ? "Fin de l’écran d’accueil" : "End of the Home screen"}</p>
    </div>
  );
}

/** Same checks as the server (utils/offerCard.rules.js). The server checks again. */
export function offerProblems(d: OfferCardDraft) {
  return {
    titleEn: textProblem(d.titleEn, 60),
    titleFr: textProblem(d.titleFr, 60),
    bodyEn: textProblem(d.bodyEn, 160),
    bodyFr: textProblem(d.bodyFr, 160),
    sponsorName: d.sponsored ? textProblem(d.sponsorName, 60) : null,
    eventId: d.action === "tickets" && !d.eventId ? "Choose the event." : null,
  };
}

/**
 * The card at the very end of Home in the app: Sunu Pay's own offers, and
 * things advertisers ask us to promote. Staff make every card, a different
 * staff member approves it, and anyone with the permission can take it down.
 */
export function OfferCardsPage() {
  const t = useT();
  const { staff } = useAuth();
  const [reload, setReload] = useState(0);
  const [making, setMaking] = useState(false);
  const [approving, setApproving] = useState<OfferCard | null>(null);
  const [removing, setRemoving] = useState<OfferCard | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => offerCards(), [reload]);
  const rows = data ?? [];
  const finish = (message: string) => {
    setMaking(false);
    setApproving(null);
    setRemoving(null);
    setDone(message);
    setReload((n) => n + 1);
  };
  return (
    <section>
      <PageHeader
        title="Offer cards"
        intro="One card at the very end of Home in the app, seen only when a customer scrolls down. A small glass hint above the tab bar tells them it is there. Advertiser cards always say Sponsored. A different staff member must approve each card."
        actions={
          <button className="primary" onClick={() => setMaking(true)}>
            {t("Make a card")}
          </button>
        }
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((c) => (
        <article key={c.id} className="card" style={{ padding: 16, marginBottom: 12, display: "grid", gridTemplateColumns: "120px 1fr", gap: 16 }}>
          <div
            aria-hidden="true"
            style={{ borderRadius: 12, minHeight: 90, background: c.imageUrl ? `center / cover url(${c.imageUrl})` : ART[c.art] }}
          />
          <div>
            <p>
              <Badge tone={STATE_LABEL[c.state].tone}>{t(STATE_LABEL[c.state].label)}</Badge>{" "}
              {c.sponsored && <Badge tone="plain">{t("Sponsored by {name}", { name: c.sponsorName })}</Badge>}{" "}
              <span className="muted small">
                {c.country === "ALL" ? t("All countries") : c.country} · {t("{from} to {to}", { from: when(c.startsAt), to: when(c.endsAt) })}
                {c.action !== "none" ? ` · ${t("Button: {label}", { label: t(CARD_ACTIONS.find((a) => a[0] === c.action)?.[1] ?? c.action) })}` : ""}
              </span>
            </p>
            <h3>{c.titleEn}</h3>
            <p>{c.bodyEn}</p>
            <p className="muted">
              <strong>{c.titleFr}</strong> — {c.bodyFr}
            </p>
            <p className="muted small">
              {t("Made by {name}, {when}", { name: c.createdByName || "—", when: when(c.createdAt) })}
              {c.approvedByName ? ` · ${t("Approved by {name}", { name: c.approvedByName })}` : ""}
              {c.withdrawnAt ? ` · ${t("Taken down by {name}, {when}", { name: c.withdrawnByName || "—", when: when(c.withdrawnAt) })}` : ""}
            </p>
            {c.state === "waiting" && c.createdBy !== staff?._id && <button onClick={() => setApproving(c)}>{t("Review and approve")}</button>}
            {c.state === "waiting" && c.createdBy === staff?._id && <p className="hint">{t("You made this card. A different staff member must approve it.")}</p>}
            {(c.state === "waiting" || c.state === "scheduled" || c.state === "live") && (
              <button className="danger" onClick={() => setRemoving(c)}>
                {t("Take down")}
              </button>
            )}
          </div>
        </article>
      ))}
      {making && <MakeDialog onClose={() => setMaking(false)} onDone={finish} />}
      {approving && <ApproveDialog c={approving} onClose={() => setApproving(null)} onDone={finish} />}
      {removing && <TakeDownDialog c={removing} onClose={() => setRemoving(null)} onDone={finish} />}
    </section>
  );
}

function MakeDialog({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const events = useLoad(() => ticketEvents(), []);
  const [draft, setDraft] = useState<OfferCardDraft>({
    titleEn: "",
    titleFr: "",
    bodyEn: "",
    bodyFr: "",
    sponsored: true,
    sponsorName: "",
    country: "ALL",
    art: "sunset",
    imageUrl: "",
    eventDate: null,
    action: "none",
    eventId: null,
    startsAt: inDays(0),
    endsAt: inDays(14),
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "fr">("en");
  const [paste, setPaste] = useState("");
  const [pasteInto, setPasteInto] = useState<"en" | "fr">("en");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const key = useMemo(newIdempotencyKey, []);
  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const url = (await uploadOfferPicture(file)).url;
      setDraft((d) => ({ ...d, imageUrl: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const usePaste = async () => {
    const got = wordsFromPaste(paste);
    setDraft((d) => (pasteInto === "en" ? { ...d, titleEn: got.title, bodyEn: got.body } : { ...d, titleFr: got.title, bodyFr: got.body }));
    setLang(pasteInto);
    const notes: string[] = [t("Took the words out of the code.")];
    if (got.removed) notes.push(t("Left out {n} links, buttons or scripts: a card is words and a picture only.", { n: got.removed }));
    if (got.pictureElsewhere) notes.push(t("The picture is on another website, which isn't allowed. Save it and upload it with the Picture button."));
    setPasteNote(notes.join(" "));
    setPaste("");
    if (got.pictureData) {
      const file = fileFromData(got.pictureData);
      if (file) await upload(file);
      else setUploadError("The picture in the code is not a JPG, PNG or WebP under 5 MB.");
    }
  };
  const set = <K extends keyof OfferCardDraft>(field: K, value: OfferCardDraft[K]) => setDraft({ ...draft, [field]: value });
  const problems = offerProblems(draft);
  const ok = Object.values(problems).every((p) => p === null) && /^(ALL|[A-Z]{2})$/.test(draft.country) && draft.endsAt > draft.startsAt && !uploading;
  const text = (name: "titleEn" | "titleFr" | "bodyEn" | "bodyFr", label: string, max: number) => (
    <label>
      {t(label)}
      {name.startsWith("title") ? (
        <input value={draft[name]} maxLength={max} onChange={(e) => set(name, e.target.value)} />
      ) : (
        <textarea rows={2} value={draft[name]} maxLength={max} onChange={(e) => set(name, e.target.value)} />
      )}
      {draft[name] && problems[name] && <span className="hint warn-text">{t(problems[name]!.startsWith("3 to ") ? "3 to {max} characters." : problems[name]!, { max })}</span>}
    </label>
  );
  const onSale = (events.data ?? []).filter((e) => e.state === "on_sale" || e.state === "waiting");
  return (
    <ConfirmWithPin
      title="Make an offer card"
      confirmLabel="Send for approval"
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        await makeOfferCard(
          {
            ...draft,
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
            eventDate: draft.eventDate ? new Date(draft.eventDate).toISOString() : null,
          },
          pin,
          key,
        );
        onDone("Made. A different staff member must approve it before customers see it.");
      }}
    >
      <div className="editor-split">
      <div className="editor-form">
      <details className="paste-box" open={!draft.titleEn && !draft.titleFr}>
        <summary>{t("Paste a card from a designer or Claude")}</summary>
        <p className="hint">{t("Paste the code or text. Only the words and one picture are kept: links, buttons, styles and scripts are thrown away. Check the preview, then fix the words below.")}</p>
        <textarea rows={4} value={paste} placeholder="<h2>…</h2><p>…</p>" onChange={(e) => setPaste(e.target.value)} />
        <div className="row-start">
          <label className="check">
            <input type="radio" checked={pasteInto === "en"} onChange={() => setPasteInto("en")} /> {t("English")}
          </label>
          <label className="check">
            <input type="radio" checked={pasteInto === "fr"} onChange={() => setPasteInto("fr")} /> {t("French")}
          </label>
          <button type="button" disabled={!paste.trim()} onClick={usePaste}>
            {t("Use these words")}
          </button>
        </div>
        {pasteNote && <p className="notice small">{pasteNote}</p>}
      </details>
      <fieldset className="choices">
        <legend>{t("Whose card is it?")}</legend>
        <label className="check">
          <input type="radio" checked={draft.sponsored} onChange={() => set("sponsored", true)} /> {t("An advertiser's (shows Sponsored)")}
        </label>
        <label className="check">
          <input type="radio" checked={!draft.sponsored} onChange={() => setDraft({ ...draft, sponsored: false, sponsorName: "" })} /> {t("Sunu Pay's own offer")}
        </label>
      </fieldset>
      {draft.sponsored && (
        <label>
          {t("Advertiser name (shown on the card)")}
          <input value={draft.sponsorName} maxLength={60} onChange={(e) => set("sponsorName", e.target.value)} />
        </label>
      )}
      {text("titleEn", "Title (English)", 60)}
      {text("bodyEn", "Message (English)", 160)}
      {text("titleFr", "Title (French)", 60)}
      {text("bodyFr", "Message (French)", 160)}
      <label>
        {t("Picture (optional; without one the card uses the colours below)")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await upload(file);
          }}
        />
        {uploading && <span className="hint">{t("Uploading…")}</span>}
        {uploadError && <span className="hint warn-text">{t(uploadError)}</span>}
      </label>
      <label>
        {t("Colours")}
        <select value={draft.art} onChange={(e) => set("art", e.target.value as OfferCard["art"])}>
          <option value="sunset">{t("Sunset")}</option>
          <option value="ocean">{t("Ocean")}</option>
          <option value="forest">{t("Forest")}</option>
          <option value="night">{t("Night")}</option>
        </select>
      </label>
      <label>
        {t("Event date on the card (optional)")}
        <input type="datetime-local" value={draft.eventDate ?? ""} onChange={(e) => set("eventDate", e.target.value || null)} />
      </label>
      <label>
        {t("The button")}
        <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value as OfferCard["action"], eventId: null })}>
          {CARD_ACTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
        <span className="hint">{t("A tap only ever opens a screen inside the app, never a website.")}</span>
      </label>
      {draft.action === "tickets" && (
        <label>
          {t("Event")}
          <select value={draft.eventId ?? ""} onChange={(e) => set("eventId", e.target.value || null)}>
            <option value="">{t("Choose…")}</option>
            {onSale.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titleEn} · {when(e.startsAt)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t("Country (two letters, or ALL)")}
        <input value={draft.country} maxLength={3} onChange={(e) => set("country", e.target.value.toUpperCase())} />
      </label>
      <label>
        {t("Starts")}
        <input type="datetime-local" value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
      </label>
      <label>
        {t("Ends (60 days at most)")}
        <input type="datetime-local" value={draft.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
      </label>
      </div>
      <div className="editor-preview">
        <div className="row-start small">
          <span className="muted">{t("How it looks in the app")}</span>
          <button type="button" className={lang === "en" ? "chip on" : "chip"} onClick={() => setLang("en")}>EN</button>
          <button type="button" className={lang === "fr" ? "chip on" : "chip"} onClick={() => setLang("fr")}>FR</button>
        </div>
        <OfferCardPreview d={draft} lang={lang} />
      </div>
      </div>
    </ConfirmWithPin>
  );
}

function ApproveDialog({ c, onClose, onDone }: { c: OfferCard; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve this offer card"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveOfferCard(c.id, pin, key);
        onDone("Approved. Customers will see it from its start time.");
      }}
    >
      <p>{t("Customers in {country} will see this at the end of Home from {from} to {to}. Read both languages and check the advertiser: you are the second check.", { country: c.country === "ALL" ? t("all countries") : c.country, from: when(c.startsAt), to: when(c.endsAt) })}</p>
      {c.sponsored && <p><Badge tone="plain">{t("Sponsored by {name}", { name: c.sponsorName })}</Badge></p>}
      <div className="preview-pair">
        <OfferCardPreview d={c} lang="en" />
        <OfferCardPreview d={c} lang="fr" />
      </div>
    </ConfirmWithPin>
  );
}

function TakeDownDialog({ c, onClose, onDone }: { c: OfferCard; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Take down this card"
      confirmLabel="Take down now"
      danger
      needsPin={false}
      onClose={onClose}
      onConfirm={async () => {
        await withdrawOfferCard(c.id, reason.trim());
        onDone("Taken down. Customers no longer see it.");
      }}
    >
      <p>{t("\"{title}\" stops showing straight away. To show it again, make it again.", { title: c.titleEn })}</p>
      <label>
        {t("Why (optional)")}
        <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}
