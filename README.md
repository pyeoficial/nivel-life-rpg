# NIVEL — Tu vida en modo aventura

NIVEL es una aplicación web progresiva de desarrollo personal que convierte misiones, hábitos y autocuidado en una aventura diaria. Las acciones reales generan experiencia y monedas, hacen evolucionar al héroe y permiten elegir recompensas conscientes.

Proyecto desarrollado íntegramente mediante **Vibe Coding con OpenAI Codex** para el Hackathon de Vibe Coding del Máster en Inteligencia Artificial — Edición 6.

## Aplicación

**Producción:** https://nivel-life-rpg.aleiglesias.chatgpt.site/

No requiere registro ni credenciales. Cada visitante recibe una partida anónima independiente.

## Funcionalidades principales

- Mapa de Aventura con misiones diarias, XP y monedas.
- Habit tracker de siete días con registro en un toque.
- Rituales iniciales para ejercicio, sueño, puntualidad y lectura.
- Creación rápida de misiones y hábitos personalizados.
- Héroe con niveles, atributos y cuatro etapas visuales.
- Check-in de energía y estado de ánimo.
- Cofre diario validado en el servidor.
- Campamento con recompensas, progreso y bitácora.
- Reinicio diario y migración automática de partidas.
- Instalación como PWA en Android y iPhone.

## Flujo corto de prueba

1. Abre la aplicación y registra tu energía.
2. Completa una misión desde el Mapa de Aventura.
3. Abre **Rituales** y registra un hábito.
4. Usa el botón central para crear una misión o ritual.
5. Revisa el héroe, el Campamento y la bitácora.
6. Recarga la página para comprobar la persistencia.

## Arquitectura

- **Frontend:** React 19, App Router y Vinext.
- **Backend:** rutas server-side en el mismo proyecto.
- **Persistencia:** Cloudflare D1 con Drizzle ORM.
- **Sesión:** identificador anónimo en cookie `HttpOnly`.
- **Despliegue:** OpenAI Sites sobre Cloudflare Workers.
- **PWA:** manifest, service worker e iconos instalables.

El cliente solicita acciones, pero las recompensas se calculan y validan en el servidor. Una misma misión o ritual no puede pagar dos veces en el mismo día.

## Estructura relevante

```text
app/
  api/state/route.ts   Lógica y acciones del juego
  nivel-app.tsx        Experiencia interactiva
  globals.css          Sistema visual responsive
db/
  schema.ts            Modelo D1
drizzle/               Migraciones SQL
public/                 PWA e ilustraciones originales
docs/                   PRD, arquitectura e historial resumido
```

## Desarrollo local

Requiere Node.js 22.13 o superior.

```bash
npm ci
npm run dev
```

Comprobaciones utilizadas:

```bash
npm run lint
npm run build
```

## Variables y secretos

El MVP no necesita claves de API ni credenciales externas. El enlace lógico `DB` se declara en `.openai/hosting.json` y la plataforma inyecta el recurso D1 real durante el despliegue.

No deben añadirse archivos `.env`, credenciales, datos personales ni identificadores de producción al repositorio.

## Privacidad

- No se solicitan correo, contraseña, nombre legal ni datos personales.
- El progreso se asocia a una cookie anónima.
- Los ejemplos incluidos son datos ficticios de demostración.

## Vibe Coding

La planificación, arquitectura, interfaz, lógica, pruebas, correcciones y despliegue se ejecutaron mediante instrucciones conversacionales a Codex. El historial completo de prompts se entrega en un Google Doc independiente, según las bases del hackathon.

## Licencia

Proyecto de demostración creado para el Hackathon de Vibe Coding E6. Todos los recursos visuales del héroe y el icono fueron generados específicamente para NIVEL.
