# API Quick Reference - Phase 3 Endpoints

## Base URL
```
http://localhost:8000/api
```

## New Endpoints (Phase 3)

### 🤖 Agent Router

#### Route User Message
```http
POST /api/agent/message
Content-Type: application/json

{
  "message": "How do I improve my bench lockout?",
  "profile": { /* ExtendedLifterProfileSchema */ },
  "currentProgramId": null
}
```

#### Get Conversation History
```http
GET /api/agent/conversations/{user_id}?limit=50
```

---

### 💪 Readiness Checks

#### Submit Readiness Check
```http
POST /api/readiness/check
Content-Type: application/json

{
  "userId": "user_123",
  "programId": "prog_456",
  "weekNumber": 2,
  "dayNumber": 3,
  "sleepQuality": 3,      // 1-5
  "stressLevel": 4,        // 1-5
  "soreness_fatigue": 3    // 1-5
}
```

#### Get Readiness History
```http
GET /api/readiness/history/{user_id}?limit=30
```

#### Get Readiness Statistics
```http
GET /api/readiness/stats/{user_id}
```

---

### 📚 Methodologies

#### List All Methodologies
```http
GET /api/methodologies/list
```

#### Get Methodology Details
```http
GET /api/methodologies/{methodology_id}
```

#### List by Category
```http
GET /api/methodologies/category/{category}
# Categories: novice, intermediate, advanced
```

---

### 🏋️ Program Generation

#### Generate Program V2 (NEW)
```http
POST /api/programs/generate-v2
Content-Type: application/json

{
  "profile": {
    "id": "user_123",
    "methodologyId": "westside",  // REQUIRED
    "trainingAge": "intermediate",
    "weakPoints": ["lockout"],
    "equipmentAccess": "commercial",
    // ... other fields
  },
  "request": {
    "goal": "strength_block",
    "weeks": 8,
    "daysPerWeek": 4,
    "limitations": [],
    "focusAreas": []
  }
}
```

#### Generate Program V1 (DEPRECATED)
```http
POST /api/programs/generate
Content-Type: application/json
# Use /generate-v2 instead
```

---

## Response Formats

### Success Response
```json
{
  "agentUsed": "analyst_mentor",
  "intentClassification": {
    "intent": "technique_question",
    "confidence": 0.92,
    "reasoning": "...",
    "suggestedAgent": "analyst_mentor",
    "requiresProgramContext": false
  },
  "response": { /* Agent-specific response */ },
  "timestamp": "2026-01-21T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Failed to process message",
  "code": "AGENT_ERROR",
  "details": {
    "message": "Detailed error information"
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing required field) |
| 404 | Resource Not Found |
| 422 | Validation Error (invalid data) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (API key not configured) |

---

## Testing with cURL

### Test Agent Message
```bash
curl -X POST http://localhost:8000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I improve my squat?",
    "profile": {
      "id": "test_user",
      "methodologyId": "westside",
      "trainingAge": "intermediate",
      "weakPoints": [],
      "equipmentAccess": "commercial",
      "preferredSessionLength": 60,
      "biometrics": {"bodyweight": 80, "unit": "kg", "sex": "male", "age": 28},
      "oneRepMax": {"squat": 180, "bench": 120, "deadlift": 220},
      "name": "Test User"
    },
    "currentProgramId": null
  }'
```

### Test Readiness Check
```bash
curl -X POST http://localhost:8000/api/readiness/check \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "programId": "test_program",
    "weekNumber": 1,
    "dayNumber": 1,
    "sleepQuality": 3,
    "stressLevel": 3,
    "soreness_fatigue": 3
  }'
```

### Test List Methodologies
```bash
curl http://localhost:8000/api/methodologies/list
```

---

## Interactive API Docs

When running in development mode:
```
http://localhost:8000/docs
```

---

## Rate Limits

Currently: **None**

Future considerations:
- 100 requests/minute per user for agent messages
- 1000 requests/minute for read-only endpoints

---

## Authentication

Currently: **None** (development)

Future: JWT tokens required for all endpoints
```http
Authorization: Bearer {token}
```
