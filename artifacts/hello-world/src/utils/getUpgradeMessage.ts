import type { Tier } from "@/config/tierConfig";
import type { UpgradeTriggerId } from "@/types/upgradeTriggers";

export function getUpgradeMessage(
  tier: Tier,
  trigger: UpgradeTriggerId
): string {
  switch (trigger) {
    case "daily_questions":
      return "Upgrade to continue asking questions.";

    case "pdfs_per_day":
      return "Upgrade for more PDF uploads.";

    case "large_document":
      return "Large document support is available in Pro.";

    case "custom_mode":
      return "Custom Modes are available in Pro.";

    default:
      return "Upgrade to unlock more features.";
  }
}