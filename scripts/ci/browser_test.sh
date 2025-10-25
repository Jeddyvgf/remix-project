#!/usr/bin/env bash

set -e



BUILD_ID=${CIRCLE_BUILD_NUM:-local}
echo "$BUILD_ID"
TEST_EXITCODE=0
npx ganache > /dev/null 2>&1 &
npx http-server -p 9090 --cors='*' ./node_modules > /dev/null 2>&1 &
yarn run serve:production > /dev/null 2>&1 &
sleep 5

PARALLEL_TOTAL=${CIRCLE_NODE_TOTAL:-1}
PARALLEL_INDEX=${CIRCLE_NODE_INDEX:-0}
SELF_SPLIT=${SELF_SPLIT:-0}
TIMINGS_JSON=${TIMINGS_JSON:-timings-current.json}
E2E_RETRIES=${E2E_RETRIES:-0} # number of retries on failure per test (0 = no retry)

# Build the list of enabled test files
BASE_FILES=$(find dist/apps/remix-ide-e2e/src/tests -type f \( -name "*.test.js" -o -name "*.spec.js" \) -print0 \
  | xargs -0 grep -IL "@disabled" \
  | xargs -I {} basename {} \
  | sed 's/\.js$//' \
  | grep -v 'metamask')

if [ "$SELF_SPLIT" = "1" ]; then
  echo "==> Using self shard planner (shards=$PARALLEL_TOTAL index=$PARALLEL_INDEX)"
  echo "ENV: CIRCLE_BRANCH=${CIRCLE_BRANCH:-local} CIRCLE_NODE_TOTAL=$PARALLEL_TOTAL CIRCLE_NODE_INDEX=$PARALLEL_INDEX E2E_RETRIES=$E2E_RETRIES"
  mkdir -p reports/shards
  TESTFILES=$(printf '%s\n' "$BASE_FILES" | node scripts/plan-shards.js --shards "$PARALLEL_TOTAL" --index "$PARALLEL_INDEX" --timings "$TIMINGS_JSON" --verbose --manifest-out reports/shards/manifest-$PARALLEL_INDEX.json)
else
  echo "==> Using CircleCI timings split"
  mkdir -p reports/shards
  TESTFILES=$(printf '%s\n' "$BASE_FILES" | circleci tests split --split-by=timings)
fi

printf '%s\n' "$TESTFILES" > reports/shards/files-$PARALLEL_INDEX.txt
COUNT=$(printf '%s\n' "$TESTFILES" | wc -l | awk '{print $1}')
echo "==> Shard $PARALLEL_INDEX selected $COUNT test files"
echo "==> Preview (first 20):"
printf '%s\n' "$TESTFILES" | head -n 20
echo "==> Preview (last 10):"
printf '%s\n' "$TESTFILES" | tail -n 10
echo "==> Full list (for grepability):"
printf '%s\n' "$TESTFILES"

# If this batch includes remixd (slither) tests, prepare pip3/slither toolchain on-demand
printf '%s\n' "$TESTFILES" | ./apps/remix-ide/ci/setup_slither_if_needed.sh
for TESTFILE in $TESTFILES; do
    echo "Running test: ${TESTFILE}.js (retries on fail: $E2E_RETRIES)"
    attempt=0
    while true; do
      if npx nightwatch --config dist/apps/remix-ide-e2e/nightwatch-${1}.js dist/apps/remix-ide-e2e/src/tests/${TESTFILE}.js --env=$1; then
        # success
        break
      fi
      # failure
      if [ "$attempt" -lt "$E2E_RETRIES" ]; then
        attempt=$((attempt+1))
        echo "Retrying ${TESTFILE}.js (attempt $attempt of $E2E_RETRIES)"
        continue
      else
        TEST_EXITCODE=1
        break
      fi
    done
    # Stop the shard loop on permanent failure
    if [ "$TEST_EXITCODE" -eq 1 ]; then
      break
    fi
done

echo "$TEST_EXITCODE"
# Fail the test early and cancel the workflow
if [ "$TEST_EXITCODE" -eq 1 ]; then
  echo "❌ Test failed. Attempting to cancel the workflow..."
  curl -s -X POST \
    -H "Authorization: Basic $FAIL_FAST_TOKEN" \
    -H "Content-Type: application/json" \
    "https://circleci.com/api/v2/workflow/${CIRCLE_WORKFLOW_ID}/cancel"
  exit 1
fi
