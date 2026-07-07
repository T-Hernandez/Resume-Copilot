Resume Analyzer
Product Requirements Document (PRD)

Versión: 1.0

Estado: Planeación

Objetivo: Crear una aplicación web que analice un CV frente a una oferta laboral utilizando un algoritmo propio para calcular compatibilidad y un LLM para explicar el resultado y generar recomendaciones accionables.

1. Visión

La mayoría de analizadores de CV actuales son simplemente un prompt enviado a un LLM.

Nuestro objetivo es construir un producto que combine:

lógica propia
procesamiento de documentos
algoritmos determinísticos
inteligencia artificial

La IA no toma las decisiones.

La IA explica, mejora y comunica.

Las decisiones importantes provienen del backend.

2. Objetivos del proyecto

Queremos demostrar experiencia en:

Frontend moderno
Backend escalable
Procesamiento de PDFs
Parsing de documentos
Integración con IA
Diseño de producto
UX
Arquitectura limpia
TypeScript
APIs
Buenas prácticas
3. Público objetivo
Usuario 1

Estudiante

Quiere mejorar su primer CV.

Usuario 2

Junior

Quiere adaptar su CV para una vacante.

Usuario 3

Semi Senior

Quiere aumentar sus probabilidades de pasar ATS.

4. Problema

Los usuarios no saben:

qué habilidades faltan
qué partes del CV son débiles
qué palabras clave esperan los reclutadores
qué tan compatible es su perfil
5. Solución

El usuario:

Sube un CV.

Pega una oferta laboral.

La aplicación:

↓

extrae el texto

↓

analiza ambos documentos

↓

calcula un porcentaje objetivo

↓

envía el análisis al LLM

↓

genera recomendaciones específicas

↓

presenta un reporte visual

6. MVP
Entrada
PDF
DOCX
Descripción del trabajo
Procesamiento

Extraer texto

↓

Normalizar

↓

Identificar secciones

↓

Extraer habilidades

↓

Extraer experiencia

↓

Extraer educación

↓

Comparar con la oferta

↓

Calcular score

↓

Enviar análisis al LLM

↓

Mostrar resultados

Salida

Compatibilidad

Fortalezas

Debilidades

Habilidades faltantes

Recomendaciones

Keywords ATS

7. Arquitectura
Frontend

↓

Backend API

↓

Resume Parser

↓

Job Parser

↓

Matching Engine

↓

Score Engine

↓

Prompt Builder

↓

LLM

↓

Response Formatter
8. Stack
Frontend

React

TypeScript

Vite

Tailwind

React Query

React Hook Form

Zod

Shadcn UI

Backend

Node

Fastify

TypeScript

Zod

Multer

pdf-parse

mammoth

IA

Claude

o

OpenAI

9. Arquitectura del backend
src

controllers

routes

services

parsers

llm

utils

types

schemas

middlewares

config
10. Flujo completo

Usuario

↓

Sube PDF

↓

Parser

↓

Texto limpio

↓

Resume Parser

↓

Objeto Resume

↓

Job Parser

↓

Objeto Job

↓

Matching Engine

↓

Score Engine

↓

Prompt Builder

↓

Claude

↓

Reporte

11. Modelo Resume
Resume

name

summary

skills[]

experience[]

education[]

languages[]

certifications[]

projects[]
12. Modelo Job
Job

title

skills[]

requiredSkills[]

preferredSkills[]

experienceYears

education

keywords[]
13. Matching Engine

Este será el corazón del proyecto.

Debe comparar:

skills

experiencia

educación

proyectos

palabras clave

certificaciones

idiomas

No usa IA.

Solo reglas.

14. Sistema de puntuación

Ejemplo:

Skills

40%

Experiencia

25%

Educación

10%

Keywords ATS

15%

Certificaciones

5%

Idiomas

5%

Total

100%

15. Filosofía

El score nunca lo genera el LLM.

El backend hace:

score =

skillsScore

+

experienceScore

+

educationScore

+

keywordScore

...

Luego el LLM recibe:

El usuario obtuvo:

82%

Skills encontradas:

React

Node

Docker

Faltan:

AWS

Kubernetes

Explica el resultado.

Sugiere mejoras.

No cambies el porcentaje.
16. Funciones del LLM

Puede:

explicar

resumir

reescribir

dar consejos

No puede:

inventar score

inventar skills

inventar experiencia

17. Pantallas

Landing

↓

Upload

↓

Loading

↓

Analysis

↓

History (v2)

↓

Settings (v2)

18. Landing

Debe responder:

¿Qué hace?

¿Por qué confiar?

¿Cómo funciona?

CTA

19. Upload

Arrastrar PDF

o

DOCX

Pegar oferta

Botón Analizar

20. Loading

Mostrar:

Parsing...

Extrayendo habilidades...

Comparando...

Calculando score...

Consultando IA...

21. Analysis

Tarjetas:

Score

Fortalezas

Debilidades

Skills faltantes

Experiencia

Educación

Keywords ATS

Recomendaciones

22. Componentes

Navbar

Footer

Hero

Dropzone

Progress

Cards

Accordion

Score Gauge

Skill Chips

Charts

Timeline

Buttons

Inputs

Toast

Modal

23. Sistema de colores

Azul

Blanco

Gris

Verde para fortalezas

Rojo para faltantes

Amarillo para recomendaciones

Minimalista

Profesional

24. Funciones futuras

Reescribir CV

Generar Cover Letter

LinkedIn Import

Guardar Historial

Versionado de CV

Comparar dos CV

Análisis ATS

Análisis por industria

Generar preguntas de entrevista

Exportar PDF

25. API

POST

/upload

POST

/analyze

POST

/score

POST

/llm

GET

/history

26. Testing

Parser

Matching

Score

API

Frontend

LLM

27. Deploy

Frontend

Vercel

Backend

Railway

Base de datos

Supabase

28. README

Descripción

Arquitectura

Stack

Instalación

Screenshots

Roadmap

Demo

Licencia

29. Roadmap
MVP

Subir CV

Calcular score

IA

Reporte

v1.1

Historial

Autenticación

Guardar análisis

v2

Cover Letter

LinkedIn

Exportar PDF

v3

Entrenador de carrera

ATS avanzado

Dashboard

30. Lo que este proyecto debe demostrar

Al terminar, cualquier persona que vea el repositorio debería concluir que eres capaz de:

Diseñar un producto desde cero.
Traducir un problema de negocio en una solución técnica.
Procesar documentos (PDF/DOCX) de forma robusta.
Modelar datos y construir un backend con arquitectura limpia.
Implementar un algoritmo propio para evaluar compatibilidad entre CV y vacantes.
Integrar un LLM como una capa de valor agregado, no como el núcleo de la lógica.
Construir una interfaz moderna, clara y agradable.
Documentar el proyecto con calidad profesional.
Desplegar una aplicación lista para que cualquiera pueda probarla.
Una propuesta adicional

Creo que podemos hacer que este proyecto destaque mucho más si dejamos de pensar en él como un simple "Resume Analyzer" y empezamos a diseñarlo como un producto SaaS real.

Es decir, definir una identidad (nombre, branding, diseño, tono, funcionalidades y roadmap) como si fuera una startup. Eso influirá en decisiones de UX, arquitectura y documentación, y hará que tu portafolio no muestre "otro proyecto con IA", sino un producto con una visión clara y un nivel de acabado que suele llamar mucho más la atención en entrevistas.