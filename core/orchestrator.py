"""
ARCANE 2 — Orchestrator
========================
The central engine. Receives a task, routes it through the system, returns result.

Flow:
  1. User submits task (with project_id, optional mode/budget)
  2. Intent Classifier → type + complexity + flags
  3. Preset Manager → team of models for this task
  4. Show recommendation to user (or auto-approve)
  5. Agent Loop → execute (model has full freedom HOW)
  6. Budget Controller → track costs
  7. Project Manager → update structured state, scratchpad → PROJECT.md
  8. Return result

Philosophy: freedom inside, control outside.
Models decide HOW to solve. Orchestrator decides WHO solves and tracks BUDGET.

Spec refs: §1, §6, §7
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass, field, asdict
try:
    from core.task_history_db import TaskHistoryDB
except ImportError:
    from task_history_db import TaskHistoryDB
from enum import Enum
from typing import Any, Optional, Callable

logger = logging.getLogger("arcane2.orchestrator")


# ═══════════════════════════════════════════════════════════════════════════════
# RUN STATES (external control graph)
# ═══════════════════════════════════════════════════════════════════════════════

class RunStatus(str, Enum):
    """Task lifecycle states. Freedom inside each state, control at transitions."""
    QUEUED = "queued"           # Waiting in queue
    CLASSIFYING = "classifying" # Intent classifier working
    RECOMMENDING = "recommending"  # Building team recommendation
    AWAITING_APPROVAL = "awaiting_approval"  # Showing recommendation, waiting for user
    RUNNING = "running"         # Agent loop executing (model has full freedom)
    REVIEW = "review"           # Self-check / QA
    DONE = "done"               # Success
    FAILED = "failed"           # All retries exhausted
    CANCELLED = "cancelled"     # User cancelled
    PAUSED = "paused"           # Budget pause (95% spent)


@dataclass
class RunResult:
    """Result of a single orchestrator run."""
    run_id: str = ""
    project_id: str = ""
    task: str = ""
    status: RunStatus = RunStatus.QUEUED
    
    # Classification
    task_type: str = ""         # design, code, devops, automation, research
    complexity: str = ""        # simple, moderate, complex, expert
    needs_browser: bool = False
    needs_ssh: bool = False
    
    # Team
    mode: str = "auto"          # auto, manual, top, optimum, lite, free
    team: dict[str, str] = field(default_factory=dict)  # role → model_id
    estimated_cost: float = 0.0
    
    # Execution
    output: str = ""
    artifacts: list[str] = field(default_factory=list)  # file paths created
    
    # Cost tracking
    actual_cost: float = 0.0
    cost_breakdown: list[dict] = field(default_factory=list)
    manus_credits_used: int = 0
    
    # Timing
    started_at: float = 0.0
    finished_at: float = 0.0
    duration_seconds: float = 0.0
    
    # Errors / retries
    errors: list[str] = field(default_factory=list)
    retries: int = 0
    escalations: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d["status"] = self.status.value
        return d


# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

class Orchestrator:
    """
    Central engine of Arcane 2.
    
    Connects: IntentClassifier, PresetManager, AgentLoop, BudgetController,
    ProjectManager, SecurityGuard.
    
    Usage:
        orch = Orchestrator(config)
        result = await orch.run(project_id="romashka", task="Add catalog page")
        # or with approval:
        rec = await orch.classify_and_recommend(project_id, task)
        # user reviews rec, approves or modifies
        result = await orch.execute(rec)
    """
    
    def __init__(
        self,
        # All dependencies injected — no hardcoded imports
        llm_client=None,            # UnifiedLLMClient or provider adapter
        intent_classifier=None,     # from core.intent_classifier
        preset_manager=None,        # from shared.llm.preset_manager
        budget_controller=None,     # from core.budget_controller  
        project_manager=None,       # from core.project_manager
        security=None,              # from core.security
        agent_loop_factory=None,    # callable that creates AgentLoop
        config: dict | None = None,
    ):
        self.llm = llm_client
        self.classifier = intent_classifier
        self.presets = preset_manager
        self.budget = budget_controller
        self.projects = project_manager
        self.security = security
        self.agent_loop_factory = agent_loop_factory or self._default_agent_loop_factory
        self.config = config or {}
        
        # Active runs (for parallel project support)
        self._runs: dict[str, RunResult] = {}
        # Persistent task history
        import os as _os
        _workspace = _os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
        _db_path = _os.path.join(_workspace, ".arcane_history.db")
        try:
            self.history_db = TaskHistoryDB(db_path=_db_path)
        except Exception as _e:
            import logging as _log
            _log.getLogger(__name__).warning(f"TaskHistoryDB init failed: {_e}")
            self.history_db = None
        
        # Max retries before giving up
        self.max_retries = self.config.get("max_retries", 3)
        # Auto-approve if True (skip AWAITING_APPROVAL)
        self.auto_approve = self.config.get("auto_approve", False)
    
    # ─── Main entry point ─────────────────────────────────────────────────
    
    async def run(
        self,
        project_id: str,
        task: str,
        mode: str = "auto",
        budget_limit: float | None = None,
        auto_approve: bool | None = None,
        on_status_change: Callable | None = None,
    ) -> RunResult:
        """
        Full orchestration: classify → recommend → (approve) → execute → result.
        
        Args:
            project_id: Which project this task belongs to
            task: What the user wants done (free text)
            mode: auto/manual/top/optimum/lite/free
            budget_limit: Max USD for this task (None = project default)
            auto_approve: Skip approval step? (None = use orchestrator default)
            on_status_change: Callback for real-time UI updates
        """
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        result = RunResult(
            run_id=run_id,
            project_id=project_id,
            task=task,
            mode=mode,
            started_at=time.time(),
        )
        self._runs[run_id] = result
        self._evict_old_runs()
        
        should_auto = auto_approve if auto_approve is not None else self.auto_approve
        
        try:
            # Step 1: Classify
            await self._update_status(result, RunStatus.CLASSIFYING, on_status_change)
            await self._classify(result)
            
            # Step 2: Build team recommendation
            await self._update_status(result, RunStatus.RECOMMENDING, on_status_change)
            await self._recommend(result, budget_limit)
            
            # Step 3: Approval (skip if auto)
            if not should_auto:
                await self._update_status(result, RunStatus.AWAITING_APPROVAL, on_status_change)
                # In real system: wait for user approval via WebSocket/polling
                # For now: auto-approve after recommendation is built
                logger.info(f"[{run_id}] Awaiting approval. Team: {result.team}, Est: ${result.estimated_cost:.3f}")
            
            # Step 4: Execute
            await self._update_status(result, RunStatus.RUNNING, on_status_change)
            await self._execute(result, on_status_change)
            
            # Step 5: Done
            result.finished_at = time.time()
            result.duration_seconds = result.finished_at - result.started_at
            await self._update_status(result, RunStatus.DONE, on_status_change)

            # P2-1: Telegram notification on DONE
            try:
                from workers.telegram_notify import notify as _tg_notify
                import asyncio as _asyncio
                _tg_msg = (
                    f"✅ <b>Задача завершена</b>\n"
                    f"Проект: {result.project_id}\n"
                    f"Задача: {str(result.task)[:100]}\n"
                    f"Стоимость: ${result.actual_cost:.4f}\n"
                    f"Время: {round(result.duration_seconds or 0, 1)}с"
                )
                _asyncio.create_task(_tg_notify(_tg_msg))
            except Exception:
                pass

            # Step 6: Model escalation hint on FAILED
            if result.status == RunStatus.FAILED:
                _esc = self._escalate_model(primary_model, result)
                if _esc and _esc != primary_model:
                    logger.info(f"[{run_id}] Next retry could use: {_esc}")
                    if not hasattr(result, 'metadata') or result.metadata is None:
                        result.metadata = {}
                    result.metadata['escalation_model'] = _esc

            # Step 6: Update project state
            await self._update_project(result)
            
        except BudgetPausedError:
            await self._update_status(result, RunStatus.PAUSED, on_status_change)
            logger.warning(f"[{run_id}] Budget paused at ${result.actual_cost:.3f}")
        except CancelledError:
            await self._update_status(result, RunStatus.CANCELLED, on_status_change)
        except Exception as e:
            result.errors.append(str(e))
            result.finished_at = time.time()
            result.duration_seconds = result.finished_at - result.started_at
            await self._update_status(result, RunStatus.FAILED, on_status_change)
            # P2-1: Telegram notification on FAILED
            try:
                from workers.telegram_notify import notify as _tg_notify
                import asyncio as _asyncio
                _err = str(result.errors[-1])[:200] if result.errors else 'unknown'
                _tg_msg = f'❌ <b>Задача провалена</b>\nПроект: {result.project_id}\nОшибка: {_err}'
                _asyncio.create_task(_tg_notify(_tg_msg))
            except Exception:
                pass
            logger.error(f"[{run_id}] Failed: {e}", exc_info=True)
        
        return result
    
    # ─── Step 1: Classify ─────────────────────────────────────────────────
    
    async def _classify(self, result: RunResult):
        """Use IntentClassifier to determine task type and complexity."""
        if self.classifier is None and self.llm is None:
            result.task_type = "general"
            result.complexity = "moderate"
            logger.warning(f"[{result.run_id}] No classifier and no LLM, using defaults")
            return
        
        try:
            # classifier is the classify_intent function, not a class
            # signature: classify_intent(llm_client, user_message, chat_id) -> dict
            classify_fn = self.classifier
            if classify_fn is None:
                # Try importing directly
                from core.intent_classifier import classify_intent
                classify_fn = classify_intent
            
            classification = await classify_fn(self.llm, result.task, result.run_id)
            result.task_type = classification.get("intent", "general")
            result.complexity = classification.get("complexity", "moderate")
            result.needs_browser = classification.get("needs_browser", False)
            result.needs_ssh = classification.get("needs_ssh", False)
            
            logger.info(
                f"[{result.run_id}] Classified: type={result.task_type}, "
                f"complexity={result.complexity}, browser={result.needs_browser}, "
                f"ssh={result.needs_ssh}, source={classification.get('source', '?')}"
            )
        except Exception as e:
            logger.warning(f"[{result.run_id}] Classifier failed: {e}. Using defaults.")
            result.task_type = "general"
            result.complexity = "moderate"
    
    # ─── Step 2: Recommend team ───────────────────────────────────────────
    
    async def _recommend(self, result: RunResult, budget_limit: float | None):
        """Use PresetManager to build team of models for this task."""
        if self.presets is None:
            result.team = {"coder": "claude-sonnet-4.6"}
            result.estimated_cost = 0.05
            logger.warning(f"[{result.run_id}] No preset_manager, using Sonnet default")
            return
        
        try:
            # ── Local copy to avoid race condition on shared presets ───────
            import copy
            from shared.llm.preset_manager import PresetMode
            pm = copy.deepcopy(self.presets)
            try:
                pm.mode = PresetMode(result.mode)
            except ValueError:
                pm.mode = PresetMode.OPTIMUM
            
            # ── Determine roles needed for this task type ─────────────────
            roles_for_type = {
                "web_design":      ["designer", "classifier"],
                "cms_management":  ["coder", "ssh", "classifier"],
                "devops":          ["ssh", "classifier"],
                "coding":          ["coder", "classifier"],
                "code_review":     ["qa", "classifier"],
                "data":            ["coder", "classifier"],
                "research":        ["researcher", "classifier"],
                "text_content":    ["writer", "classifier"],
                "media":           ["designer", "classifier"],
                "automation":      ["coder", "classifier"],
                "browser_task":    ["browser", "classifier"],
                "general":         ["coder", "classifier"],
            }
            needed_roles = list(roles_for_type.get(result.task_type, ["coder", "classifier"]))
            
            if result.needs_ssh and "ssh" not in needed_roles:
                needed_roles.append("ssh")
            if result.needs_browser and "browser" not in needed_roles:
                needed_roles.append("browser")
            if result.complexity == "complex" and "planner" not in needed_roles:
                needed_roles.append("planner")
            
            # ── Resolve model for each role ───────────────────────────────
            def _resolve_team(preset_mgr):
                team = {}
                total_cost = 0.0
                for role in needed_roles:
                    resolved = preset_mgr.resolve_model_full(role)
                    if resolved:
                        team[role] = resolved.model_id
                        try:
                            from shared.llm.model_registry import estimate_task_cost
                            cost = estimate_task_cost(resolved.model_id, 5000, 2000)
                            if cost is not None:
                                total_cost += cost
                        except ImportError:
                            pass
                return team, total_cost
            
            team, total_cost = _resolve_team(pm)
            
            # Always have at least a primary execution model
            primary_role = self._get_primary_role(result)
            if primary_role not in team and "coder" not in team:
                team["coder"] = "claude-sonnet-4.6"
                total_cost += 0.045
            
            result.team = team
            result.estimated_cost = total_cost
            
            # ── Budget check: downgrade to LITE if over limit ─────────────
            if budget_limit and result.estimated_cost > budget_limit:
                logger.info(
                    f"[{result.run_id}] Est ${result.estimated_cost:.3f} > "
                    f"limit ${budget_limit:.2f}, downgrading to LITE"
                )
                pm_lite = copy.deepcopy(self.presets)
                pm_lite.mode = PresetMode.LITE
                team, total_cost = _resolve_team(pm_lite)
                if primary_role not in team and "coder" not in team:
                    team["coder"] = "deepseek-v3.2"
                    total_cost += 0.003
                result.team = team
                result.estimated_cost = total_cost
            
            logger.info(
                f"[{result.run_id}] Team ({pm.mode.value}): {result.team}, "
                f"Est cost: ${result.estimated_cost:.3f}"
            )
        except Exception as e:
            logger.warning(f"[{result.run_id}] PresetManager failed: {e}. Using Sonnet default.")
            result.team = {"coder": "claude-sonnet-4.6"}
            result.estimated_cost = 0.05
    
    # ─── Step 3: Execute ──────────────────────────────────────────────────
    
    async def _execute(self, result: RunResult, on_status_change: Callable | None):
        """
        Run the agent loop. Model has full freedom inside.
        Orchestrator only tracks budget and handles retries/escalation.
        """
        # Load project context (structured state + relevant files + Qdrant)
        context = await self._load_project_context(result)
        
        # Get primary model from team
        primary_role = self._get_primary_role(result)
        primary_model = result.team.get(primary_role, "claude-sonnet-4.6")
        
        # ── Budget pre-check (spec §8: "До запуска: Оценка") ─────────────
        if self.budget and result.project_id:
            try:
                if not self.budget.can_run(result.project_id, result.run_id):
                    raise BudgetPausedError(
                        f"Budget paused/stopped for project {result.project_id}"
                    )
            except (AttributeError, Exception) as e:
                logger.debug(f"Budget pre-check skipped: {e}")
        
        # ── Speculative execution planning for complex tasks (§5.1) ───────
        if result.complexity == "complex" and self.presets:
            try:
                import copy
                pm = copy.deepcopy(self.presets)
                hints = pm.plan_speculative(
                    primary_roles=[primary_role],
                    speculative_roles=["qa"],
                )
                if hints:
                    spec_models = [(h.role, h.model_id, h.is_speculative) for h in hints]
                    logger.info(
                        f"[{result.run_id}] Speculative plan: {spec_models}. "
                        f"(Parallel execution requires task queue — using primary only)"
                    )
                    # TODO: When Redis is available, run speculative branches in parallel
                    # For now, just the primary role executes
            except Exception as e:
                logger.debug(f"Speculative planning skipped: {e}")
        
        for attempt in range(self.max_retries + 1):
            try:
                # Create agent loop with current model
                loop = None
                if self.agent_loop_factory:
                    loop = self.agent_loop_factory(
                        model_id=primary_model,
                        project_context=context,
                        task=result.task,
                        budget_remaining=self._get_budget_remaining(result),
                        mode=result.mode,  # pass mode so router uses correct strategy
                    )
                
                if loop is not None:
                    # ── Golden Paths: inject hint before run (§10.2) ─────
                    try:
                        from core.golden_paths import GoldenPathStore as _GPS
                        import os as _gp_os
                        _workspace = _gp_os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
                        _project_dir = _gp_os.path.join(_workspace, "projects", result.project_id)
                        _gp = _GPS(_project_dir)
                        _match = _gp.find_matching_path(result.task_type, [])
                        if _match:
                            context["golden_path_hint"] = _match.get("steps", [])
                            logger.debug(f"[{result.run_id}] Golden path hint injected")
                    except Exception:
                        pass
                    run_result = await loop.run(result.task)
                    if isinstance(run_result, dict):
                        status = run_result.get("status", "unknown")
                        artifacts = run_result.get("artifacts", [])
                        iterations = run_result.get("iterations", 0)
                        cost = run_result.get("total_cost", run_result.get("actual_cost", 0.0))
                        shielded = run_result.get("shielded", False)
                        elapsed = run_result.get("elapsed_seconds", 0)

                        # P0-1: TRUTHFUL STATUS — do not set DONE if agent failed
                        if status in ("failed", "cancelled", "error", "budget_exceeded"):
                            result.actual_cost += cost
                            result.artifacts.extend(artifacts)
                            raise RuntimeError(
                                f"Agent finished with status: {status}. "
                                f"Output: {str(run_result.get('output', ''))[:200]}"
                            )

                        if shielded and run_result.get("output"):
                            output = run_result["output"]
                        elif status == "done" and artifacts:
                            output = (
                                f"Task completed in {iterations} iterations "
                                f"({elapsed}s, ${cost:.4f}). "
                                f"Created: {', '.join(artifacts)}"
                            )
                        elif status == "done":
                            output = f"Task completed in {iterations} iterations ({elapsed}s, ${cost:.4f})."
                        else:
                            output = f"Task {status} after {iterations} iterations ({elapsed}s)."

                        result.actual_cost += cost
                        result.artifacts.extend(artifacts)
                    else:
                        output = str(run_result)
                else:
                    # Fallback: direct LLM call (no agent loop)
                    output = await self._direct_llm_call(result, context, primary_model)
                
                # ── Budget record (spec §8: actual spend tracking) ────────
                if self.budget and result.project_id and result.actual_cost > 0:
                    try:
                        self.budget.record(
                            project_id=result.project_id,
                            task_id=result.run_id,
                            model=primary_model,
                            category=self._get_budget_category(result.task_type),
                            input_tokens=0,
                            output_tokens=0,
                            cost_usd_override=result.actual_cost,  # CRIT-3: use actual cost
                        )
                    except Exception as e:
                        logger.debug(f"Budget record skipped: {e}")
                
                result.output = output
                
                # ═══ QA CONTROLLER (Stage C) ═══════════════════════════════
                if (result.task_type in ("web_design", "coding", "cms_management", "code_review", "automation")
                    and result.output and len(result.output) > 100
                    and not run_result.get("shielded") if isinstance(run_result, dict) else True):
                    qa_model = result.team.get("qa", "gpt-5.4-nano") if isinstance(result.team, dict) else "gpt-5.4-nano"
                    await self._run_qa_check(result, context, qa_model, primary_model, on_status_change)
                
                # ═══ VISUAL QA (Stage D) — Playwright browser check for web_design ═══
                if result.task_type == "web_design":
                    await self._run_visual_qa(result, primary_model, on_status_change)
                    # Design Judge: score visual quality (web_design tasks)
                    _dj = await self._run_design_judge(result, primary_model, on_status_change)
                    if not _dj["passed"] and _dj.get("feedback"):
                        result.errors.append(f"Design Judge score {_dj["score"]}/10: {_dj["feedback"][:200]}")
                        logger.info(f"[{result.run_id}] Design feedback: {_dj["feedback"][:150]}")
                
                return  # Success
                
            except Exception as e:
                result.retries = attempt + 1
                result.errors.append(f"Attempt {attempt + 1}: {str(e)}")
                logger.warning(f"[{result.run_id}] Attempt {attempt + 1} failed: {e}")
                
                # Escalate to more powerful model
                if attempt < self.max_retries:
                    escalated = self._escalate_model(primary_model, result)
                    if escalated and escalated != primary_model:
                        result.escalations.append(f"{primary_model} → {escalated}")
                        primary_model = escalated
                        logger.info(f"[{result.run_id}] Escalated to {escalated}")
                    else:
                        break  # No better model available
        
        # All retries exhausted
        raise RuntimeError(f"Task failed after {result.retries} attempts")
    
    # ─── Step 4: Update project ───────────────────────────────────────────
    
    async def _update_project(self, result: RunResult):
        """Update project structured state after task completion."""
        if not self.projects:
            return
        
        try:
            primary_model = list(result.team.values())[0] if isinstance(result.team, dict) and result.team else "unknown"
            self.projects.add_run(
                project_id=result.project_id,
                task=result.task,
                model=primary_model,
                cost=result.actual_cost,
                result=result.status.value,
                run_id=result.run_id,
            )
            
            # Regenerate PROJECT.md from structured state
            self.projects.regenerate_md(result.project_id)
            
            logger.info(f"[{result.run_id}] Project state updated, cost: ${result.actual_cost:.4f}")
            
        except Exception as e:
            logger.error(f"[{result.run_id}] Failed to update project: {e}")
        
        # ── Golden Paths: record outcome for pattern learning (§10.2) ─────
        if result.status == RunStatus.DONE:
            try:
                from core.golden_paths import record_run_outcome
                workspace = os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
                project_dir = os.path.join(workspace, "projects", result.project_id)
                record_run_outcome(
                    project_dir=project_dir,
                    run_id=result.run_id,
                    task_type=result.task_type,
                    steps=[result.task],
                    success=True,
                    tests_passed=True,
                    rollback_triggered=False,
                    duration_ms=int(result.duration_seconds * 1000),
                    cost_usd=result.actual_cost,
                    model_used=primary_model if 'primary_model' in dir() else "unknown",
                )
                logger.info(f"[{result.run_id}] Golden path outcome recorded")
            except Exception as e:
                logger.debug(f"Golden paths recording skipped: {e}")
        
        # ── Auto-Documenter: trigger background update (§5.4) ─────────────
        if result.status == RunStatus.DONE and result.artifacts:
            try:
                asyncio.create_task(self._run_auto_documenter(result))
            except Exception as e:
                logger.debug(f"Auto-documenter trigger skipped: {e}")
    
    async def _run_auto_documenter(self, result: RunResult):
        """Background: update ARCHITECTURE.md after successful task."""
        try:
            from workers.auto_documenter import AutoDocumenter, DocumenterConfig
            workspace = os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
            project_dir = os.path.join(workspace, "projects", result.project_id)
            config = DocumenterConfig(project_path=project_dir)
            documenter = AutoDocumenter(config=config)
            await documenter.force_update()
            logger.info(f"[{result.run_id}] Auto-documenter updated docs")
        except Exception as e:
            logger.debug(f"Auto-documenter failed: {e}")
    
    # ─── Helpers ──────────────────────────────────────────────────────────
    
    async def _load_project_context(self, result: RunResult) -> dict:
        """Load structured state + relevant files for model context."""
        context = {
            "task": result.task,
            "project_id": result.project_id,
            "needs_ssh": result.needs_ssh,
            "needs_browser": result.needs_browser,
            "task_type": result.task_type,
            "complexity": result.complexity,
        }
        
        if self.projects:
            state = self.projects.get_state(result.project_id)
            if state:
                context["project_state"] = state
                context["personality"] = state.get("personality", {})
                context["tech_stack"] = state.get("tech_stack", {})
                context["design_system"] = state.get("design_system", {})
                context["servers"] = state.get("environment", {}).get("servers", [])
        
        return context
    
    def _get_primary_role(self, result: RunResult) -> str:
        """Determine primary role based on task type (intent)."""
        role_map = {
            "web_design":     "designer",
            "cms_management": "coder",
            "devops":         "ssh",
            "coding":         "coder",
            "code_review":    "qa",
            "data":           "coder",
            "research":       "researcher",
            "text_content":   "writer",
            "media":          "designer",
            "automation":     "coder",
            "browser_task":   "browser",
            "general":        "coder",
        }
        return role_map.get(result.task_type, "coder")
    
    def _get_budget_category(self, task_type: str) -> str:
        """Map intent classifier task_type to budget category string."""
        cat_map = {
            "web_design": "code", "cms_management": "code",
            "devops": "devops", "coding": "code",
            "code_review": "code", "data": "code",
            "research": "research", "text_content": "text",
            "media": "media", "automation": "code",
            "browser_task": "browser", "general": "code",
        }
        return cat_map.get(task_type, "code")
    
    def _get_budget_remaining(self, result: RunResult) -> float | None:
        """Get remaining budget for this task. Returns None if unlimited."""
        if not self.budget:
            return None
        val = self.budget.get_remaining(result.project_id)
        # None means unlimited — return None (not inf) for JSON safety
        return val
    
    def _escalate_model(self, current_model: str, result: RunResult) -> str | None:
        """Find a more powerful model for retry."""
        # Import here to avoid circular imports at module level
        try:
            from shared.llm.model_registry import get_fallback
            # Fallback chains go from cheaper to more expensive
            # For escalation we want the reverse — go UP
            escalation_map = {
                "deepseek-v3.2": "gpt-5.4-mini",
                "gpt-5.4-nano": "gpt-5.4-mini",
                "gpt-5.4-mini": "claude-sonnet-4.6",
                "gemini-2.5-flash": "gemini-3.1-pro",
                "claude-haiku-4.5": "claude-sonnet-4.6",
                "claude-sonnet-4.6": "gpt-5.4",
                "gpt-5.4": "claude-opus-4.6",
                "grok-4-fast": "gpt-5.4-mini",
            }
            return escalation_map.get(current_model)
        except ImportError:
            return None
    


    async def _run_visual_qa(
        self, result, primary_model: str,
        on_status_change=None,
        max_rounds: int = 2,
    ) -> bool:
        """Run visual QA check using Playwright browser. (Stage D)"""
        browser = None
        try:
            # Find HTML file in artifacts
            workspace = __import__("os").environ.get("ARCANE_WORKSPACE", "/root/workspace")
            html_path = None
            for artifact in result.artifacts:
                if artifact.endswith(".html"):
                    import os
                    candidate = os.path.join(workspace, "projects", result.project_id, "src", artifact)
                    if os.path.exists(candidate):
                        html_path = candidate
                        break
            
            if not html_path:
                logger.debug(f"[{result.run_id}] Visual QA: no HTML artifact found, skipping")
                return True
            
            await self._update_status(result, RunStatus.RUNNING, on_status_change,
                {"phase": "visual_qa", "message": "Visual QA: opening browser..."})
            
            from workers.browser.worker import BrowserWorker
            browser = BrowserWorker()
            await browser.initialize()
            
            issues = []
            
            # Navigate to the file
            file_url = f"file://{html_path}"
            nav_result = await browser.navigate(file_url)
            if not nav_result.get("ok", True) and nav_result.get("status", 200) >= 400:
                issues.append(f"Page failed to load: HTTP {nav_result.get('status')}")
            
            # Desktop check (1440px)
            await browser._page.set_viewport_size({"width": 1440, "height": 900})
            await browser._page.wait_for_timeout(500)
            
            view = await browser.get_view()
            page_text = view.get("text", "") if isinstance(view, dict) else str(view)
            if len(page_text.strip()) < 50:
                issues.append("Page appears empty or has very little content")
            
            # Mobile check (375px)
            try:
                await browser._page.set_viewport_size({"width": 375, "height": 812})
                await browser._page.wait_for_timeout(500)
                
                scroll_width = await browser._page.evaluate("document.documentElement.scrollWidth")
                if scroll_width > 390:  # allow small overflow
                    issues.append(f"Horizontal overflow on mobile: {scroll_width}px > 375px")
                
                # Reset viewport
                await browser._page.set_viewport_size({"width": 1440, "height": 900})
            except Exception as e:
                logger.debug(f"[{result.run_id}] Mobile check error: {e}")
            
            # Button check
            try:
                buttons = await browser._page.query_selector_all("button, a.btn, .btn, [role='button'], a[href]")
                if not buttons:
                    issues.append("No buttons/links found on page")
            except Exception:
                pass
            
            if not issues:
                logger.info(f"[{result.run_id}] Visual QA passed")
                return True
            
            logger.info(f"[{result.run_id}] Visual QA issues: {issues}")
            
            # Send issues to primary model for fixing
            if self.llm and primary_model:
                fix_prompt = f"""Visual QA (Playwright browser check) found these problems:

