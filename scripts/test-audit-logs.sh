#!/usr/bin/env bash
# Trigger all auditable actions and verify audit logs
set -euo pipefail

API="http://localhost:3000/api"
TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' | jq -r '.access_token')
AUTH="Authorization: Bearer $TOKEN"

api() {
  local method=$1 path=$2
  shift 2
  curl -s -X "$method" "$API$path" -H "$AUTH" -H 'Content-Type: application/json' "$@"
}

echo "=== Fetching seed data ==="
CATS=$(api GET /asset-categories)
CAT_ID=$(echo "$CATS" | jq -r '.data.assetCategories[0].id // empty')
TYPES=$(api GET "/asset-types?page=1&limit=5")
TYPE_ID=$(echo "$TYPES" | jq -r '.data.assetTypes[0].id // empty')
BRANDS=$(api GET "/brands?page=1&limit=5")
BRAND_ID=$(echo "$BRANDS" | jq -r '.data.brands[0].id // empty')
MODELS=$(api GET "/models?page=1&limit=5")
MODEL_ID=$(echo "$MODELS" | jq -r '.data.models[0].id // empty')
ASSETS=$(api GET "/assets?status=NON_ASSIGNED&page=1&limit=5")
ASSET_ID=$(echo "$ASSETS" | jq -r '.data.assets[0].id // empty')
EMPLOYEES=$(api GET "/employees?page=1&limit=10")
EMP_ID=$(echo "$EMPLOYEES" | jq -r '.data.employees[] | select(.employeeId != "9999") | .id' | head -1)

echo "CAT_ID=$CAT_ID TYPE_ID=$TYPE_ID BRAND_ID=$BRAND_ID MODEL_ID=$MODEL_ID ASSET_ID=$ASSET_ID EMP_ID=$EMP_ID"

SUFFIX=$(date +%s)
RESULTS=()

log_action() {
  local name=$1 resp=$2
  local ok err
  ok=$(echo "$resp" | jq -r '.success // .message // .id // empty' 2>/dev/null || true)
  if echo "$resp" | jq -e '.statusCode >= 400' >/dev/null 2>&1; then
    err=$(echo "$resp" | jq -r '.message // .error')
    echo "FAIL $name: $err"
    RESULTS+=("FAIL:$name:$err")
  else
    echo "OK   $name"
    RESULTS+=("OK:$name")
  fi
}

echo ""
echo "=== 1. Asset Category CREATE ==="
R=$(api POST /asset-categories -d "{\"name\":\"AuditCat$SUFFIX\",\"description\":\"audit test\"}")
log_action "asset_categories INSERT" "$R"
NEW_CAT=$(echo "$R" | jq -r '.data.assetCategory.id // .data.category.id // empty')

echo "=== 2. Asset Type CREATE ==="
R=$(api POST /asset-types -d "{\"categoryId\":$NEW_CAT,\"name\":\"AuditType$SUFFIX\",\"description\":\"audit\"}")
log_action "asset_types INSERT" "$R"
NEW_TYPE=$(echo "$R" | jq -r '.data.assetType.id // .data.id // empty')

echo "=== 3. Asset Type UPDATE ==="
R=$(api PUT "/asset-types/$NEW_TYPE" -d "{\"categoryId\":$NEW_CAT,\"name\":\"AuditTypeUpd$SUFFIX\",\"description\":\"updated\"}")
log_action "asset_types UPDATE" "$R"

echo "=== 4. Brand CREATE ==="
R=$(api POST /brands -d "{\"name\":\"AuditBrand$SUFFIX\",\"description\":\"audit\"}")
log_action "brands INSERT" "$R"
NEW_BRAND=$(echo "$R" | jq -r '.data.brand.id // .data.id // empty')

echo "=== 5. Model CREATE ==="
R=$(api POST /models -d "{\"brandId\":$NEW_BRAND,\"assetTypeId\":$NEW_TYPE,\"name\":\"AuditModel$SUFFIX\"}")
log_action "models INSERT" "$R"
NEW_MODEL=$(echo "$R" | jq -r '.data.model.id // .data.id // empty')

