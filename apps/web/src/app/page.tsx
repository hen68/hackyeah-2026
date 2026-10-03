import { DoctorSection } from "@/components/landing/doctor-section";
import { Hero, SiteHeader } from "@/components/landing/hero";
import {
  ClosingCta,
  HowItWorks,
  PrivacySection,
  SiteFooter,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        <Hero />
        <HowItWorks />
        <DoctorSection />
        <PrivacySection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
