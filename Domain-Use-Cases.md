# Domain Use Cases

Propósito: definir los casos de uso del dominio (entradas, precondiciones, flujo y salida). Estos use cases guiarán las interfaces e implementaciones en `01-domain`.

---

## Use Case 001 — GenerateAnalysis

- Nombre: `GenerateAnalysis`
- Entrada: `Resume`, `Job`, `PipelineConfig`
- Precondiciones:
  - `Resume` y `Job` válidos y preferiblemente normalizados
  - `PipelineConfig` definido
- Flujo (alto nivel):
  1. ExtractSkills
  2. NormalizeSkills
  3. MatchResumeToJob (genera `MatchResult[]`)
  4. CalculateSubscores por categoría
  5. CalculateOverallScore
  6. Crear `Analysis` con `matches`, `breakdown`, `overall`, `confidence`, `metadata`
- Salida: `Analysis`

Criterio de aceptación: con ejemplos oficiales produce `Analysis` reproducible y explicable.

---

## Use Case 002 — NormalizeResume

- Nombre: `NormalizeResume`
- Entrada: `ParsedResume`
- Precondiciones: `ParsedResume` (resultado del parser)
- Flujo:
  1. Normalizar fechas y formatos
  2. Normalizar y mapear skills (usar ontología)
  3. Producir `NormalizedResume`
- Salida: `NormalizedResume`

---

## Use Case 003 — MatchResumeToJob

- Nombre: `MatchResumeToJob`
- Entrada: `NormalizedResume`, `NormalizedJob` (o `Job` con fields normalizados)
- Flujo:
  1. Por cada categoría (skills, experience, education, keywords, certifications, languages) ejecutar comparadores especializados
  2. Generar `MatchResult[]` con `evidence` y `confidence`
- Salida: `MatchResult[]`

---

## Use Case 004 — CalculateOverallScore

- Nombre: `CalculateOverallScore`
- Entrada: `MatchResult[]`, `PipelineConfig`
- Flujo:
  1. Agrupar matches por categoría
  2. Calcular subscores aplicando reglas (SubscoreCalculator)
  3. Aplicar `PipelineConfig.weights` y normalizar
- Salida: `{ breakdown, overall }`

---

## Use Case 005 — GenerateRecommendations

- Nombre: `GenerateRecommendations`
- Entrada: `Analysis`
- Flujo:
  1. Identificar gaps (missingSkills, low-scoring areas)
  2. Construir payload estructurado (evidence + intent) para LLM
  3. Recibir texto del LLM (o usar reglas simples) y mapear a `Recommendation[]`
- Salida: `Recommendation[]`

---

## Use Case 006 — ExtractSkills

- Nombre: `ExtractSkills`
- Entrada: `ParsedResume` o `NormalizedResume`
- Flujo:
  1. Localizar sección de skills
  2. Extraer menciones de skills de experiencias y proyectos
  3. Emitir `SkillInstance[]` con `raw` y (opcional) `canonical`/`confidence`
- Salida: `SkillInstance[]`

---

## Notas sobre uso de los casos
- Priorizar tests de integración "Outside-In": definir ejemplo (resume+job) → esperado `Analysis` → implementar lo mínimo.
- Cada caso de uso debe ser implementado como un servicio del dominio que depende de interfaces, no de detalles de infra.

---

Fin de Domain Use Cases
