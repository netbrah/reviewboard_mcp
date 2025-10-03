---
mode: 'agent'
model: 'Claude Sonnet 4.5 (Preview)'
tools: ['runCommands', 'runTasks', 'edit', 'search', 'usages', 'think', 'changes', 'jira_oss']
description: 'Analyze defects and suggest comprehensive functional tests for SMF-based security code'
---

# Defect Analysis and Functional Test Suggestions

**Jira Ticket**: ${input:jira_url:placeholder}
**Dif File**: ${input:diff_file:placeholder2}

You are analyzing a defect in an SMF (Simple Management Framework) based codebase that implements security key management for NetApp ONTAP.

## Your Task

Analyze the provided Jira ticket (make sure to get all attachments and comments with jira_oss) and code changes to generate comprehensive functional test suggestions that validate the fix.

### Analysis Steps

1. **Understand the defect** by examining:
   - Jira description, comments, and reproduction steps
   - Changed files from the diff (`.cc`, `.smf`, `.ut` files)
   - Related SMF table definitions and their REST API mappings
   - Integration points with external systems (KMIP, cryptomod, RDB)

2. **Identify impacted code paths**:
   - Which SMF iterator methods changed (`*_imp()` functions)
   - Which table operations are affected (create, modify, remove, get, next)
   - Scope: cluster-wide, node-local, or SVM-scoped
   - REST API endpoints that expose these operations

3. **Trace function usage and dependencies**:
   - Find where modified functions are called
   - Identify dependent tables and iterators
   - Check for distributed/RDB callback handlers
   - Look for error handling and logging changes

4. **Generate test scenarios** covering:
   - Primary fix validation (directly exercises the bug)
   - Regression tests (existing functionality still works)
   - Integration tests (interactions with related features)
   - Error paths and edge cases
   - Cluster/distributed scenarios if applicable

## Context to Search For

When analyzing the defect, systematically search the codebase for the following context:

### 0. Parameter and Type Resolution for CLI/REST Commands

**Critical Requirement:**
For any CLI or REST API command example, always extract parameters and their types from:
   - The relevant help XML file (`src/tables/help_xml/.../*.xml`)
   - The SMF table file (`src/tables/.../*.smf`), especially the `fields` and `command` directives
   - If a field type is an enum or custom type, reference its `.smf` definition to enumerate all valid values and descriptions

**Process:**
   1. Locate the help XML file for the CLI command and list all parameters and their descriptions
   2. Cross-reference with the SMF file to confirm parameter names, types, and attributes
   3. For each parameter with a custom or enum type, reference its type definition and enumerate possible values
   4. Use only these sources for building command examples and test steps; do not hallucinate or guess parameters

**Example:**
   - If the SMF file defines a field `state` of type `keymanager_server_status`, reference `keymanager_server_status.smf` to list valid values (`available`, `not-responding`, `unknown`)

This process must be followed for all test suggestions, defect analysis, and Copilot prompt workflows to ensure accuracy and traceability.

### 1. Changed Files Analysis
From the diff, identify modified files and extract:
- **File paths**: `src/tables/${changed_file}.cc`, `src/tables/${changed_file}.smf`
- **Modified functions**: Extract function names from diff hunks
- **Class names**: Iterator classes (e.g., `${table_name}_iterator`)
- **Field changes**: New/modified fields in `.smf` files

### 2. SMF Table Context
For each changed table:
- **Implementation**: `src/tables/${table_name}.cc` - iterator logic
- **Schema**: `src/tables/${table_name}.smf` - field definitions, attributes, CLI command
- **Unit tests**: `src/tests/tables/${table_name}.ut` - existing test patterns
- **Generated code**: References to `${table_name}.smdb.h` (generated base class)

### 3. Function Usage Tracing
For each modified function (e.g., `create_imp`, `validate_config`, custom methods):
- Search for direct calls: `#sym:${function_name}`
- Find usages: Look for `${function_name}(` in `.cc` files
- Trace nested calls: Who calls the callers?
- Check test coverage: Search in `.ut` files
- Identify callers: Trace back to REST API or CLI entry points (defined *.smf)

### 4. CLI Command Discovery via Help XML Files

