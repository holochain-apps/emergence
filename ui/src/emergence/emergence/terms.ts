import pluralize from "pluralize"
import type { Settings } from "./types"

// A term has four ergonomic forms so call sites don't have to think:
//   s = lowercase singular ("space")
//   S = capitalized singular ("Space")
//   p = lowercase plural ("spaces")
//   P = capitalized plural ("Spaces")
export type Term = { s: string; S: string; p: string; P: string }

const cap = (str: string) => str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1)
const lc = (str: string) => str.length === 0 ? str : str.charAt(0).toLowerCase() + str.slice(1)

export const buildTerm = (singular: string): Term => {
    const trimmed = singular.trim()
    const plural = pluralize.plural(trimmed)
    return {
        s: lc(trimmed),
        S: cap(trimmed),
        p: lc(plural),
        P: cap(plural),
    }
}

export const DEFAULT_SPACE_TERM = "Space"
export const DEFAULT_SITEMAP_TERM = "Site Map"
export const DEFAULT_SECTION_TERM = "Section"

export const termsFromSettings = (settings: Settings) => ({
    space: buildTerm(settings.space_term?.trim() || DEFAULT_SPACE_TERM),
    sitemap: buildTerm(settings.sitemap_term?.trim() || DEFAULT_SITEMAP_TERM),
    section: buildTerm(settings.section_term?.trim() || DEFAULT_SECTION_TERM),
})
