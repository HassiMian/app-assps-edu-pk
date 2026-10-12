#!/usr/bin/env bash
# Minimal, reversible interface filter. Do NOT enable broad UFW or edit Nginx.
# Nginx uses 127.0.0.1:3000/5000; never filter lo or ports 22/80/443.
set -euo pipefail
MODE="${1:---plan}"
IFACE="eth0"
RULE=(-i "$IFACE" -p tcp -m multiport --dports 3000,5000 -j REJECT --reject-with tcp-reset)
fail(){ echo "ASSPS_DIRECT_NODE_FIREWALL_NO_GO: $1" >&2; exit 2; }
[[ $(id -u) -eq 0 ]] || fail 'root required'
ip link show dev "$IFACE" >/dev/null 2>&1 || fail 'network interface missing'
[[ -x /usr/sbin/iptables && -x /usr/sbin/ip6tables ]] || fail 'firewall utilities unavailable'
for family in iptables ip6tables; do
  "$family" -w -S INPUT >/dev/null || fail "$family unavailable"
done
case "$MODE" in
 --plan)
   echo 'PLAN_ONLY: REJECT external eth0 TCP 3000,5000 both IPv4/IPv6'
   echo 'LOCALHOST_UNCHANGED; SSH22/HTTP80/HTTPS443_UNCHANGED; NO_FIREWALL_MUTATION'
   ;;
 --apply)
   for family in iptables ip6tables; do
     if ! "$family" -w -C INPUT "${RULE[@]}" >/dev/null 2>&1; then
       "$family" -w -I INPUT 1 "${RULE[@]}"
     fi
     "$family" -w -C INPUT "${RULE[@]}" >/dev/null || fail "$family rule postflight missing"
   done
   echo 'DIRECT_NODE_EXTERNAL_PORTS_3000_5000_RESTRICTED_V4_AND_V6'
   ;;
 --rollback)
   for family in iptables ip6tables; do
     if "$family" -w -C INPUT "${RULE[@]}" >/dev/null 2>&1; then
       "$family" -w -D INPUT "${RULE[@]}"
     fi
     if "$family" -w -C INPUT "${RULE[@]}" >/dev/null 2>&1; then
       fail "$family duplicate rule remains, independent security review required"
     fi
   done
   echo 'DIRECT_NODE_EXTERNAL_PORTS_FILTER_ROLLBACK_COMPLETE'
   ;;
 --verify)
   for family in iptables ip6tables; do
     "$family" -w -C INPUT "${RULE[@]}" >/dev/null || fail "$family restriction missing"
   done
   echo 'DIRECT_NODE_EXTERNAL_PORTS_V4_V6_FILTER_PASS'
   ;;
 *) fail 'use --plan, --apply, --verify or --rollback';;
esac
