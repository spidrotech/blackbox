#!/usr/bin/env python3
"""
Helper script for database migrations using Alembic.
Usage:
    python migrate.py --help
"""
import sys
import os
from pathlib import Path

# Ensure we're in the correct directory
os.chdir(Path(__file__).parent)

def run_command(cmd):
    """Run a shell command."""
    print(f"▶️  Running: {cmd}")
    return os.system(cmd)

def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("""
GESTAR Database Migrations Helper

Usage:
    python migrate.py revision      - Create a new migration
    python migrate.py upgrade       - Apply migrations to database
    python migrate.py downgrade -1  - Revert last migration
    python migrate.py current       - Show current revision
    python migrate.py history       - Show migration history
        """)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "revision":
        message = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Auto migration"
        return run_command(f"alembic revision --autogenerate -m '{message}'")
    
    elif command == "upgrade":
        target = sys.argv[2] if len(sys.argv) > 2 else "head"
        return run_command(f"alembic upgrade {target}")
    
    elif command == "downgrade":
        target = sys.argv[2] if len(sys.argv) > 2 else "-1"
        return run_command(f"alembic downgrade {target}")
    
    elif command == "current":
        return run_command("alembic current")
    
    elif command == "history":
        return run_command("alembic history --all")
    
    else:
        print(f"Unknown command: {command}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
