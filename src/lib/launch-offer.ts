/** Le tarif du Labo, VU D'ICI. Ce dépôt ne vend rien.
 *
 *  La source de vérité est `web/lib/launch-offer.ts` dans le dépôt algolab :
 *  c'est lui qui porte Stripe, le coupon, /membre et les CGV. Ce fichier est un
 *  MIROIR, et il existe pour la raison que l'inventaire du 2026-09-20 a rendue
 *  visible : le prix était recopié à la main dans trois phrases de ce site
 *  (la FAQ, /a-propos, la phrase d'accès du gantelet), chacune vraie le jour où
 *  elle a été écrite et aucune reliée aux deux autres.
 *
 *  Les deux fichiers lisent la MÊME variable, NEXT_PUBLIC_LAUNCH_OFFER_ENDS, et
 *  elle doit être posée dans les DEUX projets Vercel. Si elle n'est posée que
 *  côté Labo, ce site continue d'annoncer 29 € pendant que lab.algoproof.fr
 *  annonce 9 € : pas un plantage, juste deux prix pour un seul produit, à un
 *  clic l'un de l'autre. Aucun test ne peut attraper ça depuis un seul dépôt,
 *  donc c'est une étape du runbook, écrite ici pour qu'elle se lise au bon
 *  endroit.
 *
 *  Tarif de lancement (user, 2026-09-20) : 9 € par mois pendant trois
 *  échéances, puis 29 €. L'annuel ne bouge pas. */

export const FULL_PRICE_EUR = 29;
export const INTRO_PRICE_EUR = 9;
export const INTRO_MONTHS = 3;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Écrit en dur, jamais `process.env[nom]` : un accès dynamique à une variable
 *  NEXT_PUBLIC_ n'est pas remplacé au build et n'arrive jamais au navigateur.
 *  Lu dans la fonction et non au chargement du module, pour que les tests
 *  puissent exercer la fenêtre OUVERTE — sans ça, les gardes écrits pour
 *  l'offre resteraient verts sans jamais l'avoir vue active. */
export function launchOfferEndsOn(): string | null {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_OFFER_ENDS ?? "";
  return ISO_DAY.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : null;
}

/** Éteinte par défaut, et éteinte aussi sur une date illisible. */
export function launchOfferOpen(now: Date = new Date()): boolean {
  const end = launchOfferEndsOn();
  if (!end) return false;
  return now.getTime() < Date.parse(`${end}T23:59:59.999Z`);
}

/** « l'adhésion à 9 € par mois pendant 3 mois, puis 29 € par mois ».
 *  Les DEUX montants, toujours : un prix d'appel sans le prix qui le suit est
 *  une pratique commerciale trompeuse, et ce site n'a même pas l'excuse d'être
 *  celui qui encaisse. */
export function membershipPrice(now?: Date): string {
  return launchOfferOpen(now)
    ? `${INTRO_PRICE_EUR} € par mois pendant ${INTRO_MONTHS} mois, puis ${FULL_PRICE_EUR} € par mois`
    : `${FULL_PRICE_EUR} € par mois`;
}

/** La même chose en court, pour la phrase d'accès du gantelet, qui est déjà
 *  longue et se lit au bout d'un explicatif. */
export function membershipPriceShort(now?: Date): string {
  return launchOfferOpen(now)
    ? `${INTRO_PRICE_EUR} € par mois les ${INTRO_MONTHS} premiers mois, puis ${FULL_PRICE_EUR} €`
    : `${FULL_PRICE_EUR} € par mois`;
}
