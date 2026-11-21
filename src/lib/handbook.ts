// The staff handbook: what each screen is for, in plain words. Written once
// here in English and French. A test fails if a screen in the menu has no entry,
// so a new screen can't be added without saying what it is for.
export type HandbookEntry = {
  path: string;
  /** What the screen is for. */
  what: { en: string; fr: string };
  /** The one thing to be careful about, if there is one. */
  careful?: { en: string; fr: string };
};

export const HANDBOOK: HandbookEntry[] = [
  {
    path: "/",
    what: { en: "Your starting page. Shows what needs attention today.", fr: "Votre page d’accueil. Elle montre ce qui demande de l’attention aujourd’hui." },
  },
  {
    path: "/handbook",
    what: { en: "This page. What each screen is for.", fr: "Cette page. À quoi sert chaque écran." },
  },
  {
    path: "/tickets",
    what: {
      en: "Customer problems. Newest and most urgent come first. Press “Take it” to make a ticket yours, add notes, and close it when it is solved.",
      fr: "Les problèmes des clients. Les plus urgents arrivent en premier. Appuyez sur « Prendre » pour vous attribuer un ticket, ajoutez des notes et fermez-le quand il est résolu.",
    },
    careful: {
      en: "Red means overdue. Never ask a customer for their PIN or password.",
      fr: "Rouge signifie en retard. Ne demandez jamais son code PIN ou son mot de passe à un client.",
    },
  },
  {
    path: "/complaints",
    what: {
      en: "Formal complaints. Each has deadlines set by the regulator: acknowledge, send a holding reply, then a final answer. The “FCA return” button gives the half-year figures.",
      fr: "Les réclamations formelles. Chacune a des délais fixés par le régulateur : accuser réception, envoyer une réponse d’attente, puis une réponse finale. Le bouton « Déclaration FCA » donne les chiffres du semestre.",
    },
    careful: {
      en: "Do not miss a deadline. Record any money paid to put things right when you close a complaint.",
      fr: "Ne dépassez aucun délai. Notez l’argent versé pour réparer le problème quand vous fermez une réclamation.",
    },
  },
  {
    path: "/customers",
    what: {
      en: "Look up a customer, see their file, check who is calling, and send them a message.",
      fr: "Chercher un client, voir son dossier, vérifier l’identité de l’appelant et lui envoyer un message.",
    },
    careful: {
      en: "Check the caller before you change anything on an account or give out details.",
      fr: "Vérifiez l’appelant avant de modifier un compte ou de donner des informations.",
    },
  },
  {
    path: "/transactions",
    what: {
      en: "Search every payment by amount, status, date or reference, and open one to see its steps and any tickets about it.",
      fr: "Rechercher tous les paiements par montant, statut, date ou référence, et en ouvrir un pour voir ses étapes et les tickets liés.",
    },
  },
  {
    path: "/reports",
    what: {
      en: "Payment requests that customers have reported. Look at each one and refund it if it is a mistake or a scam.",
      fr: "Les demandes de paiement signalées par des clients. Examinez chacune et remboursez-la s’il s’agit d’une erreur ou d’une arnaque.",
    },
  },
  {
    path: "/cases",
    what: {
      en: "Debt, fraud and alert cases that need a person to look. Fraud alerts come from the automatic checks. Nothing is blocked automatically.",
      fr: "Les dossiers de dette, de fraude et d’alerte qui demandent un examen humain. Les alertes de fraude viennent des contrôles automatiques. Rien n’est bloqué automatiquement.",
    },
    careful: {
      en: "Write down what you checked and why before you close a case.",
      fr: "Notez ce que vous avez vérifié et pourquoi avant de fermer un dossier.",
    },
  },
  {
    path: "/finance",
    what: {
      en: "The money picture day by day: money in and out, refunds, fees kept, agent commission, failed payments, what is owed to customers and whether the books add up.",
      fr: "La situation financière jour par jour : entrées et sorties, remboursements, frais conservés, commissions des agents, paiements échoués, sommes dues aux clients et cohérence des comptes.",
    },
    careful: {
      en: "If the books do not add up, tell a senior person straight away.",
      fr: "Si les comptes ne concordent pas, prévenez tout de suite un responsable.",
    },
  },
  {
    path: "/safeguarding",
    what: {
      en: "The daily check that the money held for customers is safe and matches what we owe them.",
      fr: "Le contrôle quotidien qui vérifie que l’argent des clients est protégé et correspond à ce que nous leur devons.",
    },
  },
  {
    path: "/headroom",
    what: {
      en: "How much room we have left under our regulatory limits, and which countries are counted.",
      fr: "La marge qu’il nous reste sous nos limites réglementaires, et les pays pris en compte.",
    },
    careful: {
      en: "Changes need a second person to approve.",
      fr: "Les changements doivent être approuvés par une deuxième personne.",
    },
  },
  {
    path: "/backups",
    what: {
      en: "Shows that backups of our data are being taken and that a restore test has been done recently.",
      fr: "Montre que les sauvegardes de nos données sont faites et qu’un test de restauration a été fait récemment.",
    },
  },
  {
    path: "/holds",
    what: {
      en: "Put an account on hold, or lift a hold. A held account cannot send money.",
      fr: "Mettre un compte en suspens ou lever la suspension. Un compte en suspens ne peut pas envoyer d’argent.",
    },
    careful: {
      en: "Lifting a hold needs a second person to approve.",
      fr: "Lever une suspension doit être approuvé par une deuxième personne.",
    },
  },
  {
    path: "/reversals",
    what: {
      en: "Reverse a cash-out or cash-in that went wrong, and approve reversals that others have asked for.",
      fr: "Annuler un retrait ou un dépôt en espèces qui s’est mal passé et approuver les annulations demandées par d’autres.",
    },
    careful: {
      en: "You cannot approve your own request. Always give the reason.",
      fr: "Vous ne pouvez pas approuver votre propre demande. Donnez toujours la raison.",
    },
  },
  {
    path: "/payouts",
    what: {
      en: "Agent commission. Review each day’s figures, approve payouts, or hold one back if something looks wrong.",
      fr: "La commission des agents. Vérifiez les chiffres de chaque jour, approuvez les paiements ou retenez-en un si quelque chose semble anormal.",
    },
  },
  {
    path: "/settings",
    what: {
      en: "Exchange rates, fees and cash-out settings for each country.",
      fr: "Les taux de change, les frais et les réglages de retrait en espèces pour chaque pays.",
    },
    careful: {
      en: "Every change needs a second person to approve before it goes live.",
      fr: "Chaque changement doit être approuvé par une deuxième personne avant d’entrer en vigueur.",
    },
  },
  {
    path: "/staff",
    what: {
      en: "Who works here and what each person is allowed to do. Reset someone’s two-step login if they lose their phone.",
      fr: "Qui travaille ici et ce que chacun a le droit de faire. Réinitialisez la double authentification de quelqu’un s’il perd son téléphone.",
    },
    careful: {
      en: "Give people only the access they need. Permission changes need a second person.",
      fr: "Ne donnez que l’accès nécessaire. Les changements de droits demandent une deuxième personne.",
    },
  },
  {
    path: "/agents",
    what: {
      en: "Agents who take cash in and out. Review applications and see how each agent is doing.",
      fr: "Les agents qui prennent et donnent des espèces. Examinez les candidatures et suivez l’activité de chaque agent.",
    },
  },
  {
    path: "/analytics",
    what: {
      en: "How the business is growing: revenue, sign-ups, how many new customers go on to pay, who keeps paying, who has gone quiet, a map of where customers and payments are, the busiest corridors and which payment types fail most.",
      fr: "L’évolution de l’activité : revenus, inscriptions, combien de nouveaux clients finissent par payer, qui continue de payer, qui est devenu inactif, une carte des clients et des paiements, les corridors les plus actifs et les types de paiement qui échouent le plus.",
    },
  },
  {
    path: "/sales",
    what: {
      en: "The sales team and what each person has brought in. Sales staff see only their own figures.",
      fr: "L’équipe commerciale et ce que chacun a rapporté. Les commerciaux ne voient que leurs propres chiffres.",
    },
  },
  {
    path: "/bills",
    what: {
      en: "Airtime, data and bill payments that need a person to check them.",
      fr: "Les achats de crédit, de data et les paiements de factures qui demandent une vérification humaine.",
    },
  },
  {
    path: "/announcements",
    what: {
      en: "Messages to all customers or a group. One person writes it, another approves it before it is sent.",
      fr: "Les messages à tous les clients ou à un groupe. Une personne l’écrit, une autre l’approuve avant l’envoi.",
    },
    careful: {
      en: "Check spelling and wording. A sent message cannot be taken back.",
      fr: "Vérifiez l’orthographe et la formulation. Un message envoyé ne peut pas être repris.",
    },
  },
  {
    path: "/blocklist",
    what: {
      en: "People, phone numbers and details we will not do business with. Look someone up here, and review any matches.",
      fr: "Les personnes, numéros et informations avec lesquels nous ne travaillons pas. Cherchez quelqu’un ici et examinez les correspondances.",
    },
    careful: {
      en: "Adding or removing someone needs a second person to confirm.",
      fr: "Ajouter ou retirer quelqu’un doit être confirmé par une deuxième personne.",
    },
  },
  {
    path: "/services",
    what: {
      en: "Which services are switched on in which countries.",
      fr: "Les services activés dans chaque pays.",
    },
    careful: {
      en: "Switching a service on needs a second person to approve.",
      fr: "Activer un service doit être approuvé par une deuxième personne.",
    },
  },
  {
    path: "/audit",
    what: {
      en: "The record of who did what and when in this panel. It cannot be edited.",
      fr: "Le registre de qui a fait quoi et quand dans ce panneau. Il ne peut pas être modifié.",
    },
  },
];

