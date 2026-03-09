interface Props {
  message?: string
}

export default function FicheError({ message }: Props) {
  return (
    <div class="text-center py-12">
      <svg
        class="w-16 h-16 text-amber-500 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">
        Fiche introuvable
      </h2>
      <p class="text-gray-600 mb-6">
        {message || 'La fiche demandee n\'a pas pu etre chargee.'}
      </p>
      <a
        href="/demarches"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Retour aux demarches
      </a>
    </div>
  )
}
