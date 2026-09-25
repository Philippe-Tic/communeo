/**
 * Confirmation d'une inscription depuis le lien reçu à l'adresse officielle de la mairie (#309) :
 * la personne qui ouvre la boîte de la mairie approuve la création. Le site n'est créé qu'au clic
 * (les antivirus de messagerie ouvrent les liens tout seuls). Ensuite : choix du mot de passe du
 * demandeur, puis assistant de démarrage.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { confirmSignup, signupConfirmationQuery } from '@/lib/signup';

export function SignupConfirmScreen({ token }: { token: string | undefined }) {
  const query = useQuery({ ...signupConfirmationQuery(token ?? ''), enabled: Boolean(token) });
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || query.isError) {
    const expired = query.error instanceof ApiError && query.error.status === 410;
    return (
      <AuthLayout title={expired ? 'Ce lien a expiré' : 'Ce lien ne fonctionne pas'} documentTitle="Confirmation de l’inscription">
        <p className="text-secondary">
          {expired
            ? 'Les liens de confirmation sont valables 7 jours. Refaites la demande : un nouvel e-mail partira à l’adresse de la mairie.'
            : 'Le lien est incomplet ou a déjà servi. Si le site a déjà été créé, la personne qui l’a demandé peut se connecter.'}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/inscription">Refaire la demande</Link>
          </Button>
          <Link to="/connexion" className="font-semibold text-brand underline underline-offset-2">
            Se connecter
          </Link>
        </div>
      </AuthLayout>
    );
  }
  if (query.isPending) {
    return (
      <AuthLayout title="Confirmation de l’inscription" documentTitle="Confirmation de l’inscription">
        <p role="status">Vérification du lien…</p>
      </AuthLayout>
    );
  }

  const request = query.data;
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const invitation = await confirmSignup(token);
      await navigate({ to: '/invitation', search: { jeton: invitation } });
    } catch (caught) {
      setBusy(false);
      setError(caught instanceof ApiError && [400, 409, 410].includes(caught.status) ? caught.message : 'La création n’a pas abouti. Réessayez dans un instant.');
    }
  };

  return (
    <AuthLayout title={`Créer le site de ${request.commune}`} documentTitle="Confirmation de l’inscription">
      <p>
        <strong>
          {request.firstName} {request.lastName}
        </strong>{' '}
        ({request.email}) demande à créer le site internet de la commune sur Communeo.
      </p>
      <p className="mt-3 text-secondary">En confirmant, vous approuvez cette demande au nom de la mairie. {request.firstName} deviendra administrateur du site, avec 30 jours d’essai gratuit.</p>
      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Création du site…' : 'Confirmer la création du site'}
      </Button>
      <p className="mt-4 text-[13px] text-secondary">Si la mairie n’est pas à l’origine de cette demande, fermez cette page : rien ne sera créé.</p>
    </AuthLayout>
  );
}
