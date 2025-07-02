import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const httpErrors = new Counter('http_errors');
const connectionPoolErrors = new Counter('connection_pool_errors');
const combatActions = new Counter('combat_actions');
const successfulCombats = new Counter('successful_combats');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm-up
    { duration: '1m', target: 25 },   // Normal load
    { duration: '1m', target: 50 },   // High load
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.2'],     // Error rate should be less than 20%
    connection_pool_errors: ['count<10'], // Less than 10 pool errors total
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

// Cache for heroes and enemies
let heroes = [];
let enemies = [];

export function setup() {
  // Load heroes and enemies data once
  console.log('Loading heroes and enemies data...');
  
  const heroesResponse = http.get(`${BASE_URL}/heroes`);
  const enemiesResponse = http.get(`${BASE_URL}/enemies`);
  
  if (heroesResponse.status === 200) {
    heroes = JSON.parse(heroesResponse.body);
    console.log(`Loaded ${heroes.length} heroes`);
  }
  
  if (enemiesResponse.status === 200) {
    enemies = JSON.parse(enemiesResponse.body);
    console.log(`Loaded ${enemies.length} enemies`);
  }
  
  return { heroes, enemies };
}

export default function (data) {
  const { heroes, enemies } = data;
  
  if (heroes.length === 0 || enemies.length === 0) {
    console.log('No heroes or enemies available, skipping iteration');
    sleep(1);
    return;
  }
  
  // Test different endpoints with weighted distribution
  const testType = Math.random();
  
  let response;
  let endpointType = '';
  
  if (testType < 0.1) {
    // 10% - Health check (lightweight)
    endpointType = 'health';
    response = http.get(`${BASE_URL}/`, {
      tags: { endpoint: 'health' },
    });
  } else if (testType < 0.3) {
    // 20% - Get heroes (read operation)
    endpointType = 'heroes';
    response = http.get(`${BASE_URL}/heroes`, {
      tags: { endpoint: 'heroes' },
    });
  } else if (testType < 0.5) {
    // 20% - Get enemies (read operation)
    endpointType = 'enemies';
    response = http.get(`${BASE_URL}/enemies`, {
      tags: { endpoint: 'enemies' },
    });
  } else {
    // 50% - Combat action (most resource intensive)
    endpointType = 'combat';
    const hero = heroes[Math.floor(Math.random() * heroes.length)];
    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    
    // Always attempt combat - let the API handle "already killed" scenarios
    response = http.put(`${BASE_URL}/combat/heroes/${hero.id}/kill/${targetEnemy.enemyType}/${targetEnemy.id}`, 
      '', 
      {
        tags: { endpoint: 'combat' },
      }
    );
    
    combatActions.add(1);
  }
  
  // Check response
  const result = check(response, {
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'has response body': (r) => r.body && r.body.length > 0,
  });
  
  // Track success for combat actions
  if (endpointType === 'combat' && response.status >= 200 && response.status < 300) {
    successfulCombats.add(1);
  }
  
  // Track errors
  if (response.status >= 400) {
    httpErrors.add(1);
    
    // Check for specific error patterns
    const body = response.body ? response.body.toLowerCase() : '';
    if (response.status === 503 || 
        body.includes('pool') ||
        body.includes('timeout') ||
        body.includes('connection') ||
        body.includes('exhausted')) {
      connectionPoolErrors.add(1);
      console.log(`Pool-related error detected: ${response.status} - ${response.body}`);
    }
    
    if (body.includes('already been killed') || body.includes('not found')) {
      // This is expected - enemy was already killed or not found
      // Don't log these as they're normal in concurrent testing
    } else if (endpointType === 'combat') {
      // Only log non-expected combat errors
      console.log(`Combat error: ${response.status} - ${response.body}`);
    }
  }
  
  // Variable sleep based on endpoint type
  switch (endpointType) {
    case 'health':
      sleep(0.1); // Very fast
      break;
    case 'heroes':
    case 'enemies':
      sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
      break;
    case 'combat':
      sleep(Math.random() * 1 + 0.2); // 0.2-1.2 seconds
      break;
    default:
      sleep(0.5);
  }
}

export function handleSummary(data) {
  const scenarioName = __ENV.SCENARIO_NAME || 'default';
  
  // Calculate custom metrics
  const totalRequests = data.metrics.http_reqs?.values.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values.count || 0;
  const avgDuration = data.metrics.http_req_duration?.values.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const totalCombats = data.metrics.combat_actions?.values.count || 0;
  const successfulCombats = data.metrics.successful_combats?.values.count || 0;
  const poolErrors = data.metrics.connection_pool_errors?.values.count || 0;
  
  const summary = {
    scenario: scenarioName,
    target_url: __ENV.TARGET_URL || 'http://localhost:3000',
    timestamp: new Date().toISOString(),
    duration_ms: data.state.testRunDurationMs,
    metrics: {
      total_requests: totalRequests,
      failed_requests: failedRequests,
      error_rate: failedRequests / totalRequests * 100,
      avg_response_time_ms: avgDuration,
      p95_response_time_ms: p95Duration,
      total_combat_actions: totalCombats,
      successful_combats: successfulCombats,
      combat_success_rate: totalCombats > 0 ? (successfulCombats / totalCombats * 100) : 0,
      connection_pool_errors: poolErrors,
      requests_per_second: totalRequests / (data.state.testRunDurationMs / 1000),
    },
    thresholds_passed: {
      response_time: p95Duration < 1000,
      error_rate: (failedRequests / totalRequests) < 0.2,
      pool_errors: poolErrors < 10,
    }
  };
  
  return {
    'summary.json': JSON.stringify(summary, null, 2),
    stdout: `
🎯 Load Test Results for ${scenarioName}
==========================================
Target: ${__ENV.TARGET_URL || 'http://localhost:3000'}
Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s
Max VUs: ${data.metrics.vus?.values.max || 0}

📊 Request Metrics:
- Total Requests: ${totalRequests}
- Failed Requests: ${failedRequests} (${(failedRequests / totalRequests * 100).toFixed(2)}%)
- Requests/sec: ${(totalRequests / (data.state.testRunDurationMs / 1000)).toFixed(2)}
- Avg Response Time: ${avgDuration.toFixed(2)}ms
- P95 Response Time: ${p95Duration.toFixed(2)}ms

⚔️  Combat Metrics:
- Total Combat Actions: ${totalCombats}
- Successful Combats: ${successfulCombats}
- Combat Success Rate: ${totalCombats > 0 ? (successfulCombats / totalCombats * 100).toFixed(2) : 0}%
- Combat Failures: ${totalCombats - successfulCombats} (likely already killed)

🔗 Connection Pool:
- Pool Errors: ${poolErrors}
- Pool Health: ${poolErrors < 10 ? '✅ Good' : '⚠️  Issues detected'}

🎯 Thresholds:
- Response Time (P95 < 1000ms): ${p95Duration < 1000 ? '✅ Pass' : '❌ Fail'}
- Error Rate (< 20%): ${(failedRequests / totalRequests) < 0.2 ? '✅ Pass' : '❌ Fail'}
- Pool Errors (< 10): ${poolErrors < 10 ? '✅ Pass' : '❌ Fail'}

`,
  };
}