**Critical Resource**: The `src/tables/help_xml/` directory contains XML files that map directly to CLI commands and provide complete testing information.

**Structure Mapping**:
```
help_xml/security/key-manager/external/enable.xml
         ↓ (folder path = CLI command structure)
CLI: security key-manager external enable
         ↓ (XML comments reference)
SMF: src/tables/external/keymanager_external.smf
         ↓ (defines table)
Table: keymanager_external
         ↓ (implements in)
Code: keymanager_external.cc → keymanager_external_iterator::enable_imp()
```

**What Help XML Files Contain**:
1. **SMF File Reference**: `<!-- smf file: src/tables/external/keymanager_external.smf -->`
2. **Table Name**: `<!-- table name: keymanager_external -->`
3. **Command Syntax**: Full CLI command with all parameters
4. **Parameter Descriptions**: What each parameter does
5. **Prerequisites**: When command can/cannot be used (in `<description>`)
6. **Examples**: Real command syntax with actual values
7. **Expected Output**: What the command returns

**How to Use for Testing**:

**Step 1: Find Commands for Changed Table**
```bash
# If changed file is keymanager_external.cc
# Search for help XML files referencing that table:
grep -r "table name: keymanager_external" src/tables/help_xml/

# Or search by folder structure if you know the command area:
ls src/tables/help_xml/security/key-manager/external/
```

**Step 2: Extract Test Information from XML**
```xml
<command>
    <name>security key-manager external enable</name>  <!-- CLI command -->
    <description>Prerequisites and behavior</description>
    <parameters>
        <parameter>
            <name>vserver</name>  <!-- Required parameter -->
            <description>...</description>
        </parameter>
    </parameters>
    <example>
        <screen>
cluster-1::> security key-manager external enable -vserver cluster-1 -key-servers ...
        </screen>  <!-- Copy this for test steps -->
    </example>
</command>
```

**Step 3: Build Test Steps from Help XML**
- **Setup**: Extract prerequisites from `<description>`
- **Command**: Copy syntax from `<example>` section
- **Parameters**: Use `<parameters>` to create test variations
- **Verification**: Use expected behavior from `<description>`

**Example Usage**:
```markdown
# For testing keymanager_external_iterator::enable_imp()

1. Find help file:
   src/tables/help_xml/security/key-manager/external/enable.xml

2. Extract test command:
   security key-manager external enable -vserver <vs> -key-servers <ks:port> ...

3. Extract prerequisites:
   "Not supported when key manager already enabled"
   "Must run on both clusters for admin Vserver"

4. Build test:
   Setup: Ensure no key manager currently enabled
   Execute: security key-manager external enable ...
   Verify: Key manager is enabled, keys are accessible
```

### 5. REST API Mapping
Trace from SMF table to REST endpoint:
- **API paths**:
   **swagger/src/specs/api/paths/key_manager.yaml
   **swagger/src/specs/api/paths/gcp_kms.yaml
   **swagger/src/specs/api/paths/aws_kms.yaml
   **swagger/src/specs/api/paths/azure_key_vault.yaml
   **swagger/src/specs/api/paths/ikp_kms.yaml
   **swagger/src/specs/api/paths/key_store.yaml

- **Definitions**:
    **swagger/src/specs/api/definitions/key_manager.yaml
    **swagger/src/specs/api/definitions/key_store.yaml
    **swagger/src/specs/api/definitions/gcp_kms.yaml
    **swagger/src/specs/api/definitions/aws_kms.yaml
    **swagger/src/specs/api/definitions/azure_key_vault.yaml
    **swagger/src/specs/api/definitions/ikp_kms.yaml

- **Operation IDs**: Map `operationId` to table methods

### 5. Integration Points
Identify external dependencies:
- **KMIP**: References to `kmip_*` tables, `Keyserver` class
- **Cryptomod**: Calls to `cryptomod_*_iterator` classes
- **RDB**: Files named `*_rdb_callbackHandler.cc` or `*_rdb.smf`
- **Certificates**: References to `cert_mgwd` tables
- **Volume encryption**: Calls to `vvolEncryptionTable`, `mdvdb`

