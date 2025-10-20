import { NextResponse } from "next/server";

// Lightweight Swagger UI using CDN assets. Points at /api/mobile/openapi.json
export async function GET(): Promise<Response> {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Sawaed Mobile API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body { margin: 0; } #swagger-ui { max-width: 100%; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener('load', () => {
        window.ui = SwaggerUIBundle({
          url: '/api/mobile/openapi.json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout',
          docExpansion: 'none',
          deepLinking: true,
        });
      });
    </script>
  </body>
</html>`;
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
