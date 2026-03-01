import logging
import os
import time
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
try:
    from logstash_async.handler import AsynchronousLogstashHandler
    _LOGSTASH_AVAILABLE = True
except ImportError:
    _LOGSTASH_AVAILABLE = False
from app.api.v1.api import api_router

# Création de l'app FastAPI
app = FastAPI(
    title="GESTAR API",
    description="API Backend pour la gestion de projets énergétiques",
    version="1.0.0"
)

# Middleware pour logger TOUTES les requêtes HTTP
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Capturer le body si présent (pour POST, PUT, PATCH)
        body = b""
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            body = await request.body()
            # Recréer la requête car le body ne peut être lu qu'une fois
            async def receive():
                return {"type": "http.request", "body": body}
            request._receive = receive
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Déterminer le niveau de log selon le status code
            status_code = response.status_code
            log_level = "INFO"
            
            if status_code >= 500:
                log_level = "ERROR"
            elif status_code >= 400:
                log_level = "WARNING"
            elif status_code >= 300:
                log_level = "INFO"
            else:
                log_level = "INFO"
            
            # Parser le body pour logger
            body_str = ""
            if body:
                try:
                    body_str = body.decode('utf-8')
                    # Masquer les données sensibles dans le body
                    import json
                    try:
                        body_json = json.loads(body_str)
                        # Masquer les mots de passe et tokens
                        if "password" in body_json:
                            body_json["password"] = "***MASKED***"
                        if "token" in body_json:
                            body_json["token"] = "***MASKED***"
                        if "refresh_token" in body_json:
                            body_json["refresh_token"] = "***MASKED***"
                        body_str = json.dumps(body_json)
                    except:
                        pass
                except:
                    body_str = "[Binary data]"
            
            # Logger la requête
            log_message = f"{request.method} {request.url.path} - {status_code} ({process_time:.2f}s)"
            
            extra_data = {
                "application": "gestar_api",
                "http_method": request.method,
                "http_status": status_code,
                "http_path": request.url.path,
                "http_query": str(request.url.query),
                "response_time_ms": round(process_time * 1000, 2),
                "client_ip": request.client.host if request.client else "unknown",
                "level": log_level,
            }
            
            if body_str:
                extra_data["http_body"] = body_str
            
            if log_level == "ERROR":
                logger.error(log_message, extra=extra_data)
            elif log_level == "WARNING":
                logger.warning(log_message, extra=extra_data)
            else:
                logger.info(log_message, extra=extra_data)
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            body_str = ""
            if body:
                try:
                    body_str = body.decode('utf-8')
                except:
                    body_str = "[Binary data]"
            
            extra_data = {
                "application": "gestar_api",
                "http_method": request.method,
                "http_path": request.url.path,
                "http_query": str(request.url.query),
                "response_time_ms": round(process_time * 1000, 2),
                "client_ip": request.client.host if request.client else "unknown",
                "error": str(e),
                "level": "ERROR",
            }
            
            if body_str:
                extra_data["http_body"] = body_str
            
            logger.error(
                f"Exception: {request.method} {request.url.path} - {str(e)}",
                extra=extra_data
            )
            # Return a proper JSON response instead of re-raising so CORS headers are applied
            from fastapi.responses import JSONResponse as _JSONResponse
            return _JSONResponse(
                status_code=500,
                content={"detail": str(e), "type": type(e).__name__},
            )

app.add_middleware(LoggingMiddleware)

