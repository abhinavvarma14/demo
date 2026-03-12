import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create database engine with stable connection settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,     # checks if connection is alive before using
    pool_recycle=300,       # refresh connection every 5 minutes
    pool_size=10,           # number of persistent connections
    max_overflow=20         # extra connections if traffic increases
)

# Session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base model
Base = declarative_base()