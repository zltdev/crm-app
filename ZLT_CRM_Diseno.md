# ZLT Marketing CRM - Diseño de Sistema

## 1. Concepto General

El sistema se basa en un **contacto unificado** (`contacts`) que puede tener múltiples **touchpoints** 
(formularios, eventos, llamadas, agente, etc).

👉 Una persona existe una sola vez, pero puede aparecer múltiples veces en distintos contextos.

---

## 2. Entidad Principal: contacts

Representa a la persona.

Campos sugeridos:
- id
- phone (obligatorio)
- email
- first_name
- last_name
- created_at
- updated_at
- status

---

## 3. contact_touchpoints

Registra cada aparición del contacto.

Ejemplos:
- formulario
- evento
- expo
- llamada
- WhatsApp
- agente
- carga manual

Campos:
- id
- contact_id
- source_type
- source_name
- occurred_at
- metadata (JSONB)

👉 Permite reconstruir la historia completa del contacto.

---

## 4. Problema de los Excel históricos

Las bases actuales mezclan:
- datos del contacto
- datos del contexto (evento, campaña, etc)

❌ No deben insertarse directo al modelo final.

---

## 5. Solución: Pipeline de Ingesta

### 5.1 import_batches
Representa cada archivo.

Campos:
- id
- source_name
- source_type
- file_name
- uploaded_at

### 5.2 import_rows_raw
Guarda la fila original.

Campos:
- id
- batch_id
- raw_payload (JSON)
- created_at

### 5.3 import_rows_normalized
Fila procesada.

Campos:
- id
- batch_id
- normalized_phone
- normalized_email
- first_name
- last_name
- source_type
- source_name
- occurred_at
- metadata
- matched_contact_id

---

## 6. Proceso de Importación

1. Subir archivo → `import_batches`
2. Guardar filas → `import_rows_raw`
3. Normalizar → `import_rows_normalized`
4. Dedupe:
   - buscar contacto existente
5. Insertar:
   - si no existe → crear `contact`
   - siempre → crear `contact_touchpoint`

---

## 7. Tipos de Datos Importados

### Tipo A: Contactos puros
→ contacto + touchpoint

### Tipo B: Contacto + contexto
→ contacto + touchpoint + metadata

### Tipo C: Datos sucios
→ staging + limpieza + reglas

---

## 8. Modelado del Contexto

### Opción A: metadata JSON
Para datos variables:
```
{
  "event": "Expo 2026",
  "stand": "A12",
  "sales_rep": "Juan"
}
```

### Opción B: tablas específicas
- events
- event_attendances
- campaigns
- form_submissions

👉 Usar tablas si se repite y requiere reporting.

---

## 9. Modelo Base (MVP)

### Core
- contacts
- contact_touchpoints

### Importación
- import_batches
- import_rows_raw
- import_rows_normalized

### Marketing
- campaigns
- forms
- form_submissions
- events
- event_attendances

### Interacciones
- communications
- agent_conversations
- phone_calls

### Inteligencia
- contact_scores
- segments
- contact_segments

---

## 10. Scoring

Tipos:
- Fit score
- Engagement score
- Intent score
- Freshness score

Resultado:
- score_total

---

## 11. Automatización

Tablas:
- automation_flows
- campaign_deliveries
- content_pieces

Ejemplo:
1. envío inicial
2. seguimiento
3. scoring
4. derivación comercial

---

## 12. Principio Clave

❗ No modelar leads por canal.

✔ Modelar:
- persona única
- múltiples orígenes
- múltiples interacciones
- historial completo

---

## 13. Beneficio del Modelo

Permite responder:
- ¿de dónde vino el contacto?
- ¿por qué canales pasó?
- ¿qué hizo?
- ¿qué score tiene?
- ¿qué acción sigue?

---

## 14. Roadmap

### V1
- contacts
- contact_touchpoints
- import pipeline

### V2
- events
- campaigns
- scoring
- segmentación

### V3
- automatización
- CRM comercial completo

---

## 15. Conclusión

Este modelo permite construir un CRM moderno basado en:
- datos unificados
- trazabilidad
- automatización
- inteligencia comercial

Es escalable, flexible y preparado para integración con IA.
