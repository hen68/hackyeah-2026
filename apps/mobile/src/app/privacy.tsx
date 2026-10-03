import { InfoScreen, type InfoSection } from '@/components/info-screen';

const SECTIONS: readonly InfoSection[] = [
  {
    heading: 'What Digna keeps',
    body: 'Your answers from the first questions, your daily check-ins and notes, your chats with Digna, the symptoms Digna noted from them, and your watch data if you connect a watch.',
  },
  {
    heading: 'Where it is stored',
    body: 'Your data is stored on servers in the European Union. Only you can see it, unless you give a doctor your code.',
  },
  {
    heading: 'Your doctor',
    body: 'A doctor can see your data only after you give them a code from your Profile. A code works once and expires after 24 hours.',
  },
  {
    heading: 'Chat',
    body: 'Your chat messages are processed by an AI model to reply to you and to note your symptoms. Digna doesn’t give medical advice.',
  },
  {
    heading: 'Your copy',
    body: 'You can download a copy of everything Digna keeps about you from your Profile, under “Download my data”.',
  },
];

export default function PrivacyScreen() {
  return <InfoScreen title="Privacy" sections={SECTIONS} />;
}
