// A dated notice on every surface that shows an output of the engine: the gauntlet explainer
// on /strategies, the funnel counter on / and /overview, and the fiche of an engine-born bot,
// which is the page where a visitor decides.
//
// On 2026-09-10 an audit of the engine's order simulator found three defects, named in the
// notice itself: stop and target ignored on the entry bar, a re-entry at the open of a bar
// where the previous position was still open, and a gap through the stop filled at the stop
// price. Every verdict and count the engine produced came out of that simulator, and all of
// them will be judged again. Until then they are provisional, and the page says so where the
// numbers are.
//
// « les compteurs du moteur », not « les compteurs » full stop: on the funnel counter the
// notice sits above the fleet counts too, and those come from the `bots` table, not the engine.
//
// No end date on purpose: a promised date that slips is a second false claim. One component,
// one sentence, so the surfaces cannot drift apart. Remove it only when the re-judged verdicts
// are the ones published.
export const ENGINE_REJUDGE_NOTICE =
  'Le 10 septembre 2026, un audit a trouvé trois défauts dans la façon dont mon moteur simule les ordres (le stop et la cible ignorés sur la bougie d’entrée, une réentrée sur une bougie où la position précédente était encore ouverte, un gap au-delà du stop rempli au prix du stop). Les verdicts et les compteurs du moteur affichés ici viennent d’avant la correction. Je les rejuge, et d’ici là ils restent provisoires.'

export default function EngineRejudgeNotice({ className = '' }: { className?: string }) {
  return (
    <aside
      role="note"
      data-testid="engine-rejudge-notice"
      className={`rounded border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-foreground leading-relaxed ${className}`}
    >
      {ENGINE_REJUDGE_NOTICE}
    </aside>
  )
}
