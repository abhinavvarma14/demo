import os
import socket

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Session maker. Bound to the engine during init_engine().
SessionLocal = sessionmaker(autocommit=False, autoflush=False)

# Base model
Base = declarative_base()

# Lazily initialized engine so import-time failures don't hide useful logs.
engine: Engine | None = None


def _is_production_environment() -> bool:
    if os.getenv("ENV", "").strip().lower() in {"prod", "production"}:
        return True
    # Railway always injects RAILWAY_* env vars for deployed services.
    return any(key.startswith("RAILWAY_") for key in os.environ.keys())


def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    if _is_production_environment():
        raise RuntimeError("Missing required environment variable: DATABASE_URL")
    # Dev fallback only. Production should always provide DATABASE_URL.
    return "sqlite:///./batprint.db"


def init_engine(logger=None) -> Engine:
    global engine
    if engine is not None:
        return engine

    database_url = _get_database_url()
    has_database_url = bool(os.getenv("DATABASE_URL", "").strip())

    try:
        parsed_url = make_url(database_url)
        dialect_name = parsed_url.get_backend_name()
        safe_url = parsed_url.render_as_string(hide_password=True)
        host = parsed_url.host
        port = parsed_url.port
    except Exception:
        dialect_name = "unknown"
        safe_url = "<unparseable>"
        host = None
        port = None

    if logger:
        logger.info("db init database_url_present=%s dialect=%s url=%s", has_database_url, dialect_name, safe_url)

    # Fail fast with a clear message when the database host cannot be resolved (common with VPN/DNS filters).
    if dialect_name in {"postgresql", "postgres"} and host:
        try:
            socket.getaddrinfo(host, port or 5432)
        except OSError as exc:
            if logger:
                logger.error(
                    "db init failed: cannot resolve database host host=%s port=%s error=%s",
                    host,
                    port or 5432,
                    str(exc),
                )
            raise RuntimeError(
                f"Database host cannot be resolved: {host}. "
                "Check your DNS/VPN/network or verify the Neon host in DATABASE_URL."
            ) from exc

    engine_kwargs = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update({"pool_recycle": 300, "pool_size": 10, "max_overflow": 20})

    try:
        engine = create_engine(database_url, **engine_kwargs)
        SessionLocal.configure(bind=engine)
        # Verify connectivity early so Railway logs are explicit if Neon rejects connection.
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        if logger:
            logger.info("db init success dialect=%s", dialect_name)
        return engine
    except Exception as exc:
        if logger:
            logger.exception("db init failed dialect=%s error=%s", dialect_name, str(exc))
        # Re-raise so the service fails loudly on Railway.
        raise


def get_engine() -> Engine:
    # No logger here; main.py calls init_engine(logger=...) during lifespan.
    return init_engine()
