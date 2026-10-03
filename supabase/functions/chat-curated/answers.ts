// Curated answer base for the alternative chat. MVP placeholder: written for the demo and meant
// to be replaced by a list curated by clinicians. Rules every answer follows (enforced by
// answers.test.ts): no diagnosis, no medicine, dose or treatment advice, no claimed causes, and
// a pointer to the doctor wherever health decisions are involved.
//
// `ask` describes when the answer fits. It is what the matching model reads, so keep it short,
// concrete and distinct from its neighbours. English and Polish messages are both matched.

export type CuratedAnswer = {
  id: string;
  ask: string;
  en: string;
  pl: string;
  // Safety answers use a lower bar so that a likely emergency is never ignored.
  minConfidence?: number;
};

const URGENT = 0.4;

export const ANSWERS: readonly CuratedAnswer[] = [
  // --- Greetings and about Digna -------------------------------------------------------------
  {
    id: "greeting",
    ask: "Says hello, hi or good morning, with no question",
    en: "Hello! I'm Digna. Tell me how you're feeling today, or ask me about menopause, your symptoms or the app.",
    pl: "Cześć! Jestem Digna. Powiedz, jak się dziś czujesz, albo zapytaj o menopauzę, objawy lub aplikację.",
  },
  {
    id: "how_are_you",
    ask: "Asks how Digna is doing",
    en: "Thank you for asking. I'm here and ready to listen. How are you feeling today?",
    pl: "Dziękuję, że pytasz. Jestem tu i chętnie wysłucham. Jak się dziś czujesz?",
  },
  {
    id: "thanks",
    ask: "Thanks Digna or says it was helpful",
    en: "You're very welcome. I'm here whenever you want to talk or log how you feel.",
    pl: "Proszę bardzo. Jestem tu, kiedy chcesz porozmawiać lub zapisać, jak się czujesz.",
  },
  {
    id: "goodbye",
    ask: "Says goodbye or that they are leaving",
    en: "Take care! Come back any time, and remember your daily check-in.",
    pl: "Do zobaczenia! Wracaj, kiedy chcesz, i pamiętaj o codziennym check-inie.",
  },
  {
    id: "acknowledge",
    ask: "A short filler such as ok, yes, alright, I see, with nothing to answer",
    en: "Alright. Tell me whenever you want to log something or have a question.",
    pl: "Dobrze. Daj znać, kiedy chcesz coś zapisać albo masz pytanie.",
  },
  {
    id: "who_are_you",
    ask: "Asks who or what Digna is",
    en: "I'm Digna, a companion for the menopause years. I help you track how you feel and prepare for doctor visits. I'm an app, not a doctor.",
    pl: "Jestem Digna, towarzyszka na czas menopauzy. Pomagam śledzić samopoczucie i przygotować się do wizyt u lekarza. Jestem aplikacją, nie lekarzem.",
  },
  {
    id: "what_can_you_do",
    ask: "Asks what Digna can do or how it can help",
    en: "I can answer common questions about menopause, explain how Digna works, and help you keep track of symptoms for your doctor. For questions about treatment, your doctor is the right person.",
    pl: "Mogę odpowiadać na typowe pytania o menopauzę, wyjaśniać, jak działa Digna, i pomagać w śledzeniu objawów dla lekarza. W sprawach leczenia najlepszy jest Twój lekarz.",
  },
  {
    id: "are_you_human",
    ask: "Asks whether they are talking to a real person, a human, an AI or a bot",
    en: "I'm an app, not a person. My answers come from a prepared set of information, not from a doctor.",
    pl: "Jestem aplikacją, nie człowiekiem. Moje odpowiedzi pochodzą z przygotowanego zestawu informacji, a nie od lekarza.",
  },
  {
    id: "not_medical_advice",
    ask: "Asks whether Digna gives medical advice or can replace a doctor",
    en: "No. I share general information and help you track symptoms, but I can't diagnose or advise on treatment. Only your doctor can.",
    pl: "Nie. Dzielę się ogólnymi informacjami i pomagam śledzić objawy, ale nie stawiam diagnoz ani nie doradzam w leczeniu. Może to zrobić tylko Twój lekarz.",
  },
  {
    id: "privacy",
    ask: "Asks who can see their data or whether it is private and safe",
    en: "Your entries belong to you. They're shared only with a doctor you choose to link in Digna.",
    pl: "Twoje wpisy należą do Ciebie. Widzi je tylko lekarz, którego sama połączysz w Digna.",
  },
  {
    id: "language_switch",
    ask: "Asks to talk in Polish or in English, or to change language",
    en: "I can talk in English or Polish. Just write in the language you prefer.",
    pl: "Mogę rozmawiać po polsku lub po angielsku. Pisz w języku, który wolisz.",
  },
  {
    id: "give_feedback",
    ask: "Wants to report a problem, a bug or give feedback about the app",
    en: "Thank you, feedback is very welcome. Please send it to the Digna team through the channel where you got the app.",
    pl: "Dziękuję, opinie są bardzo cenne. Prześlij ją zespołowi Digna tam, skąd masz aplikację.",
  },
  {
    id: "frustrated",
    ask: "Is annoyed or rude, says Digna is useless or stupid",
    en: "I'm sorry I haven't been more helpful. I can answer common questions about menopause, symptoms and the app. For anything about your own health, your doctor is the right person.",
    pl: "Przepraszam, że nie byłam bardziej pomocna. Mogę odpowiadać na typowe pytania o menopauzę, objawy i aplikację. W sprawach Twojego zdrowia najlepszy jest lekarz.",
  },
  {
    id: "wrong_answer",
    ask: "Says the answer was wrong or not what they asked, wants it rephrased",
    en: "Sorry about that. Could you ask it in a different way? I may not have an answer for everything, and for health decisions your doctor is the right person.",
    pl: "Przepraszam. Czy możesz zapytać inaczej? Nie na wszystko mam odpowiedź, a w decyzjach zdrowotnych najlepszy jest lekarz.",
  },

  // --- Using the app ---------------------------------------------------------------------------
  {
    id: "how_checkin_works",
    ask: "Asks how the daily check-in works or what to do in it",
    en: "Each day you rate your symptoms from 1 (none) to 5 (severe) and can add a short note. It takes about a minute.",
    pl: "Każdego dnia oceniasz objawy od 1 (brak) do 5 (bardzo silne) i możesz dodać krótką notatkę. To zajmuje około minuty.",
  },
  {
    id: "severity_scale",
    ask: "Asks what the numbers 1 to 5 mean or how to rate a symptom",
    en: "1 means none, 2 mild, 3 moderate, 4 strong and 5 severe. A higher number always means it bothers you more.",
    pl: "1 to brak, 2 łagodne, 3 umiarkowane, 4 silne, 5 bardzo silne. Wyższa liczba zawsze oznacza, że dokucza Ci bardziej.",
  },
  {
    id: "missed_checkin",
    ask: "Forgot or missed check-ins, asks if that is a problem",
    en: "That's okay. Log today when you can. Even a few check-ins a week give a useful picture.",
    pl: "Nic się nie stało. Zapisz dzisiejszy dzień, kiedy możesz. Nawet kilka check-inów w tygodniu daje użyteczny obraz.",
  },
  {
    id: "review_past_days",
    ask: "Asks how to see or review previous days or the calendar",
    en: "The Calendar shows the days you've logged. Tap a day to see what you recorded.",
    pl: "Kalendarz pokazuje dni, które zapisałaś. Dotknij dnia, aby zobaczyć, co wpisałaś.",
  },
  {
    id: "track_other_symptom",
    ask: "Asks how to track another symptom that is not in their list",
    en: "You can track more than the symptoms you started with. Look at the symptom options when you log your day, and mention anything extra in your note.",
    pl: "Możesz śledzić więcej niż objawy, od których zaczęłaś. Sprawdź opcje objawów przy zapisie dnia, a coś dodatkowego wpisz w notatce.",
  },
  {
    id: "reminders",
    ask: "Asks about reminders, notifications or being reminded to check in",
    en: "You can set a daily reminder time in your profile so you don't forget your check-in.",
    pl: "W profilu możesz ustawić codzienną godzinę przypomnienia, aby nie zapomnieć o check-inie.",
  },
  {
    id: "text_size",
    ask: "Wants bigger text or says the text is hard to read",
    en: "You can switch to larger text in your profile settings.",
    pl: "W ustawieniach profilu możesz włączyć większy tekst.",
  },
  {
    id: "connect_watch",
    ask: "Asks how to connect a smartwatch or health app",
    en: "You can connect a watch or health app in your profile. Digna uses sleep, heart rate and temperature readings to give your doctor more context.",
    pl: "Zegarek lub aplikację zdrowotną połączysz w profilu. Digna wykorzystuje dane o śnie, tętnie i temperaturze, aby dać lekarzowi więcej kontekstu.",
  },
  {
    id: "watch_supported",
    ask: "Asks which watches or health apps work with Digna",
    en: "Digna works with Apple Health, Google Health Connect, Garmin and Fitbit.",
    pl: "Digna współpracuje z Apple Health, Google Health Connect, Garmin i Fitbit.",
  },
  {
    id: "watch_temperature",
    ask: "Asks what the temperature, sleep or heart rate readings from the watch mean",
    en: "Watch readings show patterns over time, such as warmer nights or restless sleep. They're not a diagnosis, but they can help your doctor see the bigger picture.",
    pl: "Odczyty z zegarka pokazują wzorce w czasie, na przykład cieplejsze noce lub niespokojny sen. To nie jest diagnoza, ale mogą pomóc lekarzowi zobaczyć szerszy obraz.",
  },
  {
    id: "doctor_report",
    ask: "Asks what the doctor report is or what it contains",
    en: "Before a visit you've added, Digna prepares a summary of your last 30 days for your doctor: your symptoms, how they changed, and your notes.",
    pl: "Przed dodaną wizytą Digna przygotowuje dla lekarza podsumowanie ostatnich 30 dni: Twoje objawy, ich zmiany i Twoje notatki.",
  },
  {
    id: "report_timing",
    ask: "Asks when the report is ready or how long before the appointment it is prepared",
    en: "The report is prepared about 12 hours before your appointment, so it includes your latest check-ins.",
    pl: "Raport powstaje około 12 godzin przed wizytą, więc zawiera Twoje najnowsze check-iny.",
  },
  {
    id: "link_doctor",
    ask: "Asks how to share their data with a doctor or use a link code",
    en: "In your profile you can create a short one-time code. Give it to your doctor to link their account to yours.",
    pl: "W profilu możesz utworzyć krótki jednorazowy kod. Przekaż go lekarzowi, aby połączył swoje konto z Twoim.",
  },
  {
    id: "sign_in_problem",
    ask: "Cannot sign in, forgot the password or lost access to the account",
    en: "For sign-in problems, use the help options on the sign-in screen, or contact the Digna team.",
    pl: "W razie problemów z logowaniem skorzystaj z pomocy na ekranie logowania lub skontaktuj się z zespołem Digna.",
  },

  // --- Tracking tips ---------------------------------------------------------------------------
  {
    id: "which_symptoms_to_track",
    ask: "Asks which symptoms they should track",
    en: "Track what affects your days: hot flushes, sleep, mood, energy and bleeding are common ones. Your doctor can tell you what matters most for you.",
    pl: "Śledź to, co wpływa na Twoje dni: uderzenia gorąca, sen, nastrój, energię i krwawienia to częste przykłady. Lekarz podpowie, co jest dla Ciebie najważniejsze.",
  },
  {
    id: "tracking_frequency",
    ask: "Asks how often to log or how long to track before it is useful",
    en: "A quick check-in every day is ideal. After a few weeks, patterns usually start to show.",
    pl: "Najlepiej robić krótki check-in codziennie. Po kilku tygodniach zwykle zaczynają być widoczne wzorce.",
  },
  {
    id: "no_symptoms_today",
    ask: "Says they have no symptoms today or feel fine and asks whether to log it",
    en: "Good days count too. Log them with a 1 so your report shows the full picture.",
    pl: "Dobre dni też się liczą. Zapisz je jako 1, aby raport pokazywał pełny obraz.",
  },
  {
    id: "tracking_bleeding",
    ask: "Asks how to track periods or bleeding days",
    en: "Log bleeding in your check-in on the days it happens, with how strong it was. Dates and patterns help your doctor a lot.",
    pl: "Zapisuj krwawienie w check-inie w dniach, kiedy się pojawia, wraz z jego nasileniem. Daty i wzorce bardzo pomagają lekarzowi.",
  },
  {
    id: "what_to_write_in_note",
    ask: "Asks what to write in the daily note",
    en: "Short and simple works best: what happened, when, and how it affected your day. Your doctor will see these notes in your report.",
    pl: "Najlepiej krótko i prosto: co się wydarzyło, kiedy i jak wpłynęło na Twój dzień. Lekarz zobaczy te notatki w raporcie.",
  },
  {
    id: "good_day",
    ask: "Says they are feeling good or had a good day",
    en: "That's lovely to hear. Log it in today's check-in so your good days are part of the picture.",
    pl: "Cieszę się. Zapisz to w dzisiejszym check-inie, aby Twoje dobre dni też były częścią obrazu.",
  },

  // --- Menopause basics ------------------------------------------------------------------------
  {
    id: "what_is_menopause",
    ask: "Asks what menopause is",
    en: "Menopause is the point when periods have stopped for 12 months in a row. It's a natural stage of life for most women.",
    pl: "Menopauza to moment, gdy miesiączki nie występują od 12 miesięcy z rzędu. To naturalny etap życia większości kobiet.",
  },
  {
    id: "what_is_perimenopause",
    ask: "Asks what perimenopause is or what the transition before menopause is",
    en: "Perimenopause is the transition before menopause. Periods and hormone levels start to change, and symptoms often begin. It can last several years.",
    pl: "Perimenopauza to okres przejściowy przed menopauzą. Zmieniają się miesiączki i poziom hormonów, często pojawiają się objawy. Może trwać kilka lat.",
  },
  {
    id: "what_is_postmenopause",
    ask: "Asks what postmenopause is or what happens after menopause",
    en: "Postmenopause is the time after menopause, starting 12 months after your last period. Some symptoms ease and others may continue.",
    pl: "Postmenopauza to czas po menopauzie, zaczynający się 12 miesięcy po ostatniej miesiączce. Część objawów łagodnieje, inne mogą się utrzymywać.",
  },
  {
    id: "stages_explained",
    ask: "Asks about the stages of menopause in general",
    en: "Roughly: perimenopause is the transition, menopause is 12 months without a period, and postmenopause is the time afterwards.",
    pl: "W skrócie: perimenopauza to okres przejściowy, menopauza to 12 miesięcy bez miesiączki, a postmenopauza to czas po niej.",
  },
  {
    id: "average_age",
    ask: "Asks at what age menopause usually happens or starts",
    en: "On average menopause happens around age 51, but anywhere from the 40s to the late 50s is common.",
    pl: "Przeciętnie menopauza występuje około 51. roku życia, ale między 40. a późnymi 50. latami to częste.",
  },
  {
    id: "too_young",
    ask: "Worried they are too young for menopause symptoms, for example in their early 40s",
    en: "Symptoms can start in the 40s for many women. If you're worried, your doctor can talk it through with you.",
    pl: "U wielu kobiet objawy zaczynają się w wieku 40 lat. Jeśli się martwisz, porozmawiaj z lekarzem.",
  },
  {
    id: "early_menopause",
    ask: "Asks about early or premature menopause, before age 45 or 40",
    en: "Menopause before 45 is called early, and before 40 premature. If this might apply to you, please see your doctor, who can look into it.",
    pl: "Menopauzę przed 45. rokiem życia nazywa się wczesną, a przed 40. przedwczesną. Jeśli to może Cię dotyczyć, odwiedź lekarza, który to sprawdzi.",
  },
  {
    id: "how_long_lasts",
    ask: "Asks how long menopause or its symptoms last",
    en: "It varies a lot. The transition often lasts several years, and symptoms such as hot flushes can continue for a while afterwards. Tracking helps you see your own pattern.",
    pl: "To bardzo indywidualne. Okres przejściowy często trwa kilka lat, a objawy takie jak uderzenia gorąca mogą utrzymywać się jeszcze po nim. Śledzenie pomaga zobaczyć Twój własny wzorzec.",
  },
  {
    id: "hormones_explained",
    ask: "Asks what happens to hormones, such as oestrogen, around menopause",
    en: "Around menopause the ovaries gradually make less of the female sex hormones. These changes are linked to many of the symptoms women notice.",
    pl: "W okolicy menopauzy jajniki stopniowo produkują mniej żeńskich hormonów płciowych. Te zmiany są powiązane z wieloma objawami, które zauważają kobiety.",
  },
  {
    id: "irregular_periods",
    ask: "Says periods are irregular, skipped, shorter, longer, lighter or heavier",
    en: "Changing cycles are among the most common signs of perimenopause. Track your bleeding days and mention the pattern to your doctor.",
    pl: "Zmieniający się cykl to jeden z najczęstszych objawów perimenopauzy. Notuj dni krwawienia i opowiedz lekarzowi o wzorcu.",
  },
  {
    id: "pregnancy_possible",
    ask: "Asks whether they can still get pregnant during perimenopause or with irregular periods",
    en: "Pregnancy is still possible until menopause is confirmed, even when periods are irregular. Your doctor can talk with you about contraception.",
    pl: "Ciąża jest nadal możliwa, dopóki menopauza nie zostanie potwierdzona, nawet przy nieregularnych miesiączkach. O antykoncepcji porozmawiaj z lekarzem.",
  },
  {
    id: "is_this_normal",
    ask: "Asks whether what they feel is normal or common",
    en: "Women experience a wide range of changes during these years, and it differs from person to person. Whether it's normal for you is a question for your doctor. Tracking gives them a clearer picture.",
    pl: "Kobiety doświadczają w tym czasie bardzo różnych zmian, a każda przechodzi to inaczej. Czy to normalne w Twoim przypadku, oceni lekarz. Śledzenie daje mu wyraźniejszy obraz.",
  },
  {
    id: "menopause_tests",
    ask: "Asks whether a blood test or hormone test is needed to know about menopause",
    en: "Doctors often assess menopause from age, periods and symptoms. Whether any test is needed is for your doctor to decide.",
    pl: "Lekarze często oceniają menopauzę na podstawie wieku, miesiączek i objawów. Czy potrzebne są badania, zdecyduje lekarz.",
  },
  {
    id: "surgery_menopause",
    ask: "Asks about menopause after a hysterectomy, ovary removal or other surgery",
    en: "After surgery that affects the ovaries, symptoms can begin differently. Your doctor can explain what applies to you.",
    pl: "Po zabiegu, który dotyczy jajników, objawy mogą zaczynać się inaczej. Lekarz wyjaśni, co dotyczy Ciebie.",
  },

  // --- Symptoms: general information, tracking, what to tell the doctor --------------------------
  {
    id: "hot_flushes",
    ask: "Asks about hot flushes or hot flashes, sudden waves of heat",
    en: "Hot flushes are sudden waves of heat, often with sweating or a red face, and they're very common in menopause. Log when they happen and how strong they are, and mention them to your doctor.",
    pl: "Uderzenia gorąca to nagłe fale ciepła, często z poceniem lub zaczerwienieniem twarzy, bardzo częste w menopauzie. Zapisuj, kiedy się pojawiają i jak są silne, i powiedz o nich lekarzowi.",
  },
  {
    id: "night_sweats",
    ask: "Asks about night sweats or waking up drenched",
    en: "Night sweats are hot flushes at night and can disturb sleep. Log how often they wake you, and tell your doctor, who can discuss options with you.",
    pl: "Poty nocne to uderzenia gorąca w nocy, które mogą zaburzać sen. Zapisuj, jak często Cię budzą, i powiedz o tym lekarzowi, który omówi z Tobą możliwości.",
  },
  {
    id: "sleep_trouble",
    ask: "Has trouble falling asleep, wakes in the night or sleeps badly",
    en: "Sleep often changes around menopause. Log how many nights are hard and what wakes you. Poor sleep for a long time is worth raising with your doctor.",
    pl: "Sen często się zmienia w okolicy menopauzy. Zapisuj, ile nocy jest trudnych i co Cię budzi. Długotrwałe problemy ze snem warto omówić z lekarzem.",
  },
  {
    id: "mood_swings",
    ask: "Asks about mood swings, crying easily or sudden changes in mood",
    en: "Mood changes are common during the menopause transition. Note when they happen and how strong they are, and share the pattern with your doctor.",
    pl: "Wahania nastroju są częste w okresie przejściowym. Notuj, kiedy się pojawiają i jak są silne, a wzorzec omów z lekarzem.",
  },
  {
    id: "anxiety",
    ask: "Feels anxious, nervous, on edge or has panic",
    en: "Many women feel more anxious during these years. It's worth telling your doctor, and logging how often it happens and how strong it is.",
    pl: "Wiele kobiet w tym czasie odczuwa większy niepokój. Warto powiedzieć o tym lekarzowi i zapisywać, jak często się pojawia i jak jest silny.",
  },
  {
    id: "irritability",
    ask: "Feels irritable, snappy or short-tempered",
    en: "Irritability is a common experience around menopause. Log it like any other symptom, and mention it to your doctor if it affects your life.",
    pl: "Rozdrażnienie jest częste w okolicy menopauzy. Zapisuj je jak inne objawy, a jeśli utrudnia Ci życie, powiedz o tym lekarzowi.",
  },
  {
    id: "low_energy",
    ask: "Feels tired, exhausted, has low energy or fatigue",
    en: "Tiredness is very common in these years, especially with poor sleep. Log your energy each day, and raise lasting exhaustion with your doctor.",
    pl: "Zmęczenie jest w tym czasie bardzo częste, zwłaszcza przy słabym śnie. Zapisuj energię każdego dnia, a długotrwałe wyczerpanie omów z lekarzem.",
  },
  {
    id: "brain_fog",
    ask: "Has brain fog, forgetfulness, trouble concentrating or finding words",
    en: "Brain fog, such as forgetfulness or trouble concentrating, is a common complaint. Note examples and how often they happen, and tell your doctor.",
    pl: "Mgła mózgowa, czyli zapominanie lub trudności z koncentracją, to częsta dolegliwość. Zapisuj przykłady i częstość, i powiedz o tym lekarzowi.",
  },
  {
    id: "joint_aches",
    ask: "Has joint pain, stiffness or aches in muscles",
    en: "Aches and stiff joints are reported by many women in menopause. Log where and how strong, and mention it to your doctor.",
    pl: "Bóle i sztywność stawów zgłasza wiele kobiet w menopauzie. Zapisuj, gdzie i jak silnie, i powiedz o tym lekarzowi.",
  },
  {
    id: "headaches",
    ask: "Has headaches or migraines",
    en: "Headaches can change around menopause. Log when they occur and how strong they are. A sudden, severe headache is different: please seek urgent medical help.",
    pl: "Bóle głowy mogą się zmieniać w okolicy menopauzy. Zapisuj, kiedy się pojawiają i jak są silne. Nagły, bardzo silny ból głowy to co innego: pilnie poszukaj pomocy medycznej.",
  },
  {
    id: "palpitations",
    ask: "Has heart palpitations, a racing or pounding heart, without pain",
    en: "Palpitations can happen during hot flushes and in menopause. Log when they happen. Please mention them to your doctor, and seek urgent help if they come with chest pain or fainting.",
    pl: "Kołatanie serca może pojawiać się przy uderzeniach gorąca i w menopauzie. Zapisuj, kiedy występuje. Powiedz o tym lekarzowi, a przy bólu w klatce piersiowej lub omdleniu pilnie szukaj pomocy.",
  },
  {
    id: "dizziness",
    ask: "Feels dizzy or lightheaded",
    en: "Dizziness is reported by some women around menopause. Log when it happens and tell your doctor, and seek urgent help if you faint or it comes with other worrying signs.",
    pl: "Zawroty głowy zgłaszają niektóre kobiety w okolicy menopauzy. Zapisuj, kiedy się pojawiają, powiedz o nich lekarzowi, a przy omdleniu lub innych niepokojących objawach pilnie szukaj pomocy.",
  },
  {
    id: "nausea",
    ask: "Feels nauseous or sick to the stomach",
    en: "Nausea can have many reasons, so it's worth mentioning to your doctor. Log when it happens and how strong it is.",
    pl: "Nudności mogą mieć wiele przyczyn, więc warto powiedzieć o nich lekarzowi. Zapisuj, kiedy się pojawiają i jak są silne.",
  },
  {
    id: "vaginal_dryness",
    ask: "Has vaginal dryness, discomfort or pain during sex",
    en: "Vaginal dryness is common and nothing to be embarrassed about. Doctors hear about it often, so please raise it with yours. Logging it helps.",
    pl: "Suchość pochwy jest częsta i nie ma się czego wstydzić. Lekarze często o tym słyszą, więc warto o niej powiedzieć. Pomaga też zapisywanie.",
  },
  {
    id: "low_libido",
    ask: "Has low sex drive or less interest in sex",
    en: "A change in desire is common around menopause and nothing to be ashamed of. It's a fine topic to bring to your doctor.",
    pl: "Zmiana libido jest częsta w okolicy menopauzy i nie ma się czego wstydzić. To dobry temat do rozmowy z lekarzem.",
  },
  {
    id: "weight_changes",
    ask: "Notices weight gain or changes in body shape",
    en: "Many women notice body changes around menopause. If it worries you, your doctor can talk it through with you.",
    pl: "Wiele kobiet zauważa zmiany sylwetki w okolicy menopauzy. Jeśli Cię to martwi, porozmawiaj z lekarzem.",
  },
  {
    id: "hair_skin",
    ask: "Notices hair thinning, hair loss, dry skin or skin changes",
    en: "Changes to hair and skin are reported by many women in these years. You can mention them to your doctor, especially if they bother you.",
    pl: "Zmiany włosów i skóry zgłasza wiele kobiet w tym okresie. Możesz o nich powiedzieć lekarzowi, zwłaszcza jeśli Ci przeszkadzają.",
  },
  {
    id: "bladder",
    ask: "Has bladder problems, needing to urinate often or leaking urine",
    en: "Bladder changes are common around menopause and nothing to be embarrassed about. Please mention them to your doctor.",
    pl: "Zmiany w pracy pęcherza są częste w okolicy menopauzy i nie ma się czego wstydzić. Powiedz o nich lekarzowi.",
  },
  {
    id: "breast_tenderness",
    ask: "Has sore or tender breasts",
    en: "Breast tenderness can change as hormones shift. Tell your doctor about it, and mention any lump or other change in your breasts right away.",
    pl: "Tkliwość piersi może się zmieniać wraz z hormonami. Powiedz o niej lekarzowi, a o każdym guzku lub innej zmianie w piersiach poinformuj go od razu.",
  },
  {
    id: "bleeding_after_menopause",
    ask: "Has bleeding or spotting after 12 months without a period, or after menopause",
    en: "Bleeding after 12 months without a period should always be checked. Please contact your doctor soon.",
    pl: "Krwawienie po 12 miesiącach bez miesiączki zawsze powinno zostać sprawdzone. Skontaktuj się wkrótce z lekarzem.",
  },
  {
    id: "heavy_bleeding",
    ask: "Has heavy periods, large clots or bleeding between periods, but is not in an emergency",
    en: "Heavy or unusual bleeding is worth discussing with your doctor soon. Log the days and how heavy, which helps them a lot.",
    pl: "Obfite lub nietypowe krwawienie warto wkrótce omówić z lekarzem. Zapisuj dni i nasilenie, to bardzo mu pomoże.",
  },

  // --- Treatment and medicine questions: not for Digna to answer ---------------------------------
  {
    id: "hrt_what_is",
    ask: "Asks what HRT or hormone therapy is, in general terms",
    en: "HRT, or hormone replacement therapy, is something doctors may discuss with women in menopause. Whether it suits you depends on your health, so it's a conversation for your doctor.",
    pl: "HRT, czyli hormonalna terapia zastępcza, to temat, który lekarze mogą omawiać z kobietami w menopauzie. To, czy jest odpowiednia, zależy od Twojego zdrowia, więc to rozmowa dla lekarza.",
  },
  {
    id: "hrt_start",
    ask: "Asks whether they should start HRT or hormone therapy",
    en: "That's a decision for you and your doctor. I can't advise on treatment, but your symptom history in Digna can help that conversation.",
    pl: "To decyzja dla Ciebie i lekarza. Nie doradzam w leczeniu, ale historia objawów w Digna może pomóc w tej rozmowie.",
  },
  {
    id: "hrt_dose",
    ask: "Asks about changing, increasing, doubling or skipping the dose of their hormone therapy or other medicine",
    en: "I can't advise on doses or changes to treatment. Please ask your doctor or pharmacist before changing anything.",
    pl: "Nie mogę doradzać w sprawie dawek ani zmian w leczeniu. Przed jakąkolwiek zmianą zapytaj lekarza lub farmaceutę.",
  },
  {
    id: "hrt_stop",
    ask: "Asks whether to stop hormone therapy or any treatment they are using",
    en: "Please talk to your doctor before making changes to any treatment. I can't advise on that, but I can help you note down how you feel.",
    pl: "Przed jakąkolwiek zmianą w leczeniu porozmawiaj z lekarzem. Nie mogę w tym doradzać, ale mogę pomóc zapisać, jak się czujesz.",
  },
  {
    id: "hrt_risks",
    ask: "Asks whether HRT is safe, what its risks, benefits or side effects are",
    en: "Benefits and risks differ from person to person, so this is for your doctor, who knows your health history. It may help to write down your questions before the visit.",
    pl: "Korzyści i ryzyko są różne u różnych osób, więc to pytanie do lekarza, który zna Twoją historię zdrowia. Warto zapisać pytania przed wizytą.",
  },
  {
    id: "supplements_natural",
    ask: "Asks about vitamins, herbal remedies, supplements or natural remedies",
    en: "I can't recommend supplements or remedies. Ask your doctor or pharmacist, especially since some can affect other treatments.",
    pl: "Nie mogę polecać suplementów ani środków ziołowych. Zapytaj lekarza lub farmaceutę, zwłaszcza że niektóre mogą wpływać na inne leczenie.",
  },
  {
    id: "medicine_choice",
    ask: "Asks which medicine, painkiller, sleeping aid or antidepressant to use for a symptom",
    en: "I can't suggest medicines. Your doctor can talk with you about options that fit your health. Your check-ins will show them how you've been feeling.",
    pl: "Nie mogę sugerować leków. Lekarz omówi z Tobą możliwości dopasowane do Twojego zdrowia. Twoje check-iny pokażą mu, jak się czułaś.",
  },
  {
    id: "contraception_menopause",
    ask: "Asks about the contraceptive pill, coil or contraception during menopause",
    en: "Contraception during perimenopause is a good topic for your doctor, who can consider your health and plans.",
    pl: "Antykoncepcja w perimenopauzie to dobry temat dla lekarza, który uwzględni Twoje zdrowie i plany.",
  },
  {
    id: "alternative_therapies",
    ask: "Asks about acupuncture, yoga, mindfulness or other alternative approaches",
    en: "Some women explore approaches like these. I can't judge whether they'd suit you, so please talk it over with your doctor.",
    pl: "Niektóre kobiety sięgają po takie metody. Nie oceniam, czy będą odpowiednie dla Ciebie, więc omów to z lekarzem.",
  },

  // --- Diagnosis requests --------------------------------------------------------------------------
  {
    id: "am_i_in_menopause",
    ask: "Asks whether they are in menopause or perimenopause, or what stage they are in",
    en: "I can't diagnose. Digna gives a rough estimate from your answers, but only your doctor can confirm your stage.",
    pl: "Nie stawiam diagnoz. Digna podaje orientacyjną ocenę na podstawie Twoich odpowiedzi, ale etap może potwierdzić tylko lekarz.",
  },
  {
    id: "stage_estimate_meaning",
    ask: "Asks what the 'likely in perimenopause' result from onboarding means",
    en: "That result is a rough estimate from your age, your last period and your answers. It's not a diagnosis. Your doctor can confirm where you are.",
    pl: "Ten wynik to orientacyjna ocena na podstawie wieku, ostatniej miesiączki i Twoich odpowiedzi. To nie jest diagnoza. Lekarz może potwierdzić, na jakim etapie jesteś.",
  },
  {
    id: "do_i_have_condition",
    ask: "Asks whether they have a specific condition such as thyroid problems, depression, diabetes or cancer",
    en: "I can't tell you whether you have a condition. If something worries you, please see your doctor. Writing down your symptoms first will help.",
    pl: "Nie mogę powiedzieć, czy masz jakąś chorobę. Jeśli coś Cię niepokoi, umów się do lekarza. Warto wcześniej zapisać objawy.",
  },
  {
    id: "whats_wrong_with_me",
    ask: "Asks what is wrong with them or what their symptoms mean",
    en: "I can't say what your symptoms mean. Your doctor can. The more you log, the clearer a picture they'll have.",
    pl: "Nie mogę powiedzieć, co oznaczają Twoje objawy. Może to zrobić lekarz. Im więcej zapiszesz, tym wyraźniejszy obraz będzie miał.",
  },
  {
    id: "interpret_results",
    ask: "Asks to explain or interpret blood test, hormone or scan results",
    en: "I can't interpret test results. Please go through them with your doctor, who can explain what they mean for you.",
    pl: "Nie interpretuję wyników badań. Omów je z lekarzem, który wyjaśni, co oznaczają w Twoim przypadku.",
  },

  // --- Doctor visits -------------------------------------------------------------------------------
  {
    id: "prepare_visit",
    ask: "Asks how to prepare for a doctor's appointment",
    en: "Keep logging your symptoms, note what bothers you most, and write down your questions. Digna prepares a summary for your doctor before your visit.",
    pl: "Zapisuj objawy, zanotuj, co dokucza Ci najbardziej, i spisz pytania. Digna przygotuje dla lekarza podsumowanie przed wizytą.",
  },
  {
    id: "questions_for_doctor",
    ask: "Asks what questions to ask the doctor",
    en: "You could ask what is happening in your body, what your options are, and what to watch for. Writing your own questions in advance helps you remember them.",
    pl: "Możesz zapytać, co dzieje się w Twoim organizmie, jakie są możliwości i na co zwracać uwagę. Spisanie pytań wcześniej pomaga o nich pamiętać.",
  },
  {
    id: "what_doctor_asks",
    ask: "Asks what the doctor will ask or check during the visit",
    en: "Doctors often ask about your periods, your symptoms and how they affect your days. Your Digna history can help you answer.",
    pl: "Lekarze często pytają o miesiączki, objawy i to, jak wpływają na Twoje dni. Historia w Digna pomoże Ci odpowiedzieć.",
  },
  {
    id: "which_doctor",
    ask: "Asks which kind of doctor to see, such as a gynaecologist or GP",
    en: "A family doctor or a gynaecologist is a good place to start. Either can discuss menopause with you or refer you on.",
    pl: "Dobrym początkiem jest lekarz rodzinny lub ginekolog. Każdy z nich może porozmawiać o menopauzie lub skierować Cię dalej.",
  },
  {
    id: "visit_frequency",
    ask: "Asks how often to see a doctor about menopause",
    en: "That depends on you, so it's best to ask your doctor how often they'd like to see you.",
    pl: "To zależy od Ciebie, więc najlepiej zapytać lekarza, jak często chce Cię widywać.",
  },
  {
    id: "what_to_bring",
    ask: "Asks what to bring to the appointment",
    en: "Bring your list of questions, a note of any medicines you already use, and your Digna summary.",
    pl: "Zabierz listę pytań, informację o lekach, które już stosujesz, i podsumowanie z Digna.",
  },
  {
    id: "doctor_dismissive",
    ask: "Says the doctor did not take them seriously or dismissed their symptoms",
    en: "You deserve to be heard. Your logged symptoms are useful evidence to bring along, and it's okay to ask for another opinion.",
    pl: "Zasługujesz na to, by Cię wysłuchano. Zapisane objawy to cenny materiał na wizytę, a prośba o drugą opinię jest w porządku.",
  },

  // --- Feelings and support -----------------------------------------------------------------------
  {
    id: "feeling_low",
    ask: "Feels sad, down, hopeless or low for a long time, without talking about harming themselves",
    en: "I'm sorry you feel this way. Feeling low for a while deserves attention, so please talk to your doctor or someone you trust. You don't have to carry it alone.",
    pl: "Przykro mi, że tak się czujesz. Długotrwały smutek zasługuje na uwagę, więc porozmawiaj z lekarzem lub kimś zaufanym. Nie musisz tego dźwigać sama.",
  },
  {
    id: "overwhelmed",
    ask: "Feels overwhelmed, stressed or can't cope",
    en: "That sounds like a lot. Be kind to yourself. Logging how you feel and sharing it with your doctor can be a first step.",
    pl: "Brzmi to jak dużo. Bądź dla siebie łagodna. Zapisanie, jak się czujesz, i podzielenie się tym z lekarzem może być pierwszym krokiem.",
  },
  {
    id: "lonely",
    ask: "Feels lonely or like nobody understands",
    en: "You're not alone. Many women go through this and few talk about it. Talking to someone you trust, or to your doctor, can help.",
    pl: "Nie jesteś sama. Wiele kobiet to przechodzi, choć rzadko o tym mówi. Rozmowa z kimś zaufanym lub z lekarzem może pomóc.",
  },
  {
    id: "partner_family",
    ask: "Says their partner or family does not understand what they are going through",
    en: "It can be hard when others don't see what you feel. Sharing your Digna summary can help them understand, and your doctor may have ideas too.",
    pl: "Trudno, gdy inni nie widzą, co czujesz. Podsumowanie z Digna może pomóc im zrozumieć, a lekarz może mieć też swoje pomysły.",
  },
  {
    id: "work_struggles",
    ask: "Has difficulty at work because of symptoms",
    en: "Many women find work harder during these years. Logging how symptoms affect your days gives you something concrete to discuss with your doctor.",
    pl: "Wielu kobietom w tym czasie trudniej pracować. Zapisywanie, jak objawy wpływają na Twoje dni, daje konkretny materiał do rozmowy z lekarzem.",
  },
  {
    id: "embarrassed",
    ask: "Feels embarrassed or ashamed to talk about symptoms",
    en: "There's nothing to be ashamed of. Doctors talk about these things every day, and you can use Digna to write things down first.",
    pl: "Nie ma się czego wstydzić. Lekarze rozmawiają o tym codziennie, a w Digna możesz wcześniej wszystko zapisać.",
  },
  {
    id: "scared_worried",
    ask: "Is scared, worried or afraid about what is happening to their body",
    en: "It's understandable to worry. Your doctor is the best person to put your mind at rest. Writing down what you notice can make that visit easier.",
    pl: "To zrozumiałe, że się martwisz. Najlepiej uspokoi Cię lekarz. Zapisywanie tego, co zauważasz, ułatwi wizytę.",
  },
  {
    id: "bad_day",
    ask: "Says they are having a really bad or hard day",
    en: "I'm sorry today is hard. Take it gently. If you'd like, log how you feel so your tough days are part of the picture too.",
    pl: "Przykro mi, że dziś jest ciężko. Zadbaj o siebie. Jeśli chcesz, zapisz, jak się czujesz, aby trudne dni też były częścią obrazu.",
  },

  // --- Lifestyle (information only) ---------------------------------------------------------------
  {
    id: "exercise",
    ask: "Asks about exercise or physical activity during menopause",
    en: "Many women feel better when they stay active. What suits you depends on your health, so check with your doctor if you're unsure.",
    pl: "Wiele kobiet czuje się lepiej, gdy pozostaje aktywnych. To, co jest dla Ciebie odpowiednie, zależy od zdrowia, więc w razie wątpliwości zapytaj lekarza.",
  },
  {
    id: "diet",
    ask: "Asks about food, diet or nutrition during menopause",
    en: "Food affects how many women feel, but advice differs from person to person. Your doctor or a dietitian can guide you.",
    pl: "Jedzenie wpływa na samopoczucie wielu kobiet, ale zalecenia są indywidualne. Poprowadzi Cię lekarz lub dietetyk.",
  },
  {
    id: "alcohol_caffeine",
    ask: "Asks about alcohol, coffee, caffeine or smoking and symptoms",
    en: "Some women notice that alcohol or caffeine affect their symptoms. You can note it in your check-in and see whether you spot a pattern, then discuss it with your doctor.",
    pl: "Niektóre kobiety zauważają, że alkohol lub kofeina wpływają na objawy. Możesz to zapisać w check-inie, sprawdzić, czy widać wzorzec, i omówić z lekarzem.",
  },
  {
    id: "stress_relaxation",
    ask: "Asks about stress, relaxation or calming down",
    en: "Stress can affect how you feel day to day. Noting stressful days in your check-in may show a pattern worth sharing with your doctor.",
    pl: "Stres może wpływać na samopoczucie na co dzień. Zapisanie stresujących dni w check-inie może pokazać wzorzec, o którym warto powiedzieć lekarzowi.",
  },

  // --- Urgent safety (lower matching bar so a likely emergency is never ignored) -------------------
  {
    id: "urgent_chest_pain",
    ask: "Has chest pain, pressure or tightness in the chest, or pain spreading to the arm or jaw, now or just now",
    en: "Chest pain can be serious. If this is happening now, call 112 or your local emergency number straight away.",
    pl: "Ból w klatce piersiowej może być poważny. Jeśli dzieje się to teraz, zadzwoń od razu pod numer 112.",
    minConfidence: URGENT,
  },
  {
    id: "urgent_heavy_bleeding",
    ask: "Is bleeding very heavily right now, soaking through pads quickly, or feels faint with bleeding",
    en: "Very heavy bleeding needs urgent care. Please call 112 or go to the nearest emergency department now.",
    pl: "Bardzo obfite krwawienie wymaga pilnej pomocy. Zadzwoń pod numer 112 lub od razu zgłoś się na najbliższy szpitalny oddział ratunkowy.",
    minConfidence: URGENT,
  },
  {
    id: "urgent_stroke_signs",
    ask: "Sudden weakness on one side, drooping face, slurred speech, sudden confusion, or the worst sudden headache of their life",
    en: "These can be signs of a medical emergency. Call 112 or your local emergency number right now.",
    pl: "To mogą być objawy zagrożenia życia. Zadzwoń teraz pod numer 112.",
    minConfidence: URGENT,
  },
  {
    id: "urgent_breathing",
    ask: "Severe shortness of breath or cannot breathe properly right now",
    en: "Trouble breathing can be serious. If this is happening now, call 112 or your local emergency number straight away.",
    pl: "Trudności z oddychaniem mogą być poważne. Jeśli dzieje się to teraz, zadzwoń od razu pod numer 112.",
    minConfidence: URGENT,
  },
  {
    id: "urgent_fainting",
    ask: "Has fainted, collapsed or is about to pass out",
    en: "Fainting needs medical attention. If you've collapsed or feel you might, call 112 or ask someone nearby to help you right now.",
    pl: "Omdlenie wymaga pomocy medycznej. Jeśli zasłabłaś lub czujesz, że możesz, zadzwoń pod numer 112 lub poproś kogoś obok o pomoc.",
    minConfidence: URGENT,
  },
  {
    id: "urgent_self_harm",
    ask: "Talks about wanting to die, ending their life, hurting themselves or not wanting to go on",
    en: "I'm really sorry you're in so much pain, and I'm glad you said it. You don't have to face this alone. If you might act on these thoughts, call 112 now or go to the nearest emergency department. In Poland you can also call the crisis line 116 123. Please reach out to someone you trust.",
    pl: "Bardzo mi przykro, że tak cierpisz, i cieszę się, że o tym napisałaś. Nie musisz mierzyć się z tym sama. Jeśli możesz zrobić sobie krzywdę, zadzwoń teraz pod numer 112 lub zgłoś się na najbliższy oddział ratunkowy. W Polsce możesz też zadzwonić na telefon wsparcia 116 123. Zwróć się do kogoś zaufanego.",
    minConfidence: URGENT,
  },
];

export const NONE_KEY = "none";
export const NONE_ASK =
  "Nothing above clearly fits: an unrelated topic, an unclear message, or something these answers do not cover";

export const FALLBACK = {
  en:
    "I'm not sure I have a good answer for that one. I can help with questions about menopause basics, symptoms, tracking in Digna and preparing for a doctor's visit. For anything about your own health or treatment, your doctor is the right person.",
  pl:
    "Nie jestem pewna, czy mam na to dobrą odpowiedź. Mogę pomóc w pytaniach o podstawy menopauzy, objawy, śledzenie w Digna i przygotowanie do wizyty u lekarza. W sprawach Twojego zdrowia i leczenia najlepszy jest lekarz.",
} as const;