### 6. Error Handling & Logging
Look for changes in:
- **Error returns**: `smdb_error::*` enum values
- **Logging**: `traceError()`, `traceInfo()`, `traceDebug()` calls
- **Message catalogs**: References to `keymanager_messages.h`
- **EMS events**: Files in `src/ems/*.ems`

### 7. Distributed Operations
For cluster-wide changes:
- **Distribution keys**: Tables with `dist_keys` directive in `.smf`
- **Parallel execution**: References to `smdb_parallel_executor`
- **RDB callbacks**: `*_rdb_callbackHandler` implementations
- **Node iteration**: Loops over cluster nodes
- **MetroCluster**: References to `metroclusterIf`, partner cluster operations

### 8. Cross-Component Analysis

If the changed file is NOT in the current workspace, follow this strategy:

**Step 1: Identify the component**
- Is the file in `kmip2/`, `cryptomod/`, `cert_mgwd/`, or another component?
- Example: `kmip2/src/import_keys.cc` is in the KMIP client library

**Step 2: Find integration points in workspace**
- Search for includes or references to the external component:
  ```markdown
  "Search for #include.*kmip OR calls to kmip functions"
  "Find references to Keyserver OR kmip_keytable"
  ```
- Look for SMF tables that configure or interact with that component:
  ```markdown
  "Show me keymanager_keystore.smf"  # Configures KMIP servers
  "Find keymanager_config table"      # Global key manager settings
  ```

**Step 3: Understand the feature domain**
- What feature area does this belong to? (key restoration, aggregate encryption, certificate management, etc.)
- Search for key type definitions if encryption-related:
  ```markdown
  "Find KmipCustomAttributesConst definitions"
  "Search for NAE OR NVE OR NSE key usage"
  ```

**Step 4: Map to end-user operations**
- What CLI/REST API operations exercise the changed code?
- Search swagger/ for REST endpoints:
  ```markdown
  "Search for operationId.*key.manager in swagger/"
  "Find POST /api/security/key-managers endpoint"
  ```

**Step 5: Focus test plan on integration**
- Don't try to unit test code from another component
- Instead, test end-to-end operations that exercise the integration:
  - Configure key manager → Create encrypted resources → Verify functionality
  - Focus on user-visible behavior, not internal implementation

**Step 6: Note the limitation**
- In your analysis, explicitly state:
  > "Changed file `kmip2/src/import_keys.cc` is not in current workspace (`keymanager_mgwd`). Analysis based on integration points and REST API behavior."

**Step 7: Search for related domain knowledge**
- If the change involves unfamiliar concepts (optimized boot, key types, etc.):
  ```markdown
  "Search for bootarg.kmip2_client OR optimized boot"
  "Find aggregate encrypt OR NAE key usage"
  ```

### When Changed Files Are Outside Workspace

When the diff includes files from components outside `keymanager_mgwd/` (e.g., `kmip2/`, `cryptomod/`, `cert_mgmt/`):

1. **Identify all changed files** and their components
   - Note which are in workspace vs. external components
   - Example: `kmip2/src/kmipCmds/KmipLocateCmdUtils.cc` is in the KMIP client library

2. **Search for bootargs** in changed files:
   - Look for `KenvUtils::isKenvTrue("bootarg.*")` - runtime configuration checks
   - Search for `FIJI_*` fault injection macros - testing/debugging hooks
   - These bootargs are often needed to exercise new code paths in tests
   - Example pattern: `if (KenvUtils::isKenvTrue("bootarg.component.feature.behavior"))`

3. **Find constants used in loops**:
   - When seeing iterations like `for (... < SomeConstant::getValue())`, search for that function
   - The constant value determines test validation (e.g., "verify N iterations occurred")
   - Example: `getNumVekHashBuckets()` returns 70 → test should verify 70 operations

4. **Search workspace for integration points**:
   - Find CLI commands that call changed functions (check `.smf` files)
   - Locate SMF tables that use changed components (check includes in `.cc` files)
   - Focus testing on user-visible operations, not internal component details

## Extracting Testable Details from Diff

Before generating tests, extract specific, verifiable details from the code changes:

### 1. Find New Bootargs
**Purpose**: Bootargs enable testing of specific code paths and error conditions.

