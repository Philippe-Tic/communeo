/**
 * Exporter les données (#343, administrateurs) : toute la commune dans une archive ZIP, dans des formats
 * ouverts, pour la garder ou la reprendre ailleurs. Possible aussi après la fin de l'essai.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { DATA_EXPORT_KEEP_DAYS } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { sessionQuery } from '@/lib/session';
import { DataExportPanel } from './data-export-panel';

export function ExportScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const site = user.site!;

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <PageHeader
        title="Exporter les données"
        description={`Toutes les données de ${site.name} dans une archive ZIP, lisible sans Communeo : pour les garder, les archiver ou changer de prestataire.`}
      />

      <section
        aria-labelledby="export-contenu"
        className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar"
      >
        <h2 id="export-contenu" className="text-base font-semibold">
          Ce que contient l'archive
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Le site tel qu'il est en ligne, consultable dans un navigateur.</li>
          <li>
            Les pages, actualités, événements, documents officiels, alertes, associations, menus de la cantine,
            collectes et réglages du site, en JSON (format ouvert), avec leurs dates et leur statut.
          </li>
          <li>Tous les fichiers d'origine de la médiathèque, avec leur texte alternatif.</li>
          <li>
            Les messages des habitants (et leurs pièces jointes), les inscrits à la lettre d'information et les fiches
            des associations, en CSV.
          </li>
          <li>Un fichier LISEZMOI qui décrit l'archive.</li>
        </ul>
        <p className="mt-3 text-secondary">
          L'archive contient des données personnelles d'habitants : conservez-la en lieu sûr. Elle reste téléchargeable{' '}
          {DATA_EXPORT_KEEP_DAYS} jours, puis elle est effacée de nos serveurs.
        </p>
      </section>

      <section
        aria-labelledby="export-archive"
        className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar"
      >
        <h2 id="export-archive" className="mb-2 text-base font-semibold">
          Archive
        </h2>
        <DataExportPanel />
      </section>
    </div>
  );
}
