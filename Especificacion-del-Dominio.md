# Especificación del Dominio

Versión: 0.1

Este documento define, sin ataduras a la tecnología, el dominio del producto "Resume Copilot": problema a resolver, entidades, reglas de matching, criterios de calidad, alcance y principios de producto.

## 1. Problema que resolvemos

Objetivo: ayudar a un candidato a aumentar sus probabilidades de obtener una entrevista para una vacante concreta, entregando análisis reproducible, explicable y accionable.

## 2. Criterios de un buen análisis

- Explicable: el usuario entiende por qué obtuvo un resultado.
- Accionable: genera recomendaciones concretas (skills a añadir, keywords, reordenar experiencia).
- Consistente y determinista: mismos datos → mismo resultado.
- Rápido: feedback interactivo (< 5s en procesamiento básico, sujeto a recursos).
- Transparente: se muestran las reglas y pesos principales.

## 3. Alcance

In-scope (MVP):
- Procesamiento de CV electrónicos (PDF/DOCX) que contienen texto seleccionable.
- Entrada de descripción de trabajo como texto plano.
- Parser que extrae secciones básicas: metadata, skills, experiencia, educación, proyectos, certificaciones, idiomas.
- Motor de matching basado en reglas determinísticas y normalización de skills.
- Generación de un reporte estructurado (overall score + breakdown + recommendations) y salida para LLM explicativo.

Out-of-scope (MVP):
- OCR para CV escaneados.
- Soporte multilenguaje.
- Importación desde LinkedIn u otras plataformas.
- Generación automática de CV o cartas.
- Gestión de usuarios o historial.

## 4. Glosario

- Resume: representación estructurada de la trayectoria profesional del candidato (objeto, no PDF).
- Job (Job Description): representación estructurada de una vacante.
- Skill: capacidad técnica o profesional identificable y normalizable (p.ej. React → React).
- Keyword: término relevante para ATS; no necesariamente una skill (p.ej. Agile, Remote).
- Experience: bloque de experiencia laboral (empresa, rol, fechas, responsabilidades, skills usadas).
- Match: resultado de comparar dos entidades (ej. skill X en Resume vs requiredSkill en Job).
- Score: representación numérica agregada de varios matches.

## 5. Entidades y campos (resumen)

Resume (estructura mínima):
- id (string)
- name?: string
- contact?: { email?: string, phone?: string }
- summary?: string
- skills: Array<SkillInstance>
- experience: Array<Experience>
- education: Array<Education>
- languages?: Array<{ name: string, level?: string }>
- certifications?: Array<string>
- projects?: Array<{ name: string, description?: string, skills?: string[] }>

SkillInstance:
- raw: string (texto extraído)
- canonical: string (vía normalización)
- confidence?: number

Experience:
- company
- title
- startDate?
- endDate?
- description?
- skills?: string[]

Job (estructura mínima):
- id
- title
- rawText
- requiredSkills: string[]
- preferredSkills?: string[]
- minExperienceYears?: number
- educationLevel?: string
- keywords?: string[]

## 6. Relaciones

- Un `Resume` contiene múltiples `Experience` y `SkillInstance`.
- Un `Job` lista `requiredSkills` y `preferredSkills`.
- El `Matching Engine` compara `Resume.skills` con `Job.requiredSkills/preferredSkills`, y también correlaciona experiencias y keywords.

## 7. Definición de Match y Score

Match (por skill):
- Igualdad canónica: 1.0
- Alias o mapping (ReactJS → React): 1.0
- Coincidencia parcial (p.ej. "React Native" vs "React"): 0.7 (configurable)

Experiencia:
- Comparar años en roles relevantes y títulos; aplicar regla de pro-rating si candidato tiene menos años.

Keywords ATS:
- Proporción de keywords obligatorias presentes.

Score global (ejemplo base, configurable):
- Skills: 40%
- Experiencia: 25%
- Educación: 10%
- Keywords ATS: 15%
- Certificaciones: 5%
- Idiomas: 5%

Cada submódulo devuelve un score en 0..100 y un detalle explicable. `calculateOverallScore()` aplica pesos y normaliza.

## 8. Normalización y Ontología de Skills

Requisitos:
- Tener una lista de alias → canonical.
- Permitir reglas regex para variaciones comunes.
- Casos prioridad: tech stack (p.ej. node, nodejs, node.js → Node.js).

Formato de ejemplo (CSV/JSON):

```
alias,canonical
reactjs,React
react,React
node,node.js,Node.js
postgres,PostgreSQL
```

Estrategia inicial:
- Empezar con una lista pequeña y añadir mappings según ejemplos reales.
- Proveer función `normalizeSkill(raw) -> canonical | null`.

## 9. Reglas y ejemplos de decisión

- Si una `requiredSkill` no aparece en el `Resume.skills` ni en `Experience.skills`, marcar como faltante.
- Si candidato tiene 4 años y puesto pide 5, calcular proporción: score_experience = min(1, candidateYears / requiredYears) * 100.
- Skills obligatorias tienen peso mayor que preferidas.

## 10. Principios del producto

- Backend es la única fuente de verdad para scoring.
- Los LLMs solo explican y generan orientación, no calculan scores.
- Todo cálculo es reproducible y testeable.
- Privacidad: datos solo se usan para el análisis activo y no se exponen.

## 11. Separación Dominio / Infraestructura

