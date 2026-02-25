'use client';

/**
 * ThemeScript Component
 * 
 * This component injects a small script into the head of the document to prevent
 * the "white flash" on page reloads when using dark mode.
 * 
 * It runs BEFORE React hydrates, checking localStorage and system preferences
 * to apply the 'dark' class to the <html> element immediately.
 */
export function ThemeScript() {
    const scriptContent = `
        (function() {
            try {
                const savedTheme = localStorage.getItem('theme');
                // Default to light unless user explicitly chose dark.
                const theme = savedTheme === 'dark' ? 'dark' : 'light';
                const themeColor = theme === 'dark' ? '#080c16' : '#eff2f6';
                
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                var themeMeta = document.querySelector('meta[name="theme-color"]');
                if (themeMeta) themeMeta.setAttribute('content', themeColor);
            } catch (e) {
                console.error('Theme synchronization failed:', e);
            }
        })();
    `;

    return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
