/**
 * Confirmation de l'adresse de la personne qui s'inscrit (#309, #337), depuis le lien reçu dans sa
 * boîte : la commune n'est créée qu'au clic (les antivirus de messagerie ouvrent les liens tout
 * seuls). Ensuite : choix de son mot de passe, puis assistant de démarrage ; la mairie approuve de
 * son côté avant la mise en ligne du site.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { ofCommune } from '@communeo/core';
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
            ? 'Les liens de confirmation sont valables 7 jours. Refaites la demande : un nouveau lien vous sera envoyé.'
            : 'Le lien est incomplet ou a déjà servi. Si vous avez déjà créé le site, connectez-vous.'}
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
      const { invitation } = await confirmSignup(token);
      await navigate({ to: '/invitation', search: { jeton: invitation } });
    } catch (caught) {
      setBusy(false);
      setError(caught instanceof ApiError && [400, 409, 410].includes(caught.status) ? caught.message : 'La création n’a pas abouti. Réessayez dans un instant.');
    }
  };

  return (
    <AuthLayout title={`Créer le site ${ofCommune(request.commune)}`} documentTitle="Confirmation de l’inscription">
      <p>
        Votre adresse <strong>{request.email}</strong> est confirmée. Vous allez devenir administrateur du site de la commune, avec 30 jours d’essai
        gratuit.
      </p>
      <p className="mt-3 text-secondary">
        Vous choisirez ensuite votre mot de passe et pourrez préparer le site tout de suite. Il sera mis en ligne une fois la demande approuvée par la
        mairie.
      </p>
      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Création du site…' : 'Créer le site'}
      </Button>
      <p className="mt-4 text-[13px] text-secondary">Si vous n’êtes pas à l’origine de cette demande, fermez cette page : rien ne sera créé.</p>
    </AuthLayout>
  );
}
