import type { Metadata } from "next";
import { HomeRouteView } from "@/components/site-pages";

export const metadata: Metadata = {
  title: "BioTransport Anemia Screening",
  description: "AI-powered anemia risk screening using a simple eye photo.",
};

export default function HomePage() {
  return <HomeRouteView />;
}
