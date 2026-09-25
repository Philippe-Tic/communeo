import { createFileRoute } from '@tanstack/react-router';
import { SignupScreen } from '@/components/signup/signup-screen';

export const Route = createFileRoute('/inscription')({
  component: SignupScreen,
});
