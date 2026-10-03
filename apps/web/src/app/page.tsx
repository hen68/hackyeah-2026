import { SITE_URL } from "@/components/landing/content";
import { DoctorSection } from "@/components/landing/doctor-section";
import { Hero, SiteHeader } from "@/components/landing/hero";
import {
  ClosingCta,
  Faq,
  HowItWorks,
  PrivacySection,
  SiteFooter,
  WhyItMatters,
} from "@/components/landing/sections";

/** No offers or ratings: the app isn't released, so none would be true. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Digna",
  url: SITE_URL,
  operatingSystem: "iOS, Android",
  applicationCategory: "HealthApplication",
  description: "A daily menopause companion that prepares a clear report for your doctor.",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-col">
        <Hero />
        <WhyItMatters />
        <HowItWorks />
        <DoctorSection />
        <PrivacySection />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
