// US-14: Digna never diagnoses, recommends medication or dosing, advises starting or stopping
// therapy, or attributes a symptom to a specific cause. This is a safety net on top of the
// system prompt: it scans the reply (EN + PL) and swaps in a fallback when a rule trips.
// No message text is ever stored, only the rule name.

export const SAFE_FALLBACK =
  "That's a good question for your doctor — I've noted it for your next visit.";

export type GuardrailRule =
  | "dosing"
  | "directive"
  | "diagnosis"
  | "causal_attribution"
  | "drug_recommendation";

// JS \b is ASCII-only, so use Unicode-aware lookarounds to keep Polish letters inside words.
const START = String.raw`(?<![\p{L}\p{N}])`;
const END = String.raw`(?![\p{L}\p{N}])`;
const re = (source: string) => new RegExp(`${START}(?:${source})${END}`, "iu");

const CONDITIONS_EN =
  "depression|anxiety disorder|hypothyroidism|hyperthyroidism|thyroid (?:problems?|disease|condition)|diabetes|osteoporosis|cancer|anemia|anaemia|heart disease|pcos|endometriosis|fibroids|dementia";
const CONDITIONS_PL =
  "depresj\\p{L}*|nadczynno\\p{L}*|niedoczynno\\p{L}*|cukrzyc\\p{L}*|osteoporoz\\p{L}*|nowotw\\p{L}*|raka|anemi\\p{L}*|niedokrwisto\\p{L}*|choroby? serca|pcos|endometrioz\\p{L}*|mięśniak\\p{L}*|demencj\\p{L}*";

const PATTERNS: { rule: GuardrailRule; re: RegExp }[] = [
  {
    rule: "dosing",
    re: re(
      String.raw`\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|μg|ug|ml|iu|j\.m\.|tabl(?:etek|etki|etka|ets?)|kaps(?:ułek|ułki|ułka|ules?))`,
    ),
  },
  {
    rule: "directive",
    re: re(
      String.raw`you (?:should|must|need to|ought to|have to) (?:take|stop|start|increase|decrease|double|reduce|switch|skip|quit|try)`,
    ),
  },
  {
    rule: "directive",
    re: re(
      String.raw`(?:take|stop taking|start taking|increase|decrease|double|halve|reduce|skip|quit) (?:your|the) (?:dose|dosage|hrt|medication|medicine|pills?|patch(?:es)?|gel|hormones?|treatment|therapy|supplements?)`,
    ),
  },
  {
    rule: "directive",
    re: re(String.raw`i (?:recommend|suggest|advise) (?:you )?(?:taking|stopping|starting|trying|increasing|reducing)`),
  },
  {
    rule: "directive",
    re: re(
      String.raw`(?:powinnaś|musisz|zalecam|polecam|sugeruję|przyjmuj|zażywaj|odstaw|zwiększ|zmniejsz|podwój|zacznij brać|przestań brać)[^.!?]{0,40}(?:dawk\p{L}*|lek\p{L}*|tablet\p{L}*|hormon\p{L}*|hrt|plaster\p{L}*|żel\p{L}*|terapi\p{L}*|suplement\p{L}*)`,
    ),
  },
  {
    rule: "diagnosis",
    re: re(
      `you (?:have|are suffering from|probably have|likely have|may have|might have|definitely have|clearly have) (?:an? |the )?(?:${CONDITIONS_EN})`,
    ),
  },
  {
    rule: "diagnosis",
    re: re(
      `(?:masz|cierpisz na|prawdopodobnie masz|zapewne masz|możliwe,? że masz)[^.!?]{0,20}(?:${CONDITIONS_PL})`,
    ),
  },
  {
    rule: "causal_attribution",
    re: re(String.raw`(?:is|are|was|were|be) (?:caused|triggered) by`),
  },
  {
    rule: "causal_attribution",
    re: re(String.raw`(?:because of|due to) your (?:hormones?|menopause|thyroid|age|stress|diet|medication)`),
  },
  {
    rule: "causal_attribution",
    re: re(
      String.raw`spowodowan\p{L}*|wywołan\p{L}*|przyczyną (?:jest|są|tego)|z powodu twoj\p{L}*|jest to (?:skutek|wynik)`,
    ),
  },
];

// Introducing a drug is a recommendation. Repeating one the patient already named is not.
const DRUG_NAMES = [
  "estradiol", "utrogestan", "duphaston", "dydrogesterone", "tibolone", "clonidine", "gabapentin",
  "pregabalin", "fezolinetant", "elinzanetant", "paroxetine", "venlafaxine", "escitalopram",
  "fluoxetine", "sertraline", "oxybutynin", "ibuprofen", "paracetamol", "aspirin", "melatonin",
  "zolpidem", "black cohosh", "st john's wort", "dziurawiec", "cimicifuga", "estrofem", "femoston",
  "kliogest", "angeliq", "evorel", "estrogel", "oestrogel", "premarin", "testosterone", "tamoxifen",
  "metformin", "levothyroxine", "euthyrox", "letrox", "progesterone",
];
const DRUG_RE = re(DRUG_NAMES.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
const DRUG_GLOBAL = new RegExp(DRUG_RE.source, "giu");

export type GuardrailResult = { tripped: false } | { tripped: true; rule: GuardrailRule };

export function checkReply(reply: string, userMessage: string): GuardrailResult {
  for (const pattern of PATTERNS) {
    if (pattern.re.test(reply)) return { tripped: true, rule: pattern.rule };
  }
  const named = new Set((userMessage.match(DRUG_GLOBAL) ?? []).map((name) => name.toLowerCase()));
  for (const match of reply.match(DRUG_GLOBAL) ?? []) {
    if (!named.has(match.toLowerCase())) return { tripped: true, rule: "drug_recommendation" };
  }
  return { tripped: false };
}
