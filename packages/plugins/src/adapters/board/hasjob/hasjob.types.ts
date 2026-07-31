/**
 * Shape of a parsed Atom entry from HasJob.
 * HasJob uses Atom 1.0 format (not RSS), so entries have different tags:
 * <entry> instead of <item>, <content> instead of <description>,
 * and <link href="..."/> self-closing tags instead of <link>URL</link>.
 */
export interface HasJobAtomEntry {
  title: string | null;
  link: string | null;
  content: string | null;
  published: string | null;
  updated: string | null;
  location: string | null;
}
