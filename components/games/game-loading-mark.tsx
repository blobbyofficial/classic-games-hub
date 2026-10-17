import Image from "next/image";

/** Branded, accessible loading treatment for the game stage.
 * Use the static site mark for OS or in-app reduced-motion preferences.
 * Both assets are served as-is: GIFs must not be processed by next/image.
 */
export function GameLoadingMark() {
  return (
    <div role="status" aria-label="Loading game" className="flex flex-col items-center gap-2">
      <picture className="block size-14 overflow-hidden rounded-lg bg-black">
        <source media="(prefers-reduced-motion: reduce)" srcSet="/icon.svg" type="image/svg+xml" />
        <Image
          src="/animated-icon.gif"
          alt=""
          width={56}
          height={56}
          unoptimized
          className="game-loading-animated size-full object-contain"
        />
      </picture>
      <span className="text-xs font-medium text-muted-foreground">Loading game…</span>
    </div>
  );
}
