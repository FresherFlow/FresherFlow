export const toTitleCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => {
            if (!word) return '';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

export const formatListToTitleCase = (list: string[] | null | undefined): string => {
    if (!list || list.length === 0) return '';
    return list.map(item => toTitleCase(item)).join(', ');
};
