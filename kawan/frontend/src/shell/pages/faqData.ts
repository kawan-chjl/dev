// FAQ content — plain language, no jargon, no emdashes.

export type FaqCategory = 'Using Kawan' | 'How it works' | 'Privacy'

export interface FaqItem {
  id: string
  category: FaqCategory
  question: string
  answer: string
}

export const faqData: FaqItem[] = [
  // Using Kawan
  {
    id: 'faq-01',
    category: 'Using Kawan',
    question: 'How do I make a commitment?',
    answer:
      'Tap "Make a commitment" from the home screen. You choose an action (like "complete" or "ship"), describe what you will deliver, and set a deadline. That is your commitment. Kawan keeps track of it from there.'
  },
  {
    id: 'faq-02',
    category: 'Using Kawan',
    question: 'What counts as evidence?',
    answer:
      'Evidence is something Kawan can inspect directly, not something you just say. For software work, that usually means GitHub commits. For other work, a screenshot can work. Kawan checks the evidence itself rather than taking your word for it.'
  },
  {
    id: 'faq-03',
    category: 'Using Kawan',
    question: 'How does a check-in work?',
    answer:
      'When a check-in happens (on your schedule, or when you trigger one), Kawan fetches your evidence and makes a judgment. You get a verdict: verified, not sure yet, or no pass. Each verdict is honest, not punishing.'
  },
  {
    id: 'faq-04',
    category: 'Using Kawan',
    question: 'What are rest days?',
    answer:
      'Rest days are check-ins you can skip without it counting against you. You choose how many (zero to two) when you set up your commitment. Once used, they are gone for that commitment.'
  },
  {
    id: 'faq-05',
    category: 'Using Kawan',
    question: 'Can I change my companion after I start?',
    answer:
      'Yes. Go to Settings and pick a different companion. The change takes effect immediately. Your commitment and timeline stay exactly as they are.'
  },
  {
    id: 'faq-06',
    category: 'Using Kawan',
    question: 'Can I repeat a commitment once it ends?',
    answer:
      'Yes. On the Timeline page, once your commitment closes, you can choose "Repeat this." It pre-fills the same action and deliverable with a new deadline a week out so you can adjust before committing again.'
  },
  {
    id: 'faq-07',
    category: 'Using Kawan',
    question: 'Can I have more than one commitment at a time?',
    answer:
      'No. Kawan holds you to one thing at a time. The constraint is intentional: one real commitment beats a list of vague intentions.'
  },

  // How it works
  {
    id: 'faq-08',
    category: 'How it works',
    question: 'What does Kawan verify versus what does it trust you on?',
    answer:
      'Kawan verifies the evidence directly (commits, screenshots). It does not verify your feelings about the work or whether you tried hard. The commitment fields (action, deliverable, deadline) are set by you and read by Kawan. Kawan never edits them.'
  },
  {
    id: 'faq-09',
    category: 'How it works',
    question: 'What do the three verdicts mean?',
    answer:
      '"Verified" means Kawan found clear evidence that matches your commitment. "Not sure yet" means the evidence was ambiguous and Kawan could not call it either way. "No pass" means the evidence did not support the commitment. Only "not sure yet" does not count for or against you.'
  },
  {
    id: 'faq-10',
    category: 'How it works',
    question: 'What does the timeline show?',
    answer:
      'The timeline is a running record of every check-in and every verdict Kawan made, in order. You can see exactly what happened and when. Nothing is hidden.'
  },
  {
    id: 'faq-11',
    category: 'How it works',
    question: 'What does "Check now" do?',
    answer:
      '"Check now" tells Kawan to run a check-in immediately, outside your normal schedule. Kawan fetches your evidence right away and returns a verdict. Use it when you know you just completed something and want confirmation now rather than waiting.'
  },
  {
    id: 'faq-12',
    category: 'How it works',
    question: 'What is TEE verification?',
    answer:
      'TEE stands for Trusted Execution Environment. It means the code that inspects your evidence runs inside a secure, isolated processor that cannot be tampered with, even by the server running it. Your evidence is checked privately and the result is cryptographically guaranteed.'
  },
  {
    id: 'faq-13',
    category: 'How it works',
    question: 'Who is Kawan?',
    answer:
      'Kawan is a skeptical accountability companion. It watches your commitment, checks your evidence, and tells you honestly what it sees. It does not celebrate effort alone. It celebrates verified work.'
  },
  {
    id: 'faq-14',
    category: 'How it works',
    question: 'Why can I only have one commitment?',
    answer:
      'One commitment at a time keeps Kawan focused on what matters most to you right now. Adding more commitments would dilute accountability. When your current commitment closes, you can start a new one.'
  },

  // Privacy
  {
    id: 'faq-15',
    category: 'Privacy',
    question: 'What information does Kawan store?',
    answer:
      'Kawan stores your commitment fields (action, deliverable, deadline, cadence, evidence type), the timeline of check-ins and verdicts, and your settings. It does not store your evidence files directly. For GitHub, it reads commit metadata only.'
  },
  {
    id: 'faq-16',
    category: 'Privacy',
    question: 'What is the difference between a guest and a signed-in account?',
    answer:
      'As a guest, your session is local to your device and browser. Nothing is synced to a server. If you clear your browser data, your commitment history is gone. Signing in with Chutes stores your commitments and timeline on the server so you can access them from any device.'
  },
  {
    id: 'faq-17',
    category: 'Privacy',
    question: 'What is Chutes sign-in?',
    answer:
      'Chutes is the platform that powers Kawan. Signing in with Chutes creates an account that stores your commitments securely and links to your Chutes balance for AI calls. You do not need a separate password.'
  },
  {
    id: 'faq-18',
    category: 'Privacy',
    question: 'Can Kawan edit my commitment fields?',
    answer:
      'No. Kawan reads your commitment fields but never edits them. Only you can change the action, deliverable, deadline, cadence, or evidence type. Kawan may suggest a change (shown on your timeline as a proposal), but it waits for you to accept it.'
  },
  {
    id: 'faq-19',
    category: 'Privacy',
    question: 'Does Kawan share my data with anyone?',
    answer:
      'Kawan does not sell or share your data with third parties. Evidence is processed inside a Trusted Execution Environment and the result is what leaves the enclave, not the raw evidence itself.'
  },
  {
    id: 'faq-20',
    category: 'Privacy',
    question: 'Can I delete my account and data?',
    answer:
      'Yes. Go to Settings and choose "Delete account." This removes your account and all associated commitments and timeline data from the server. Guest sessions can be cleared by clearing your browser storage.'
  }
]