**Search for**:
- `KenvUtils::isKenvTrue("bootarg.*")` in diff hunks
- `FIJI_FIRED(fh_*)` or `FaultHandle fh_*` declarations
- Note: These are runtime flags that alter behavior for testing

**Example patterns**:
```cpp
// Runtime bootarg check (example from typical code)
if (KenvUtils::isKenvTrue("bootarg.component.feature.disable")) {
    throw NotSupportedException("Feature disabled for testing");
}

// Fault injection point (example)
if (FIJI_FIRED(fh_forceErrorPath)) {
    return smdb_error::InternalError;
}
```

**In your test specification**: Document which bootargs are needed and why
```markdown
**Setup**: Enable bootarg to force fallback: `bootarg.component.feature.disable=true`
```

### 2. Extract Exact Log Messages
**Purpose**: Tests verify correct code paths by checking for specific log output.

**Extract verbatim** from diff:
- `traceLog("...")` - informational logs
- `traceDebug("...")` - detailed debug information
- `traceError("...")` - error conditions
- `traceInfo("...")`, `traceWarning("...")` - other log levels

**In your test specification**: Copy exact strings, don't paraphrase
```markdown
**Verify**: Log contains exactly:
- "Server does not support X capability"
- "Falling back to use of legacy method"
```

### 3. Find Iteration Bounds
**Purpose**: When code iterates (e.g., over buckets, nodes, keys), tests must verify completeness.

**Look for**:
- Loop conditions: `for (i = 0; i < getSomeLimit(); i++)`
- Search for the function/constant definition to get the actual value
- This value becomes a test assertion (e.g., "verify 70 log messages")

**Example search strategy**:
```bash
# See loop in diff using getNumVekHashBuckets()
# Search for: "getNumVekHashBuckets" in *.cc and *.h files
# Find: const int NUM_VEK_HASH_BUCKETS = 70;
```

**In your test specification**:
```markdown
**Verify**: Message "Processing bucket <N>" appears exactly 70 times (buckets 0-69)
```

### 4. Identify What's NEW vs Modified
**Purpose**: Focus tests on changes, not unchanged code.

**Prioritize testing**:
- ✅ New bootargs introduced in this diff
- ✅ New log messages added
- ✅ New functions or branches added
- ✅ Logic changes (e.g., `<` changed to `<=`)
- ❌ Unchanged code paths (unless this is regression testing)

**Test focus by change type** (examples):
| Change in Diff | Test Focus |
|----------------|------------|
| `+ if (bootarg)` | Verify bootarg enables the intended behavior |
| `+ traceLog("...")` | Verify log message appears in expected scenarios |
| `- oldFunc()` → `+ newFunc()` | Verify new function produces correct results |
| `- if (x < N)` → `+ if (x <= N)` | Test boundary condition (x == N) |

### Example: Extracting Test Details from a Diff

**Given this diff snippet** (example only, not from actual code):
```cpp
+ if (KenvUtils::isKenvTrue("bootarg.keymanager.feature.forceRetry")) {
+     traceDebug("Forcing retry mechanism");
      retryCount = 0;  // Changed logic
  }

  for (int i = 0; i < getMaxRetries(); i++) {
+     traceLog("Retry attempt %d of %d", i, getMaxRetries());
      // ... retry logic
  }
```

**Extract for testing**:
1. **Bootarg**: `bootarg.keymanager.feature.forceRetry` (enables retry path)
2. **Log messages**:
   - "Forcing retry mechanism" (debug level)
   - "Retry attempt %d of %d" (info level)
3. **Iteration bound**: Search for `getMaxRetries()` definition
   - Found: `const int MAX_RETRIES = 3;`
4. **What's new**: The bootarg check and enhanced logging are new

**Resulting test specification**:
```markdown
**Test**: Validate Forced Retry Mechanism

**Setup**:
- Enable bootarg: `bootarg.keymanager.feature.forceRetry=true`
- Enable debug logging

**Execute**: [trigger operation that might need retry]

**Verify**:
- Log contains exactly: "Forcing retry mechanism"
- Log contains exactly 3 messages matching pattern: "Retry attempt [0-2] of 3"
- Operation eventually succeeds after retries
```

