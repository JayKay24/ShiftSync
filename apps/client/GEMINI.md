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

## Routing & Auth
- **Role-Based Redirects**: The root page (`/app/page.tsx`) automatically redirects users to `/dashboard/manager` or `/dashboard/staff` based on their role stored in the `AuthContext`.
- **Interceptors**: Axios interceptors handle Bearer token injection and automatic logout on 401 Unauthorized responses.
