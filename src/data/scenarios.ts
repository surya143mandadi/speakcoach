export type Category = 'interview' | 'work' | 'everyday' | 'presenting'
export type Level = 'A2' | 'B1' | 'B2' | 'C1'

export interface Scenario {
  id: string
  category: Category
  title: string
  blurb: string
  minutes: number
  difficulty: 1 | 2 | 3
  avatarId: string
  /** Coach's opening line, spoken at session start. */
  opening: string
  /** What a good answer must contain - shown as a live checklist. */
  goals: string[]
  /** Extra instructions injected into the AI coach system prompt. */
  brief: string
  /** Offline fallback: asked in order when no API key is configured. */
  offlineQuestions: string[]
  /** Metrics this scenario is scored hardest on. */
  focus: Array<'structure' | 'fillers' | 'fluency' | 'clarity' | 'substance'>
}

export const SCENARIOS: Scenario[] = [
  // ---------------------------------------------------------------- interview
  {
    id: 'lp-loop',
    category: 'interview',
    title: 'Behavioural interview loop',
    blurb: 'Rotating Leadership Principle questions with real follow-ups. STARR scored.',
    minutes: 12,
    difficulty: 3,
    avatarId: 'maya',
    opening:
      "Hi, thanks for making the time. I'm Maya, I look after operations here. I'd like to walk through a few examples from your experience. To start: tell me about a time you had to deliver a result with less resource than you needed.",
    goals: [
      'Situation and Task in under 30 seconds',
      'Use "I" for your own actions, not "we"',
      'Quantify the result with a real number',
      'Close with what you learned or changed after'
    ],
    brief:
      'Run a realistic behavioural interview. One question at a time. After each answer, ask exactly one probing follow-up that targets the weakest part of the answer (missing metric, unclear personal action, no result, or no learning). Rotate across Leadership Principles: Deliver Results, Ownership, Dive Deep, Earn Trust, Bias for Action, Insist on the Highest Standards. Never accept a vague answer - ask for the number or the specific action.',
    offlineQuestions: [
      'Tell me about a time you delivered a result with fewer resources than you needed.',
      'What was the specific metric before you started, and what did it become?',
      'Tell me about a time you disagreed with your manager or a peer. What did you do?',
      'Describe a problem where you had to dig into the data yourself. How deep did you go?',
      'Tell me about a time you took ownership of something outside your remit.',
      'What is the hardest feedback you have received, and what changed afterwards?'
    ],
    focus: ['structure', 'substance', 'fillers']
  },
  {
    id: 'bar-raiser',
    category: 'interview',
    title: 'Bar Raiser pressure round',
    blurb: 'Relentless follow-ups on one story until it holds up. Hard mode.',
    minutes: 10,
    difficulty: 3,
    avatarId: 'alex',
    opening:
      "I'm Alex, I'm the Bar Raiser on this loop. I'm going to pick one example and go deep on it. Walk me through the most difficult operational problem you have personally owned end to end.",
    goals: [
      'Hold one story for the whole round without switching examples',
      'Answer the question actually asked, then stop',
      'Separate what you did from what the team did',
      'Admit trade-offs and what you would do differently'
    ],
    brief:
      'You are a Bar Raiser. Pick the candidate\'s first story and stay on it for the entire session, drilling one layer deeper each turn: root cause, the data they looked at, who pushed back, what they personally decided, what the result was, what they would change. If they try to switch to a different example, pull them back. Be neutral, never praise mid-round.',
    offlineQuestions: [
      'Walk me through the most difficult operational problem you have personally owned.',
      'What was the root cause, and how did you prove it rather than assume it?',
      'Which data did you look at yourself, and what did it show?',
      'Who disagreed with your approach, and how did you handle that?',
      'What decision was yours alone to make, and what did you decide?',
      'What did the metric do over the following four weeks?',
      'What would you do differently if it happened again next week?'
    ],
    focus: ['substance', 'structure', 'clarity']
  },
  {
    id: 'tell-me-about-yourself',
    category: 'interview',
    title: 'Tell me about yourself, in 2 minutes',
    blurb: 'The opening 120 seconds that sets the tone for the whole loop.',
    minutes: 6,
    difficulty: 2,
    avatarId: 'charlotte',
    opening:
      "Let's polish your opener. Give me your \"tell me about yourself\" - aim for two minutes, no more. Start whenever you're ready.",
    goals: [
      'Present, then past, then why this role',
      'Two concrete achievements with numbers',
      'No life story, no job-by-job list',
      'Land the ending cleanly instead of trailing off'
    ],
    brief:
      'Coach a two-minute personal pitch. Time it. After the first attempt, give three specific edits (what to cut, what to add, how to open) and ask them to run it again. Compare attempt two to attempt one out loud.',
    offlineQuestions: [
      'Give me your two-minute "tell me about yourself".',
      'Now cut it to 60 seconds and keep only the strongest achievement.',
      'Run it once more, opening with your current role and a number.'
    ],
    focus: ['structure', 'fillers', 'clarity']
  },
  {
    id: 'curveball',
    category: 'interview',
    title: 'Curveballs and gaps',
    blurb: 'Weak spots, failures, "why should we pick you" and other uncomfortable ones.',
    minutes: 8,
    difficulty: 3,
    avatarId: 'alex',
    opening:
      "Let's do the uncomfortable ones. Tell me about a time you failed at something that mattered.",
    goals: [
      'Own the failure without over-apologising',
      'Show the fix, not just the regret',
      'Stay under 90 seconds per answer',
      'No blaming other teams'
    ],
    brief:
      'Ask hard, uncomfortable interview questions: biggest failure, worst feedback, a time you missed a commitment, weakness, why you over another candidate, a decision you regret. Push back once per answer if they deflect blame or over-explain.',
    offlineQuestions: [
      'Tell me about a time you failed at something that mattered.',
      'What is your biggest weakness as a leader today?',
      'Tell me about a commitment you missed. What did the stakeholder say?',
      'Why should we pick you over someone with more experience?',
      'Describe a decision you regret.'
    ],
    focus: ['clarity', 'structure', 'fluency']
  },

  // -------------------------------------------------------------------- work
  {
    id: 'shift-brief',
    category: 'work',
    title: 'Start-of-shift brief',
    blurb: 'Brief your associates: priorities, safety call-out, targets. Short and clear.',
    minutes: 6,
    difficulty: 1,
    avatarId: 'maya',
    opening:
      "You've got 30 associates in front of you and four minutes before shift start. Give me your brief - safety point, plan for the shift, and what good looks like tonight.",
    goals: [
      'Open with the safety message',
      'Three priorities maximum',
      'State the target as a number',
      'Finish with a clear ask and a check for questions'
    ],
    brief:
      'Play an experienced ops leader listening to a shift brief. After the brief, role-play two associate questions (one about workload fairness, one about a process change), then give feedback on pace, volume of detail and whether the target was clear.',
    offlineQuestions: [
      'Give me your start-of-shift brief: safety point, plan, and target.',
      'An associate asks why their area always gets the heaviest freight. Respond.',
      'Someone asks what happens if the plan changes mid-shift. Respond.',
      'Close the brief in two sentences.'
    ],
    focus: ['structure', 'clarity', 'fillers']
  },
  {
    id: 'escalation',
    category: 'work',
    title: 'Escalate to a senior leader',
    blurb: 'Two minutes with a senior manager. Problem, impact, ask, options.',
    minutes: 8,
    difficulty: 3,
    avatarId: 'charlotte',
    opening:
      "I'm your senior manager and I have two minutes between meetings. You asked for time - go ahead.",
    goals: [
      'Headline the problem in one sentence',
      'Quantify the impact (loads, hours, cost, risk)',
      'State the ask explicitly',
      'Offer two options with a recommendation'
    ],
    brief:
      'Play a time-poor senior leader. Interrupt once with "what do you need from me?" if the speaker buries the ask. Push for the number if impact is described in adjectives. End by summarising back what you understood, so they can hear whether their message landed.',
    offlineQuestions: [
      'You have two minutes. What is the problem and what do you need from me?',
      'What is the impact if we do nothing this week?',
      'What are my options, and which one do you recommend?',
      'Who else have you spoken to about this?'
    ],
    focus: ['structure', 'substance', 'clarity']
  },
  {
    id: 'difficult-convo',
    category: 'work',
    title: 'Difficult conversation with an associate',
    blurb: 'Performance or process issue, handled firmly and respectfully.',
    minutes: 8,
    difficulty: 2,
    avatarId: 'priya',
    opening:
      "I'm the associate. You asked to speak with me. I skipped a process step on the dock last night, and honestly I think everyone does it. What did you want to say?",
    goals: [
      'Describe the behaviour, not the person',
      'Explain the risk in concrete terms',
      'Listen and acknowledge before correcting',
      'Agree a specific next step and follow-up'
    ],
    brief:
      'Role-play a defensive but reasonable associate. Start slightly resistant. If the leader listens and is specific, soften. If the leader lectures or generalises, get more defensive. Afterwards, give feedback as a coach on tone, listening and whether a clear commitment was reached.',
    offlineQuestions: [
      'I skipped the step because everyone does. What did you want to say?',
      'So am I in trouble now?',
      'Nobody told me it was that serious. Why is this on me?',
      'Fine - what do you want me to do differently tonight?'
    ],
    focus: ['clarity', 'structure', 'fluency']
  },
  {
    id: 'metric-briefout',
    category: 'work',
    title: 'DOR / metric brief-out',
    blurb: 'Walk a leadership audience through yesterday: misses, root cause, actions.',
    minutes: 8,
    difficulty: 3,
    avatarId: 'maya',
    opening:
      "You're up for the daily brief-out. Take me through yesterday's performance: what missed, why, and what changes today.",
    goals: [
      'Lead with the miss, not the narrative',
      'One root cause per miss, evidenced',
      'Owner and date on every action',
      'Anticipate the obvious question before it is asked'
    ],
    brief:
      'Play a demanding operations director in a daily review. Ask "why" up to three times on the first miss the speaker mentions. Challenge any action without an owner or a date. Keep it fast.',
    offlineQuestions: [
      'Take me through yesterday: what missed and by how much?',
      'Why did that happen? Give me the root cause, not the symptom.',
      'Why did that root cause happen?',
      'What are you changing today, who owns it, and by when?',
      'What is the risk to tonight if that action slips?'
    ],
    focus: ['substance', 'structure', 'clarity']
  },
  {
    id: 'pushback',
    category: 'work',
    title: 'Say no, keep the relationship',
    blurb: 'Decline an unreasonable request without damage. Offer an alternative.',
    minutes: 6,
    difficulty: 2,
    avatarId: 'charlotte',
    opening:
      "I need your team to take an extra 40 loads tonight on top of plan. I know it's short notice, but I'm counting on you. Can you do it?",
    goals: [
      'Acknowledge the request before answering',
      'Give the constraint with evidence',
      'Offer a partial or alternative solution',
      'Keep the tone collaborative, not defensive'
    ],
    brief:
      'Play a peer manager pressing for an unreasonable commitment. Push twice. Accept a well-reasoned partial offer. Afterwards, coach on softeners, hedging and whether the no was actually clear.',
    offlineQuestions: [
      'Can you take an extra 40 loads tonight?',
      'Come on - can you not just flex a few people across?',
      'So what can you give me?',
      'How will you tell me if that changes?'
    ],
    focus: ['clarity', 'fluency', 'structure']
  },

  // ---------------------------------------------------------------- everyday
  {
    id: 'small-talk',
    category: 'everyday',
    title: 'Small talk that goes somewhere',
    blurb: 'Coffee-queue conversation: open, ask, share, exit gracefully.',
    minutes: 6,
    difficulty: 1,
    avatarId: 'priya',
    opening:
      "Hey! I don't think we've met properly - I just moved over to the transport team last week. How long have you been here?",
    goals: [
      'Ask an open question in your first three sentences',
      'Share something back, do not just answer',
      'Follow a thread instead of changing topic',
      'Close warmly with a reason to talk again'
    ],
    brief:
      'Be a friendly new colleague making small talk. Keep turns short and natural. Occasionally leave a small opening the speaker should pick up on. Afterwards, note two moments where they could have gone deeper.',
    offlineQuestions: [
      "I just moved to the transport team - how long have you been here?",
      'What does a normal day look like for you?',
      'Did you do anything on the weekend?',
      'We should grab a coffee sometime - when suits you?'
    ],
    focus: ['fluency', 'fillers', 'clarity']
  },
  {
    id: 'phone-call',
    category: 'everyday',
    title: 'Phone call: enquiry or complaint',
    blurb: 'No body language, no visual cues. Pure clarity practice.',
    minutes: 6,
    difficulty: 2,
    avatarId: 'priya',
    opening:
      "Good morning, you've reached customer service, this is Priya speaking. How can I help you today?",
    goals: [
      'State the reason for calling in one sentence',
      'Give reference details clearly and slowly',
      'Ask for a specific outcome',
      'Confirm the next step before hanging up'
    ],
    brief:
      'Play a polite but by-the-book service agent. Ask for details, mishear one thing on purpose so the caller has to clarify, and offer a partial resolution so the caller has to push politely.',
    offlineQuestions: [
      'How can I help you today?',
      'Sorry, can you repeat the reference number slowly?',
      'I can offer a partial credit - would that be acceptable?',
      'Can I confirm what we agreed before we finish?'
    ],
    focus: ['clarity', 'fluency', 'fillers']
  },
  {
    id: 'explain-job',
    category: 'everyday',
    title: 'Explain your job in plain English',
    blurb: 'No acronyms, no jargon. If a stranger gets it, you own it.',
    minutes: 6,
    difficulty: 2,
    avatarId: 'charlotte',
    opening:
      "Pretend we just met at a barbecue and I know nothing about warehouses. What do you actually do all day?",
    goals: [
      'Zero acronyms and internal jargon',
      'Use one everyday analogy',
      'Answer in under 60 seconds',
      'End with why it matters to a normal person'
    ],
    brief:
      'Play a curious outsider. Every time the speaker uses jargon or an acronym, stop and say you did not understand that word, and ask them to say it another way. Keep it friendly.',
    offlineQuestions: [
      'What do you actually do all day?',
      'You used a word I did not understand - can you say that differently?',
      'Why does that matter to someone like me?',
      'What is the hardest part of it?'
    ],
    focus: ['clarity', 'fillers', 'fluency']
  },
  {
    id: 'story',
    category: 'everyday',
    title: 'Tell a story people want to hear',
    blurb: 'Set-up, tension, turn, landing. Ninety seconds of storytelling.',
    minutes: 6,
    difficulty: 2,
    avatarId: 'priya',
    opening:
      "Tell me about a trip or a day that did not go to plan - I want the whole story, with the bit where it went wrong.",
    goals: [
      'Set the scene in two sentences',
      'Build one clear point of tension',
      'Use present tense for the peak moment',
      'Land an ending instead of fading out'
    ],
    brief:
      'Be an engaged listener who reacts naturally and asks for sensory detail ("what did that look like?", "what were you thinking then?"). Afterwards, point out where the story sagged and where it worked.',
    offlineQuestions: [
      'Tell me about a trip or day that did not go to plan.',
      'What were you thinking at that exact moment?',
      'What did the other people do?',
      'How did it end - give me a proper ending.'
    ],
    focus: ['fluency', 'structure', 'clarity']
  },

  // -------------------------------------------------------------- presenting
  {
    id: 'sixty-seconds',
    category: 'presenting',
    title: '60-second update, zero fillers',
    blurb: 'One minute, one message, no "um". The hardest simple drill there is.',
    minutes: 5,
    difficulty: 2,
    avatarId: 'charlotte',
    opening:
      "Sixty seconds, one message, no filler words. Pick anything from your week and go. I'll count every um and uh.",
    goals: [
      'One headline message, stated first',
      'Three supporting points maximum',
      'Pause instead of saying um',
      'Stop at the end, do not repeat yourself'
    ],
    brief:
      'Time a 60-second update. Count filler words and report the exact count. Then have them run it again and compare. Be encouraging about improvement but precise about the numbers.',
    offlineQuestions: [
      'Sixty seconds on anything from your week. Go.',
      'Again - same content, pause instead of filling. Go.',
      'Last time, and cut it to 30 seconds.'
    ],
    focus: ['fillers', 'fluency', 'structure']
  },
  {
    id: 'impromptu',
    category: 'presenting',
    title: 'Impromptu topic',
    blurb: 'Random topic, ten seconds to think, ninety seconds to speak.',
    minutes: 8,
    difficulty: 3,
    avatarId: 'alex',
    opening:
      "I'll give you a topic and you speak for ninety seconds with almost no prep. First topic: the most useful habit you have built. Ten seconds to think, then go.",
    goals: [
      'Take a breath and start with a position',
      'Two examples, one contrast',
      'Do not apologise for the topic',
      'Finish with a summary line'
    ],
    brief:
      'Give one impromptu topic at a time, mixing everyday and workplace subjects. After each, give one strength and one fix in a single sentence each, then hand over the next topic.',
    offlineQuestions: [
      'Topic: the most useful habit you have built. Ninety seconds.',
      'Topic: something most people get wrong about your job.',
      'Topic: a rule you would change at work and why.',
      'Topic: the best decision you made this year.'
    ],
    focus: ['fluency', 'structure', 'fillers']
  },
  {
    id: 'eli5',
    category: 'presenting',
    title: 'Explain a complex process simply',
    blurb: 'Teach a process to someone who has never seen it. Test of true clarity.',
    minutes: 7,
    difficulty: 2,
    avatarId: 'priya',
    opening:
      "Teach me a process you know well, as if it's my first day and I've never been on a site before. Start from the beginning.",
    goals: [
      'Sequence it: first, then, after that',
      'Define every term you introduce',
      'Give one failure mode and how to avoid it',
      'Check my understanding at the end'
    ],
    brief:
      'Play a keen but completely new starter. Ask a clarifying question every 30-40 seconds. If a step is skipped, say you are lost and ask them to go back one step.',
    offlineQuestions: [
      'Teach me a process you know well, from the very beginning.',
      'Wait - what happens if that step goes wrong?',
      'Why is that step in that order?',
      'Can you check whether I have understood it?'
    ],
    focus: ['clarity', 'structure', 'substance']
  }
]

export const CATEGORY_META: Record<Category, { label: string; blurb: string; icon: string }> = {
  interview: { label: 'Interview', blurb: 'PA, AM and loop practice', icon: 'briefcase' },
  work: { label: 'Workplace', blurb: 'Briefs, escalations, hard chats', icon: 'people' },
  everyday: { label: 'Everyday', blurb: 'Small talk, calls, stories', icon: 'chat' },
  presenting: { label: 'Presenting', blurb: 'Impromptu and 60-second drills', icon: 'mic' }
}

export const scenarioById = (id: string): Scenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
