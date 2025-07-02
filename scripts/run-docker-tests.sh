#!/bin/bash

# Run K6 load tests against Docker scenarios
set -e

echo "🚀 Running Prisma Pool Load Tests on Docker Scenarios"
echo "======================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ K6 is not installed. Installing via npm...${NC}"
    npm install -g k6
fi

# Test scenario configuration
declare -A scenarios=(
    ["Scenario-A-Default"]="http://localhost:3001"
    ["Scenario-B-High-Pool"]="http://localhost:3004"
    ["Scenario-C-Low-Timeout"]="http://localhost:3007"
    ["Scenario-D-Aggressive"]="http://localhost:3010"
)

echo -e "${BLUE}🔍 Testing scenarios:${NC}"
for scenario in "${!scenarios[@]}"; do
    echo "   - $scenario: ${scenarios[$scenario]}"
done
echo ""

# Create results directory
mkdir -p test-results
rm -rf test-results/*

# Run tests for each scenario
for scenario in "${!scenarios[@]}"; do
    url=${scenarios[$scenario]}
    
    echo -e "${YELLOW}🎯 Testing $scenario${NC}"
    echo "Target: $url"
    
    # Quick health check
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $scenario is healthy${NC}"
        
        # Run K6 load test
        echo -e "${BLUE}🧪 Running load test...${NC}"
        
        k6 run \
            --vus 25 \
            --duration 2m \
            --env TARGET_URL="$url" \
            --env SCENARIO_NAME="$scenario" \
            --out json="test-results/${scenario}-results.json" \
            scripts/simple-load-test.js
            
        echo -e "${GREEN}✅ Test completed for $scenario${NC}"
        echo ""
        
        # Wait between tests
        echo -e "${YELLOW}⏳ Waiting 30 seconds before next test...${NC}"
        sleep 30
    else
        echo -e "${RED}❌ $scenario is not responding, skipping...${NC}"
        echo ""
    fi
done

echo -e "${GREEN}🎉 All tests completed!${NC}"
echo -e "${BLUE}📊 Results saved in test-results/ directory${NC}"
echo ""
echo -e "${YELLOW}📈 Summary of tests:${NC}"
for scenario in "${!scenarios[@]}"; do
    if [ -f "test-results/${scenario}-results.json" ]; then
        echo -e "${GREEN}✅ $scenario - Test completed${NC}"
    else
        echo -e "${RED}❌ $scenario - Test failed or skipped${NC}"
    fi
done