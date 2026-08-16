export type DrillKind = 'readAloud' | 'fillerFree' | 'pace' | 'timed'

export interface Drill {
  id: string
  kind: DrillKind
  title: string
  blurb: string
  seconds: number
  /** For readAloud / pace drills: the exact text to say. */
  target?: string
  /** For timed drills: the prompt to answer. */
  prompt?: string
  tip: string
}

export const DRILLS: Drill[] = [
  {
    id: 'clarity-1',
    kind: 'readAloud',
    title: 'Consonant endings',
    blurb: 'Word-by-word accuracy check on endings people swallow.',
    seconds: 45,
    target:
      'The picked stock moved fast last night, and the packed loads left the docks exactly on the planned times.',
    tip: 'Finish every -ed and -s sound. Slight over-pronunciation now becomes normal clarity later.'
  },
  {
    id: 'clarity-2',
    kind: 'readAloud',
    title: 'Numbers and dates out loud',
    blurb: 'Say figures the way a listener can write them down.',
    seconds: 45,
    target:
      'We received one hundred and forty two loads, thirteen were late, and utilisation finished at ninety four point six percent.',
    tip: 'Group digits and pause between figures. Numbers are where listeners lose you first.'
  },
  {
    id: 'clarity-3',
    kind: 'readAloud',
    title: 'Tough clusters',
    blurb: 'Classic tongue twister set for articulation.',
    seconds: 40,
    target:
      'She sells shipped seashells; the sixth shift ships six thick shipments; red lorry, yellow lorry.',
    tip: 'Slow first, accurate second, fast third. Never trade accuracy for speed.'
  },
  {
    id: 'pace-1',
    kind: 'pace',
    title: 'Pace control: 130 words a minute',
    blurb: 'Read a paragraph and hit the target speaking rate.',
    seconds: 60,
    target:
      'Good evening everyone. Before we start, one safety point: keep clear of the dock door until the restraint light shows green. Tonight we have a heavier inbound plan than yesterday, so our first priority is clearing the trailers in the yard before eleven. Second priority is keeping the outbound loads on their dispatch times. If anything blocks you for more than ten minutes, come and find me rather than waiting. Any questions before we go?',
    tip: 'Aim for 120 to 140 words a minute. Faster feels confident to you and unclear to everyone else.'
  },
  {
    id: 'filler-1',
    kind: 'fillerFree',
    title: 'Filler-free 60',
    blurb: 'Speak for a minute. Every um, uh, like or you know is counted live.',
    seconds: 60,
    prompt: 'Describe what you did at work yesterday, start to finish.',
    tip: 'When you feel a filler coming, close your mouth and breathe. A one-second pause sounds deliberate.'
  },
  {
    id: 'filler-2',
    kind: 'fillerFree',
    title: 'Filler-free under pressure',
    blurb: 'Same rules, harder topic: explain a decision you were unsure about.',
    seconds: 60,
    prompt: 'Explain a decision you made that you were not sure about, and why you made it anyway.',
    tip: 'Fillers spike when you buy time. Plan your first sentence before you open your mouth.'
  },
  {
    id: 'timed-3sent',
    kind: 'timed',
    title: 'Three sentences only',
    blurb: 'Answer a question in exactly three sentences. Discipline over detail.',
    seconds: 45,
    prompt: 'What is the biggest risk on your site this week, and what are you doing about it?',
    tip: 'Sentence one: the answer. Sentence two: the evidence. Sentence three: the action.'
  },
  {
    id: 'timed-headline',
    kind: 'timed',
    title: 'Headline first',
    blurb: 'Give the conclusion in your opening sentence, then support it.',
    seconds: 60,
    prompt: 'Yesterday your area missed its dispatch target. Brief your manager, headline first.',
    tip: 'If your first sentence could be deleted without losing information, it was a warm-up. Cut it.'
  },
  {
    id: 'timed-starr',
    kind: 'timed',
    title: 'STARR in 90 seconds',
    blurb: 'One complete story: situation, task, action, result, reflection.',
    seconds: 90,
    prompt: 'Tell a complete STARR story about a time you improved a process.',
    tip: '20 seconds of context, 40 of your actions, 20 of result with a number, 10 of what you learned.'
  }
]

export const drillById = (id: string): Drill => DRILLS.find((d) => d.id === id) ?? DRILLS[0]