### Example: Using Help XML to Build Complete Test

**Scenario**: Changed file is `keymanager_external.cc`, method `enable_imp()` modified.

**Step 1: Find Help XML File**
```bash
# Search by table name in XML comments
grep -r "table name: keymanager_external" src/tables/help_xml/
# Result: src/tables/help_xml/security/key-manager/external/enable.xml
```

**Step 2: Extract from Help XML**
```xml
<command>
    <name>security key-manager external enable</name>
    <description>Enables external key manager... Not supported when
    key manager already enabled...</description>
    <parameters>
        <parameter><name>vserver</name>...</parameter>
        <parameter><name>key-servers</name>...</parameter>
    </parameters>
    <example>
        <screen>
cluster-1::> security key-manager external enable -vserver cluster-1
-key-servers ks1.local:15696 -client-cert AdminVserverClientCert
-server-ca-certs ServerCaCert1
        </screen>
    </example>
</command>
```

**Step 3: Build Test from Help XML Content**
```markdown
**Test**: Validate External Key Manager Enable

**Prerequisites** (from `<description>`):
- External key manager not currently enabled on the Vserver
- Client certificate and server CA certificates installed
- Key servers accessible from cluster

**Setup**:
1. Install certificates:
   ```bash
   security certificate install -type client-ca ...
   security certificate install -type server-ca ...
   ```
2. Ensure key manager not already enabled:
   ```bash
   security key-manager external show -vserver cluster-1
   # Should show: No entries
   ```

**Execute** (from `<example>`):
```bash
security key-manager external enable -vserver cluster-1 \
  -key-servers ks1.local:15696 \
  -client-cert AdminVserverClientCert \
  -server-ca-certs ServerCaCert1
```

**Verify**:
- Command succeeds
- Key manager shows as enabled:
  ```bash
  security key-manager external show -vserver cluster-1
  # Should show configured key servers
  ```
- Can perform key operations (if this was the change being tested)

**Test Variations** (from `<parameters>`):
- Test with multiple key servers (up to 4)
- Test with IPv6 addresses
- Test error case: Try enabling when already enabled (should fail per description)
```

## Search Strategy ExamplesUse VS Code's built-in tools to trace code effectively. Replace `${placeholders}` with actual values from the diff:

### Finding Implementations
```markdown
# Search for table iterator implementation
"Show me the implementation of ${table_name}_iterator class"

# Find a specific function definition
"Find the definition of ${function_name} in ${file_path}"

# Search for method implementations
"Search for create_imp OR modify_imp OR remove_imp OR *_imp in src/tables/*.cc"
```

### Tracing Function Usage
```markdown
# Find all usages of a modified function
Use: #sym:${function_name}
Or: "Find all usages of function ${function_name}"

# Find calls to a specific method
"Search for calls to ${method_name}( in src/tables/"

# Find where a class is instantiated
"Find where ${iterator_class} (${table_name}_iterator) is created or instantiated"
```

### Finding Related Files
```markdown
# Find the SMF schema for a table
"Show me ${table_name}.smf file"

# Find unit tests for a table
"Find test files for ${table_name} in src/tests/"

# Find REST API endpoints
"Search for operationId containing ${table_name} in swagger/"


# Find CLI command help (IMPORTANT - contains examples and prerequisites)
"Search for help XML files for ${table_name}"
# Or use file path directly if you know the command:
"Show me src/tables/help_xml/security/key-manager/external/enable.xml"
```

### Extracting CLI Commands from Help XML
```markdown
# Find all help XML files for a specific command area
"List files in src/tables/help_xml/security/key-manager/external/"

# Search for help files referencing a specific table
"Search for 'table name: keymanager_external' in help_xml/"

# Extract command example from help XML
"Show me the example section from enable.xml help file"
```

### Understanding Impact
```markdown
# Find dependent tables
"Search for #include.*${table_name}.smdb.h to find dependent files"

# Find RDB callback handlers
"Show me ${table_name}_rdb_callbackHandler.cc"

# Search for error handling
"Find traceError OR smdb_error in files that include ${table_name}"
```

