# ADR-001: Deterministic Scoring

Date: 2026-07-06

## Status
Accepted

## Context
El producto requiere que los resultados sean reproducibles, explicables y auditables. Confiar en un LLM para calcular scores conduce a problemas de opacidad, variabilidad y posibles alucinaciones.

## Decision
El score será calculado exclusivamente por reglas determinísticas en el backend. Los LLMs solo se usan para explicar, resumir y generar recomendaciones en lenguaje natural.

## Alternatives considered
- LLM calcula score — rejected: falta de reproducibilidad y trazabilidad.
- Heurísticas + reglas configurables — accepted.

## Consequences
- Implementar y mantener reglas y pesos.
- Versionar el algoritmo y almacenar `algorithmVersion` en cada `Analysis`.
- LLM prompts reciben `Analysis` y no deben modificar scores.

## Implementation notes
- Definir `pipelineConfig` con pesos por categoría.
- Registrar `algorithmVersion` y `pipelineConfig` en metadata.
- Añadir pruebas unitarias para cada regla de scoring.
