import { createFileRoute, Link } from "@tanstack/react-router";
import { PrivacyText } from "@/components/keygenius/privacy";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [{ title: "Privacidad · KeyGenius" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-5 py-8">
      <Link to="/" className="text-sm text-brass">
        Volver a KeyGenius
      </Link>
      <PrivacyText />
    </main>
  );
}
