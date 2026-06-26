# ShellTI — Explorador ChileCompra

Aplicación serverless para consultar licitaciones de Mercado Público.

## Estructura

```
├── api/
│   ├── _lib/mercadopublico.js     ← helper compartido + datos mock
│   ├── health.js                  → GET /api/health
│   └── licitaciones/
│       ├── fecha.js               → GET /api/licitaciones/fecha?fecha=YYYY-MM-DD
│       ├── organismo.js           → GET /api/licitaciones/organismo?codigo=89100
│       └── codigo.js              → GET /api/licitaciones/codigo?codigo=2345-1-LE26
├── public/
│   ├── index.html
│   ├── css/styles.css
│   ├── js/app.js
│   └── logo_shellti.webp
├── .env.example
├── vercel.json
└── package.json
```

## Despliegue en Vercel

```bash
npm i -g vercel
vercel
vercel env add CHILECOMPRA_TICKET
vercel --prod
```

## Modo demo (sin ticket)

Deja el campo ticket vacío o agrega `DEMO_MODE=true` en las variables de entorno.
Se mostrarán 8 licitaciones de prueba con un banner dorado indicando el modo demo.
