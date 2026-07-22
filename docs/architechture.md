# Architecture

Bombay Silvers follows a modern client-server architecture.

```
Browser
        │
        ▼
React Application
        │
        ▼
TanStack Router
        │
        ▼
Authentication Layer
        │
        ▼
Role Based Access Control
        │
        ▼
Supabase
        │
        ▼
PostgreSQL
        │
        ▼
Row Level Security
```

Every request must satisfy both frontend authorization and backend Row Level Security before data is returned.

This layered security model prevents unauthorized access even if frontend restrictions are bypassed.
