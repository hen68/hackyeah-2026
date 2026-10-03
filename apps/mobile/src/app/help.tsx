import { InfoScreen, type InfoSection } from '@/components/info-screen';

const SECTIONS: readonly InfoSection[] = [
  {
    heading: 'Daily check-in',
    body: 'On Today, answer a few short questions about how you feel. It takes about a minute. You can change your answers at any time that day.',
  },
  {
    heading: 'Talk to Digna',
    body: 'Tell Digna anything else in your own words. Digna adds the symptoms you mention to your day, and you can change them.',
  },
  {
    heading: 'Calendar',
    body: 'The calendar shows how each day went. Tap a day to see what you logged.',
  },
  {
    heading: 'Sharing with your doctor',
    body: 'On Profile, tap “Get a code for my doctor” and give the code to your doctor. They will see your check-ins before your visit.',
  },
  {
    heading: 'In an emergency',
    body: 'Digna is not for emergencies. If you feel very unwell, call 112 or your local emergency number.',
  },
];

export default function HelpScreen() {
  return <InfoScreen title="Help" sections={SECTIONS} />;
}
