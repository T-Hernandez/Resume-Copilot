# ADR-003: MatchResult con evidencia

Date: 2026-07-06

## Status
Accepted

## Context
Para que las recomendaciones sean explicables y auditables, cada coincidencia debe poder justificar su score.

## Decision
Cada `MatchResult` incluirá: `score`, `confidence`, `reason`, `evidence[]`, `resumeRef`, `jobRef`.

## Alternatives considered
- Mantener Match simple (solo score) — rejected: pobre trazabilidad.
- Añadir evidencia y confidence — accepted.

## Consequences
- Mayor tamaño de los resultados.
- Mejora de UX y capacidad de debugging.
- Prompts para LLM mejor estructurados.

## Implementation notes
- Definir `MatchResult` en `01-domain/match.ts`.
- Establecer convenciones para `evidence[]` (referencias a secciones/ítems).
