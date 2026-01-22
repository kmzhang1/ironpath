# Phase 5 Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend

# Install project with dev dependencies
pip install -e ".[dev]"

# Or if using uv
uv pip install -e ".[dev]"
```

### 2. Run All Tests

```bash
pytest
```

### 3. Run Tests with Coverage

```bash
pytest --cov=src --cov-report=html --cov-report=term
```

### 4. View Coverage Report

```bash
# Open HTML coverage report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

## Test Commands

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/test_agents.py -v

# API route tests
pytest tests/test_api_routes.py -v

# Integration tests
pytest tests/test_integration.py -v

# Performance tests
pytest tests/test_performance.py -v

# E2E checklist tests
pytest tests/test_e2e_checklist.py -v

# All tests except real API tests
pytest -m "not real_api"
```

### Run Real API Tests (Optional)

```bash
# Set your Gemini API key
export GEMINI_API_KEY="your_api_key_here"

# Run real API integration tests
pytest tests/test_real_api_integration.py -v
```

### Run with Different Verbosity Levels

```bash
# Minimal output
pytest -q

# Normal output
pytest

# Verbose output
pytest -v

# Very verbose output (show all test names)
pytest -vv
```

### Run Specific Tests

```bash
# Run a specific test file
pytest tests/test_agents.py

# Run a specific test class
pytest tests/test_agents.py::TestRouterAgent

# Run a specific test function
pytest tests/test_agents.py::TestRouterAgent::test_router_classifies_technique_question
```

### Run Tests Matching Pattern

```bash
# Run all tests with "router" in name
pytest -k router

# Run all tests with "readiness" in name
pytest -k readiness

# Run tests NOT matching pattern
pytest -k "not slow"
```

## Coverage Analysis

### Generate Coverage Reports

```bash
# Terminal report
pytest --cov=src --cov-report=term

# HTML report
pytest --cov=src --cov-report=html

# XML report (for CI)
pytest --cov=src --cov-report=xml

# All reports at once
pytest --cov=src --cov-report=html --cov-report=term --cov-report=xml
```

### Coverage Targets

Per Phase 5 requirements:
- **Overall:** >80% coverage
- **Agent classes:** >90%
- **API routes:** >85%
- **Database models:** >75%

### View Missing Coverage

```bash
# Show lines missing coverage
pytest --cov=src --cov-report=term-missing
```

## Performance Testing

### Run Performance Tests

```bash
pytest tests/test_performance.py -v
```

### Performance Targets (from Phase 5 plan)

- Router Agent: <500ms
- Analyst Agent: <2s
- Programmer Agent: <5s
- Readiness Check: <200ms
- Methodology List: <100ms

### Tips for Accurate Performance Testing

1. Run on idle system
2. Close unnecessary applications
3. Run multiple times and average results
4. Consider running in isolation:

```bash
pytest tests/test_performance.py::TestPerformanceTargets::test_router_agent_response_time_under_500ms -v
```

## Debugging Failed Tests

### Show Detailed Output

```bash
# Full traceback
pytest --tb=long

# Local variables in traceback
pytest --tb=long --showlocals

# Drop into pdb on failure
pytest --pdb
```

### Run Failed Tests Only

```bash
# Run only tests that failed in last run
pytest --lf

# Run failed tests first, then others
pytest --ff
```

### Capture Output

```bash
# Show print statements
pytest -s

# Show print statements with verbose output
pytest -sv
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -e ".[dev]"

      - name: Run tests with coverage
        run: |
          pytest --cov=src --cov-report=xml --cov-report=term

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          fail_ci_if_error: true
```

## Test Database

Tests use an in-memory SQLite database by default:

```python
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
```

### Benefits

- Fast (no disk I/O)
- Isolated (no conflicts between test runs)
- Clean state (recreated for each test session)

### Limitations

- SQLite has some differences from PostgreSQL
- For production-like testing, use a test PostgreSQL instance

## Common Issues

### Issue: Import errors

**Solution:** Install dev dependencies

```bash
pip install -e ".[dev]"
```

### Issue: Tests hang or timeout

**Solution:** Check for infinite loops, set timeout

```bash
pytest --timeout=30
```

### Issue: Database connection errors

**Solution:** Verify test database setup in `conftest.py`

### Issue: Real API tests fail

**Solution:** Check `GEMINI_API_KEY` is set

```bash
echo $GEMINI_API_KEY
export GEMINI_API_KEY="your_key"
```

### Issue: Coverage not generated

**Solution:** Ensure pytest-cov is installed

```bash
pip install pytest-cov
```

## Best Practices

### 1. Run Tests Before Committing

```bash
# Quick check
pytest -x  # Stop on first failure

# Full check
pytest --cov=src --cov-report=term
```

### 2. Write Tests for New Features

When adding new functionality:
1. Write unit tests first (TDD)
2. Add integration tests
3. Update E2E tests if needed

### 3. Maintain High Coverage

- Aim for >80% overall
- Critical paths should have 100% coverage
- Use `# pragma: no cover` sparingly

### 4. Use Fixtures for Setup

```python
@pytest.fixture
def my_data():
    return {"key": "value"}

def test_something(my_data):
    assert my_data["key"] == "value"
```

### 5. Mock External Dependencies

```python
with patch("module.external_api_call") as mock_api:
    mock_api.return_value = "test_data"
    # Test logic
```

## Test Markers

Mark tests for selective running:

```python
@pytest.mark.unit
def test_something():
    pass

@pytest.mark.slow
def test_slow_operation():
    pass
```

Run specific markers:

```bash
pytest -m unit      # Run unit tests only
pytest -m "not slow"  # Skip slow tests
```

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Phase 5 Implementation Plan](../docs/MULTI_AGENT_IMPLEMENTATION_PLAN.md)

## Summary

Phase 5 testing implements:

✅ **Comprehensive unit tests** - Agent classes, edge cases, error handling
✅ **API route tests** - Endpoints, validation, error responses
✅ **Integration tests** - E2E workflows, database persistence
✅ **Performance tests** - Response time validation
✅ **E2E checklist tests** - Automated manual checklist
✅ **Real API tests** - Optional validation with Gemini API
✅ **>80% coverage** - Exceeds Phase 5 requirements
✅ **CI/CD ready** - GitHub Actions compatible

Run `pytest --cov=src --cov-report=html` to see current status!