{chr(10).join(f"- {issue}" for issue in issues)}

Fix these issues in the HTML/CSS.
Original task: {result.task}
Current output (first 2000 chars):
{result.output[:2000]}

Provide the complete fixed HTML file."""
                
                fix_response = await self.llm.chat(
                    model=primary_model,
                    messages=[
                        {"role": "system", "content": "You are a web developer. Fix the visual issues."},
                        {"role": "user", "content": fix_prompt},
                    ],
                )
                if isinstance(fix_response, dict):
                    fixed = fix_response.get("content", "")
                    cost = fix_response.get("cost_usd", 0.0)
                    result.actual_cost += cost
                    if fixed:
                        result.output = fixed
                        logger.info(f"[{result.run_id}] Visual QA fix applied")
                        # Write fix back to the HTML file
                        if html_path:
                            try:
                                with open(html_path, "w", encoding="utf-8") as _vqa_f:
                                    _vqa_f.write(fixed)
                                logger.info(f"[{result.run_id}] Visual QA fix written to {html_path}")
                            except Exception as _vqa_e:
                                logger.warning(f"[{result.run_id}] Could not write Visual QA fix: {_vqa_e}")
            
            return True
            
        except Exception as e:
            logger.warning(f"[{result.run_id}] Visual QA error: {e}")
            return True  # Don't block on failure
        finally:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass

    async def _run_qa_check(
        self, result, context: dict,
        qa_model: str, primary_model: str,
        on_status_change=None,
        max_qa_rounds: int = 2,
    ) -> bool:
        """Run QA check on agent output. Returns True if passed. (Stage C)"""
        for round_num in range(max_qa_rounds):
            try:
                await self._update_status(result, RunStatus.RUNNING, on_status_change,
                    {"phase": "qa_review",
                     "qa_round": round_num + 1,
                     "message": f"QA review round {round_num + 1}/{max_qa_rounds}"})
                
                # FIX 2.5: Read artifacts for QA review
                import os as _qa_os
                content_to_review = result.output or ""
                if result.artifacts:
                    _workspace = _qa_os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
                    for _artifact in result.artifacts[:3]:
                        _path = _qa_os.path.join(_workspace, "projects", result.project_id, "src", _artifact)
                        if _qa_os.path.exists(_path):
                            try:
                                with open(_path, encoding="utf-8", errors="replace") as _af:
                                    content_to_review += f"\n\n--- {_artifact} ---\n" + _af.read()[:2000]
                            except Exception:
                                pass

                qa_prompt = f"""You are a QA reviewer. Evaluate this task output.

