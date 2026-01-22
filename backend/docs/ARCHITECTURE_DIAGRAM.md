# IronPath AI - Multi-Agent Architecture (Post Phase 3)

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Wizard  │  │  Chat    │  │Readiness │  │ Program  │       │
│  │          │  │Interface │  │  Check   │  │   View   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      API ROUTES                           │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │  router.py  │  │readiness.py │  │methodologies│      │  │
│  │  │             │  │             │  │    .py      │      │  │
│  │  │ /agent/     │  │/readiness/  │  │/methodologies│     │  │
│  │  │  message    │  │  check      │  │    /list    │      │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │  │
│  │         │                 │                 │             │  │
│  │  ┌──────┴────────────────────────────────┐ │             │  │
│  │  │         programs.py                    │ │             │  │
│  │  │                                        │ │             │  │
│  │  │  /programs/generate-v2 (NEW)          │ │             │  │
│  │  │  /programs/generate (DEPRECATED)      │ │             │  │
│  │  └────────────────┬───────────────────────┘ │             │  │
│  └─────────────────────────────────────────────┼─────────────┘  │
│                      │                          │                │
│                      ▼                          ▼                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   AI AGENTS (Phase 2)                       │ │
│  │                                                              │ │
│  │  ┌──────────────┐                                          │ │
│  │  │ RouterAgent  │                                          │ │
│  │  │ (Temp: 0.3)  │                                          │ │
│  │  │              │                                          │ │
│  │  │ Classifies   │                                          │ │
│  │  │ Intent       │                                          │ │
│  │  └──────┬───────┘                                          │ │
│  │         │                                                   │ │
│  │    ┌────┼────┬──────────────┐                             │ │
│  │    │    │    │              │                             │ │
│  │    ▼    ▼    ▼              ▼                             │ │
│  │  ┌────┐┌────┐┌─────────┐ ┌──────┐                        │ │
│  │  │Prog││Anal││Feedback │ │Nutri │ (Future)               │ │
│  │  │ram ││yst ││ Agent   │ │tion  │                        │ │
│  │  │mer ││    ││         │ │Agent │                        │ │
│  │  │    ││    ││         │ │      │                        │ │
│  │  │0.8 ││0.7 ││  0.7    │ │ 0.7  │                        │ │
│  │  └────┘└────┘└─────────┘ └──────┘                        │ │
│  │    │     │       │                                         │ │
│  │    │     │       └──────────┐                             │ │
│  │    │     └──────────┐       │                             │ │
│  │    └────────┐       │       │                             │ │
│  │             ▼       ▼       ▼                             │ │
│  │         ┌────────────────────────┐                        │ │
│  │         │   Gemini 2.0 Flash     │                        │ │
│  │         │   (Google AI Studio)   │                        │ │
│  │         └────────────────────────┘                        │ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│                      ▲                   ▲                      │
│                      │                   │                      │
│  ┌───────────────────┴──────┐  ┌────────┴────────────────────┐│
│  │   KNOWLEDGE BASES         │  │    DATABASE (PostgreSQL)     ││
│  │                           │  │                              ││
│  │  • Methodology Rules      │  │  Tables:                     ││
│  │  • Exercise Library       │  │  • training_methodologies    ││
│  │  • Programming Principles │  │  • exercises                 ││
│  │  • Coaching Tips          │  │  • readiness_checks         ││
│  │                           │  │  • agent_conversations      ││
│  └───────────────────────────┘  │  • programs                 ││
│                                  │  • lifter_profiles          ││
│                                  │  • progress_logs            ││
│                                  └──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Request Flow Examples

### 1. Agent Chat Message Flow

```
User: "How do I improve my bench lockout?"
  │
  ▼
Frontend → POST /api/agent/message
  │
  ▼
RouterAgent.process()
  │
  ├─> Classify intent: "technique_question"
  ├─> Confidence: 0.92
  └─> Route to: AnalystAgent
      │
      ▼
  AnalystAgent.process()
      │
      ├─> Load methodology knowledge (Westside)
      ├─> Build system prompt
      └─> Call Gemini with context
          │
          ▼
      Response: "Focus on board press, floor press..."
          │
          ▼
      Save to agent_conversations table
          │
          ▼
      Return to user
```

### 2. Readiness Check Flow

```
User submits: Sleep=3, Stress=4, Soreness=3
  │
  ▼
Frontend → POST /api/readiness/check
  │
  ▼
Calculate score:
  │
  ├─> (3/5)*0.4 + (2/5)*0.3 + (3/5)*0.3 = 0.62
  │
  ▼
Determine adjustment:
  │
  ├─> Score < 0.7 → reduce_intensity
  └─> Recommendation: "Back off RPE by 1..."
      │
      ▼
  Save to readiness_checks table
      │
      ▼
  Return to user with adjustment
```

### 3. Program Generation V2 Flow

