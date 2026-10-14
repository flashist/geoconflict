#!/usr/bin/env bash
#
# sshd-hardening.sh — turn SSH password login off, guarded and with a way back (task 0442).
#
# A LIBRARY, sourced — never run. It defines one function, harden_sshd, and does nothing at
# source time (no `set`, no command). Two callers ship it next to themselves and source it:
#   - setup-game-host.sh   — the game boxes' every-deploy root step (deploy.sh ships it);
#   - setup-telemetry.sh   — the telemetry box's every-deploy setup (build-deploy-telemetry.sh
#                            ships it to /root/sshd-hardening.sh).
# setup-profile.sh keeps its own inline copy (task 0221, proven live and owner-verified); this
# file is that section's logic, unchanged in substance. Change both together.
#
#   harden_sshd [<root prefix>]
#     0 → the hardening is IN EFFECT (global and root-effective), whether this run wrote it or
#         found it already there.
#     1 → NOT in effect, or not judged: refused before touching anything, or rolled back to
#         exactly the previous state. The reason is printed and kept in SSHD_HARDENING_REASON.
#
# What it writes: /etc/ssh/sshd_config.d/00-geoconflict-hardening.conf — password and
# keyboard-interactive login off, empty passwords off, key login on, root key-only
# (`prohibit-password`, NOT `no`: root is the deploy user on every box), MaxAuthTries 6 (the
# value all three boxes already had). Ciphers/KEX stay at distro defaults (a custom list is a
# lock-out vector). Never an edit to sshd_config itself.
#
# 🚨 MUST NEVER LOCK OUT SSH. Lock-out guards, in order:
#   0. (the CALLER's job) never harden on a deploy that itself came in by PASSWORD — that
#      operator may not hold the on-box key. setup-telemetry.sh checks TELEMETRY_DEPLOY_SSH_AUTH;
#      on the game boxes deploy.sh never runs the root step without a key, so it holds there by
#      construction;
#   1. never disable password login on a box with NO key in /root/.ssh/authorized_keys;
#      plus: sshd_config must Include sshd_config.d/*.conf, or the drop-in would be inert;
#   2. `sshd -t` BEFORE the reload — a rejected config is rolled back on the spot, so the NEXT
#      sshd start can never be blocked by it;
#   3. reload (never restart: the caller's own session survives; a failed reload rolls back),
#      then gate on the EFFECTIVE config — global AND for a root connection
#      (`sshd -T -C user=root,…`), because a Match block overrides the globals and plain
#      `sshd -T` would not show it. Not in effect → rolled back and reloaded.
# Rollback means RESTORE, not delete (0221 R3): an earlier drop-in is backed up first — OUTSIDE
# sshd_config.d/, so the backup is never read as config — and moved back on any failure. With no
# earlier drop-in, rollback removes the new one. Either way: state exactly as before.
#
# Idempotent (setup-game-host.sh's contract: never RESTART a service whose config did not
# change). The new content is built in a temporary file and compared with the drop-in already
# there. UNCHANGED → no write, but still `sshd -t` → reload → gate (task 0442 R2): `sshd -T`
# reads the config on DISK, not the running daemon, so without the reload a run that died
# between writing the file and reloading would be reported "hardened" on every later deploy
# while the daemon still took passwords. A reload is not a restart — sessions stay up, and
# setup-profile.sh (0221) reloads on every deploy too. Any failure there reports FAILED and
# LEAVES the file — removing it would re-open password login, and "restore the previous file"
# is the same file.
#
# Test seam: <root prefix> prefixes every path read or written (tests/ssh-alerts.sh drives it
# into a fake root with stub `sshd` and `systemctl`); on a box it is empty. Bash 3.2 compatible.
# Every step checks its own result: callers run this inside `if`, where `set -e` is OFF.

SSHD_HARDENING_REASON=""