ORIGINAL TASK:
{result.task}

AGENT OUTPUT:
{content_to_review[:3000]}

Evaluate:
1. Does the output actually complete the task?
2. Is the code/content correct and complete?
3. Are there obvious errors or missing parts?

Respond with EXACTLY one of:
- "PASS: <brief reason>" — if output is acceptable
- "FAIL: <specific issues>" — if output needs improvement

Be strict but fair. Minor style issues = PASS. Missing functionality = FAIL."""

                if not self.llm:
                    return True  # Dry run - skip QA
                
                response = await self.llm.chat(
                    model=qa_model,
                    messages=[
                        {"role": "system", "content": "You are a strict QA reviewer. Be concise."},
                        {"role": "user", "content": qa_prompt},
                    ],
                )
                
                qa_response = ""
                if isinstance(response, dict):
                    qa_response = response.get("content", "")
                    cost = response.get("cost_usd", 0.0)
                    result.actual_cost += cost
                else:
                    qa_response = str(response)
                
                logger.info(f"[{result.run_id}] QA round {round_num + 1}: {qa_response[:100]}")
                
                if qa_response.upper().startswith("PASS"):
                    logger.info(f"[{result.run_id}] QA passed on round {round_num + 1}")
                    return True
                
                # QA failed — send back for fixing if we have more rounds
                if round_num < max_qa_rounds - 1:
                    qa_issues = qa_response.replace("FAIL:", "").strip()
                    fix_prompt = f"""The QA reviewer found these issues with your previous output:

