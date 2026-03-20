/**
 * ThemeScript Component
 *
 * Must be a SERVER component — runs before React hydration to set the
 * 'dark' class on <html> synchronously, preventing flash and ensuring
 * dark:hidden / hidden:dark:block logo swap works on first paint.
 */
export function ThemeScript() {
    const scriptContent = `
        (function() {
            try {
                const savedTheme = localStorage.getItem('theme');
                const theme = savedTheme === 'dark' ? 'dark' : 'light';
                const themeColor = theme === 'dark' ? '#0d0f14' : '#e2eaf2';
                
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                var themeMeta = document.querySelector('meta[name="theme-color"]');
                if (themeMeta) themeMeta.setAttribute('content', themeColor);
            } catch (e) {}
        })();
    `;

    return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}






