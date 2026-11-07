import type { DisplayState } from '@/lib/dogStatus.ts'
import { STATUS_ICON_SVG } from '@/lib/statusIcons.ts'

export default function StatusIcon({
  state,
  size = 24,
}: {
  state: DisplayState
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: STATUS_ICON_SVG[state] }}
    />
  )
}