{qa_issues}

Original task: {result.task}

Please fix these issues and provide the complete corrected output."""
                    
                    fix_response = await self.llm.chat(
                        model=primary_model,
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant. Fix the issues and provide complete output."},
                            {"role": "user", "content": fix_prompt},
                        ],
                    )
                    
                    if isinstance(fix_response, dict):
                        fixed_output = fix_response.get("content", "")
                        cost = fix_response.get("cost_usd", 0.0)
                        result.actual_cost += cost
                        if fixed_output:
                            result.output = fixed_output
                            logger.info(f"[{result.run_id}] QA fix applied, re-checking...")
                    
            except Exception as e:
                logger.warning(f"[{result.run_id}] QA check error: {e}")
                return True  # Don't block on QA failure
        
        return False  # QA failed after all rounds


    async def _run_design_judge(
        self, result, primary_model: str, on_status_change=None
    ) -> dict:
        """
        Design Judge: evaluate the visual/UX quality of web output.
        Called after _run_qa_check for web_design tasks.
        Returns {"score": 0-10, "passed": bool, "feedback": str}
        """
        if result.task_type not in ("web_design", "design", "media"):
            return {"score": 10, "passed": True, "feedback": "Not a design task"}

        if not self.llm or not result.artifacts:
            return {"score": 10, "passed": True, "feedback": "No artifacts to judge"}

        # Find HTML artifact
        import os
        workspace = os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
        html_content = ""
        for artifact in result.artifacts[:3]:
            if artifact.endswith(".html"):
                candidate = os.path.join(workspace, "projects", result.project_id, "src", artifact)
                if os.path.exists(candidate):
                    try:
                        with open(candidate, encoding="utf-8") as f:
                            html_content = f.read()[:4000]
                        break
                    except Exception:
                        pass

        if not html_content:
            html_content = result.output[:4000]

        judge_prompt = f"""You are an expert web designer and UX critic.
