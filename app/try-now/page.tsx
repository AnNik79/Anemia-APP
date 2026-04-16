import type { Metadata } from "next";

import { TryNowRouteView } from "@/components/site-pages";

export const metadata: Metadata = {
  title: "Try Now | BioTransport Anemia Screening",
  description: "Run the live anemia screening demo with your own eye image.",
};

export default function TryNowPage() {
  return <TryNowRouteView />;
}
