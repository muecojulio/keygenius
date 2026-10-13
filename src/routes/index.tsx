import { createFileRoute } from "@tanstack/react-router";
import { KeyGeniusApp } from "@/components/keygenius/app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <KeyGeniusApp />;
}