Principio: el dominio no conoce orígenes de datos ni formatos.

Ejemplo conceptual:

```
Input Source
  (PDF / DOCX / API / LinkedIn / JSON)
      ↓
  Extraction (infra)
      ↓
  Resume (dominio)
```

La capa de infraestructura se encarga de extracción y conversión. El dominio sólo trabaja con objetos `Resume` y `Job`.

## 12. Inmutabilidad del Resume

Principio: las representaciones son inmutables durante el pipeline.

Flujo de transformaciones (cada paso produce una nueva entidad):

```
Raw Input
  ↓
Parsed Resume
  ↓
Normalized Resume
  ↓
Scored Resume
```

Esto facilita reproducibilidad y depuración.

## 13. Pipeline explícito

Cada etapa tiene responsabilidad única:

- Extraction: extrae texto bruto de la fuente (infraestructura).
- Parsing: detecta secciones y produce `Parsed Resume`.
- Normalization: normaliza skills, fechas y nombres.
- Matching: compara entidades y genera `MatchResult` por elemento.
- Scoring: agrega scores parciales y produce `Scored Resume`.
- Recommendation: genera datos para LLM (capa superior).
- Presentation: UI/Export.

## 14. MatchResult, evidencia y confianza

Cada match debe devolver una estructura rica:

```
MatchResult {
  id: string,
  type: 'skill'|'experience'|'education'|'keyword'|'certification'|'language',
  resumeRef: string, // referencia a elemento del Resume (puede ser null si falta)
  jobRef: string,    // referencia al elemento del Job
  score: number,     // 0..100
  confidence: number, // 0..100 (calidad de la evidencia)
  reason: string,    // razón textual corta (p.ej. "Missing required skill")
  evidence: string[] // referencias (p.ej. "Experience #2", "Skills section")
}
```

La evidencia permite que la capa LLM sólo transforme datos estructurados en lenguaje natural.

## 15. Separar Score de Confidence

- `score`: cuán bien la entidad cumple la expectativa (0..100).
- `confidence`: cuánta evidencia apoya el `score` (0..100). Esto refleja calidad del parser/extracción.

Ejemplo: `score=80, confidence=52`.

## 16. Versionado del algoritmo y auditabilidad

Todo resultado incluirá metadatos:

- `algorithmVersion`: string (p.ej. "v1.0").
- `timestamp`.
- `pipelineConfiguration`: resumen de pesos y reglas usadas.

Requisito de auditabilidad: con `Resume`, `Job` y `algorithmVersion` = X se debe obtener exactamente el mismo `Analysis`.

## 17. Recomendaciones como capa superior

El dominio produce `Analysis` (datos objetivos). Las recomendaciones (texto accionable) son responsabilidad de la capa de presentación/LLM que transforma `Analysis` en lenguaje humano.

Pipeline lógico:

```
Resume + Job -> Analysis -> (LLM) -> Recommendations -> Presentation
```

## 18. Invariantes

- Un `score` está en 0..100.
- Un `breakdown` aplica pesos y al agregarse produce `overall` (dentro de tolerancia numérica).
- Cada `MatchResult` referencia exactamente un elemento del `Job` y como mucho un elemento del `Resume` (o `null` si falta).
- El parser nunca altera el contenido original del `Raw Input`.
- Un `Resume` para análisis debe contener al menos una sección analizada (skills o experience).

## 19. Analysis Model (objeto central)

El `Analysis` es el producto del dominio. Debe ser independiente de la infraestructura y contener toda la evidencia necesaria para reproducir decisiones y para que la capa LLM genere recomendaciones.

Ejemplo de `Analysis` (JSON simplificado):

```json
{
  "id": "analysis_0001",
  "resumeId": "r_123",
  "jobId": "j_321",
  "algorithmVersion": "v1.0",
  "timestamp": "2026-07-06T12:00:00Z",
  "overall": 82,
  "breakdown": {
    "skills": 94,
    "experience": 71,
    "education": 100
  },
  "matches": [ /* array of MatchResult */ ],
  "gaps": [ /* elementos faltantes */ ],
  "strengths": [ /* elementos con high score */ ],
  "weaknesses": [ /* elementos con low score */ ],
  "confidence": 78,
  "metadata": { "pipelineConfig": { /* pesos, rules */ } }
}
```

El `Analysis` es la entrada única para la capa LLM y para cualquier presentación o export.

---

## 11. Salidas esperadas (ejemplo JSON)

```json
{
  "overall": 82,
  "breakdown": {
    "skills": 94,
    "experience": 71,
    "education": 100,
    "keywords": 60,
    "certifications": 0,
    "languages": 50
  },
  "missingSkills": ["Docker", "Kubernetes"],
  "recommendations": [
    "Añadir Docker en el apartado de skills y en la descripción de proyectos.",
    "Reordenar experiencia para destacar proyectos relevantes con React."
  ]
}
```

## 12. Criterios de aceptación (MVP)

- `parseResume(file)` devuelve un objeto `Resume` con `skills` y `experience` detectados en > 80% de ejemplos de la suite de pruebas.
- `parseJob(text)` extrae `requiredSkills` y `preferredSkills` en ejemplos de prueba.
- `calculateOverallScore()` devuelve un objeto con `overall` y `breakdown` aplicando la tabla de pesos.

---

Fin del documento versión 0.1
