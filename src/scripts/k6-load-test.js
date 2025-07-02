import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const httpErrors = new Counter('http_errors');
const connectionPoolErrors = new Counter('connection_pool_errors');
const requestDuration = new Trend('request_duration');
const successRate = new Rate('success_rate');

// Test configuration
const scenarios = {
  // Low load scenario
  low_load: {
    executor: 'constant-vus',
    vus: 5,
    duration: '2m',
    tags: { load_type: 'low' },
  },
  // Medium load scenario
  medium_load: {
    executor: 'constant-vus',
    vus: 20,
    duration: '5m',
    tags: { load_type: 'medium' },
    startTime: '2m',
  },
  // High load scenario
  high_load: {
    executor: 'constant-vus',
    vus: 50,
    duration: '3m',
    tags: { load_type: 'high' },
    startTime: '7m',
  },
  // Spike test
  spike_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '10s', target: 0 },
    ],
    tags: { load_type: 'spike' },
    startTime: '10m',
  },
};

export const options = {
  scenarios,
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10%
    connection_pool_errors: ['count<10'], // Less than 10 pool errors
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

// Test data - heroes and enemies IDs
const heroes = [1, 2, 3, 4, 5];
const enemies = Array.from({ length: 50 }, (_, i) => i + 1);

export default function () {
  const startTime = Date.now();
  
  // Random selection of hero and enemy
  const heroId = heroes[Math.floor(Math.random() * heroes.length)];
  const enemyId = enemies[Math.floor(Math.random() * enemies.length)];
  
  // Test different endpoints with different loads
  const testEndpoint = Math.random();
  
  let response;
  
  if (testEndpoint < 0.4) {
    // 40% - Combat action (most resource intensive)
    response = http.post(`${BASE_URL}/combat/kill`, {
      heroId: heroId,
      enemyId: enemyId,
      enemyType: 'DRAGON'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test',
      },
      tags: { endpoint: 'combat' },
    });
  } else if (testEndpoint < 0.7) {
    // 30% - Get heroes (read operation)
    response = http.get(`${BASE_URL}/heroes`, {
      headers: {
        'User-Agent': 'k6-load-test',
      },
      tags: { endpoint: 'heroes' },
    });
  } else if (testEndpoint < 0.9) {
    // 20% - Get enemies (read operation)
    response = http.get(`${BASE_URL}/enemies`, {
      headers: {
        'User-Agent': 'k6-load-test',
      },
      tags: { endpoint: 'enemies' },
    });
  } else {
    // 10% - Health check (lightweight)
    response = http.get(`${BASE_URL}/health`, {
      headers: {
        'User-Agent': 'k6-load-test',
      },
      tags: { endpoint: 'health' },
    });
  }
  
  const duration = Date.now() - startTime;
  requestDuration.add(duration);
  
  // Check response
  const result = check(response, {
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has valid content-type': (r) => r.headers['Content-Type'] && 
      (r.headers['Content-Type'].includes('application/json') || 
       r.headers['Content-Type'].includes('text/html')),
  });
  
  successRate.add(result);
  
  // Check for specific error types
  if (response.status >= 400) {
    httpErrors.add(1);
    
    // Check for connection pool exhaustion
    if (response.status === 503 || 
        (response.body && response.body.includes('pool')) ||
        (response.body && response.body.includes('timeout'))) {
      connectionPoolErrors.add(1);
      console.log(`Pool error detected: ${response.status} - ${response.body}`);
    }
  }
  
  // Variable sleep time based on load type
  const loadType = __VU.tags?.load_type || 'medium';
  switch (loadType) {
    case 'low':
      sleep(Math.random() * 2 + 1); // 1-3 seconds
      break;
    case 'medium':
      sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
      break;
    case 'high':
      sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
      break;
    case 'spike':
      sleep(Math.random() * 0.2); // 0-0.2 seconds
      break;
    default:
      sleep(1);
  }
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;
  
  let summary = `
${indent}Test Summary:
${indent}=============
${indent}Duration: ${data.state.testRunDurationMs}ms
${indent}VUs: ${data.metrics.vus.values.max}
${indent}Iterations: ${data.metrics.iterations.values.count}
${indent}
${indent}Request Metrics:
${indent}- HTTP Requests: ${data.metrics.http_reqs.values.count}
${indent}- Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}- Avg Duration: ${data.metrics.http_req_duration.values.avg}ms
${indent}- P95 Duration: ${data.metrics.http_req_duration.values['p(95)']}ms
${indent}
${indent}Custom Metrics:
${indent}- HTTP Errors: ${data.metrics.http_errors?.values.count || 0}
${indent}- Connection Pool Errors: ${data.metrics.connection_pool_errors?.values.count || 0}
${indent}- Success Rate: ${(data.metrics.success_rate?.values.rate || 0) * 100}%
  `;
  
  return summary;
}