### Checking Integration Points
```markdown
# Find KMIP integration
"Search for Keyserver OR kmip_keytable in src/tables/${table_name}.cc"

# Find cryptomod calls
"Search for cryptomod_create OR cryptomod_import in ${file_path}"

# Find distributed operations
"Search for smdb_parallel_executor in ${file_path}"
```

## Key Questions to Answer

Analyze the diff and codebase to answer:

### 1. What type of change is this?
**Identify from diff patterns** (these guide test focus):

- [ ] **Functional**: New feature or behavior change
  - Pattern: New SMF fields, new methods, new functionality
  - Test focus: Verify new feature works correctly

- [ ] **Bug Fix**: Corrects incorrect behavior
  - Pattern: Logic changes (`<` → `<=`), added null checks, error handling
  - Test focus: Reproduce original bug, verify fix, test boundary conditions

- [ ] **Supportability**: Logging, debugging, error messages
  - Pattern: Enhanced `traceLog/Debug/Error()` calls, better error messages
  - Test focus: Verify logs appear with correct information

- [ ] **Code Hygiene**: Refactoring, cleanup, documentation
  - Pattern: Code moved to utilities, renamed constants, consolidated duplicate logic
  - Test focus: Verify refactored code produces same results, new utilities work correctly

- [ ] **Testability**: Added test hooks or debug capabilities
  - Pattern: New bootargs, fault injection points, diagnostic commands
  - Test focus: Verify test hooks enable desired testing scenarios

- [ ] **Test**: Test-only changes
- [ ] **Tools**: Build, deployment, infrastructure

### 2. What is impacted?
- [ ] **Data Path**: Affects I/O operations, volume encryption, key retrieval
- [ ] **Control Path**: Affects configuration, management, REST API

### 3. Were unit tests added?
- [ ] Yes - List new `.ut` files or additions to existing tests
- [ ] No - Note missing test coverage
- **Estimate coverage**: What % of changed lines are tested?

### 4. Were logs/stats added for supportability?
- [ ] **Traces**: New `traceError()`, `traceInfo()`, `traceDebug()` calls
- [ ] **Stats**: Performance metrics, counters
- [ ] **EMS**: New events in `src/ems/`

### 5. What functions were modified?
Extract from diff:
- Function names: `${modified_function_1}`, `${modified_function_2}`, ...
- Iterator methods: `${method}_imp()` (e.g., `create_imp`, `validate_config_imp`)
- Helper functions: Any non-iterator methods

