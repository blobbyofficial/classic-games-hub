import { Nameplate } from "./nameplate";
import { NameStyle } from "./name-style";

/**
 * A player's name with their equipped nameplate and display-name style applied,
 * for use anywhere a name appears (search, friends, leaderboards, chat).
 */
export function PlayerName({
  name,
  equipped,
  className,
}: {
  name: string;
  equipped?: Record<string, string> | null;
  className?: string;
}) {
  return (
    <Nameplate slug={equipped?.nameplate} className={className}>
      <NameStyle style={equipped?.nameplate ? undefined : equipped?.name_style}>{name}</NameStyle>
    </Nameplate>
  );
}
