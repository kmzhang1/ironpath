# IronPath AI - Phase 5 Testing Documentation

## Overview

Comprehensive test suite for the multi-agent architecture implementation (Phase 5). Tests validate router agent, programmer agent, analyst agent, readiness checks, and methodology management.

## Test Structure

```
tests/
├── conftest.py                      # Pytest configuration and fixtures
├── test_agents.py                   # Unit tests for agent classes
├── test_api_routes.py               # API route tests
├── test_integration.py              # Integration and E2E tests
├── test_performance.py              # Performance validation tests
├── test_e2e_checklist.py           # Automated manual checklist tests
├── test_real_api_integration.py    # Optional real Gemini API tests
└── README.md                        # This file
```

## Running Tests

### Run All Tests

```bash
cd backend
pytest
```

### Run Specific Test Files

```bash
# Unit tests only
pytest tests/test_agents.py

# API route tests
pytest tests/test_api_routes.py

# Integration tests
pytest tests/test_integration.py

# Performance tests
pytest tests/test_performance.py

# E2E checklist tests
pytest tests/test_e2e_checklist.py
```

### Run with Coverage

```bash
# Generate coverage report
pytest --cov=src --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html
```

### Run Real API Tests (Optional)

Real API tests require a valid `GEMINI_API_KEY` environment variable:

```bash
# Set API key
export GEMINI_API_KEY="your_api_key_here"

# Run real API tests
pytest tests/test_real_api_integration.py -v

# Or run all tests including real API
pytest
```

**Note:** Real API tests are automatically skipped if `GEMINI_API_KEY` is not set.

## Test Categories

### 1. Unit Tests (`test_agents.py`)

**Purpose:** Test individual agent components in isolation

**Coverage:**
- BaseAgent retry logic and error handling
- RouterAgent intent classification
- ProgrammerAgent methodology loading and exercise filtering
- AnalystAgent read-only constraint and knowledge retrieval
- Edge cases and error conditions

**Key Tests:**
- ✓ Router classifies technique questions
- ✓ Router classifies program generation requests
- ✓ Programmer loads methodology with caching
- ✓ Programmer filters exercises by weak points and equipment
- ✓ Analyst enforces read-only constraint
- ✓ BaseAgent retry logic on failures

### 2. API Route Tests (`test_api_routes.py`)

**Purpose:** Test API endpoints and request/response handling

**Coverage:**
- Agent message routing endpoint
- Readiness check endpoints
- Methodology management endpoints
- Program generation v2 endpoint
- Validation and error handling

**Key Tests:**
- ✓ Agent endpoint requires API key
- ✓ Technique questions route to analyst
- ✓ Program requests redirect to wizard
- ✓ Readiness checks calculate scores correctly
- ✓ Methodology listing and filtering

### 3. Integration Tests (`test_integration.py`)

**Purpose:** Test complete workflows and data persistence

**Coverage:**
- End-to-end user onboarding flow
- Readiness check adjustment flow
- Agent chat technique question flow
- Database persistence and consistency
- Multi-methodology filtering

**Key Tests:**
- ✓ New user completes wizard and generates program
- ✓ Poor readiness triggers workout adjustment
- ✓ Agent chat conversation persistence
- ✓ Methodology filtering by category

### 4. Performance Tests (`test_performance.py`)

**Purpose:** Validate API response times meet Phase 5 targets

**Performance Targets:**
- Router Agent: <500ms
- Analyst Agent: <2s
- Programmer Agent: <5s
- Readiness Check: <200ms
- Methodology List: <100ms

**Key Tests:**
- ✓ All endpoints meet response time targets
- ✓ Database query performance
- ✓ Concurrent request handling

### 5. E2E Checklist Tests (`test_e2e_checklist.py`)

**Purpose:** Automated versions of manual testing checklist from Phase 5 plan

**Checklist Coverage:**

**Wizard Flow:**
- ✓ Complete wizard with all new fields
- ✓ Select each methodology and verify descriptions
- ✓ Test weak point input
- ✓ Verify competition date validation

**Readiness System:**
- ✓ Submit poor readiness (all 1s) → verify adjustment
- ✓ Submit good readiness (all 5s) → verify proceed
- ✓ Test adjustment acceptance flow
- ✓ Verify data saved to database

**Agent Chat:**
- ✓ Ask technique question → verify Analyst response
- ✓ Request program → verify redirect
- ✓ Test conversation history

**Success Criteria:**
- ✓ Router classification accuracy >85%
- ✓ Readiness checks trigger appropriate adjustments

