import type { Metadata } from "next";
import { ContactRouteView } from "@/components/site-pages";

export const metadata: Metadata = {
  title: "Contact | BioTransport Anemia Screening",
  description: "Connect with BioTransport for anemia screening support and questions.",
};

export default function ContactPage() {
  return <ContactRouteView />;
}
