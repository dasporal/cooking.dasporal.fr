import type { MarkdownInstance } from "astro";

export type RecipeSection = "bakery" | "cooking";

type RecipeFrontmatter = {
  title?: string;
  date?: string;
  categories?: string[];
  tags?: string[];
  draft?: boolean;
};

type RecipeModule = MarkdownInstance<RecipeFrontmatter>;

export type RecipeEntry = {
  title: string;
  url: string;
  section: RecipeSection;
  sectionLabel: string;
  tags: string[];
  categories: string[];
  date: string | null;
};

const modules = import.meta.glob<RecipeModule>("../pages/{bakery,cooking}/*.md", { eager: true });

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function hasDiacritics(value: string) {
  return stripDiacritics(value) !== value;
}

export function slugifyTag(tag: string) {
  return stripDiacritics(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSectionLabel(section: RecipeSection | string) {
  return section === "bakery" ? "Bakery" : "Cooking";
}

function getSectionFromUrl(url: string): RecipeSection {
  return url.startsWith("/bakery/") ? "bakery" : "cooking";
}

export function getAllRecipes() {
  return Object.values(modules)
    .filter((entry) => !entry.frontmatter.draft && entry.url)
    .map((entry) => {
      const section = getSectionFromUrl(entry.url!);

      return {
        title: entry.frontmatter.title ?? "Untitled recipe",
        url: entry.url!,
        section,
        sectionLabel: getSectionLabel(section),
        tags: entry.frontmatter.tags ?? [],
        categories: entry.frontmatter.categories ?? [],
        date: entry.frontmatter.date ?? null,
      } satisfies RecipeEntry;
    })
    .sort((left, right) => {
      const leftDate = left.date ? new Date(left.date).getTime() : 0;
      const rightDate = right.date ? new Date(right.date).getTime() : 0;

      return rightDate - leftDate || left.title.localeCompare(right.title, "fr");
    });
}

export function getRecipesBySection(section: RecipeSection) {
  return getAllRecipes().filter((recipe) => recipe.section === section);
}

export function getAllTags() {
  const tagMap = new Map<string, { label: string; count: number }>();

  for (const recipe of getAllRecipes()) {
    for (const tag of recipe.tags) {
      const slug = slugifyTag(tag);
      const existing = tagMap.get(slug);

      if (!existing) {
        tagMap.set(slug, { label: tag, count: 1 });
        continue;
      }

      existing.count += 1;

      if (!hasDiacritics(existing.label) && hasDiacritics(tag)) {
        existing.label = tag;
      }
    }
  }

  return [...tagMap.entries()]
    .map(([slug, value]) => ({ slug, label: value.label, count: value.count }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

export function getRecipesByTag(tagSlug: string) {
  return getAllRecipes().filter((recipe) => recipe.tags.some((tag) => slugifyTag(tag) === tagSlug));
}

export function getTagLabel(tagSlug: string) {
  return getAllTags().find((tag) => tag.slug === tagSlug)?.label ?? tagSlug;
}
