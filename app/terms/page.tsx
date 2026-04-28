import type { Metadata } from "next";

import { TermsRouteView } from "@/components/site-pages";

export const metadata: Metadata = {
  title: "Terms & Privacy | BioTransport Anemia Screening",
  description:
    "Review BioTransport anemia screening terms, privacy handling, and medical disclaimer.",
};

export default function TermsPage() {
  return <TermsRouteView />;
}
