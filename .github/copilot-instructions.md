# Global Project Instructions

## General Python Style
- Use **Type Hinting** for all function arguments and return types.
- Prefer `pathlib` over `os.path`.
- Use `ruff` for linting; do not suggest code that violates standard ruff rules.

## FastAPI & Pydantic
- All endpoints must return a Pydantic `response_model`.
- Use `Annotated` for all Dependency Injection to keep types clean.
- Place all business logic in `app/services/` and keep `app/api/` for routing only.

## Database (SQLAlchemy)
- Use the `AsyncSession` for all DB operations.
- Always use the `select()` statement (2.0 style), never `session.query()`.

## Testing
- Use `pytest` and `httpx` for integration tests.
- Mock all external API calls using `respx`.