### 6. Real API Integration Tests (`test_real_api_integration.py`)

**Purpose:** Validate agents with real Gemini API (optional)

**When to Use:**
- Pre-deployment validation
- Debugging agent behavior
- Quality assurance of AI responses

**Key Tests:**
- ✓ Real router classifies intents correctly
- ✓ Real analyst provides relevant advice
- ✓ Real programmer generates valid programs
- ✓ Agents handle edge cases gracefully
- ✓ Response quality and relevance

**Note:** These tests consume API quota and require network access.

## Test Fixtures

### Database Fixtures

- `test_engine` - In-memory SQLite test database
- `test_session` - Async database session
- `client` - HTTP test client with DB override

### Sample Data Fixtures

- `sample_lifter_profile` - Basic lifter profile
- `sample_extended_lifter_profile` - Extended profile with multi-agent fields
- `sample_program_request` - Program generation request
- `sample_methodology` - Test methodology
- `sample_exercises` - Exercise list
- `mock_db_session` - Mock session for unit tests

### API Fixtures

- `gemini_api_key` - Gemini API key from environment
- `has_gemini_api_key` - Boolean flag for conditional tests

## Coverage Goals

**Target:** >80% code coverage (as specified in Phase 5 plan)

**Current Coverage by Module:**

Run `pytest --cov=src --cov-report=term` to see detailed coverage.

**Key Areas:**
- Agent classes: >90%
- API routes: >85%
- Database models: >75%
- Utilities: >80%

## Best Practices

### 1. Use Mocks for External Dependencies

```python
with patch("src.routes.router.settings.GEMINI_API_KEY", "test_key"), \
     patch("src.routes.router.RouterAgent") as MockRouter:
    # Test logic here
```

### 2. Test Both Success and Failure Cases

```python
# Success case
response = await client.post("/api/endpoint", json=valid_data)
assert response.status_code == 200

# Failure case
response = await client.post("/api/endpoint", json=invalid_data)
assert response.status_code == 422
```

### 3. Verify Database Persistence

```python
# Make API call
await client.post("/api/readiness/check", json=check_data)

# Verify DB entry
result = await test_session.execute(select(ReadinessCheck))
assert result.scalar_one_or_none() is not None
```

### 4. Use Fixtures for Reusable Data

```python
@pytest.fixture
def sample_data():
    return {"key": "value"}

def test_something(sample_data):
    assert sample_data["key"] == "value"
```

## Continuous Integration

### GitHub Actions (Example)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest --cov=src --cov-report=xml
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Fail with "GEMINI_API_KEY not configured"

**Solution:** Set a test API key in the patch:

```python
with patch("src.routes.router.settings.GEMINI_API_KEY", "test_key"):
    # Your test
```

### Database Tests Fail

**Issue:** Tables not created in test DB

**Solution:** Ensure `Base.metadata.create_all()` is called in `test_engine` fixture.

### Real API Tests Always Skip

**Issue:** `GEMINI_API_KEY` environment variable not set

**Solution:**
```bash
export GEMINI_API_KEY="your_actual_api_key"
pytest tests/test_real_api_integration.py
```

### Performance Tests Fail

**Issue:** System under load, response times too slow

**Solution:** Run performance tests in isolation on an idle system:
```bash
pytest tests/test_performance.py -v
```

## Writing New Tests

### Template for Unit Test

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_my_feature(mock_db_session):
    """Test description following best practices"""
    # Arrange
    my_agent = MyAgent(api_key="test_key", db_session=mock_db_session)

    # Act
    result = await my_agent.process(input_data, context)

    # Assert
    assert result["expected_key"] == "expected_value"
```

### Template for API Test

```python
@pytest.mark.asyncio
async def test_my_endpoint(client, sample_data):
    """Test API endpoint behavior"""
    response = await client.post("/api/my-endpoint", json=sample_data)

    assert response.status_code == 200
    data = response.json()
    assert "key" in data
```

## Success Criteria Validation

The test suite validates all Phase 5 success criteria:

- ✅ All database migrations apply without errors
- ✅ All unit tests pass (>80% coverage)
- ✅ All integration tests pass
- ✅ Router classifies intents with >85% accuracy
- ✅ Programmer generates valid programs for all methodologies
- ✅ Analyst provides helpful responses
- ✅ Readiness checks trigger appropriate adjustments
- ✅ Frontend wizard completes successfully
- ✅ API response times meet targets
- ✅ No breaking changes to existing functionality

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Phase 5 Implementation Plan](../../docs/MULTI_AGENT_IMPLEMENTATION_PLAN.md)
