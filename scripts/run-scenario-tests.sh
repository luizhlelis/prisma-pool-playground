#!/bin/bash

# Prisma Pool Testing Scenarios
# This script runs K6 load tests against different Prisma connection pool configurations

set -e

echo "🚀 Starting Prisma Connection Pool Testing Scenarios"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ K6 is not installed. Please install it first.${NC}"
    echo "Installation: https://grafana.com/docs/k6/latest/set-up/install-k6/"
    exit 1
fi

# Check if application is running
check_app_health() {
    local url=$1
    local scenario_name=$2
    
    echo -e "${BLUE}🔍 Checking health of $scenario_name at $url${NC}"
    
    if curl -sf "$url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $scenario_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ $scenario_name is not responding${NC}"
        return 1
    fi
}

# Run K6 test for a scenario
run_k6_test() {
    local target_url=$1
    local scenario_name=$2
    local test_duration=$3
    local virtual_users=$4
    
    echo -e "${YELLOW}🧪 Running test for $scenario_name${NC}"
    echo "   Target: $target_url"
    echo "   Duration: $test_duration"
    echo "   Virtual Users: $virtual_users"
    
    # Create results directory
    mkdir -p "test-results/$scenario_name"
    
    # Run K6 test
    k6 run \
        --vus $virtual_users \
        --duration $test_duration \
        --env TARGET_URL=$target_url \
        --env SCENARIO_NAME=$scenario_name \
        --out json="test-results/$scenario_name/results.json" \
        src/scripts/k6-load-test.js
    
    echo -e "${GREEN}✅ Test completed for $scenario_name${NC}"
    echo ""
}

# Test scenarios configuration
declare -A scenarios=(
    ["Local-App"]="http://localhost:3000"
    ["Scenario-A"]="http://localhost:3001"
    ["Scenario-B"]="http://localhost:3004"
    ["Scenario-C"]="http://localhost:3007"
    ["Scenario-D"]="http://localhost:3010"
    ["Scenario-E-PgBouncer-Transaction"]="http://localhost:3013"
    ["Scenario-F-PgBouncer-Session"]="http://localhost:3016"
    ["Scenario-G-PgBouncer-Statement"]="http://localhost:3019"
    ["Scenario-H-Mixed"]="http://localhost:3022"
)

# Create results directory
rm -rf test-results
mkdir -p test-results

echo -e "${BLUE}📋 Testing scenarios:${NC}"
for scenario in "${!scenarios[@]}"; do
    echo "   - $scenario: ${scenarios[$scenario]}"
done
echo ""

# Check which scenarios are available
available_scenarios=()
for scenario in "${!scenarios[@]}"; do
    url=${scenarios[$scenario]}
    if check_app_health "$url" "$scenario"; then
        available_scenarios+=("$scenario")
    fi
done

echo ""
echo -e "${BLUE}📊 Available scenarios for testing: ${#available_scenarios[@]}${NC}"

if [ ${#available_scenarios[@]} -eq 0 ]; then
    echo -e "${RED}❌ No scenarios are available for testing. Please start the applications first.${NC}"
    echo ""
    echo "To start scenarios:"
    echo "  1. For local testing: npm run start:dev"
    echo "  2. For Docker scenarios: docker compose up -d"
    echo ""
    exit 1
fi

# Run tests for available scenarios
for scenario in "${available_scenarios[@]}"; do
    url=${scenarios[$scenario]}
    
    echo -e "${YELLOW}🎯 Testing $scenario${NC}"
    echo "=================================================="
    
    # Test with increasing load
    echo -e "${BLUE}Phase 1: Warm-up (10 VUs, 30s)${NC}"
    run_k6_test "$url" "$scenario-warmup" "30s" "10"
    
    echo -e "${BLUE}Phase 2: Normal Load (25 VUs, 60s)${NC}"
    run_k6_test "$url" "$scenario-normal" "60s" "25"
    
    echo -e "${BLUE}Phase 3: High Load (50 VUs, 90s)${NC}"
    run_k6_test "$url" "$scenario-high" "90s" "50"
    
    echo -e "${BLUE}Phase 4: Stress Test (100 VUs, 60s)${NC}"
    run_k6_test "$url" "$scenario-stress" "60s" "100"
    
    echo -e "${GREEN}✅ Completed all phases for $scenario${NC}"
    echo ""
    
    # Wait between scenarios to let the database recover
    echo -e "${YELLOW}⏳ Waiting 30 seconds before next scenario...${NC}"
    sleep 30
done

# Generate summary report
echo -e "${BLUE}📈 Generating summary report...${NC}"

cat > test-results/summary.md << EOF
# Prisma Connection Pool Testing Results

## Test Summary

Generated on: $(date)

## Scenarios Tested

$(for scenario in "${available_scenarios[@]}"; do
    echo "- **$scenario**: ${scenarios[$scenario]}"
done)

## Test Configuration

Each scenario was tested with the following phases:
1. **Warm-up**: 10 VUs for 30 seconds
2. **Normal Load**: 25 VUs for 60 seconds  
3. **High Load**: 50 VUs for 90 seconds
4. **Stress Test**: 100 VUs for 60 seconds

## Results Location

Individual test results are available in:
\`\`\`
test-results/[scenario-name]/results.json
\`\`\`

## Key Metrics to Analyze

- **HTTP Request Duration**: Response times under different loads
- **Connection Pool Errors**: Pool exhaustion incidents
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests

## Next Steps

1. Import results into Grafana dashboards
2. Analyze connection pool behavior patterns
3. Compare direct vs PgBouncer performance
4. Identify optimal pool configurations
EOF

echo -e "${GREEN}✅ Testing completed successfully!${NC}"
echo -e "${BLUE}📊 Results summary: test-results/summary.md${NC}"
echo -e "${BLUE}📁 Detailed results: test-results/ directory${NC}"
echo ""
echo -e "${YELLOW}💡 Next: Import results into Grafana for visual analysis${NC}"