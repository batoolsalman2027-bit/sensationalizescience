/**
 * FAQ content, grouped by category. Edit here — the FAQ page and the home FAQ
 * section both read from this file.
 */

export interface FaqGroup {
  category: string;
  questions: { q: string; a: string }[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    category: "General",
    questions: [
      { q: "What is Synapse?", a: "A tool that turns scientific papers into short, animated, narrated videos ready for TikTok, Reels, Shorts, LinkedIn, and more." },
      { q: "Who is it for?", a: "Researchers, labs, universities, journals, biotech companies, and science creators who want their work seen beyond academia." },
      { q: "Do I need any video editing skills?", a: "No. Upload a paper and you get a finished video. You can optionally fine-tune everything before export." },
    ],
  },
  {
    category: "Scientific accuracy",
    questions: [
      { q: "How accurate are the generated videos?", a: "Scripts are grounded in your paper's actual content. You review and approve the script, visuals, terminology, and citations before anything is exported." },
      { q: "Can I edit the script?", a: "Yes. You can edit the narration line by line and adjust wording, pacing, and emphasis." },
      { q: "Does it invent findings?", a: "No. The system is built to summarize what's in your paper. You remain in control and can correct anything before publishing." },
    ],
  },
  {
    category: "Video creation",
    questions: [
      { q: "How long does it take?", a: "Most videos are ready in a few minutes." },
      { q: "How long are the videos?", a: "Short-form by default — typically under 60 seconds — and tuned for vertical feeds." },
      { q: "Can I customize the visuals and voice?", a: "Yes. Choose voices, adjust the storyboard, and apply your brand." },
    ],
  },
  {
    category: "Ownership and copyright",
    questions: [
      { q: "Who owns the videos I create?", a: "You do. Videos you generate are yours to use and publish." },
      { q: "Can I use them commercially?", a: "Yes, on paid plans. Check your plan for watermark and licensing details." },
      { q: "What about the underlying paper's rights?", a: "You are responsible for ensuring you have the rights to the paper content you upload." },
    ],
  },
  {
    category: "Privacy and unpublished research",
    questions: [
      { q: "Is my unpublished research safe?", a: "Your uploads are private to your account. We do not publish or share your content." },
      { q: "Do you train models on my papers?", a: "No — your uploaded papers are not used to train models." },
      { q: "Can I delete my data?", a: "Yes. You can delete your uploads and generated videos at any time." },
    ],
  },
  {
    category: "Pricing",
    questions: [
      { q: "Is there a free plan?", a: "Yes. The Free plan lets you try it on a few papers each month." },
      { q: "Can I change plans?", a: "Yes, upgrade or downgrade anytime; changes apply next cycle." },
      { q: "Do you offer academic discounts?", a: "Yes, for students and verified academic labs. Contact us to set it up." },
    ],
  },
  {
    category: "Exporting and publishing",
    questions: [
      { q: "What formats can I export?", a: "Vertical and square formats sized for TikTok, Reels, Shorts, LinkedIn, and YouTube." },
      { q: "Can I download the raw video file?", a: "Yes. Download an MP4 and post it anywhere." },
      { q: "Do you publish directly to platforms?", a: "Direct publishing is on our roadmap; for now you export and upload." },
    ],
  },
];
