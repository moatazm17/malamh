import { Badge } from "@/components/ui/badge";

type ConsentLevel = "BLOCKED" | "TOKEN_REQUIRED" | "OPEN";

interface ConsentBadgeProps {
  level: ConsentLevel;
  className?: string;
}

export function ConsentBadge({ level, className }: ConsentBadgeProps) {
  if (level === "BLOCKED") {
    return <Badge className={`badge-blocked ${className || ""}`}>Blocked</Badge>;
  }
  if (level === "TOKEN_REQUIRED") {
    return <Badge className={`badge-token ${className || ""}`}>Token Required</Badge>;
  }
  return <Badge className={`badge-open ${className || ""}`}>Open</Badge>;
}