# The drop-in, exactly. Its text is the SAME on every run — the unchanged-file check needs that.
sshd_hardening_dropin_content() {
    cat << 'EOF'
# Written by sshd-hardening.sh (task 0442) — change the script and redeploy, not this file.
# 00- prefix: sshd keeps the FIRST value it reads for a keyword and the Include glob is lexical,
# so this file wins over a cloud image's 50-cloud-init.conf (PasswordAuthentication yes).
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
MaxAuthTries 6
X11Forwarding no
LoginGraceTime 30
# Match blocks OVERRIDE the global section, and cloud images ship them (seen on the profile box:
# 99-qemu.conf `Match User root` → PasswordAuthentication yes, PermitRootLogin yes). Among Match
# blocks the FIRST matching value wins, so the auth keywords are pinned again here, first.
Match all
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PermitEmptyPasswords no
    PermitRootLogin prohibit-password
EOF
}

sshd_hardening_reload() {  # Debian/Ubuntu unit is `ssh`, upstream/Fedora `sshd`; stderr shown only when BOTH fail
    local errlog
    errlog=$(mktemp 2>/dev/null) || errlog=/dev/null
    if { systemctl reload ssh || systemctl reload sshd; } 2>"$errlog"; then
        [ "$errlog" = /dev/null ] || rm -f "$errlog"
        return 0
    fi
    [ "$errlog" = /dev/null ] || { cat "$errlog" >&2; rm -f "$errlog"; }
    return 1
}

sshd_hardening_rollback() {  # <drop-in> <backup> — the drop-in exactly as it was before this run
    if [ -f "$2" ]; then
        mv -f "$2" "$1"
        echo "       sshd rollback: restored the previous drop-in."
    else
        rm -f "$1"
        echo "       sshd rollback: removed the drop-in (none existed before this run)."
    fi
}

sshd_hardening_effective() {  # <keyword> → "<global> <root-effective>"
    local g r
    g=$(sshd -T 2>/dev/null | awk -v k="$1" '$1==k{print $2; exit}')
    r=$(sshd -T -C user=root,host=localhost,addr=127.0.0.1 2>/dev/null | awk -v k="$1" '$1==k{print $2; exit}')
    echo "${g:-?} ${r:-?}"
}

