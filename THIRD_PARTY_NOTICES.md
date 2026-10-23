# Third-party notices

The root MIT license covers project-owned contributions only. It does not
replace third-party copyright notices, dependency licenses, data-provider terms,
or grant rights to Formula 1, FIA, team, or other third-party trademarks.

## Circuit geometry

`lib/circuits/data/f1-circuits.geojson` comes from
[Tomislav Bacinger's f1-circuits](https://github.com/bacinger/f1-circuits).
Copyright (c) 2019-2025 Tomislav Bacinger, MIT.
Keep the full [original notice](lib/circuits/data/LICENSE.md) with the data and
substantial derived portions, including `public/circuits/*.svg` and derived
geometry in metadata, outlines, or replay track paths.
See [the circuit source review](docs/CIRCUIT_ASSETS.md).

## Upstash skill documentation

`f1-reminder` includes `.agents/skills/upstash-ratelimit-js/` and
`.agents/skills/upstash-redis-js/` from [upstash/skills](https://github.com/upstash/skills),
as recorded in `skills-lock.json`. Their front matter declares MIT.
Copyright (c) 2026 Upstash, Inc. The upstream MIT text is retained in
[.agents/skills/LICENSE](.agents/skills/LICENSE). These documents are not project-owned code.

## Dependencies

Dependencies retain their own licenses. The project's MIT declaration does not
relicense them. Preserve applicable licenses and notices when redistributing
packages or built artifacts; check the exact installed versions.

The `apex-v3-web` lockfile includes MIT, Apache-2.0, ISC, BSD-3-Clause, 0BSD,
CC-BY-4.0 (`caniuse-lite`), and LGPL-3.0-or-later components
(`sharp`/`@img`/libvips, including combined expressions). Binary redistribution
requires checking the relevant LGPL source, notice, and relinking obligations.
`f1-reminder` has no committed dependency lockfile; its transitive resolution is
not pinned and this review does not certify a complete installed dependency tree.

## External data and content

Jolpica, OpenF1, Formula 1 schedule pages, search/news results, and other external
services remain subject to their own applicable terms and third-party rights.
This repository's MIT license does not grant blanket permission to redistribute
their data, images, logos, or articles. Cached data must be assessed separately
for the intended use. Files named `real-sessions` are marked `curated_demo` in
code and have a local generation script; their names do not establish a license
or provenance for externally sourced telemetry.
