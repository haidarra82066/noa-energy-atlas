# Noa Energy Atlas

## Overview

Begin with a sector, trace its connected instruments, then open the legal record and its primary sources. The map serves engineers, analysts and legal specialists investigating Lebanon’s energy framework.

## Colors

Use warm paper for reading and a deep navy plotting surface in both themes. Mint marks the active map view and the action that opens a full legal record. Keep sector colors consistent across navigation, ports, record outlines and graph labels. Pair each color with a name or icon. The shared color tokens live in `src/styles/global.css` and the map palette in `src/styles/map.css`.

## Typography

Use the system sans stack for headings, controls and body text. Use the Arabic font stack for right-to-left reading. Give the map title the strongest weight and size contrast. Keep summaries within a comfortable line length and use tabular numerals for counts.

## Layout

The desktop rail holds navigation, filters and a dedicated footer for Noa. A breadcrumb and review date orient the reader above the workspace. Search sits beside the map heading, with the view switch and relationship ledger along the top of the map. The footer reports the current sector and visible record and relationship totals.

On phones, move the rail into the navigation drawer, stack search below the heading and arrange the sector ports in two staggered columns. Give the selected sector its own two-column record layout so each instrument can be read and tapped. Keep locale and theme controls available in the header.

## Components

**Sector overview.** Label each circular port with its sector and record count. Draw a route only when the ledger contains a relationship between records in those sectors. Thicker routes represent more documented connections. Keep background contours quiet and route lines clear of unrelated ports. Hover and keyboard focus highlight the routes attached to a sector.

**Record graph.** Selecting a sector, zooming over its port, or pinching into it opens its records and expands readable status/summary cards automatically. Keep the sector switcher, All sectors return and Copy view link available while exploring. Store the selected sector, filters and record in the URL. Zooming out of a sector returns to the overview. Preserve pan, pinch, zoom, draggable records and keyboard selection. Trace active connections with restrained motion. Under reduced motion, keep the highlight static and open the inspector immediately. Offer the filtered record directory below the map and a clear-filters action when a search returns no matches.

**Dossiers.** Follow connected records in the map without navigating away; preserve ordinary modified-click links to full records. Search supports Enter to open, Arrow Down to reach suggestions and Escape to clear. Hide suggestions when a dossier opens, including after reloading a shared URL. Lead with the instrument title, summary and link to its full legal record. Keep year, status, relationships and sources together. On the full record, provide direct paths back to the map, to documented relationships and to original sources.

**Noa.** Use the established Lebanese phoenix artwork throughout the app. Noa’s note gives readers the review schedule and recent briefings. Keep the launcher within its reserved rail space so it never covers map controls or totals.

**Bilingual navigation.** Use the same evidence ledger for English and Arabic. Switch labels, reading direction and directional navigation together. Keep original official titles and source links available in both languages. Preserve visible keyboard focus and distinct text labels for each state.
