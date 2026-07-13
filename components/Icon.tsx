import {
  Users,
  Clock,
  Lightbulb,
  Share2,
  FileText,
  Sparkles,
  Mic,
  Captions,
  Palette,
  Languages,
  Microscope,
  FlaskConical,
  GraduationCap,
  BookOpen,
  Building2,
  Clapperboard,
  type LucideProps,
} from "lucide-react";

/** Maps the string icon names used in config/*.ts to lucide components. */
const MAP: Record<string, React.ComponentType<LucideProps>> = {
  Users,
  Clock,
  Lightbulb,
  Share2,
  FileText,
  Sparkles,
  Mic,
  Captions,
  Palette,
  Languages,
  Microscope,
  FlaskConical,
  GraduationCap,
  BookOpen,
  Building2,
  Clapperboard,
};

export default function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Cmp = MAP[name] ?? Sparkles;
  return <Cmp {...props} />;
}
