"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

/**
 * `data-slot` is the styling hook the sidebar submenus key off
 * (`[data-slot='collapsible-content']` in globals.css) so open/close slides via
 * the Radix-measured height instead of snapping. Stamped in the primitive
 * rather than passed as a className at each call site so every collapsible
 * matches and the design-system lint stays quiet.
 */
function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
