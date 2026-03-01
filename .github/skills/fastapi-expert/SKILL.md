---
name: fastapi-expert
description: Specialized in high-performance FastAPI development, Pydantic v2 schemas, and asynchronous database integration.
---

# FastAPI Expert Instructions
- **Type Safety:** Always use `Annotated` for dependencies (e.g., `db: Annotated[Session, Depends(get_db)]`).
- **Pydantic:** Use Pydantic v2 features. Prefer `Field` for descriptions and constraints.
- **Asynchrony:** Default to `async def` for endpoints unless a library is blocking.
- **Documentation:** Include `summary`, `description`, and `responses` in route decorators for better Swagger UI generation.
- **Status Codes:** Use `fastapi.status` constants (e.g., `status.HTTP_201_CREATED`) instead of magic numbers.
- **Validation:** Use `Query`, `Path`, and `Body` for explicit request parameter validation.