export const HANDBOOK_GENERAL: { title: { en: string; fr: string }; body: { en: string; fr: string } }[] = [
  {
    title: { en: "Second person approval", fr: "Approbation par une deuxième personne" },
    body: {
      en: "Anything that changes money, limits, access or who can do what needs two people. One asks, a different one approves with their PIN and a reason.",
      fr: "Tout ce qui change l’argent, les limites, les accès ou les droits demande deux personnes. L’une demande, une autre approuve avec son code PIN et une raison.",
    },
  },
  {
    title: { en: "Your login", fr: "Votre connexion" },
    body: {
      en: "Never share your password, PIN or two-step code with anyone, including colleagues. Log out when you leave your desk.",
      fr: "Ne partagez jamais votre mot de passe, votre code PIN ou votre code à deux étapes, même avec des collègues. Déconnectez-vous quand vous quittez votre poste.",
    },
  },
  {
    title: { en: "Customer details", fr: "Informations des clients" },
    body: {
      en: "Look at a customer’s file only when you need to for your work. Everything you do is recorded in the audit trail.",
      fr: "Ne consultez le dossier d’un client que si votre travail l’exige. Tout ce que vous faites est enregistré dans le journal d’audit.",
    },
  },
  {
    title: { en: "If you are unsure", fr: "En cas de doute" },
    body: {
      en: "Ask a senior colleague before acting. A fraud or safety worry always goes to a senior person straight away.",
      fr: "Demandez à un responsable avant d’agir. Une inquiétude sur la fraude ou la sécurité va toujours tout de suite à un responsable.",
    },
  },
];

/** Every English sentence with its French, for the language file. */
export function handbookFrench(): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (p?: { en: string; fr: string }) => {
    if (p) out[p.en] = p.fr;
  };
  for (const e of HANDBOOK) {
    add(e.what);
    add(e.careful);
  }
  for (const g of HANDBOOK_GENERAL) {
    add(g.title);
    add(g.body);
  }
  return out;
}
