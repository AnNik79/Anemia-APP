import type { Metadata } from "next";
import { AboutRouteView } from "@/components/site-pages";

export const metadata: Metadata = {
  title: "About us | BioTransport Anemia Screening",
  description:
    "Building a healthier future through early, explainable anemia screening.",
};

export default function AboutPage() {
  return <AboutRouteView />;
}
