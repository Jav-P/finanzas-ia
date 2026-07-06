# Contexto del Proyecto: App de Finanzas en Pareja

## Objetivo

Aplicación web para que Javi y Xime lleven al día sus obligaciones financieras mensuales como pareja: registrar gastos/obligaciones, subir comprobantes de pago (imagen o PDF), y recibir alertas automáticas antes de que venza cada pago.

## Problema que resuelve

- Cada persona tiene obligaciones mensuales propias (o compartidas).
- Actualmente no hay un sistema centralizado para saber qué está pendiente, qué ya se pagó, y con qué respaldo.
- Se necesitan recordatorios proactivos (5 días antes del vencimiento) para evitar mora o pagos tardíos.

## Funcionalidad núcleo (MVP)

1. **Registro de obligaciones**: persona responsable, monto, categoría, fecha límite de pago, recurrencia (mensual/única).
2. **Carga de comprobantes**: subir imagen o PDF como respaldo de un pago realizado.
3. **Sistema de alertas**: 5 días antes de la fecha límite se dispara una notificación (empezar con email, evaluar push después).
4. **Dashboard de estado**: vista tipo semáforo (al día / próximo a vencer / vencido) por persona y consolidado de pareja.

## Decisión de plataforma

**Web app (PWA)**, no nativa. Razones:

- Uso solo entre 2 personas, no requiere distribución en app stores.
- Web Push cubre la necesidad de notificaciones sin fricción de instalación.
- Reutiliza el stack que Javi ya domina profesionalmente (Angular + NestJS).
- Sirve como proyecto de portafolio alineado a su búsqueda laboral activa.

## Stack técnico definido

| Componente                     | Servicio                                    | Motivo                                                                  |
| ------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| Frontend                       | Angular → Vercel o Netlify                  | Free tier robusto, deploy automático desde GitHub                       |
| Backend                        | NestJS → Railway o Render                   | Free tier / crédito mensual, sin tarjeta obligatoria                    |
| Base de datos + Auth + Storage | Supabase (Postgres)                         | Todo incluido en un solo free tier (500MB DB + 1GB storage)             |
| Cron (alertas)                 | GitHub Actions (schedule)                   | Gratis, confiable, ya conocido por Javi vía Azure DevOps                |
| Emails                         | Resend (3,000/mes gratis) o Brevo (300/día) | Más simple que SendGrid                                                 |
| IA / OCR / Agente              | Claude API (Anthropic)                      | Único componente con costo real, pero marginal para este volumen de uso |

**Nota explícita**: Javi usa Azure en su trabajo (Orafa) pero evita usarlo en proyectos personales por miedo a facturación inesperada y porque no tiene apps robustas que justifiquen ese ecosistema. Por eso este proyecto usa alternativas gratuitas fuera de Azure.

## Modelo de datos (Postgres/Supabase)

Definido en [`supabase/schema.sql`](supabase/schema.sql). Resumen:

- **hogares**: agrupa a las 2 personas de la pareja (id, nombre).
- **usuarios**: id (= auth.users.id), hogar_id, nombre, email.
- **categorias**: hogar_id (null = categoría global/seed), nombre, color.
- **obligaciones** (plantilla): hogar_id, usuario_responsable_id (null = compartida), categoria_id, descripción, monto, recurrencia (única/mensual), día_vencimiento, fecha_inicio, activa.
- **obligacion_instancias**: una fila por período real de cobro (obligacion_id, periodo, fecha_vencimiento, monto, estado pendiente/pagado/vencido). El estado vive aquí y no en `obligaciones`, porque una obligación mensual tiene un estado distinto cada mes.
- **pagos**: instancia_id (1:1), usuario_pago_id, fecha_pago, monto_pagado, url_comprobante (Supabase Storage).

Pendiente: definir políticas RLS (filtrar por `hogar_id` según `auth.uid()`) al conectar Supabase Auth.

## Capa de IA (diferenciador para portafolio)

Priorizado de menor a mayor complejidad:

1. **OCR estructurado de comprobantes**: enviar imagen/PDF a Claude API pidiendo JSON con monto, fecha, entidad bancaria, referencia — cruzarlo automáticamente contra la obligación pendiente.
2. **Agente conversacional vía MCP server**: exponer los datos de Supabase como MCP server (mismo patrón que Javi usa en Orafa con LLM agents + MCP + operaciones reales) para consultar o crear obligaciones en lenguaje natural.
3. **Alertas con contexto**: mensajes de recordatorio generados con IA que consideren historial de pago (puntualidad, atrasos previos), no solo texto genérico.
4. **Resumen mensual automático**: job que genere un resumen en lenguaje natural del comportamiento financiero de la pareja al cierre de cada mes.

Recomendación de modelo: usar el modelo más económico disponible (ej. gama "Haiku") para tareas rutinarias como OCR y generación de mensajes; reservar lógica más compleja (agente conversacional) para un modelo más capaz. Verificar precios vigentes en el momento de implementar, ya que pueden cambiar.

## Costos esperados

- Infraestructura (Vercel/Railway/Supabase/GitHub Actions/Resend): **$0**.
- Claude API: pay-as-you-go, volumen esperado (pocos comprobantes/consultas al día) estimado en centavos de dólar al mes.
- Mitigación de riesgo: configurar límite de gasto mensual duro en la consola de Anthropic (ej. $5 USD) para evitar sorpresas, igual que la precaución que ya aplica con Azure.

## Valor para portafolio / búsqueda laboral

- Este proyecto extiende a un dominio personal el mismo patrón que Javi usa en producción en Orafa (LLM agents + MCP servers + operaciones reales), lo cual es más diferenciador en entrevistas que un CRUD de gastos genérico.
- Repo público en GitHub con README explicando la arquitectura (especialmente el MCP server).
- Contenido para LinkedIn mostrando el flujo (ej. GIF de subida de comprobante con extracción automática).
- Términos técnicos relevantes para CV/LinkedIn: "structured outputs", "document understanding", "MCP servers", "AI-powered reporting".

## Estado actual

Fase de definición de arquitectura y stack. Siguiente paso pendiente de decidir: diseño del esquema completo de base de datos en Supabase, o diseño del flujo de pantallas de la app.
