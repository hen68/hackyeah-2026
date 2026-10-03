import { DoctorSection } from "@/components/landing/doctor-section";
import { Hero } from "@/components/landing/hero";
import {
  ClosingCta,
  HowItWorks,
  PrivacySection,
  SiteFooter,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Hero />
      <main className="flex flex-col">
        <HowItWorks />
        <DoctorSection />
        <PrivacySection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
