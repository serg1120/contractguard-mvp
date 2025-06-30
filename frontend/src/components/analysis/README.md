# AnalysisStatus Component

A React component for displaying and tracking the progress of contract analysis operations.

## Features

- ✅ Display analysis progress states (queued, in-progress, completed, failed)
- ✅ Show progress bar with percentage when analysis is running
- ✅ Display estimated time remaining
- ✅ Include retry button for failed analyses
- ✅ Show success message when analysis completes
- ✅ Handle real-time status updates (polling every 3 seconds)
- ✅ Use Bootstrap progress bars and status indicators
- ✅ Include proper TypeScript interfaces
- ✅ Emit events when analysis completes successfully

## Usage

### Basic Usage

```tsx
import { AnalysisStatus } from './components/analysis';

function MyComponent() {
  const handleAnalysisComplete = (analysisId: string, status: AnalysisStatusData) => {
    console.log('Analysis completed:', analysisId);
    // Handle completion logic here
  };

  const handleRetry = (analysisId: string) => {
    // Trigger retry logic here
    console.log('Retrying analysis:', analysisId);
  };

  return (
    <AnalysisStatus
      analysisId="analysis-123"
      onAnalysisComplete={handleAnalysisComplete}
      onRetry={handleRetry}
      pollingInterval={3000}
    />
  );
}
```

### With Initial Status

```tsx
const initialStatus = {
  id: 'analysis-123',
  state: 'in-progress' as const,
  progress: 45,
  estimatedTimeRemaining: 120,
  fileName: 'contract.pdf',
  startedAt: new Date().toISOString()
};

<AnalysisStatus
  analysisId="analysis-123"
  initialStatus={initialStatus}
  onAnalysisComplete={handleAnalysisComplete}
  onRetry={handleRetry}
/>
```

## Props

### AnalysisStatusProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `analysisId` | `string` | ✅ | - | Unique identifier for the analysis |
| `initialStatus` | `AnalysisStatusData` | ❌ | `null` | Initial status data to display |
| `onAnalysisComplete` | `(analysisId: string, status: AnalysisStatusData) => void` | ❌ | - | Callback when analysis completes successfully |
| `onRetry` | `(analysisId: string) => void` | ❌ | - | Callback when retry button is clicked |
| `className` | `string` | ❌ | `''` | Additional CSS classes |
| `pollingInterval` | `number` | ❌ | `3000` | Polling interval in milliseconds |

### AnalysisStatusData Interface

```tsx
interface AnalysisStatusData {
  id: string;
  state: 'queued' | 'in-progress' | 'completed' | 'failed';
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // in seconds
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  fileName?: string;
}
```

## States

### Queued
- Shows waiting message
- No progress bar
- Clock icon with warning color

### In Progress
- Shows progress bar with percentage
- Displays estimated time remaining
- Spinning arrow icon with info color
- Polls for updates every 3 seconds

### Completed
- Shows success alert with completion message
- Check circle icon with success color
- Stops polling
- Triggers `onAnalysisComplete` callback

### Failed
- Shows error alert with error message
- Shows retry button (if `onRetry` provided)
- Exclamation triangle icon with danger color
- Stops polling

## API Integration

The component expects you to replace the mock API call in `fetchAnalysisStatus` with your actual backend endpoint:

```tsx
const fetchAnalysisStatus = async (id: string): Promise<AnalysisStatusData> => {
  const response = await axios.get(`/api/analysis/${id}/status`);
  return response.data;
};
```

### Expected API Response

```json
{
  "id": "analysis-123",
  "state": "in-progress",
  "progress": 65,
  "estimatedTimeRemaining": 180,
  "fileName": "contract.pdf",
  "startedAt": "2023-01-01T10:00:00Z",
  "completedAt": null,
  "errorMessage": null
}
```

## Styling

The component uses Bootstrap 5 classes for styling:

- **Progress bars**: `progress`, `progress-bar`
- **Cards**: `card`, `card-body`
- **Alerts**: `alert`, `alert-success`, `alert-danger`
- **Icons**: Bootstrap Icons (bi-*)
- **Buttons**: `btn`, `btn-outline-primary`
- **Utilities**: spacing, text colors, flex utilities

## Accessibility

- Progress bars include proper ARIA attributes
- Alert messages use appropriate roles
- Icons are accompanied by descriptive text
- Loading states are announced to screen readers

## Error Handling

The component handles various error scenarios:

1. **Network errors**: Shows retry button for status fetching
2. **Analysis failures**: Shows error message and retry option
3. **Invalid responses**: Graceful degradation with error display
4. **Component unmounting**: Cleans up polling intervals

## Performance Considerations

- Polling automatically stops when analysis completes or fails
- Intervals are cleaned up on component unmount
- Loading states prevent multiple simultaneous requests
- Consider using React Query or SWR for advanced caching and request deduplication

## Testing

Use the `AnalysisStatusExample` component to test different states and scenarios:

```tsx
import AnalysisStatusExample from './components/analysis/AnalysisStatusExample';

// Render in your test environment or development page
<AnalysisStatusExample />
```

## Customization

### Custom Polling Interval

```tsx
<AnalysisStatus
  analysisId="analysis-123"
  pollingInterval={5000} // Poll every 5 seconds
/>
```

### Custom CSS Classes

```tsx
<AnalysisStatus
  analysisId="analysis-123"
  className="my-custom-analysis-status"
/>
```

### Disable Polling

```tsx
<AnalysisStatus
  analysisId="analysis-123"
  pollingInterval={0} // Disable automatic polling
/>
```