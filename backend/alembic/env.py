"""Alembic environment.

Reads the database URL from app settings rather than alembic.ini, so migrations
always target the same database the app uses.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base

# Importing the model modules registers every table on Base.metadata, which is
# what autogenerate diffs against. Without these imports Alembic would see no
# tables and cheerfully generate a migration that drops all of them.
from app.models import company as company_models  # noqa: F401
from app.models import guide as guide_models  # noqa: F401
from app.models import learning as learning_models  # noqa: F401
from app.models import test as test_models  # noqa: F401
from app.models import user as user_models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.sqlalchemy_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# SQLite cannot ALTER most things in place. Batch mode makes Alembic rebuild the
# table (create new -> copy rows -> drop old -> rename), which preserves data.
IS_SQLITE = settings.sqlalchemy_url.startswith("sqlite")


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sqlalchemy_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=IS_SQLITE,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=IS_SQLITE,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