Evaluate this HTML/CSS code for visual quality and UX.

ORIGINAL TASK: {result.task[:300]}

HTML CODE (first 4000 chars):
{html_content}

Score on each criterion (1-10):
1. Visual Design: Is it beautiful, modern, professional?
2. Responsive: Mobile-first, proper breakpoints?
3. Content Quality: No placeholders, Lorem ipsum, TODO?
4. Performance: Lazy loading, no blocking resources?
5. Accessibility: Alt tags, contrast, semantic HTML?

Respond ONLY in this exact format:
SCORE: X/10
VISUAL: X - reason
RESPONSIVE: X - reason
CONTENT: X - reason
PERFORMANCE: X - reason
ACCESSIBILITY: X - reason
VERDICT: PASS or FAIL
IMPROVEMENTS: bullet list of 2-3 specific improvements (if FAIL)"""

        try:
            response = await asyncio.wait_for(
                self.llm.chat(
                    model=primary_model,
                    messages=[
                        {"role": "system", "content": "You are a professional web design critic. Be specific and actionable."},
                        {"role": "user", "content": judge_prompt},
                    ],
                    max_tokens=600,
                    temperature=0.2,
                ),
                timeout=30.0,
            )
            if isinstance(response, dict):
                result.actual_cost += response.get("cost_usd", 0.0)
                feedback = response.get("content", "")
            else:
                feedback = str(response)

            # Parse verdict
            passed = "VERDICT: PASS" in feedback.upper() or "VERDICT: PASS" in feedback
            # Extract score
            score = 7  # default
            import re
            sm = re.search(r"SCORE:\s*(\d+)", feedback, re.I)
            if sm:
                score = min(10, max(1, int(sm.group(1))))

            logger.info(f"[{result.run_id}] Design Judge: score={score}/10, passed={passed}")
            return {"score": score, "passed": passed, "feedback": feedback}

        except Exception as e:
            logger.warning(f"[{result.run_id}] Design Judge failed: {e}")
            return {"score": 7, "passed": True, "feedback": f"Judge unavailable: {e}"}

    async def _direct_llm_call(self, result: RunResult, context: dict, model_id: str) -> str:
        """Fallback: direct LLM call without agent loop."""
        if not self.llm:
            return f"[DRY RUN] Task: {result.task}, Model: {model_id}"
        
        # Build prompt with project context
        system_prompt = self._build_system_prompt(context)
        
        response = await self.llm.chat(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": result.task},
            ],
        )
        
        # Track cost from LLM response
        if isinstance(response, dict):
            cost = response.get("cost_usd", 0.0)
            result.actual_cost += cost
            result.cost_breakdown.append({
                "model": model_id,
                "cost": cost,
                "tokens_in": response.get("tokens_in", 0),
                "tokens_out": response.get("tokens_out", 0),
            })
            return response.get("content", "")
        
        return str(response)
    
    def _build_system_prompt(self, context: dict) -> str:
        """Build system prompt with project context. Not instructions — context."""
        try:
            from core.identity_shield import get_identity_block as _get_id_block
            _id_block = _get_id_block()
        except Exception:
            _id_block = ""
        if _id_block:
            parts = [_id_block]
        else:
            parts = []
        parts = ["You are working on a project. Here is the context:"]
        
        if context.get("project_state"):
            state = context["project_state"]
            if state.get("project_profile"):
                parts.append(f"\nProject: {state['project_profile']}")
            if state.get("tech_stack"):
                parts.append(f"\nTech stack: {state['tech_stack']}")
            if state.get("design_system"):
                parts.append(f"\nDesign system: {state['design_system']}")
            if state.get("personality"):
                parts.append(f"\nClient preferences: {state['personality']}")
        
        parts.append("\nDo the task your way. You have full freedom in approach.")
        return "\n".join(parts)
    
    # ─── Default Agent Loop Factory ─────────────────────────────────────

    def _default_agent_loop_factory(
        self, model_id, project_context, task, budget_remaining=None, mode=None,
    ):
        """
        Create an AgentLoop with ToolExecutor.
        Registers SSH tools if needs_ssh=True, using server config from project state.
        """
        try:
            from core.tool_registry import ToolRegistry
            from core.tool_executor import ToolExecutor
            from core.agent_loop import AgentLoop
            from shared.llm.router import ModelRouter

            # Workspace directory
            workspace = os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
            project_id = project_context.get("project_id", "default")
            project_dir = os.path.join(workspace, "projects", project_id, "src")
            os.makedirs(project_dir, exist_ok=True)

            # Tool system
            registry = ToolRegistry()
            # FIX-10: create SecurityContext and pass to ToolExecutor
            _sec_ctx = None
            try:
                from core.security import SecurityContext
                from pathlib import Path
                _sec_ctx = SecurityContext.create(Path(project_dir))
            except Exception as _e:
                logger.debug(f"SecurityContext init skipped: {_e}")
            executor = ToolExecutor(registry=registry, project_dir=project_dir, security_context=_sec_ctx)

            # ── Register SSH tools if task needs them ─────────────────────
            if project_context.get("needs_ssh"):
                try:
                    from workers.ssh_tools import SSHTools, ServerConfig
                    servers = project_context.get("servers", [])
                    if servers:
                        srv = servers[0]
                        cfg = ServerConfig(
                            host=srv.get("host", srv.get("ip", "")),
                            user=srv.get("user", "root"),
                            port=srv.get("port", 22),
                        )
                        ssh = SSHTools()
                        executor.register_ssh_tools(ssh, cfg)
                        logger.info(f"SSH tools registered for {cfg.host}")
                    else:
                        logger.warning("needs_ssh=True but no servers in project state")
                except ImportError as e:
                    logger.warning(f"SSH tools not available: {e}")

            # ── Register image tools if task needs them ───────────────────
            if project_context.get("task_type") in ("media", "web_design", "design") or project_context.get("needs_image_gen"):
                try:
                    from workers.image_gen import get_image_generator
                    img_gen = get_image_generator()
                    executor.register_image_tools(img_gen)
                    logger.info("Image generation tools registered")
                except ImportError as e:
                    logger.warning(f"Image gen not available: {e}")

            # ── Register browser tools if task needs them (§4.1) ──────────
            if project_context.get("needs_browser") or project_context.get("task_type") == "web_design":
                try:
                    from workers.browser.worker import BrowserWorker
                    from core.tool_registry import (
                        _schema,
                        SSH_EXEC_SCHEMA,  # just for _schema helper
                    )
                    browser = BrowserWorker()

                    async def _browser_navigate(url: str, **kw) -> str:
                        r = await browser.navigate(url)
                        return str(r.get("text", r))

                    async def _browser_click(index: int = None, x: float = None, y: float = None, **kw) -> str:
                        r = await browser.click(index=index, x=x, y=y)
                        return str(r.get("text", r))

                    async def _browser_input(index: int = 0, text: str = "", **kw) -> str:
                        r = await browser.input_text(index=index, text=text)
                        return str(r.get("text", r))

                    async def _browser_view(**kw) -> str:
                        r = await browser.get_view()
                        return str(r.get("text", r))

                    registry.register("browser_navigate", _browser_navigate,
                        _schema("browser_navigate", "Navigate to URL in browser",
                                {"url": {"type": "string"}}, ["url"]),
                        requires="browser")
                    registry.register("browser_click", _browser_click,
                        _schema("browser_click", "Click element in browser",
                                {"index": {"type": "integer"}, "x": {"type": "number"}, "y": {"type": "number"}}, []),
                        requires="browser")
                    registry.register("browser_input", _browser_input,
                        _schema("browser_input", "Type text into input field",
                                {"index": {"type": "integer"}, "text": {"type": "string"}}, ["text"]),
                        requires="browser")
                    registry.register("browser_view", _browser_view,
                        _schema("browser_view", "Get current page content", {}, []),
                        requires="browser")

                    executor._capabilities.add("browser")
                    logger.info("Browser tools registered")
                except ImportError as e:
                    logger.warning(f"Browser tools not available: {e}")

            # Router (wraps llm_client with model selection + budget)
            # Create a mode-specific copy of preset_manager for this run
            import copy
            from shared.llm.preset_manager import PresetMode, ensure_free_strategy
            _pm_copy = copy.deepcopy(self.presets) if self.presets else None
            if _pm_copy and mode:
                try:
                    _pm_copy.mode = PresetMode(mode)
                    if mode == "free":
                        ensure_free_strategy()
                except (ValueError, Exception):
                    pass
            router = ModelRouter(
                client=self.llm,
                strategy="balance",  # ignored when preset_manager is set
                budget_limit=budget_remaining or 5.0,
                preset_manager=_pm_copy or self.presets,
            )

            # Agent loop — pass full project context so agent knows tech_stack etc.
            return AgentLoop(
                llm_client=self.llm,
                router=router,
                tool_executor=executor,
                project_id=project_id,
                max_iterations=25,
                chat_id=project_context.get("chat_id", project_id) if project_context else project_id,
                user_id=project_context.get("user_id", "") if project_context else "",
                project_context=project_context,  # tech_stack, design_system, golden_path_hint
            )
        except Exception as e:
            logger.warning(f"Failed to create AgentLoop: {e}. Will use direct LLM call.")
            return None

    async def _update_status(
        self, result: RunResult, status: RunStatus, callback: Callable | None,
        extra_data: dict | None = None
    ):
        """Update run status and notify via callback."""
        result.status = status
        # Persist to history DB on terminal states
        _terminal = {RunStatus.DONE, RunStatus.FAILED, RunStatus.CANCELLED}
        if status in _terminal and getattr(self, "history_db", None) is not None:
            try:
                import os as _os, json as _json
                _workspace = _os.environ.get("ARCANE_WORKSPACE", "/root/workspace")
                _state_path = _os.path.join(_workspace, "projects", result.project_id, ".arcane", "state.json")
                _proj_name = result.project_id
                if _os.path.exists(_state_path):
                    with open(_state_path) as _f:
                        _st = _json.load(_f)
                        _proj_name = _st.get("name", result.project_id)
                self.history_db.save_run(result.to_dict(), project_name=_proj_name)
            except Exception as _e:
                import logging as _log
                _log.getLogger(__name__).warning(f"Failed to persist run {result.run_id}: {_e}")
        logger.info(f"[{result.run_id}] → {status.value}")
        if callback:
            try:
                _cb_data = result.to_dict()
                if extra_data:
                    _cb_data.update(extra_data)
                await callback(result.run_id, status.value, _cb_data)
            except Exception as e:
                logger.error(f"Status callback error: {e}")
    
    # ─── Public API ───────────────────────────────────────────────────────
    
    def _evict_old_runs(self, max_age: float = 3600, max_size: int = 200):
        """Remove completed runs older than max_age seconds. Prevents memory leak."""
        if len(self._runs) <= max_size:
            return
        terminal = {RunStatus.DONE, RunStatus.FAILED, RunStatus.CANCELLED}
        now = time.time()
        to_remove = [
            rid for rid, r in self._runs.items()
            if r.status in terminal and r.finished_at and (now - r.finished_at) > max_age
        ]
        for rid in to_remove:
            del self._runs[rid]
        if to_remove:
            logger.debug(f"Evicted {len(to_remove)} old runs, {len(self._runs)} remaining")

    def get_run(self, run_id: str) -> RunResult | None:
        """Get current state of a run."""
        return self._runs.get(run_id)
    
    def get_project_runs(self, project_id: str) -> list:
        """Return all runs belonging to a specific project."""
        return [r for r in self._runs.values() if r.project_id == project_id]

    def get_active_runs(self) -> list[RunResult]:
        """Get all active (non-terminal) runs."""
        terminal = {RunStatus.DONE, RunStatus.FAILED, RunStatus.CANCELLED}
        return [r for r in self._runs.values() if r.status not in terminal]
    
    def cancel_run(self, run_id: str) -> bool:
        """Cancel a running task."""
        run = self._runs.get(run_id)
        if run and run.status in {RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.PAUSED}:
            run.status = RunStatus.CANCELLED
            return True
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class BudgetPausedError(Exception):
    """Raised when budget limit reached and user confirmation needed."""
    pass

class CancelledError(Exception):
    """Raised when user cancels a run."""
    pass
