<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Data Fetching Rules

### NEVER use client-side fetch when Next.js Server Actions can be used instead

- **Use Server Actions** (`"use server"`) for all data fetching that can be done on the server
- **Avoid client-side fetch()** in React components unless absolutely necessary (e.g., third-party APIs)
- **Prefer Server Components** for data fetching - they can directly access databases and APIs
- **Use useTransition()** when calling Server Actions from Client Components for optimal UX
- **Only use API routes** when you need to expose endpoints to external services

**Examples of CORRECT usage:**
```typescript
// ✅ Server Action in src/server/actions/rates.ts
"use server";
export async function getRatesForEmployee(employeeId: number, effectiveDate: string) {
  const rates = await db.select().from(schema.rateEdits).where(...);
  return rates;
}

// ✅ Client Component using Server Action
"use client";
import { getRatesForEmployee } from "@/server/actions/rates";
import { useTransition } from "react";

export function Rates() {
  const [isPending, startTransition] = useTransition();
  
  const fetchData = () => {
    startTransition(async () => {
      const data = await getRatesForEmployee(id, date);
      setData(data);
    });
  };
}
```

**Examples of INCORRECT usage:**
```typescript
// ❌ Client-side fetch in React component
"use client";
export function Rates() {
  useEffect(() => {
    fetch('/api/rates?employeeId=1') // DON'T DO THIS!
      .then(res => res.json())
      .then(data => setData(data));
  }, []);
}
```

**When client-side fetch IS acceptable:**
- Calling third-party APIs that don't support CORS from server
- Real-time features (WebSockets, Server-Sent Events)
- File uploads with progress tracking
- Integration with external services that require client-side authentication
<!-- END:nextjs-agent-rules -->
