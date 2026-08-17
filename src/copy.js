export const COPY = {
  timeline: [
    {
      id: "cook",
      time: "9:00",
      title: "BREAKFAST",
      subtitle: "Three dishes. One functioning attention span.",
      prompt: "SPACE — start cooking",
    },
    {
      id: "docs",
      time: "11:00",
      title: "OVERDUE DOCS",
      subtitle: "Ten deadlines have entered the chat.",
      prompt: "SPACE — open Outlook",
    },
    {
      id: "blackjack",
      time: "1:30",
      title: "PLANE MONEY",
      subtitle: "A sound financial decision made at 1:30 PM.",
      prompt: "SPACE — enter the casino",
    },
    {
      id: "sprint",
      time: "4:00",
      title: "AIRPORT SPRINT",
      subtitle: "Cardio finally becomes administratively useful.",
      prompt: "SPACE — run for it",
    },
    {
      id: "plane",
      time: "5:00",
      title: "FLIGHT TO GERMANY",
      subtitle: "Boarding closes whenever the joke needs it to.",
      prompt: "",
    },
  ],

  cook: {
    title: "9:00 AM — BREAKFAST OF CHAMPIONS",
    help: "Drag food from the pantry. Ignite pots, lift in green, and sear both steak sides.",
    win: "PERFECT. Three beige foods and not a vegetable in sight.",
    restart: "KITCHEN RESET — even the smoke alarm gave up.",
  },

  documents: [
    { name: "PASSPORT SCAN", email: "passport@international.uni.de" },
    { name: "VISA APPLICATION", email: "visa@international.uni.de" },
    { name: "ENROLLMENT FORM", email: "enrollment@international.uni.de" },
    { name: "HEALTH INSURANCE", email: "insurance@studentservices.de" },
    { name: "HOUSING CONTRACT", email: "housing@wohnheim.de" },
    { name: "PROOF OF FUNDS", email: "finance@international.uni.de" },
    { name: "LEARNING AGREEMENT", email: "exchange@international.uni.de" },
    { name: "BIOMETRIC PHOTO", email: "records@international.uni.de" },
    { name: "ARRIVAL FORM", email: "arrivals@international.uni.de" },
    { name: "COURSE REGISTRATION", email: "courses@international.uni.de" },
  ],

  emailPieces: {
    greeting: [
      { text: "Dear International Office,", good: true },
      { text: "Hey visa people,", good: false },
      { text: "Dear Canadian Exchange Office,", good: false },
    ],
    accountability: [
      { text: "I sincerely apologize for missing the deadline.", good: true },
      { text: "The deadline was more of a suggestion.", good: false },
      { text: "My bad. I was meal-prepping.", good: false },
    ],
    explanation: [
      { text: "I have now completed my {document}.", good: true, mentionsDocument: true },
      { text: "Attached is my overdue leg day waiver.", good: false, mentionsDocument: false },
      { text: "I definitely have the thing you wanted.", good: false, mentionsDocument: false },
    ],
    request: [
      { text: "Would you please allow me to submit it late?", good: true, asksPermission: true },
      { text: "Please confirm my steak can still be accepted.", good: false, asksPermission: false },
      { text: "Anyway, put it in the system. Thanks.", good: false, asksPermission: false },
    ],
    closing: [
      { text: "Thank you for your time and consideration. Best, Ariel Vainer", good: true },
      { text: "Sent from my panini press, Ariel", good: false },
      { text: "Respectfully, Definitely Not Ariel", good: false },
    ],
  },

  docs: {
    title: "11:00 AM — OUTLOOK APOLOGY TOUR",
    help: "COPY the address, PASTE it into To, then choose one line from every row.",
    approved: "APPROVED. German bureaucracy has shown mercy.",
    denied: "DENIED. Somehow the email made the late document worse.",
    win: "TEN EMAILS SENT. Ariel has discovered accountability at 11:58 AM.",
  },

  blackjack: {
    title: "1:30 PM — TOTALLY RESPONSIBLE BLACKJACK",
    help: "Reach $100 for the ticket. The dealer is suspiciously talented.",
    rigged: "DEALER HAS 21. AGAIN. The table only promised half the hands were fair.",
    bailout: "BANKRUPT. Mom found $15 in a winter coat. Try again.",
    win: "TICKET FUNDED. Please never describe this as an investment strategy.",
  },

  sprint: {
    title: "4:52 PM — AIRPORT SPRINT",
    help: "MASH SPACE. Momentum disappears faster than Ariel's deadlines.",
    fail: "MISSED BOARDING. Time has been legally reset. Try again.",
    win: "GATE REACHED WITH SECONDS AND ONE TUPPERWARE STEAK TO SPARE.",
  },

  end: {
    title: "5:00 PM — BOARDING COMPLETE",
    lines: [
      "He cooked the food.",
      "He begged for the documents.",
      "He gambled for the ticket.",
      "He ran like leg day finally mattered.",
      "Ariel Vainer is now Germany's problem.",
    ],
    again: "SPACE — procrastinate all over again",
  },
};
