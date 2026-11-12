---
name: guanfeng-generate
description: Generate and verify a small meteorology Vue application with real local observations and bounded parallel model roles.
---

# Guanfeng application generation

Applicable when a user requests a meteorology application from a text requirement and existing datasets. Input: prompt, an optional real datasetId, a configured model, and optional probe=true for small token generation. Credentials are never an input to this Skill.

1. Load this Skill from disk and record its SHA-256 and loadedAt in the task.
2. Inspect actual Workbench dataset and component metadata. Select a real dataset; do not fabricate measurements, coordinates or coincident observation times.
3. Ask the planning role for title, description and an executable versioned workflow.
4. Execute the Vue UI and API module model roles concurrently; allow at most two active provider requests globally. Both roles must produce actual source, not a fixed replacement page.
5. Assemble only App.vue and api.js into the fixed Vue skeleton. The API module may call only fixed local runtime endpoints. Show missing data, errors and provenance. Treat threshold as a configurable rule, never a safety standard.
6. Run the restricted-source analyzer and fixed Vite command, then real Workbench workflow validation, observation analysis and workflow execution. Preserve actual command errors and analysis summaries.
7. On failure, send the actual error and current source to the repair role. At most two repair rounds are allowed. Preserve failed validation records even if repair succeeds.
8. Mark ready only after all real checks pass. Preserve timestamps, provider usage, generated source and hashed artifact manifest. Failure is a first-class result.
9. Deploy only the validated build using the fixed local runtime script with a minimal child environment containing no model credentials. Check health and the served HTML. Stop explicitly and report exited/lost processes honestly after a backend restart.
10. Export source, build tools, dependency versions, the originating platform lockfile and verification records, without credentials or runtime process logs.

Example input: {"prompt":"Build a wind-profile threshold analysis page with editable height limits and provenance", "datasetId":"an existing profile dataset id"}.

Outputs: persistent task with stages, calls, usage, validation, skillUsage, artifacts and deployment. probe=true performs real small-token requests and can fail from token exhaustion; it is never reported as a successful application unless the same checks pass.

2026-11-03增强：每轮生成/修复源码保存validation/sources-{round}/。构建和数据流程通过后，执行generation-template/browser-check.cjs：真实浏览器加载构建页面、转发真实Java分析请求，检查自动分析、可见汇总/超限记录、观测高度范围、对象字段、请求中的阈值变化及要求的廓线。校验失败必须反馈模型修复，不能用手工替换成品或静态结果绕过。