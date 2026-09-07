// Les comptes seuls, sans le paquet.
//
// `lib/investir` importe un JSON de 1,2 Mo au niveau du module : n'importe quel
// import depuis un COMPOSANT CLIENT l'embarquerait entier dans le bundle envoyé
// au navigateur, qu'il l'affiche ou non. `/wealth` est un composant client et
// n'a besoin que de deux nombres.
import meta from '@/data/investir-meta.json'

export const investirMeta = meta as {
  as_of: string
  contexte: { mediane_annees: number; societes_notees: number; plafond_annees: number }
  fiches_publiees: number
}
