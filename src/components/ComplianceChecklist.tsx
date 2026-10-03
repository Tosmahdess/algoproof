// What I check each year to stay in order, as four lines of a register (refonte of
// /mica, 2026-10-03). It was four checkboxes that struck their line through and
// remembered nothing (audit 2026-10: a generic page); each line now says why.
const ITEMS: { title: string; note: string }[] = [
  {
    title: 'J’utilise une plateforme agréée MiCA',
    note: 'Ou un protocole non-custodial, hors du champ de l’agrément. Le statut se vérifie sur le registre de l’ESMA.',
  },
  {
    title: 'Je déclare mes comptes d’actifs numériques à l’étranger',
    note: 'Formulaire 3916-bis, même sans aucune vente dans l’année.',
  },
  {
    title: 'Je déclare mes plus-values de l’année',
    note: 'Seule une conversion en euros, ou l’achat d’un bien, déclenche l’impôt. Un échange entre cryptos, non.',
  },
  {
    title: 'Je garde l’historique complet de mes transactions',
    note: 'La méthode réelle calcule chaque cession sur la valeur globale du portefeuille : sans historique, pas de calcul.',
  },
]

export default function ComplianceChecklist() {
  return (
    <ul className="border-y border-border">
      {ITEMS.map(item => (
        <li key={item.title} className="border-t border-border py-4 first:border-t-0">
          <p className="font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.note}</p>
        </li>
      ))}
    </ul>
  )
}
