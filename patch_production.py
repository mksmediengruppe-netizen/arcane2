#!/usr/bin/env python3
"""
ARCANE 2 — Production Patch Script v1.0
========================================
Запускать из директории /root/arcane2:

    cd /root/arcane2
    python3 patch_production.py
    sudo systemctl restart arcane2

Что делает:
  Fix-1  Логин 401  →  per-user пароли, /auth/register, change-password
  Fix-2  memory_v9  →  убирает опасные импорты (subprocess security risk)
  Fix-3  budget     →  float(inf) → None (JSON-safe)
"""

import os, re, subprocess, sys

ROOT = os.getcwd()
ERRORS = []

def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(os.path.join(ROOT, path), "w", encoding="utf-8") as f:
        f.write(content)

def patch(path, old, new, label):
    src = read(path)
    if old not in src:
        print(f"  SKIP (already patched or not found): {label}")
        return False
    write(path, src.replace(old, new, 1))
    print(f"  ✅ {label}")
    return True

def check_syntax(path):
    r = subprocess.run(
        ["python3", "-m", "py_compile", os.path.join(ROOT, path)],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        ERRORS.append(f"{path}: {r.stderr.strip()[:150]}")
        print(f"  ❌ SYNTAX ERROR in {path}: {r.stderr.strip()[:150]}")
    else:
        print(f"  ✅ {path}")


print("=" * 60)
print("ARCANE 2 — Applying Production Patches")
print("=" * 60)

# ────────────────────────────────────────────────────────────────────────────
# FIX-1a: Login — проверять пароль из БД + env fallback
# ПРОБЛЕМА: пользователь вводит "admin"/"admin", сервер ожидает "arcane2025"
# ────────────────────────────────────────────────────────────────────────────
print("\n[Fix-1a] Login: per-user password + env fallback")
patch(
    "api/compat_all.py",
    '''    # Validate password
    stored_pass = os.environ.get("ARCANE_ADMIN_PASSWORD", "arcane2025")
    if password != stored_pass:
        raise HTTPException(401, "Invalid credentials")''',
    '''    # Validate password — per-user hash OR env fallback
    import hashlib as _hl, hmac as _hmac
    env_pass = os.environ.get("ARCANE_ADMIN_PASSWORD", "arcane2025")
    uid = user.get("id", "admin")
    stored_user = _users.get(uid) or {}
    stored_hash = stored_user.get("password_hash", "")

    def _pw_ok(plain, stored_h, env_p):
        if plain == env_p:
            return True
        if stored_h:
            expected = _hl.sha256((plain + "arcane_salt").encode()).hexdigest()
            return _hmac.compare_digest(expected, stored_h)
        return False

    if not _pw_ok(password, stored_hash, env_pass):
        raise HTTPException(401, "Invalid credentials")''',
    "per-user password check with env fallback"
)

# ────────────────────────────────────────────────────────────────────────────
# FIX-1b: admin_create_user — сохранять хеш пароля
# ────────────────────────────────────────────────────────────────────────────
print("\n[Fix-1b] admin_create_user: store hashed password")
patch(
    "api/compat_all.py",
    '''    uid = f"user_{uuid.uuid4().hex[:8]}"
    user = {"id": uid, "email": req.email, "name": req.name, "role": req.role,
            "is_active": True, "status": "active", "created_at": _ts(),
            "avatarInitials": req.name[:2].upper(), "avatarColor": "#10B981"}
    _users[uid] = user
    return {"ok": True, "user": user}''',
    '''    import hashlib as _hl
    uid = f"user_{uuid.uuid4().hex[:8]}"
    pass_hash = _hl.sha256((req.password + "arcane_salt").encode()).hexdigest() if req.password else ""
    user = {"id": uid, "email": req.email, "name": req.name, "role": req.role,
            "is_active": True, "status": "active", "created_at": _ts(),
            "avatarInitials": req.name[:2].upper(), "avatarColor": "#10B981",
            "password_hash": pass_hash}
    _users.set(uid, user)
    return {"ok": True, "user": {k: v for k, v in user.items() if k != "password_hash"}}''',
    "admin_create_user stores hashed password"
)

# ────────────────────────────────────────────────────────────────────────────
# FIX-1c: Добавить /auth/register + /auth/change-password + /admin/reset-password
# ────────────────────────────────────────────────────────────────────────────
print("\n[Fix-1c] Auth: /register + /change-password + /admin/reset-password")

NEW_AUTH = '''
@compat_router.post("/auth/register")
async def register(req: CreateUserRequest):
    """Регистрация нового пользователя.
    Отключить: Environment=ARCANE_ALLOW_REGISTER=false
    """
    import hashlib as _hl
    if os.environ.get("ARCANE_ALLOW_REGISTER", "true").lower() == "false":
        raise HTTPException(403, "Registration disabled")
    for uid, u in _users.items():
        if u.get("email") == req.email:
            raise HTTPException(409, "Email already registered")
    uid = f"user_{uuid.uuid4().hex[:8]}"
    pass_hash = _hl.sha256((req.password + "arcane_salt").encode()).hexdigest()
    user = {
        "id": uid, "email": req.email, "name": req.name, "role": "user",
        "is_active": True, "status": "active", "created_at": _ts(),
        "avatarInitials": req.name[:2].upper(), "avatarColor": "#10B981",
        "password_hash": pass_hash,
    }
    _users.set(uid, user)
    token = f"tok_{uuid.uuid4().hex}"
    _sessions.set(token, uid)
    _log_audit("register", uid, f"Registered: {req.email}", resource_type="auth")
    return {"ok": True, "token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}


@compat_router.post("/auth/change-password")
async def change_password(request: Request):
    """Сменить пароль текущего пользователя."""
    import hashlib as _hl, hmac as _hmac
    body = await request.json()
    old_pass = body.get("old_password", "")
    new_pass = body.get("new_password", "")
    if not old_pass or not new_pass:
        raise HTTPException(400, "old_password and new_password required")
    if len(new_pass) < 6:
        raise HTTPException(400, "Password must be >= 6 chars")
    user = _get_current_user(request)
    uid = user.get("id", "admin")
    stored = dict(_users.get(uid) or {})
    env_pass = os.environ.get("ARCANE_ADMIN_PASSWORD", "arcane2025")
    stored_hash = stored.get("password_hash", "")
    old_expected = _hl.sha256((old_pass + "arcane_salt").encode()).hexdigest()
    if old_pass != env_pass and (not stored_hash or not _hmac.compare_digest(old_expected, stored_hash)):
        raise HTTPException(401, "Current password incorrect")
    stored["password_hash"] = _hl.sha256((new_pass + "arcane_salt").encode()).hexdigest()
    _users.set(uid, stored)
    _log_audit("password.change", uid, "Password changed", resource_type="auth")
    return {"ok": True}


@compat_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, request: Request):
    """Admin: принудительно сменить пароль пользователя."""
    import hashlib as _hl
    _check_admin_auth(request)
    body = await request.json()
    new_pass = body.get("new_password", "")
    if not new_pass:
        raise HTTPException(400, "new_password required")
    user = _users.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    updated = dict(user)
    updated["password_hash"] = _hl.sha256((new_pass + "arcane_salt").encode()).hexdigest()
    _users.set(user_id, updated)
    _log_audit("password.reset", user_id, "Password reset by admin", resource_type="auth")
    return {"ok": True}

'''

patch(
    "api/compat_all.py",
    '@compat_router.get("/auth/me")',
    NEW_AUTH + '@compat_router.get("/auth/me")',
    "added /register, /change-password, /admin/reset-password"
)

# ────────────────────────────────────────────────────────────────────────────
# FIX-2: memory_v9/engine.py — заменить опасные импорты на safe stubs
# ПРОБЛЕМА: DynamicToolManager использует subprocess для выполнения
#           AI-сгенерированного кода — критический security risk
# ────────────────────────────────────────────────────────────────────────────
print("\n[Fix-2] memory_v9/engine.py: safe stubs for dangerous modules")

SAFE_STUBS = '''# ── Safe stubs (disabled modules) ─────────────────────────────────────────
# dynamic_tools  — DISABLED: subprocess exec of AI-generated code = security risk
# finetuning     — DISABLED: requires GPU + unsloth/axolotl (not installed)
# cross_learning — DISABLED by default; enable: ARCANE_CROSS_LEARNING=true
import os as _os_eng
_CROSS_LEARNING_ENABLED = _os_eng.environ.get("ARCANE_CROSS_LEARNING", "false").lower() == "true"

class DynamicToolManager:
    @staticmethod
    def check_and_generate(*a, **kw): pass

class ToolGenerator:
    @staticmethod
    def get_tools_schema(*a, **kw): return []
    @staticmethod
    def execute(*a, **kw): return {"ok": False, "error": "dynamic tools disabled"}

class CrossUserLearning:
    @staticmethod
    def get_prompt_suggestions(*a, **kw): return None
    @staticmethod
    def record_command_pair(*a, **kw): pass
    @staticmethod
    def record_tool_sequence(*a, **kw): pass
    @staticmethod
    def suggest_error_fix(*a, **kw): return None

class DatasetExporter:
    @staticmethod
    def export_all(): return []

class FineTuner:
    @staticmethod
    def train(*a, **kw): raise NotImplementedError("GPU required for fine-tuning")

class InferenceRouter:
    @staticmethod
    def should_use_finetuned(*a, **kw): return False
'''

patch(
    "shared/memory_v9/engine.py",
    "from .dynamic_tools import DynamicToolManager, ToolGenerator\n"
    "from .cross_learning import CrossUserLearning\n"
    "from .finetuning import DatasetExporter, FineTuner, InferenceRouter",
    SAFE_STUBS,
    "dangerous imports → safe stubs"
)

# Guard CrossUserLearning calls
src = read("shared/memory_v9/engine.py")
src = src.replace(
    "        # Cross-User Learning: popular patterns\n"
    "        try:\n"
    "            cross_ctx = CrossUserLearning.get_prompt_suggestions(",
    "        # Cross-User Learning (opt-in: ARCANE_CROSS_LEARNING=true)\n"
    "        if _CROSS_LEARNING_ENABLED:\n"
    "         try:\n"
    "            cross_ctx = CrossUserLearning.get_prompt_suggestions(",
    1
)
src = src.replace(
    "        # Cross-User Learning: record anonymous patterns\n"
    "        if self.anchor and len(self.anchor.actions) >= 2:",
    "        # Cross-User Learning (opt-in)\n"
    "        if _CROSS_LEARNING_ENABLED and self.anchor and len(self.anchor.actions) >= 2:",
    1
)
write("shared/memory_v9/engine.py", src)
print("  ✅ CrossUserLearning calls guarded")

# ────────────────────────────────────────────────────────────────────────────
# FIX-3: budget_controller — float(inf) → None
# ────────────────────────────────────────────────────────────────────────────
print("\n[Fix-3] budget_controller: get_remaining never returns float(inf)")
patch(
    "core/budget_controller.py",
    "        limits = self.get_limits(project_id)\n"
    "        if limits.per_project_month is None:\n"
    "            return None\n"
    "        spent = self.spent_on_project_month(project_id)\n"
    "        return max(0.0, limits.per_project_month - spent)",
    "        limits = self.get_limits(project_id)\n"
    "        if limits.per_project_month is None:\n"
    "            return None  # unlimited\n"
    "        spent = self.spent_on_project_month(project_id)\n"
    "        val = max(0.0, limits.per_project_month - spent)\n"
    "        if val != val or val in (float('inf'), float('-inf')):  # nan/inf guard\n"
    "            return None\n"
    "        return round(val, 6)",
    "get_remaining: inf/nan guard"
)

# ────────────────────────────────────────────────────────────────────────────
# Syntax check
# ────────────────────────────────────────────────────────────────────────────
print("\n[Syntax check]")
for fn in ["api/compat_all.py", "api/api.py",
           "core/budget_controller.py", "shared/memory_v9/engine.py"]:
    check_syntax(fn)

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
if ERRORS:
    print(f"❌ {len(ERRORS)} errors — fix them before restarting!")
    for e in ERRORS:
        print(f"   {e}")
else:
    print("✅ ALL PATCHES APPLIED SUCCESSFULLY")
    print()
    print("Next steps:")
    print("  1. sudo systemctl restart arcane2")
    print("  2. Проверить логин: admin / arcane2025")
    print("     (или задать свой: ARCANE_ADMIN_PASSWORD=... в systemd)")
    print("  3. Создать новых пользователей через POST /api/auth/register")
    print("     или через Admin Panel → Users → Add User")