### 6. What are the dependencies?
Trace from modified functions:
- **Calls made**: What functions does the changed code call?
- **Called by**: What code calls the modified functions? (Use #sym:)
- **Nested calls**: What code calls the callers?
- **Find the affect CLI commands in the right *.smf/REST API**: What endpoints map to these functions?
- **Dependent tables**: What other SMF tables depend on this table?
- **RDB callbacks**: Is there a `*_rdb_callbackHandler` involved?
- **Tables used**: What other SMF tables are accessed?
- **External systems**: KMIP, cryptomod, RDB, certificates

## Output Format Template

Fill in this template based on your analysis:

---

## Defect Analysis: ${input:jira_url}

### Fix Description

**Summary**: [2-3 sentence overview: What was broken? How was it fixed?]

**Changed Files**:
- `${file_1}`: [Brief description of changes]
- `${file_2}`: [Brief description of changes]
- ...

**Modified Functions**:
- `${function_1}`: [What changed and why]
- `${function_2}`: [What changed and why]

---

### Classification

**Type of Change**:
- [x] Functional / Supportability / Test / Tools / Code Hygiene

**Impact**:
- [x] Data Path / Control Path

**Unit Tests Added**: Yes / No
- Files: `${test_file}.ut`
- Coverage: [X%] or [NA]

**Supportability Added**: Traces / Stats / None
- [Description of new logging/metrics]

---

### Code Impact Analysis

**Direct Changes**:
1. **${table_name}_iterator::${method_name}()**
   - File: `src/tables/${file_name}.cc`
   - Change: [Describe what changed]
   - Reason: [Why this change fixes the bug]

**Function Usage** (found via #sym:):
- `${function_name}` is called by:
  - `${caller_1}` in `${file_1}`
  - `${caller_2}` in `${file_2}`
  - REST API: `${rest_endpoint}`

**Dependent Tables**:
- `${related_table_1}`: [How it depends on changed code]
- `${related_table_2}`: [Interaction description]

**Integration Points Affected**:
- [ ] KMIP key server operations
- [ ] Cryptomod key generation/wrapping
- [ ] RDB distributed operations
- [ ] Certificate management
- [ ] Volume encryption
- [ ] MetroCluster synchronization

---

### REST API Mapping

**Affected Endpoints** (from `swagger/src/specs/api/paths/key_manager.yaml`):
- `${http_method} ${endpoint_path}`
  - Operation: `${operationId}`
  - Maps to: `${table_name}_iterator::${method}()`
  - Change impact: [Describe]

---

## Functional Test Suggestions

### Test 1: Primary Fix Validation - ${defect_symptom}

**Objective**: Directly validate the fix addresses the reported defect.

**Prerequisites**:
- ${prerequisite_1}
- ${prerequisite_2}

**Test Steps**:

1. **Setup**: ${setup_description}
   ```bash
   # CLI command
   ${cli_command}
   ```

   Or via REST API:
   ```bash
   ${http_method} /api${endpoint_path}
   {
     "${field_1}": "${value_1}",
     "${field_2}": "${value_2}"
   }
   ```

2. **Execute**: ${action_description}

3. **Verify**: ${verification_description}
   ```bash
   # Verification command
   ${verify_command}
   ```

**Expected Result**:
- ${expected_outcome}
- Validation: ${how_to_validate}

**Defect Validation**:
- **Before fix**: ${what_failed}
- **After fix**: ${what_succeeds}

---

### Test 2: Regression - ${related_feature}

**Objective**: Ensure the fix doesn't break existing functionality.

**Prerequisites**:
- ${regression_prereq}

**Test Steps**:
1. ${regression_step_1}
2. ${regression_step_2}

**Expected Result**:
- ${existing_behavior_unchanged}

**Reference**: See existing test `src/tests/tables/${existing_test}.ut` for patterns

---

### Test 3: Integration - ${integration_component}

**Objective**: Validate interaction between changed code and ${integration_component}.

**Prerequisites**:
- ${integration_setup}

**Test Steps**:
1. ${combined_operation}

**Expected Result**:
- ${correct_interaction}

---

### Test 4: Error Handling - ${error_scenario}

**Objective**: Validate error paths related to the fix.

**Prerequisites**:
- ${error_condition_setup}

**Test Steps**:
1. ${trigger_error_condition}

**Expected Result**:
- Error: `${expected_error_code}` or `${expected_error_message}`
- Log entry: `${expected_log_message}` (if supportability added)
- Graceful handling: ${graceful_behavior}

---

### Test 5: Cluster/Distributed Scenario

(Only if changes affect distributed operations - check for `dist_keys`, `smdb_parallel_executor`, or `*_rdb_callbackHandler`)

**Objective**: Validate fix in multi-node or MetroCluster configuration.

**Prerequisites**:
- ${cluster_setup_requirements}

**Test Steps**:
1. ${operation_on_node_1}
2. ${verify_propagation_to_node_2}
3. ${check_consistency_cluster_wide}

**Expected Result**:
- ${consistent_behavior_all_nodes}

---

## Edge Cases & Additional Considerations

Based on code analysis, also test:

1. **${edge_case_1}**: ${description}
2. **${edge_case_2}**: ${description}
3. **Upgrade/Downgrade**: ${considerations}
4. **Performance**: ${long_running_operations}
5. **Stress**: ${high_load_scenarios}

---

## Reference Information

**Files Analyzed**:
- Changed: `${changed_file_list}`
- Related: `${related_file_list}`
- Tests: `${test_file_list}`

**REST API Endpoints**:
- `${endpoint_1}`: ${description_1}
- `${endpoint_2}`: ${description_2}

**SMF Tables Involved**:
- `${table_1}`: ${role_in_fix}
- `${table_2}`: ${dependency_description}

**Key Functions Traced**:
- `${function_1}`: Called by ${callers}
- `${function_2}`: Calls ${callees}

---
