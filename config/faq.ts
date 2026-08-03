/**
 * FAQ content, grouped by category. Edit here. The FAQ page and the home FAQ
 * section both read from this file.
 */

export interface FaqGroup {
  category: string;
  questions: { q: string; a: string }[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    category: "The basics",
    questions: [
      {
        q: "What is Sensationalize Science?",
        a: "Sensationalize Science turns a research paper into a short, structured video. You upload a PDF; you get back a narrated video that moves through the paper's motivation, methods, results, and significance, with visuals from the paper's own figures and data.",
      },
      {
        q: "Wait, “sensationalize”? Isn't that the thing science communication is supposed to avoid?",
        a: "Fair question, and the name is deliberate. “Sensational” comes from sensus, of the senses. We're not inflating your findings, we're making them sensory. The claims in your video stay exactly as careful as the claims in your paper.",
      },
      {
        q: "Who is it for?",
        a: "Researchers who want a publication-quality video abstract without hiring a production team.",
      },
      {
        q: "What do I actually get?",
        a: "An MP4 (60 to 120 seconds), the narration script, and a video that has undergone quality control checks from our team at Sensationalize Science.",
      },
      {
        q: "How long does it take?",
        a: "Once you upload your PDF, expect a 2 to 3 business day turnaround for a typical paper. This ensures our quality control team has time to provide you with the best video possible.",
      },
    ],
  },
  {
    category: "How it works",
    questions: [
      {
        q: "What are the steps?",
        a: "Four. We parse the PDF, including its text, figures, tables, and captions. Our AI model then drafts a scene-by-scene script structured around the paper's own sections. We generate or adapt a visual for each scene. Then we assemble narration, motion, and captions into the finished video.",
      },
      {
        q: "Can I edit it?",
        a: "Yes. If you are not happy with the results of your first video, you can reach out to the team at Sensationalize Science, and they will re-render scenes of your choosing.",
      },
    ],
  },
  {
    category: "Accuracy",
    questions: [
      {
        q: "How do you keep it from making claims the paper doesn't make?",
        a: "Each scene is traceable back to the section it came from, so you can check any line against its source in a few seconds.",
      },
      {
        q: "Does the video cite the paper?",
        a: "Yes. The full citation and DOI appear on screen, and in the description text we generate alongside the video.",
      },
    ],
  },
  {
    category: "Your paper, your rights",
    questions: [
      {
        q: "Do I own the video?",
        a: "Yes.",
      },
      {
        q: "Can I upload a paper I didn't write?",
        a: "Only if you have the right to. Open-access papers under a CC license are generally fine with attribution. Rights to what you upload are your responsibility.",
      },
      {
        q: "Is my unpublished work safe here?",
        a: "Uploaded papers are private to your account, and are never published to our public gallery unless you give permission.",
      },
      {
        q: "Can I use this on a manuscript under review?",
        a: "Yes, and many people build the video during review so it's ready the day the paper lands.",
      },
    ],
  },
  {
    category: "Practical",
    questions: [
      {
        q: "What does it cost?",
        a: "Your first video is free. After that, credits start at $100 per video, with discounts on larger packs. Credits never expire.",
      },
      {
        q: "Are captions included?",
        a: "Yes, captions are included so the video works on mute and with screen readers.",
      },
      {
        q: "Where can I post the videos?",
        a: "Anywhere: journal supplementary material, conference sites, lab pages, LinkedIn, X, YouTube, TikTok. You can choose to generate the video in three different aspect ratios.",
      },
    ],
  },
  {
    category: "Support",
    questions: [
      {
        q: "Something came out wrong. What now?",
        a: "Use the contact form at the bottom of this page (or on Contact) and choose Bug / Quality issue. We'll reply within 2 business days.",
      },
      {
        q: "Question not covered?",
        a: "Scroll to the contact form below and send us a message. We reply within 2 business days.",
      },
    ],
  },
];
