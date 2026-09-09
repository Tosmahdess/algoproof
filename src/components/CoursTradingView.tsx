'use client'

import { useEffect, useRef } from 'react'

/**
 * Le cours du titre, servi par TradingView au navigateur du lecteur.
 *
 * POURQUOI CELUI-CI ET PAS UN PRIX À NOUS. Le site a cessé de publier des cours
 * le 2026-09-08 : la seule source gratuite dont je disposais en interdisait la
 * rediffusion, et une licence d'affichage coûte environ 2 750 €/an. Un widget
 * embarqué ne rediffuse rien — c'est le navigateur du lecteur qui va chercher
 * la donnée chez TradingView, exactement comme s'il ouvrait leur site.
 *
 * L'ATTRIBUTION EST LA CONDITION. Les conditions de TradingView autorisent
 * l'usage gratuit sur un site externe tant que le lien vers eux reste visible
 * et non modifié ; la retirer demande un plan payant, et l'enfreindre expose à
 * un bannissement. Le bloc `tradingview-widget-copyright` ci-dessous EST cette
 * condition : ne pas le supprimer.
 *
 * CE COURS N'ENTRE PAS DANS LA NOTE. Il ne vient pas du dépôt annuel dont la
 * fiche imprime le numéro, donc il ne passe pas le contrat sur les nombres et
 * il ne peut apparaître dans aucune prose notée. Il est affiché à côté, avec sa
 * source, et la page le dit.
 */
export function CoursTradingView({ symbole }: { symbole: string }) {
  const hote = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const noeud = hote.current
    if (!noeud || noeud.querySelector('script')) return
    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: symbole,
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'fr',
      width: '100%',
    })
    noeud.appendChild(script)
  }, [symbole])

  return (
    <div className="tradingview-widget-container" ref={hote}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright text-[10px] text-muted">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          Cours fourni par TradingView
        </a>
      </div>
    </div>
  )
}
