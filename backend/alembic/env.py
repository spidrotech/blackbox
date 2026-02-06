"""Alembic configuration for GESTAR."""
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys
from pathlib import Path

# Add the parent directory to Python path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from sqlmodel import SQLModel

# Load environment variables
load_dotenv()

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the sqlalchemy.url from environment variables
database_url = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://gestar_user:gestar_password@db:3306/gestar_db?charset=utf8mb4"
)
config.set_main_option("sqlalchemy.url", database_url)

# Import all models for autogenerate to detect them
try:
    from app.models import (
        Address,
        Company,
        User,
        Customer,
        Project,
        ProjectPlanning,
        ProjectTeam,
        Quote,
        Invoice,
        LineItem,
        Supplier,
        Purchase,
        Equipment,
        TimeEntry,
        PriceLibraryItem,
    )
    target_metadata = SQLModel.metadata
except ImportError as e:
    print(f"Warning: Could not import models: {e}")
    target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # this event listens for events emitted
    # by a .py file and processes it into a database connection
    # that doesn't fail even if there is not currently a database
    # available.
    def process_revision_directives(context, revision, directives):
        if config.cmd_opts and config.cmd_opts.autogenerate:
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                print('No changes in schema detected.')

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata,
            process_revision_directives=process_revision_directives,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
