# ADR-002: Analysis como objeto central

Date: 2026-07-06

## Status
Accepted

## Context
Para desacoplar parsing, matching, scoring y presentación, necesitamos una representación única que contenga evidencia y resultados.

## Decision
Introducir `Analysis` como el objeto central que agrupa: `resumeId`, `jobId`, `matches`, `breakdown`, `overall`, `confidence`, `algorithmVersion`, `timestamp` y `metadata`.

## Alternatives considered
- Dejar resultados dispersos entre endpoints — rejected: dificulta auditoría.
- Usar Analysis centralizado — accepted.

## Consequences
- Frontend y LLM consumen `Analysis`.
- Tests validan `Analysis` en vez de endpoints individuales.
- Facilita export, historial y auditoría.

## Implementation notes
- Definir schema `Analysis` en `01-domain/analysis.ts`.
- Incluir `pipelineConfig` y `algorithmVersion` en metadata.
