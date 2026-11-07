import type { DisplayState } from './dogStatus.ts'

/** Inner SVG markup (24x24 viewBox, stroke = currentColor). Shared by React icons and map pins. */
export const STATUS_ICON_SVG: Record<DisplayState, string> = {
  off_leash_ok: '<path d="M5.5 12.6l4.4 4.4L18.6 7.8"/>',
  off_leash_zones:
    '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 3"/><path d="M8.4 12.3l2.6 2.6 4.6-5"/>',
  leash_required:
    '<path d="M4.8 19.2c3.6 0 2.3-5.4 6.4-6.6 2.6-.8 3.2-2.2 4.2-4.6"/><circle cx="16.9" cy="6.9" r="1.9"/>',
  no_dogs: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  unverified:
    '<path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.9.4-1.2 1-1.2 1.9"/><path d="M12 17.4v.1" stroke-width="3"/>',
}