```
User: Generate 8-week Westside program
  │
  ▼
Frontend → POST /api/programs/generate-v2
  │
  ├─> Profile has methodologyId: "westside"
  │
  ▼
ProgrammerAgent.process()
  │
  ├─> Load methodology from DB (cached)
  ├─> Filter exercises by:
  │   ├─> Equipment: commercial
  │   ├─> Complexity: intermediate
  │   └─> Weak points: lockout
  │
  ├─> Build dynamic prompt:
  │   ├─> Methodology template
  │   ├─> Athlete profile
  │   ├─> Available exercises
  │   └─> Programming rules
  │
  ├─> Call Gemini with structured schema
  │
  ├─> Validate response (Pydantic)
  │
  ▼
Save to programs table with metadata:
  │
  ├─> methodology_id: "westside"
  ├─> generation_metadata: {
  │     "agent_version": "2.0",
  │     "methodology_used": "Westside Conjugate",
  │     "training_age": "intermediate",
  │     ...
  │   }
  │
  ▼
Return complete program to user
```

## Database Relationships

```
┌─────────────────────┐
│ training_           │
│ methodologies       │
│                     │
│ • id (PK)          │
│ • name             │
│ • programming_rules│
│ • knowledge_base   │
└──────┬──────────────┘
       │
       │ (FK)
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌──────┐ ┌──────────────┐
│lifter│ │   programs   │
│profil│ │              │
│es    │ │ • methodology│
│      │ │   _id (FK)   │
│• meth│ │ • generation │
│  odol│ │   _metadata  │
│  ogy │ └──────┬───────┘
│  _id │        │
│  (FK)│        │
└──┬───┘        │
   │            │ (FK)
   │            │
   │   ┌────────┴─────────┐
   │   │                  │
   │   ▼                  ▼
   │ ┌──────────┐   ┌──────────────┐
   │ │readiness │   │agent_        │
   └>│checks    │   │conversations │
     │          │   │              │
     │• user_id │   │• user_id (FK)│
     │  (FK)    │   │• agent_type  │
     │• program │   │• intent_     │
     │  _id (FK)│   │  classification│
     └──────────┘   └──────────────┘

┌─────────────┐
│  exercises  │
│             │
│ • equipment │
│ • targets_  │
│   weak_     │
│   points    │
│ • complexity│
└─────────────┘
```

## Component Dependencies

```
main.py
  │
  ├─> routes/router.py
  │     └─> services/router_agent.py
  │           └─> services/base_agent.py
  │     └─> services/analyst_agent.py
  │           └─> services/base_agent.py
  │           └─> models/tables.py (TrainingMethodology)
  │
  ├─> routes/readiness.py
  │     └─> models/tables.py (ReadinessCheck)
  │     └─> models/schemas.py (ReadinessCheckRequest/Response)
  │
  ├─> routes/methodologies.py
  │     └─> models/tables.py (TrainingMethodology)
  │     └─> models/schemas.py (MethodologyListItem/DetailResponse)
  │
  └─> routes/programs.py
        └─> services/programmer_agent.py
              └─> services/base_agent.py
              └─> models/tables.py (TrainingMethodology, Exercise)
              └─> models/schemas.py (FullProgramSchema)
```

## Agent Temperature Settings

| Agent | Temperature | Reason |
|-------|-------------|--------|
| Router | 0.3 | Consistent, deterministic classification |
| Programmer | 0.8 | Creative exercise selection and variation |
| Analyst | 0.7 | Balanced advice with personality |
| Feedback | 0.7 | Consistent adjustments with flexibility |

## Caching Strategy

```
BaseAgent._cache (per-request)
  │
  ├─> Methodology data
  │     Key: "methodology_{id}"
  │     Lifespan: Single request
  │
  └─> Exercise library
        Key: "exercises_{equipment}_{training_age}"
        Lifespan: Single request

Future: Application-level cache
  │
  ├─> Methodologies (refresh daily)
  └─> Exercise library (refresh on updates)
```

## Performance Targets

| Endpoint | Target | Expected |
|----------|--------|----------|
| GET /methodologies/list | <200ms | ~20-50ms |
| POST /readiness/check | <200ms | ~50-100ms |
| POST /agent/message | <2s | ~300-400ms |
| POST /programs/generate-v2 | <5s | ~2-4s |

## Security Layers (Future)

```
Request
  │
  ▼
┌─────────────────┐
│ Rate Limiting   │ 100 req/min per user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ JWT Auth        │ Verify token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Input Validation│ Pydantic schemas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business Logic  │ Agents & DB
└────────┬────────┘
         │
         ▼
Response
```

## Monitoring Points

```
┌─────────────────────────────────────┐
│          Metrics to Track           │
├─────────────────────────────────────┤
│ • Agent routing decisions           │
│   - Intent distribution             │
│   - Confidence scores               │
│                                     │
│ • Response times (p50, p95, p99)    │
│   - Per endpoint                    │
│   - Per agent                       │
│                                     │
│ • Readiness patterns                │
│   - Adjustment rate                 │
│   - Average scores                  │
│                                     │
│ • Program generation                │
│   - Success rate                    │
│   - Methodology usage               │
│   - Generation time                 │
│                                     │
│ • Error rates                       │
│   - Per endpoint                    │
│   - Error types                     │
│                                     │
│ • Gemini API costs                  │
│   - Per agent type                  │
│   - Per user                        │
└─────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
Internet
  │
  ▼
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│FastAPI│ │FastAPI│ (Horizontal scaling)
│  Pod  │ │  Pod  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Managed)     │
└─────────────────┘
```

---

This architecture diagram shows the complete Phase 3 implementation with all components, flows, and relationships clearly defined.
