# Client Context

The frontend is a **Next.js** application utilizing **Tailwind CSS** for styling and **Lucide React** for iconography.

## API Consumption

The client communicates with the backend via a centralized Axios instance in `src/lib/api.ts`. It leverages the shared `@shiftsync/data-access` library for full type safety across the network boundary.

### Type Safety Example
In `src/lib/api.ts`, API interfaces are imported from the shared library to ensure requests and responses match the backend's DTOs:

```typescript
import { 
  ShiftResponse, 
  CreateShiftRequest,
  // ... other interfaces
} from '@shiftsync/data-access';

export const shiftsApi = {
  getShifts: (params?: { start?: string; end?: string; locationId?: string }) => 
    api.get<ShiftResponse[]>('/shifts', { params }),
  
  createShift: (data: CreateShiftRequest) => 
    api.post<ShiftResponse>('/shifts', data),
};
```

## Styling & Utilities

The project uses a standard utility for conditional class merging to ensure Tailwind classes are applied correctly without conflicts.

### Class Merging (`cn`)
The `cn` utility in `src/lib/utils.ts` wraps `clsx` and `tailwind-merge`. It should be used for all dynamic class applications in components to handle conditional logic and class overrides safely.

```typescript
import { cn } from '@/lib/utils';

// Usage example
<div className={cn(
  "px-4 py-2 rounded",
  isActive ? "bg-blue-500 text-white" : "bg-gray-200",
  className // merge external classes passed via props
)} />
```

## Routing & Auth
- **Role-Based Redirects**: The root page (`/app/page.tsx`) automatically redirects users to `/dashboard/manager` or `/dashboard/staff` based on their role stored in the `AuthContext`.
- **Interceptors**: Axios interceptors handle Bearer token injection and automatic logout on 401 Unauthorized responses.
