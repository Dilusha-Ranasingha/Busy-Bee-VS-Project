from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from flask import current_app
import os

def get_engine():
    """Get SQLAlchemy engine from Flask config"""
    database_url = current_app.config.get('DATABASE_URL') or os.getenv('DATABASE_URL')
    return create_engine(database_url, pool_pre_ping=True)

def get_session():
    """Get database session"""
    engine = get_engine()
    Session = scoped_session(sessionmaker(bind=engine))
    return Session()

def close_session(session):
    """Close database session"""
    session.close()
