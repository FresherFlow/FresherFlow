'use client';

import { SidebarVariantPicker } from '@/ui/SidebarVariantPicker';
import { useAdminLayout } from '@/features/admin/layout/AdminLayoutProvider';

/**
 * Admin → Settings → Appearance. The reference's Sidebar style picker
 * (Inset / Floating / Sidebar) bound to `AdminLayoutProvider`, whose
 * `variant` already drives `<Sidebar variant={variant}>` in `AdminSidebar`.
 * The Layout section (Default / Compact / Full) is deliberately not ported.
 */
export default function AppearanceSettings() {
    const { variant, setVariant } = useAdminLayout();

    return (
        // No card here: the settings page wraps every section in one, and
        // nesting a second border/rounded pair inside it just doubles the chrome.
        <SidebarVariantPicker value={variant} onChange={setVariant} />
    );
}
