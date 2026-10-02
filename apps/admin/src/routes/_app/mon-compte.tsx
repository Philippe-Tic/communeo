import { createFileRoute } from '@tanstack/react-router';
import { AccountScreen } from '@/components/account/account-screen';

export const Route = createFileRoute('/_app/mon-compte')({
  component: AccountScreen,
});