echo "=== 6. Employee CREATE ==="
R=$(api POST /employees -d "{\"employeeId\":\"8$(echo $SUFFIX | tail -c 4)\",\"firstName\":\"Audit\",\"lastName\":\"Tester\",\"email\":\"audit$SUFFIX@test.com\"}")
log_action "employees INSERT" "$R"
NEW_EMP=$(echo "$R" | jq -r '.data.employee.id // empty')

echo "=== 7. Employee UPDATE ==="
R=$(api PUT "/employees/$NEW_EMP" -d "{\"firstName\":\"AuditUpd\",\"lastName\":\"Tester\",\"email\":\"auditupd$SUFFIX@test.com\"}")
log_action "employees UPDATE" "$R"

echo "=== 8. Vendor CREATE ==="
R=$(api POST /vendors -d "{\"name\":\"Audit Vendor $SUFFIX\",\"vendorType\":\"SUPPLIER\",\"email\":\"vendor$SUFFIX@test.com\"}")
log_action "vendors INSERT" "$R"
NEW_VENDOR=$(echo "$R" | jq -r '.id // .data.vendor.id // .data.id // empty')

echo "=== 9. Vendor UPDATE ==="
R=$(api PUT "/vendors/$NEW_VENDOR" -d "{\"name\":\"Audit Vendor Upd $SUFFIX\",\"vendorType\":\"SUPPLIER\",\"email\":\"vendorupd$SUFFIX@test.com\"}")
log_action "vendors UPDATE" "$R"

echo "=== 10. Vendor STATUS ==="
R=$(api PATCH "/vendors/$NEW_VENDOR/status" -d '{"status":"INACTIVE"}')
log_action "vendors STATUS" "$R"

echo "=== 11. Asset CREATE ==="
R=$(api POST /assets -d "{\"assetTypeId\":$NEW_TYPE,\"brandId\":$NEW_BRAND,\"modelId\":$NEW_MODEL,\"location\":\"PUNE_INVENTORY_CENTER\",\"serialNumber\":\"SN$SUFFIX\"}")
log_action "assets INSERT" "$R"
NEW_ASSET=$(echo "$R" | jq -r '.data.asset.id // .data.id // empty')

echo "=== 12. Asset UPDATE ==="
R=$(api PUT "/assets/$NEW_ASSET" -d "{\"assetTypeId\":$NEW_TYPE,\"brandId\":$NEW_BRAND,\"modelId\":$NEW_MODEL,\"location\":\"THANE_INVENTORY_CENTER\",\"serialNumber\":\"SNUPD$SUFFIX\"}")
log_action "assets UPDATE" "$R"

echo "=== 13. Maintenance CREATE ==="
R=$(api POST /maintenance -d "{\"assetId\":$NEW_ASSET,\"maintenanceType\":\"PREVENTIVE\",\"scheduledDate\":\"2026-07-15\",\"description\":\"Audit maintenance test\"}")
log_action "maintenance INSERT" "$R"
NEW_MAINT=$(echo "$R" | jq -r '.data.maintenance.id // .data.id // .id // empty')

echo "=== 14. Maintenance UPDATE ==="
R=$(api PATCH "/maintenance/$NEW_MAINT" -d '{"description":"Updated audit maintenance"}')
log_action "maintenance UPDATE" "$R"

echo "=== 15. Maintenance COMPLETE ==="
R=$(api PUT "/maintenance/$NEW_MAINT/complete" -d '{"actualCost":"99.50","completionNotes":"Done"}')
log_action "maintenance COMPLETE" "$R"

echo "=== 16. Maintenance CREATE (for cancel) ==="
R=$(api POST /maintenance -d "{\"assetId\":$NEW_ASSET,\"maintenanceType\":\"CORRECTIVE\",\"scheduledDate\":\"2026-08-01\",\"description\":\"Cancel test\"}")
NEW_MAINT2=$(echo "$R" | jq -r '.data.maintenance.id // .data.id // .id // empty')
log_action "maintenance INSERT 2" "$R"