# Configuration CORS - doit être ajouté EN DERNIER pour être la couche la plus externe
# (dernier add_middleware = outermost dans Starlette)
app.add_middleware(
    CORSMiddleware,
    # Regex covers http://localhost:*, http://127.0.0.1:*, http://*.localhost:*
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|[a-z0-9\-]+\.localhost)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Safety-net: catch unhandled exceptions so CORS headers are always present
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {request.method} {request.url.path} - {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Serve static files (uploads, etc.)
static_path = os.path.join(os.getcwd(), 'static') if hasattr(__import__('os'), 'getcwd') else 'static'
try:
    app.mount('/static', StaticFiles(directory=static_path), name='static')
except Exception:
    pass

# Home page
@app.get("/", response_class=HTMLResponse)
async def home():
    return """
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gestar - Gestion des chantiers en bâtiment</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
            }
            
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1); }
                50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2); }
            }
            
            @keyframes gradient-shift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            
            body {
                font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
                background: linear-gradient(-45deg, #0f0f1e, #1a1a2e, #16213e, #0f3460);
                background-size: 400% 400%;
                animation: gradient-shift 15s ease infinite;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow: hidden;
            }
            
            .stars-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }
            
            .star {
                position: absolute;
                width: 2px;
                height: 2px;
                background: white;
                border-radius: 50%;
                opacity: 0.5;
            }
            
            .container {
                position: relative;
                z-index: 2;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 215, 0, 0.2);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                max-width: 900px;
                width: 100%;
                padding: 80px 60px;
                text-align: center;
            }
            
            .logo {
                font-size: 4em;
                margin-bottom: 20px;
                display: inline-block;
                animation: float 3s ease-in-out infinite;
            }
            
            h1 {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
                font-size: 3em;
                font-weight: 800;
                letter-spacing: 2px;
            }
            
            .subtitle {
                color: #a0aec0;
                margin-bottom: 40px;
                font-size: 1.2em;
                font-weight: 300;
                letter-spacing: 1px;
            }
            
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 12px 28px;
                border-radius: 50px;
                margin-bottom: 50px;
                font-weight: 600;
                font-size: 0.95em;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                animation: glow 2s ease-in-out infinite;
            }
            
            .button-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 25px;
                margin: 50px 0;
            }
            
            .btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 18px 32px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 600;
                font-size: 1em;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 2px solid transparent;
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }
            
            .btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                transition: left 0.3s ease;
                z-index: -1;
            }
            
            .btn:hover::before {
                left: 100%;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #0f0f1e;
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.3);
            }
            
            .btn-primary:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
            }
            
            .btn-secondary {
                background: rgba(255, 215, 0, 0.1);
                color: #ffd700;
                border-color: rgba(255, 215, 0, 0.3);
            }
            
            .btn-secondary:hover {
                background: rgba(255, 215, 0, 0.2);
                border-color: #ffd700;
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.2);
                transform: translateY(-3px);
            }
            
            .endpoints-section {
                text-align: left;
                background: rgba(26, 26, 46, 0.5);
                border: 1px solid rgba(255, 215, 0, 0.1);
                border-radius: 15px;
                padding: 40px;
                margin: 50px 0;
            }
            
            .endpoints-section h3 {
                color: #ffd700;
                margin-bottom: 30px;
                font-size: 1.5em;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .endpoints-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 15px;
            }
            
            .endpoint {
                display: flex;
                gap: 12px;
                align-items: center;
                padding: 16px;
                background: rgba(16, 185, 129, 0.05);
                border-radius: 10px;
                border-left: 4px solid #ffd700;
                transition: all 0.3s ease;
            }
            
            .endpoint:hover {
                background: rgba(255, 215, 0, 0.08);
                transform: translateX(4px);
                border-left-color: #ffed4e;
            }
            
            .method-tag {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #0f0f1e;
                padding: 6px 14px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 0.85em;
                min-width: 50px;
                text-align: center;
                flex-shrink: 0;
            }
            
            .endpoint-path {
                color: #cbd5e0;
                font-family: 'Monaco', 'Courier New', monospace;
                font-size: 0.95em;
            }
            
            .footer {
                color: #718096;
                margin-top: 50px;
                padding-top: 30px;
                border-top: 1px solid rgba(255, 215, 0, 0.1);
                font-size: 0.9em;
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 40px 30px;
                }
                h1 {
                    font-size: 2em;
                }
                .button-group {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="stars-bg" id="starsContainer"></div>
        
        <div class="container">
            <div class="logo">⭐</div>
            <h1>GESTAR</h1>
            <p class="subtitle">Gestion Star - Plateforme de Gestion de Projets</p>
            
            <div class="status-badge">✓ API Active et Opérationnelle</div>
            
            <div class="button-group">
                <a href="/docs" class="btn btn-primary">📚 Swagger UI</a>
                <a href="/redoc" class="btn btn-secondary">📖 ReDoc</a>
                <a href="/health" class="btn btn-secondary">🏥 Health Check</a>
            </div>
            
            <div class="endpoints-section">
                <h3>⚡ Endpoints Principaux</h3>
                <div class="endpoints-grid">
                    <div class="endpoint">
                        <span class="method-tag">POST</span>
                        <span class="endpoint-path">/api/v1/auth/login</span>
                    </div>
                    <div class="endpoint">
                        <span class="method-tag">GET</span>
                        <span class="endpoint-path">/api/v1/customers</span>
                    </div>
                    <div class="endpoint">
                        <span class="method-tag">GET</span>
                        <span class="endpoint-path">/api/v1/projects</span>
                    </div>
                    <div class="endpoint">
                        <span class="method-tag">GET</span>
                        <span class="endpoint-path">/api/v1/quotes</span>
                    </div>
                    <div class="endpoint">
                        <span class="method-tag">GET</span>
                        <span class="endpoint-path">/api/v1/invoices</span>
                    </div>
                    <div class="endpoint">
                        <span class="method-tag">GET</span>
                        <span class="endpoint-path">/api/v1/dashboard</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>GESTAR API v1.0.0 • FastAPI Backend • Optimisé et Moderne</p>
            </div>
        </div>
        
        <script>
            // Générer les étoiles de fond
            const starsContainer = document.getElementById('starsContainer');
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.opacity = Math.random() * 0.7 + 0.2;
                star.style.animation = 'float ' + (3 + Math.random() * 3) + 's ease-in-out infinite';
                star.style.animationDelay = Math.random() * 2 + 's';
                starsContainer.appendChild(star);
            }
        </script>
    </body>
    </html>
    """


# Test endpoint pour vérifier que les logs sont envoyés à Kibana
@app.get("/test-logs")
async def test_logs():
    logger.info(
        "Test log message from API",
        extra={
            "application": "gestar_api",
            "endpoint": "/test-logs",
            "timestamp": "test",
            "level": "INFO"
        }
    )
    return {"message": "Log sent to Kibana! Check http://localhost:5601"}

# Configuration du logger
logger = logging.getLogger('python-logstash-logger')
logger.setLevel(logging.DEBUG)

# Logstash est optionnel - activé uniquement si LOGSTASH_ENABLED=true
_logstash_enabled = os.getenv('LOGSTASH_ENABLED', 'false').lower() == 'true'
if _LOGSTASH_AVAILABLE and _logstash_enabled:
    _logstash_host = os.getenv('LOGSTASH_HOST', 'logstash')
    _logstash_port = int(os.getenv('LOGSTASH_PORT', '5000'))
    handler = AsynchronousLogstashHandler(
        host=_logstash_host,
        port=_logstash_port,
        database_path='logstash.db'
    )
    logger.addHandler(handler)
    logger.info("🚀 GESTAR API Started", extra={"application": "gestar_api", "event": "startup"})
else:
    logging.getLogger(__name__).info("Logstash désactivé (LOGSTASH_ENABLED != true)")