sshd_hardening_gate() {  # 0 when all four auth keywords are in effect, global AND root-effective
    local kv key want got failed=0
    for kv in "passwordauthentication no" "kbdinteractiveauthentication no" "permitemptypasswords no" "permitrootlogin prohibit-password"; do
        key=${kv%% *}; want=${kv#* }
        got=$(sshd_hardening_effective "$key")
        # OpenSSH ≤ 9.2 prints prohibit-password as its old name, without-password.
        got=${got//without-password/prohibit-password}
        if [ "$got" = "$want $want" ]; then
            echo "✅ sshd: $key $want (global + root-effective)"
        else
            echo "❌ sshd: $key is '$got' (global, root-effective) — expected '$want' for both"
            failed=1
        fi
    done
    return "$failed"
}

harden_sshd() {  # [<root prefix>]
    local root="${1:-}"
    local dropin="$root/etc/ssh/sshd_config.d/00-geoconflict-hardening.conf"
    local backup="$root/etc/ssh/geoconflict-hardening.conf.previous"
    local config="$root/etc/ssh/sshd_config"
    local keys="$root/root/.ssh/authorized_keys"
    local candidate
    SSHD_HARDENING_REASON=""

    # Guard 1: a key-type prefix, not merely a non-empty file (a comment-only file is no way in).
    if ! grep -qsE '^(ssh-|ecdsa-|sk-)' "$keys"; then
        SSHD_HARDENING_REASON="/root/.ssh/authorized_keys is missing or holds no key — refusing to turn password login off (it may be the only way in); nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    if ! grep -qsE '^[[:space:]]*Include[[:space:]]+/etc/ssh/sshd_config\.d/\*\.conf' "$config"; then
        SSHD_HARDENING_REASON="/etc/ssh/sshd_config does not Include /etc/ssh/sshd_config.d/*.conf — the drop-in would be inert; nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    if ! mkdir -p "$root/etc/ssh/sshd_config.d"; then
        SSHD_HARDENING_REASON="could not create /etc/ssh/sshd_config.d; nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    # The candidate is built OUTSIDE sshd_config.d/, so it is never read as config.
    if ! candidate=$(mktemp "$root/etc/ssh/.geoconflict-hardening.XXXXXX"); then
        SSHD_HARDENING_REASON="could not create a temporary file in /etc/ssh; nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    if ! sshd_hardening_dropin_content > "$candidate"; then
        rm -f "$candidate"
        SSHD_HARDENING_REASON="could not write the candidate drop-in; nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi

    # Unchanged → no write. Still sshd -t → reload → gate (0442 R2): the gate reads the config
    # on disk, so only a reload makes "in effect" true of the RUNNING daemon too — e.g. after an
    # earlier run died between its write and its reload. Every failure here LEAVES the file.
    if [ -f "$dropin" ] && cmp -s "$candidate" "$dropin"; then
        rm -f "$candidate"
        echo "sshd drop-in unchanged — not rewritten; reloading sshd so the running daemon has it (a reload, not a restart)."
        if ! sshd -t; then
            SSHD_HARDENING_REASON="sshd rejects its current config (sshd -t) although the drop-in is unchanged — sshd not reloaded; the file was left (removing it would re-open password login). Inspect /etc/ssh/sshd_config.d/ and 'sshd -t'"
            echo "Error: $SSHD_HARDENING_REASON."
            return 1
        fi
        if ! sshd_hardening_reload; then
            SSHD_HARDENING_REASON="sshd reload failed (see above) — the running daemon may not have the drop-in; the unchanged file was left (removing it would re-open password login)"
            echo "Error: $SSHD_HARDENING_REASON."
            return 1
        fi
        if ! sshd_hardening_gate; then
            SSHD_HARDENING_REASON="the drop-in is in place but NOT in effect — another sshd config still wins; the file was left (removing it would re-open password login). Inspect /etc/ssh/sshd_config.d/ and 'sshd -T -C user=root,host=localhost,addr=127.0.0.1'"
            echo "Error: $SSHD_HARDENING_REASON."
            return 1
        fi
        echo "✅ sshd hardened: password login OFF, root key-only (prohibit-password)."
        return 0
    fi

    # Changed (or new): back up → write → sshd -t → reload → gate; roll back on any failure.
    rm -f "$backup"
    if [ -f "$dropin" ] && ! cp -p "$dropin" "$backup"; then
        rm -f "$candidate" "$backup"
        SSHD_HARDENING_REASON="could not back up the existing drop-in; nothing changed"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    if ! chmod 644 "$candidate" || ! mv -f "$candidate" "$dropin"; then
        rm -f "$candidate"
        sshd_hardening_rollback "$dropin" "$backup"
        SSHD_HARDENING_REASON="could not write the drop-in; rolled back, sshd not reloaded"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    # Guard 2: never leave a config that blocks the NEXT sshd start.
    if ! sshd -t; then
        sshd_hardening_rollback "$dropin" "$backup"
        SSHD_HARDENING_REASON="sshd rejected the drop-in (sshd -t); rolled back — sshd config is as before"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    # reload, not restart. A failed reload (its stderr is printed) rolls back, so the drop-in
    # never outlives a run the gate never judged (0221 R4).
    if ! sshd_hardening_reload; then
        sshd_hardening_rollback "$dropin" "$backup"
        sshd_hardening_reload || true
        SSHD_HARDENING_REASON="sshd reload failed (see above); rolled back — sshd config is as before"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    # Guard 3: the EFFECTIVE values — global section and a root connection — must both match.
    if ! sshd_hardening_gate; then
        sshd_hardening_rollback "$dropin" "$backup"
        sshd_hardening_reload || true
        SSHD_HARDENING_REASON="the hardening is NOT in effect — another sshd config still wins; rolled back and sshd reloaded (state as before). Inspect /etc/ssh/sshd_config.d/ and 'sshd -T -C user=root,host=localhost,addr=127.0.0.1'"
        echo "Error: $SSHD_HARDENING_REASON."
        return 1
    fi
    rm -f "$backup"
    echo "✅ sshd hardened: password login OFF, root key-only (prohibit-password), drop-in /etc/ssh/sshd_config.d/00-geoconflict-hardening.conf."
    return 0
}