echo "=== 17. Maintenance CANCEL ==="
R=$(api PUT "/maintenance/$NEW_MAINT2/cancel" -d '{"cancellationReason":"Audit cancel test"}')
log_action "maintenance CANCEL" "$R"

echo "=== 18. Maintenance DELETE ==="
R=$(api DELETE "/maintenance/$NEW_MAINT2")
log_action "maintenance DELETE" "$R"

echo "=== 19. Assignment ISSUE ==="
R=$(api POST /assignments -d "{\"assetId\":$NEW_ASSET,\"employeeId\":$NEW_EMP,\"issueDate\":\"2026-07-07\",\"issueReason\":\"Audit test\"}")
log_action "asset_issues INSERT" "$R"
NEW_ASSIGN=$(echo "$R" | jq -r '.data.assignment.id // .data.id // empty')

echo "=== 20. Assignment COLLECT ==="
R=$(api PUT "/assignments/$NEW_ASSIGN/return" -d '{"returnDate":"2026-07-07","returnCondition":"WORKING_CONDITION","collectionNotes":"Audit collect"}')
log_action "asset_issues UPDATE" "$R"

echo "=== 21. Asset RETIRE ==="
R=$(api PUT "/assets/$NEW_ASSET/retire" -d '{"retirementReason":"Audit retire test"}')
log_action "assets RETIRE" "$R"

echo "=== 22. Asset REACTIVATE ==="
R=$(api PUT "/assets/$NEW_ASSET/reactivate" -d '{"reactivationReason":"Audit reactivate test"}')
log_action "assets REACTIVATE" "$R"

echo "=== 23. Admin CREATE ==="
R=$(api POST /admin/users -d "{\"employeeId\":$NEW_EMP,\"username\":\"audadmin$SUFFIX\",\"password\":\"Test@123\"}")
log_action "users INSERT" "$R"
NEW_ADMIN=$(echo "$R" | jq -r '.data.user.id // .data.id // empty')

echo "=== 24. Admin STATUS ==="
R=$(api PATCH "/admin/users/$NEW_ADMIN/status" -d '{"isActive":false}')
log_action "users STATUS" "$R"

echo "=== 25. Admin DELETE ==="
R=$(api DELETE "/admin/users/$NEW_ADMIN")
log_action "users DELETE" "$R"

echo "=== 26. Asset DELETE ==="
R=$(api DELETE "/assets/$NEW_ASSET")
log_action "assets DELETE" "$R"

echo "=== 27. Vendor DELETE ==="
R=$(api DELETE "/vendors/$NEW_VENDOR")
log_action "vendors DELETE" "$R"

echo "=== 28. Employee DELETE ==="
R=$(api DELETE "/employees/$NEW_EMP")
log_action "employees DELETE" "$R"

echo "=== 29. Model DELETE ==="
R=$(api DELETE "/models/$NEW_MODEL")
log_action "models DELETE" "$R"

echo "=== 30. Brand DELETE ==="
R=$(api DELETE "/brands/$NEW_BRAND")
log_action "brands DELETE" "$R"

echo "=== 31. Asset Type DELETE ==="
R=$(api DELETE "/asset-types/$NEW_TYPE")
log_action "asset_types DELETE" "$R"

echo "=== 32. Asset Category DELETE ==="
R=$(api DELETE "/asset-categories/$NEW_CAT")
log_action "asset_categories DELETE" "$R"

echo ""
echo "=== Action results ==="
for r in "${RESULTS[@]}"; do echo "$r"; done

echo ""
echo "=== Audit logs summary ==="
LOGS=$(api GET "/audit-logs?page=1&limit=100")
echo "$LOGS" | jq '{
  total: .data.pagination.total,
  byTable: [.data.logs[] | .tableName] | group_by(.) | map({table: .[0], count: length}),
  byAction: [.data.logs[] | .action] | group_by(.) | map({action: .[0], count: length})
}'

echo ""
echo "=== Recent audit logs ==="
echo "$LOGS" | jq -r '.data.logs[:40][] | "\(.action)\t\(.tableName)\t\(.summary)\t\(.performedBy // .username // "admin")"'
