/**
 * ThemeScript Component
 *
 * Must be a SERVER component — runs before React hydration to set the
 * 'dark' class on <html> synchronously, preventing flash and ensuring
 * dark:hidden / hidden:dark:block logo swap works on first paint.
 */
export const themeScriptContent = `
        (function() {
            try {
                let theme = localStorage.getItem('theme');
                if (!theme || theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                const themeColor = theme === 'dark' ? '#0d0f14' : '#e2eaf2';
                
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                }
                var themeMeta = document.querySelector('meta[name="theme-color"]');
                if (themeMeta) themeMeta.setAttribute('content', themeColor);
            } catch (e) {}
        })();
    `;
