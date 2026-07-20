# Arquitectura técnica — NIVEL MVP

## Decisiones

- **Frontend:** React 19 + App Router sobre Vinext, responsive y mobile-first.
- **Backend:** rutas server-side en el mismo proyecto para reducir complejidad operativa.
- **Datos:** Cloudflare D1 mediante Drizzle ORM.
- **Sesión:** identificador aleatorio en cookie HttpOnly; no requiere registro para la demo.
- **Instalación:** PWA con manifest, iconos, service worker y modo standalone.
- **Planificador:** reglas deterministas por energía/tiempo; funciona sin claves ni costo externo.

## Modelo de datos

El MVP almacena un documento de estado por sesión en `player_states`. Es deliberadamente simple para acelerar la entrega. Misiones, recompensas y eventos viajan juntos, evitando sincronizaciones parciales durante la demo.

## Reglas de seguridad e integridad

- El navegador solicita acciones; el servidor calcula XP, monedas, niveles y costo.
- Una misión completada no vuelve a pagar recompensa.
- Un capricho canjeado no puede canjearse otra vez.
- La cookie no es accesible desde JavaScript.
- No se recopila correo, contraseña ni información sensible.

## Evolución prevista

Normalizar tablas de perfiles, misiones, hábitos, recompensas y eventos; añadir autenticación; usar claves idempotentes; introducir analítica respetuosa; conectar un modelo de IA solo como capa opcional para sugerencias, manteniendo siempre un modo determinista.

## Viabilidad móvil

La misma URL HTTPS funciona en navegador y se instala desde Chrome o Safari. No hace falta compilar APK/IPA ni pasar por una tienda para la prueba y el video. Para una versión comercial posterior puede envolverse con Capacitor o construirse nativa con Expo, pero no aporta valor al MVP del hackathon.
