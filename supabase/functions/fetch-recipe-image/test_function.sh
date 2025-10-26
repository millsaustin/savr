#!/bin/bash
# Test script for fetch-recipe-image Edge Function

# Configuration
FUNCTION_URL="${FUNCTION_URL:-http://localhost:54321/functions/v1/fetch-recipe-image}"
AUTH_TOKEN="${SUPABASE_SERVICE_ROLE_KEY:-your-local-service-role-key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Testing fetch-recipe-image Function"
echo "=================================="
echo "URL: $FUNCTION_URL"
echo "=================================="
echo ""

# Test 1: Valid request
echo -e "${YELLOW}Test 1: Valid request${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Garlic Chicken with Broccoli",
    "tags": ["chicken", "garlic", "broccoli", "dinner", "high-protein"],
    "category": "high-protein",
    "cuisine": "Mediterranean"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test passed${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Missing recipeId
echo -e "${YELLOW}Test 2: Missing recipeId (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pasta Carbonara",
    "tags": ["pasta", "italian"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Test passed (correctly rejected)${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (expected 400, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Invalid UUID format
echo -e "${YELLOW}Test 3: Invalid UUID format (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "not-a-uuid",
    "name": "Test Recipe",
    "tags": ["test"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Test passed (correctly rejected)${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (expected 400, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Missing tags
echo -e "${YELLOW}Test 4: Missing tags (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Test Recipe"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Test passed (correctly rejected)${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (expected 400, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 5: OPTIONS request (CORS preflight)
echo -e "${YELLOW}Test 5: OPTIONS request (CORS preflight)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$FUNCTION_URL")

if [ "$HTTP_CODE" = "204" ]; then
  echo -e "${GREEN}✓ Test passed${NC}"
else
  echo -e "${RED}✗ Test failed (expected 204, got $HTTP_CODE)${NC}"
fi
echo ""

# Test 6: GET request (should fail)
echo -e "${YELLOW}Test 6: GET request (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "405" ]; then
  echo -e "${GREEN}✓ Test passed (correctly rejected)${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (expected 405, got $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

# Test 7: Minimal valid request
echo -e "${YELLOW}Test 7: Minimal valid request (no category/cuisine)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "789e4567-e89b-12d3-a456-426614174999",
    "name": "Simple Salad",
    "tags": ["salad", "vegetarian"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Test passed${NC}"
  echo "Response: $BODY" | jq '.'
else
  echo -e "${RED}✗ Test failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
fi
echo ""

echo "=================================="
echo "Tests complete!"
echo "=================================="
