# OpenAI Resilience & Error Handling

This document describes how the application handles OpenAI API failures, timeouts, and quota issues.

## Architecture

```
HTTP Request → API Route → OpenAI Service → Circuit Breaker → OpenAI SDK (retry logic) → OpenAI API
```

**Key components:**
- **OpenAI SDK**: Built-in retry logic handles transient failures (rate limits, 5xx errors, timeouts)
- **Circuit Breaker**: Prevents cascading failures when OpenAI is degraded or down
- **Error Classification**: Categorizes errors for logging and alerting

## OpenAI SDK Configuration

The OpenAI client is configured with:
- `maxRetries: 2` (default) - SDK automatically retries transient errors
- `timeout: 15000ms` - Request timeout before retry

The SDK **automatically retries** these conditions:
- 429 Rate Limit (with exponential backoff)
- 5xx Server Errors (500, 502, 503, 504)
- Connection errors and timeouts

The SDK **does not retry** these conditions:
- 4xx Client Errors (400, 401, 403, 404)
- Invalid API key
- Quota/billing errors

## Circuit Breaker

**Purpose**: Stop making requests to OpenAI when it's unhealthy, preventing wasted retries and cascading failures.

**Configuration** (via environment variables):
- `OPENAI_CIRCUIT_TIMEOUT=60000` - How long circuit stays open (60s default)
- `OPENAI_CIRCUIT_ERROR_THRESHOLD=50` - Error % to open circuit (50% default)
- `OPENAI_CIRCUIT_VOLUME_THRESHOLD=10` - Min requests before circuit can open (10 default)

**States:**
- **Closed** (normal): All requests pass through
- **Open**: All requests fail fast without calling OpenAI
- **Half-Open**: Testing if service recovered

**Circuit opens when:**
- 50% of last 10 requests fail
- Stays open for 60 seconds
- After timeout, enters half-open state to test recovery

**Circuit does NOT open for:**
- Single isolated failures
- Low request volume (< 10 requests)

## Error Classification

Errors are classified for logging and monitoring:

| Error Type | Examples | Action |
|------------|----------|--------|
| `quota_exceeded` | Insufficient quota, billing issue | **CRITICAL** - Log alert, fail fast |
| `rate_limit` | 429 Too Many Requests | SDK retries with backoff |
| `invalid_api_key` | 401 Unauthorized | Fail fast, check config |
| `server_error` | 500, 502, 503, 504 | SDK retries up to 2x |
| `timeout` | Request timeout | SDK retries up to 2x |
| `network_error` | Connection refused, DNS failure | SDK retries up to 2x |
| `unknown` | Other errors | Log and fail |

## Quota Exhaustion Handling

When monthly OpenAI budget is exhausted:

1. **Error detected**: `insufficient_quota` in error message
2. **Logged as CRITICAL**: Alert-worthy severity
3. **Request fails immediately**: No retries (prevents hammering API)
4. **Circuit breaker**: May open if quota errors are sustained
5. **User action required**: Increase OpenAI quota and retry via UI

**Why no automatic retry?**
- Quota errors are not transient
- User must take action (increase budget)
- Prevents wasting API calls

**Recovery:**
- User increases OpenAI quota
- Circuit closes after timeout (60s)
- User retries conversation via UI

## Monitoring

### Metrics

**OpenAI Circuit Breaker State:**
```
openai_circuit_open{} 0  # 0=closed, 1=open, 0.5=half-open
```

**HTTP Request Metrics** (include OpenAI-triggered requests):
```
http_request_duration_seconds{method,route,status_code}
http_requests_total{method,route,status_code}
http_errors_total{method,route,status_code}
```

### Health Check

**Endpoint**: `GET /api/deep-ping`

**Response includes**:
```json
{
  "ok": true,
  "dependencies": {
    "openai": {
      "ok": true,
      "latencyMs": 234,
      "circuitOpen": false
    }
  }
}
```

**When circuit is open**:
```json
{
  "ok": false,
  "dependencies": {
    "openai": {
      "ok": false,
      "error": "circuit_breaker_open",
      "circuitOpen": true
    }
  }
}
```

### Logs

**Circuit state changes**:
```
ERROR: OpenAI circuit breaker opened - requests will be rejected
WARN:  OpenAI circuit breaker half-open - testing if service recovered
INFO:  OpenAI circuit breaker closed - service healthy
```

**Quota errors** (CRITICAL):
```
ERROR: CRITICAL: OpenAI quota exceeded - check billing and usage limits
```

**Error classification**:
```
ERROR: OpenAI API error: rate_limit
ERROR: OpenAI API error: server_error
```

## Suggested Alerts

1. **Circuit breaker open** - Alert when `openai_circuit_open == 1`
2. **Quota exceeded** - Alert on log: `CRITICAL: OpenAI quota exceeded`
3. **High error rate** - Alert when `http_errors_total` for OpenAI routes spikes
4. **Deep ping failure** - Alert when `/api/deep-ping` returns 503

## Troubleshooting

### Circuit breaker is open
- **Check**: OpenAI API status (https://status.openai.com)
- **Check**: Recent error logs for root cause
- **Wait**: Circuit auto-recovers after 60s timeout
- **Manual reset**: Restart application (not recommended)

### Quota exceeded errors
- **Check**: OpenAI billing dashboard
- **Action**: Increase usage limit or add payment method
- **Retry**: Use UI to retry conversation after quota increase

### High latency
- **Check**: `http_request_duration_seconds` metrics for OpenAI routes
- **Check**: OpenAI API status
- **Consider**: Increasing `OPENAI_TIMEOUT_MS` if consistently timing out

### Rate limit errors (429)
- **SDK handles**: Automatic retry with backoff
- **If persistent**: Increase rate limits with OpenAI or reduce request volume
- **Check**: `OPENAI_MAX_RETRIES` configuration
